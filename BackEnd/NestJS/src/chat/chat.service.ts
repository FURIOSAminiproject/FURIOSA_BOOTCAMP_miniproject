import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import {
  explicitTravelMode,
  scheduleFromText,
  surveyStep,
  surveyPrompt,
} from './planner-survey';

export interface ChatMessageDto {
  role: 'user' | 'model';
  content: string;
}

export class ChatRequestDto {
  message?: string;
  text?: string;
  history?: ChatMessageDto[];
  context?: {
    origin?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    departureTime?: string;
    durationLabel?: string;
    mode?: string;
    distanceText?: string;
    durationText?: string;
    timelineSummary?: string;
    places?: { name: string; category?: string; address?: string }[];
  };
}

export interface ChatResponseDto {
  reply: string;
  modelUsed: string;
}

export class PlannerChatRequestDto {
  message?: string;
  history?: { role: 'user' | 'model'; content: string }[];
  currentDraft?: {
    originName?: string;
    destinationName?: string;
    durationLabel?: string;
    departureTime?: string;
    startDate?: string;
    endDate?: string;
    mode?: string;
    modeConfirmed?: boolean;
    preferences?: string;
  };
  currentStep?: number;
}

export class PlannerChatResponseDto {
  reply: string;
  step: number;
  extracted: {
    originName?: string | null;
    destinationName?: string | null;
    durationLabel?: string | null;
    departureTime?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    mode?: 'driving' | 'walking' | null;
    modeConfirmed?: boolean;
    preferences?: string | null;
    selectedCategoryIds?: string[];
    categorySelections?: Record<string, string[]>;
    categoryNames?: string[];
  };
  isReady: boolean;
  modelUsed: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Optional() @Inject(DataSource) private readonly dataSource?: DataSource,
  ) {}

  private async getGeminiClient(): Promise<{
    ai: GoogleGenAI;
    modelName: string;
  } | null> {
    let apiKey = process.env.GEMINI_API_KEY;
    let rawModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

    if (this.dataSource) {
      try {
        let rows: any[] | null = null;
        try {
          rows = await this.dataSource.query(
            `SELECT model_name, api_key FROM app_model_config WHERE is_active = true AND provider = 'google' ORDER BY id DESC LIMIT 1`,
          );
        } catch {
          rows = null;
        }

        if (!rows || rows.length === 0) {
          try {
            rows = await this.dataSource.query(
              `SELECT model_name, api_key FROM ai_model_config WHERE is_active = true AND provider = 'google' ORDER BY id DESC LIMIT 1`,
            );
          } catch {
            rows = null;
          }
        }

        if (rows && rows.length > 0) {
          if (rows[0].api_key) apiKey = String(rows[0].api_key).trim();
          if (rows[0].model_name) rawModel = String(rows[0].model_name).trim();
        }
      } catch (dbErr: any) {
        this.logger.warn(`DB 모델 설정 조회 실패: ${dbErr.message}`);
      }
    }

    if (!apiKey) {
      return null;
    }

    const modelName = rawModel.toLowerCase().replace(/\s+/g, '-');
    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 30000 } });
    return { ai, modelName };
  }

  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const userMessage = (dto.message || dto.text || '').trim();
    if (!userMessage) {
      return {
        reply:
          '안녕하세요! 여행에 대해 궁금한 점이 있으시면 언제든 편하게 물어보세요. (예: "서울에서 부산 갈 때 12시 반 맛집 추천해줘")',
        modelUsed: 'local-fallback',
      };
    }

    const gemini = await this.getGeminiClient();
    if (!gemini) {
      return {
        reply:
          '안녕하세요! 현재 시스템에 GEMINI_API_KEY가 등록되지 않은 상태입니다. DB의 ai_model_config 테이블 또는 환경 설정을 확인해 주세요.',
        modelUsed: 'local-fallback',
      };
    }

    const { ai, modelName } = gemini;

    // 컨텍스트 및 시스템 프롬프트 조립
    const contextLines: string[] = [];
    if (dto.context) {
      if (dto.context.origin && dto.context.destination) {
        contextLines.push(
          `- 현재 선택 경로: ${dto.context.origin} -> ${dto.context.destination}`,
        );
      }
      if (dto.context.startDate && dto.context.endDate) {
        contextLines.push(
          `- 여행 일정: ${dto.context.startDate} ~ ${dto.context.endDate} (${dto.context.durationLabel || ''})`,
        );
      }
      if (dto.context.departureTime) {
        contextLines.push(`- 출발 시각: ${dto.context.departureTime}`);
      }
      if (dto.context.mode) {
        contextLines.push(`- 이동 수단: ${dto.context.mode}`);
      }
      if (dto.context.distanceText || dto.context.durationText) {
        contextLines.push(
          `- 예상 거리 및 소요 시간: ${dto.context.distanceText || ''} (${dto.context.durationText || ''})`,
        );
      }
      if (dto.context.timelineSummary) {
        contextLines.push(
          `- 현재 타임라인 및 경유지: ${dto.context.timelineSummary}`,
        );
      }
    }

    const systemInstruction = `당신은 여행 플랫폼 'I am your J'의 [AI 일정 수정 & 코스 조율 전속 플래너]입니다.
사용자는 이미 생성된 여행 계획(출발지, 도착지, 이동 경로, 타임라인 구간, 추천 장소 등)을 조회 중이며, 이를 수정·조율하고자 대화하고 있습니다.
다음 원칙을 지켜 답변하세요:
1. 사용자가 요구하는 일정 수정 사항(식당 교체, 카페 추가, 휴게소/경유지 시간 변경, 도착지 인근 명소 추천 등)을 정확히 파악하고, 전체 이동 동선과 현실적인 소요 시간을 고려하여 최적의 대안과 수정된 일정을 제시하세요.
2. 현재 계획된 일정 정보(출발지, 도착지, 일정 기간, 타임라인)를 적극 참고하여, 앞뒤 일정과의 조화와 이동 피로도를 고려해 답변하세요.
3. 친절하고 전문적이며 신뢰감 있는 어조(존댓말)로 답변하세요.
4. 답변은 읽기 편하게 깔끔한 마크다운(강조, 불릿 포인트, 시간대별 일정 표기 등)을 사용하세요.
5. 너무 장황하지 않게 핵심 수정안을 3~4문단 내외로 명확하게 작성하세요.
${contextLines.length ? `\n[현재 생성된 여행 계획 정보]\n${contextLines.join('\n')}` : ''}`;

    // 대화 내역(history) 구성
    const contents: any[] = [];
    contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
    contents.push({
      role: 'model',
      parts: [
        {
          text: '네, I am your J 전속 플래너로서 고객님의 완벽한 여행을 위해 일정 수정 및 코스 조율을 성심껏 도와드리겠습니다. 어떤 부분을 변경하고 싶으신가요?',
        },
      ],
    });

    if (dto.history && Array.isArray(dto.history)) {
      for (const h of dto.history.slice(-8)) {
        contents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
      });

      const replyText = response.text?.trim();
      if (replyText) {
        return {
          reply: replyText,
          modelUsed: modelName,
        };
      }
      return {
        reply: '답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        modelUsed: modelName,
      };
    } catch (err: any) {
      this.logger.error(`Gemini (${modelName}) API Error:`, err?.message);
      return {
        reply: `답변 생성 중 오류가 발생했습니다. (${err?.message || '잠시 후 다시 시도해 주세요'})`,
        modelUsed: modelName,
      };
    }
  }

  /** 모델의 isReady/기본 이동 수단 때문에 필수 질문을 건너뛰지 않는다. */
  async planChat(dto: PlannerChatRequestDto): Promise<PlannerChatResponseDto> {
    const message =
      typeof dto?.message === 'string' ? dto.message.trim().slice(0, 5000) : '';
    const currentStep =
      Number.isInteger(dto?.currentStep) &&
      dto.currentStep! >= 1 &&
      dto.currentStep! <= 5
        ? dto.currentStep!
        : 1;
    const draft = { ...dto?.currentDraft };
    const result =
      currentStep === 1
        ? await this.generatePlanChat({
            ...dto,
            message,
            currentStep,
            currentDraft: draft,
          })
        : this.fallbackPlanChat(message, draft, currentStep);
    let extracted: PlannerChatResponseDto['extracted'] = {
      ...draft,
      mode:
        draft.modeConfirmed === true &&
        (draft.mode === 'driving' || draft.mode === 'walking')
          ? draft.mode
          : null,
      modeConfirmed: draft.modeConfirmed === true,
    };
    // 현재 단계에서 답한 항목만 채택한다. 기간 답변을 취향으로 저장하지 않는다.
    if (currentStep === 1) {
      for (const key of ['originName', 'destinationName'] as const) {
        const value = result.extracted[key];
        if (typeof value === 'string' && value.trim())
          extracted[key] = value.trim();
      }
    } else if (currentStep === 2) {
      extracted = scheduleFromText(message, extracted) as typeof extracted;
    } else if (currentStep === 3) {
      const mode = explicitTravelMode(message);
      if (mode) {
        extracted.mode = mode;
        extracted.modeConfirmed = true;
      }
    } else if (currentStep === 4 && message) {
      extracted.preferences = message;
      Object.assign(extracted, this.extractCategories(message));
    }
    const step = surveyStep(extracted);
    return {
      reply:
        step === 3 && currentStep === 3 && !explicitTravelMode(message)
          ? `자동차 또는 도보 중 하나를 직접 선택해 주세요. ${surveyPrompt(3)}`
          : surveyPrompt(step),
      step,
      extracted,
      isReady: step === 5,
      modelUsed: result.modelUsed,
    };
  }

  /** 장소 표현만 AI로 해석하고 단계 결정은 planChat에서 검사한다. */
  private async generatePlanChat(
    dto: PlannerChatRequestDto,
  ): Promise<PlannerChatResponseDto> {
    const fallback = this.fallbackPlanChat(
      dto.message || '',
      dto.currentDraft || {},
      1,
    );
    const gemini = await this.getGeminiClient();
    if (!gemini) return fallback;
    try {
      const response = await gemini.ai.models.generateContent({
        model: gemini.modelName,
        contents: JSON.stringify({
          message: dto.message,
          previous: dto.currentDraft,
        }),
        config: {
          systemInstruction:
            '출발지와 도착지의 실제 지명만 추출하세요. JSON {originName: string|null, destinationName: string|null}으로 답하세요. 모르는 지명은 만들지 마세요.',
          responseMimeType: 'application/json',
        },
      });
      const parsed: unknown = JSON.parse(response.text || '{}');
      if (parsed && typeof parsed === 'object') {
        for (const key of ['originName', 'destinationName'] as const) {
          const value = (parsed as Record<string, unknown>)[key];
          if (typeof value === 'string' && value.trim() && value.length <= 100)
            fallback.extracted[key] = value.trim();
        }
      }
      return { ...fallback, modelUsed: gemini.modelName };
    } catch {
      return fallback;
    }
  }

  /** 취향 텍스트 기반 DB 카테고리 자동 시맨틱 매핑 */
  private extractCategories(text: string): {
    selectedCategoryIds: string[];
    categorySelections: Record<string, string[]>;
    categoryNames: string[];
  } {
    const raw = (text || '').trim();
    const selectedCategoryIds: string[] = [];
    const categorySelections: Record<string, string[]> = {};
    const categoryNames: string[] = [];

    const FOOD_ID = 'dd608518-f993-4a23-bd10-2c59a24fa674';
    const CAFE_ID = 'f63cd46c-13db-465b-923d-4f064ab05feb';
    const KOREAN_FOOD_ID = '917f7b5a-5f95-414d-8ca6-9dc8c5535199';

    const NATURE_ID = '6486b07a-4e08-4f42-9942-eec0b631592b';
    const FOREST_ID = 'b1c0732e-15d7-4837-ad8c-b5f3a88af4b2';
    const PARK_ID = 'a44a0670-6aa4-4794-8b7d-0126f260e439';

    const CULTURE_ID = '1cd55dd3-084a-4f30-aa37-b9f772807d90';
    const ACTIVITY_ID = '02e5b4c1-7434-48a1-8712-76cba3e09ad8';

    // 카페 매핑
    if (
      raw.includes('카페') ||
      raw.includes('디저트') ||
      raw.includes('커피') ||
      raw.includes('찻집') ||
      raw.includes('빵') ||
      raw.includes('베이커리')
    ) {
      if (!selectedCategoryIds.includes(FOOD_ID))
        selectedCategoryIds.push(FOOD_ID);
      categorySelections[FOOD_ID] = categorySelections[FOOD_ID] || [];
      if (!categorySelections[FOOD_ID].includes(CAFE_ID))
        categorySelections[FOOD_ID].push(CAFE_ID);
      categoryNames.push('카페/ 찻집');
    }

    // 맛집 / 한식 매핑
    if (
      raw.includes('맛집') ||
      raw.includes('밥') ||
      raw.includes('한식') ||
      raw.includes('닭갈비') ||
      raw.includes('고기') ||
      raw.includes('막국수') ||
      raw.includes('식당') ||
      raw.includes('식사') ||
      raw.includes('먹거리') ||
      raw.includes('향토음식')
    ) {
      if (!selectedCategoryIds.includes(FOOD_ID))
        selectedCategoryIds.push(FOOD_ID);
      categorySelections[FOOD_ID] = categorySelections[FOOD_ID] || [];
      if (!categorySelections[FOOD_ID].includes(KOREAN_FOOD_ID))
        categorySelections[FOOD_ID].push(KOREAN_FOOD_ID);
      categoryNames.push('한식(맛집)');
    }

    // 자연 / 힐링 / 공원 매핑
    if (
      raw.includes('자연') ||
      raw.includes('휴양') ||
      raw.includes('숲') ||
      raw.includes('산책') ||
      raw.includes('힐링') ||
      raw.includes('쉼터') ||
      raw.includes('호수') ||
      raw.includes('바다') ||
      raw.includes('산') ||
      raw.includes('공원') ||
      raw.includes('수목원')
    ) {
      if (!selectedCategoryIds.includes(NATURE_ID))
        selectedCategoryIds.push(NATURE_ID);
      categorySelections[NATURE_ID] = [FOREST_ID, PARK_ID];
      categoryNames.push('자연휴양림 & 자연공원');
    }

    // 문화 / 역사 / 전시 / 명소 매핑 (사용자가 "역사 유적지와 관광 명소"라고 입력한 경우 완벽 지원!)
    if (
      raw.includes('역사') ||
      raw.includes('유적') ||
      raw.includes('명소') ||
      raw.includes('관광') ||
      raw.includes('문화') ||
      raw.includes('박물관') ||
      raw.includes('미술관') ||
      raw.includes('전시') ||
      raw.includes('문화재') ||
      raw.includes('랜드마크') ||
      raw.includes('유적지')
    ) {
      if (!selectedCategoryIds.includes(CULTURE_ID))
        selectedCategoryIds.push(CULTURE_ID);
      categoryNames.push('문화관광 & 랜드마크');
    }

    // 체험 / 액티비티 / 쇼핑 매핑
    if (
      raw.includes('체험') ||
      raw.includes('액티비티') ||
      raw.includes('레포츠') ||
      raw.includes('스포츠') ||
      raw.includes('놀이') ||
      raw.includes('테마파크') ||
      raw.includes('시장') ||
      raw.includes('쇼핑')
    ) {
      if (!selectedCategoryIds.includes(ACTIVITY_ID))
        selectedCategoryIds.push(ACTIVITY_ID);
      categoryNames.push('체험관광 & 로컬마켓');
    }

    // 기본 카테고리가 없으면 골고루 지정
    if (selectedCategoryIds.length === 0) {
      selectedCategoryIds.push(FOOD_ID, NATURE_ID, CULTURE_ID);
      categorySelections[FOOD_ID] = [CAFE_ID, KOREAN_FOOD_ID];
      categorySelections[NATURE_ID] = [PARK_ID];
      categoryNames.push('카페/ 찻집', '한식(맛집)', '자연공원', '문화관광');
    }

    return { selectedCategoryIds, categorySelections, categoryNames };
  }

  private fallbackPlanChat(
    userText: string,
    draft: any,
    currentStep: number,
  ): PlannerChatResponseDto {
    const extracted = { ...draft };
    if (currentStep === 1) {
      const clean = (value: string) =>
        value
          .trim()
          .replace(
            /(?:으로|로)?\s*(?:가고 싶어요|가고 싶어|갈게요|가요|갈래|갈거야)?[.!?]*$/,
            '',
          )
          .replace(/(?:에서|부터|까지|으로|로)$/, '')
          .trim();
      const parts = userText.split(/에서(?:부터)?|부터|➔|->/);
      if (parts.length >= 2) {
        extracted.originName = clean(parts[0]);
        extracted.destinationName = clean(parts.slice(1).join(' '));
      }
    }
    return {
      reply: surveyPrompt(currentStep),
      step: currentStep,
      extracted,
      isReady: false,
      modelUsed: 'local-nlp-fallback',
    };
  }
}
