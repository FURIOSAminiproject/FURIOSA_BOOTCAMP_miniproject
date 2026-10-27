import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GoogleGenAI } from '@google/genai';

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
    mode?: 'driving' | 'transit' | 'walking' | null;
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

  private async getGeminiClient(): Promise<{ ai: GoogleGenAI; modelName: string } | null> {
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
        reply: '안녕하세요! 여행에 대해 궁금한 점이 있으시면 언제든 편하게 물어보세요. (예: "서울에서 부산 갈 때 12시 반 맛집 추천해줘")',
        modelUsed: 'local-fallback',
      };
    }

    const gemini = await this.getGeminiClient();
    if (!gemini) {
      return {
        reply: '안녕하세요! 현재 시스템에 GEMINI_API_KEY가 등록되지 않은 상태입니다. DB의 ai_model_config 테이블 또는 환경 설정을 확인해 주세요.',
        modelUsed: 'local-fallback',
      };
    }

    const { ai, modelName } = gemini;

    // 컨텍스트 및 시스템 프롬프트 조립
    const contextLines: string[] = [];
    if (dto.context) {
      if (dto.context.origin && dto.context.destination) {
        contextLines.push(`- 현재 선택 경로: ${dto.context.origin} -> ${dto.context.destination}`);
      }
      if (dto.context.startDate && dto.context.endDate) {
        contextLines.push(`- 여행 일정: ${dto.context.startDate} ~ ${dto.context.endDate} (${dto.context.durationLabel || ''})`);
      }
      if (dto.context.departureTime) {
        contextLines.push(`- 출발 시각: ${dto.context.departureTime}`);
      }
      if (dto.context.mode) {
        contextLines.push(`- 이동 수단: ${dto.context.mode}`);
      }
      if (dto.context.distanceText || dto.context.durationText) {
        contextLines.push(`- 예상 거리 및 소요 시간: ${dto.context.distanceText || ''} (${dto.context.durationText || ''})`);
      }
      if (dto.context.timelineSummary) {
        contextLines.push(`- 현재 타임라인 및 경유지: ${dto.context.timelineSummary}`);
      }
    }

    const systemInstruction = `당신은 여행 플랫폼 'I like your J'의 [AI 일정 수정 & 코스 조율 전속 플래너]입니다.
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
    contents.push({ role: 'model', parts: [{ text: '네, I like your J 전속 플래너로서 고객님의 완벽한 여행을 위해 일정 수정 및 코스 조율을 성심껏 도와드리겠습니다. 어떤 부분을 변경하고 싶으신가요?' }] });

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

  /** 대화형 AI 여행 플래너 4단계 문답 에이전트 */
  async planChat(dto: PlannerChatRequestDto): Promise<PlannerChatResponseDto> {
    const userMessage = (dto.message || '').trim();
    const currentDraft = dto.currentDraft || {};
    const currentStep = dto.currentStep || 1;

    const gemini = await this.getGeminiClient();
    if (!gemini) {
      return this.fallbackPlanChat(userMessage, currentDraft, currentStep);
    }

    const { ai, modelName } = gemini;

    const todayStr = new Date().toISOString().slice(0, 10);
    const systemInstruction = `당신은 여행 플랫폼 'I like your J'의 [대화형 AI 여행 설계 플래너]입니다.
사용자는 별도의 날짜/시간 선택 창(Select Box, Date Picker) 없이 오직 당신과의 대화만으로 여행을 설계합니다.
따라서 최적의 여행 경로 API(/api/routes/compare)와 시간대별 타임라인 API(/api/routes/timeline)를 호출할 수 있도록,
다음 4가지 여행 조건을 순서대로 매우 정확하게 파악해야 합니다.

[기준 현재 일자]: ${todayStr}

[필수 수집 조건 4단계]
1단계. 출발지와 도착지 (originName, destinationName)
   - 예: "서울부터 강원도 춘천" -> originName: "서울", destinationName: "강원도 춘천"
   - 지명 뒤 조사(~부터, ~에서, ~까지, ~으로 등)를 깔끔하게 제거한 실제 행정구역/장소명을 추출하세요. (예: "강원도 춘천", "부산 해운대" 등 지명이 잘리지 않게 온전히 보존)
2단계. 출발 날짜, 여행 기간, 출발 시각 (startDate, endDate, durationLabel, departureTime)
   - [필수 확인 3가지]:
     1) 출발 날짜(startDate: YYYY-MM-DD): 사용자가 말한 날짜(예: 10월 28일 -> 2026-10-28, 내일, 이번 주말 등).
     2) 여행 기간(durationLabel: "당일치기" | "1박 2일" | "2박 3일" 등) 및 종료 날짜(endDate: YYYY-MM-DD).
     3) 출발 시각(departureTime: HH:mm 형식, 예: 09:30, 08:00, 14:00 등).
   - [매우 중요 규칙!]:
     사용자가 아직 "출발 날짜(몇월 몇일)"를 말하지 않았거나, "출발 시각(몇 시)"을 말하지 않았거나, "기간(당일/1박2일 등)"을 명시하지 않았다면,
     절대로 3단계로 넘어가지 말고 step을 2로 유지하세요!
     사용자가 말한 내용(예: "1박 2일")을 확인해 주고, 아직 확인되지 않은 항목(예: "몇월 몇일에 출발하시나요? 몇 시에 출발하시나요?")을 구체적으로 되물어보세요.
3단계. 이동 수단 (mode: "driving" | "transit" | "walking")
   - 자동차 운전: "driving", 대중교통: "transit", 도보: "walking"
4단계. 선호 장소/취향 (preferences 및 DB 카테고리 매핑)
   - 사용자가 방문하고 싶은 장소나 취향(예: "뷰 좋은 카페, 닭갈비 맛집, 힐링 숲길")을 말하면,
     우리 시스템 DB 카테고리와 매핑하여 selectedCategoryIds(상위 ID), categorySelections(세부 ID 맵), categoryNames(카테고리명 목록)를 함께 추출하세요.
   - 주요 카테고리 ID 가이드:
     * 카페/찻집: 상위 음식(dd608518-f993-4a23-bd10-2c59a24fa674) > 세부 카페(f63cd46c-13db-465b-923d-4f064ab05feb)
     * 한식/맛집: 상위 음식(dd608518-f993-4a23-bd10-2c59a24fa674) > 세부 한식(917f7b5a-5f95-414d-8ca6-9dc8c5535199)
     * 자연/휴양/산책: 상위 자연관광(6486b07a-4e08-4f42-9942-eec0b631592b) > 세부 자연휴양림(b1c0732e-15d7-4837-ad8c-b5f3a88af4b2), 자연공원(a44a0670-6aa4-4794-8b7d-0126f260e439)
     * 문화/전시/공연: 상위 문화관광(1cd55dd3-084a-4f30-aa37-b9f772807d90)
     * 체험/액티비티: 상위 체험관광(02e5b4c1-7434-48a1-8712-76cba3e09ad8)

[사용자의 정정 및 변경 발언 처리]
- 사용자가 "다시 말할게", "아니 도착지는 춘천이야" 등 정정하면 해당 필드를 즉시 갱신하고 다른 확정 필드는 유지하세요.

[현재까지 파악된 여행 조건]
- 출발지(originName): ${currentDraft.originName || '(미정)'}
- 도착지(destinationName): ${currentDraft.destinationName || '(미정)'}
- 출발일자(startDate): ${currentDraft.startDate || '(미정)'}
- 도착일자(endDate): ${currentDraft.endDate || '(미정)'}
- 여행기간(durationLabel): ${currentDraft.durationLabel || '(미정)'}
- 출발시각(departureTime): ${currentDraft.departureTime || '(미정)'}
- 이동수단(mode): ${currentDraft.mode || '(미정)'}
- 선호취향(preferences): ${currentDraft.preferences || '(미정)'}
- 현재 진행 단계: ${currentStep}단계

[응답 포맷 규칙]
반드시 다음 JSON 형식으로만 응답해야 합니다 (마크다운 백틱 없이 순수 JSON만 출력):
{
  "reply": "사용자에게 전할 친절하고 정중한 마크다운 대화 답변 (이모지와 볼드체 활용, 파악된 항목 확인 및 미비한 항목 질문)",
  "step": 1 | 2 | 3 | 4 | 5,
  "extracted": {
    "originName": "파악되거나 유지된 출발지 (없으면 null)",
    "destinationName": "파악되거나 유지된 도착지 (없으면 null)",
    "startDate": "YYYY-MM-DD (없으면 null)",
    "endDate": "YYYY-MM-DD (없으면 null)",
    "durationLabel": "파악되거나 유지된 기간 (없으면 null)",
    "departureTime": "파악되거나 유지된 출발시각 HH:mm (없으면 null)",
    "mode": "driving | transit | walking (없으면 null)",
    "preferences": "파악되거나 유지된 취향 (없으면 null)",
    "selectedCategoryIds": ["매핑된 상위 카테고리 UUID"],
    "categorySelections": { "상위UUID": ["하위UUID"] },
    "categoryNames": ["사용자에게 보여줄 카테고리명 (예: 카페/ 찻집, 한식)"]
  },
  "isReady": boolean (4단계까지 모든 조건이 완벽히 수집되어 5단계가 되었을 때만 true, 아니면 false)
}`;

    const contents: any[] = [];
    contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
    contents.push({ role: 'model', parts: [{ text: '{"reply": "네! I like your J 전속 플래너로서 완벽한 여행 일정을 설계하겠습니다.", "step": 1, "extracted": {}, "isReady": false}' }] });

    if (dto.history && Array.isArray(dto.history)) {
      for (const h of dto.history.slice(-6)) {
        contents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: `사용자 최근 입력: "${userMessage}"\n반드시 지정된 JSON 형식으로만 응답하세요.` }],
    });

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
      });

      const rawText = response.text?.trim() || '';
      let cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(cleanJson);
      return {
        reply: parsed.reply || '입력을 확인했습니다.',
        step: typeof parsed.step === 'number' ? parsed.step : currentStep,
        extracted: {
          originName: parsed.extracted?.originName || currentDraft.originName || null,
          destinationName: parsed.extracted?.destinationName || currentDraft.destinationName || null,
          startDate: parsed.extracted?.startDate || currentDraft.startDate || null,
          endDate: parsed.extracted?.endDate || currentDraft.endDate || null,
          durationLabel: parsed.extracted?.durationLabel || currentDraft.durationLabel || null,
          departureTime: parsed.extracted?.departureTime || currentDraft.departureTime || null,
          mode: parsed.extracted?.mode || currentDraft.mode || null,
          preferences: parsed.extracted?.preferences || currentDraft.preferences || null,
          selectedCategoryIds: parsed.extracted?.selectedCategoryIds || [],
          categorySelections: parsed.extracted?.categorySelections || {},
          categoryNames: parsed.extracted?.categoryNames || [],
        },
        isReady: Boolean(parsed.isReady || parsed.step === 5),
        modelUsed: modelName,
      };
    } catch (err: any) {
      this.logger.error(`Gemini planChat error: ${err?.message}`);
      return this.fallbackPlanChat(userMessage, currentDraft, currentStep);
    }
  }

  private fallbackPlanChat(
    userText: string,
    draft: any,
    currentStep: number,
  ): PlannerChatResponseDto {
    const raw = userText.trim();
    const updatedDraft = { ...draft };
    let step = currentStep;
    let reply = '';

    const clean = (s: string) =>
      s
        .replace(/^(?:출발지?|도착지?|출발은|도착은|출발|도착|여기서|장소)[:\s]*/i, '')
        .replace(/(?:에서부터|부터|에서|으로|로|까지|행|쪽으로|방면|가고|떠나|향해|가자|갈래|입니다|이야|야)+$/i, '')
        .trim();

    // 1. 사용자의 정정 감지
    const isCorrection =
      raw.includes('다시') ||
      raw.includes('아니') ||
      raw.includes('도착지') ||
      raw.includes('출발지') ||
      raw.includes('수정');

    if (isCorrection) {
      const destMatch = raw.match(/도착(?:지|은|:)?\s*([가-힣a-zA-Z0-9\s]+)/);
      const origMatch = raw.match(/출발(?:지|은|:)?\s*([가-힣a-zA-Z0-9\s]+)/);

      if (destMatch) {
        updatedDraft.destinationName = clean(destMatch[1]);
        reply = `도착지를 **${updatedDraft.destinationName}**(으)로 수정했습니다! 🚗\n\n📅 **2단계: 언제 출발하시고, 며칠 동안 여행하시나요?**\n출발 날짜(몇월 몇일)와 여행 기간(당일치기, 1박 2일 등), 그리고 출발 시각을 알려주세요.\n(예: '10월 28일 출발 1박 2일, 오전 9시 30분 출발')`;
        step = 2;
      } else if (origMatch) {
        updatedDraft.originName = clean(origMatch[1]);
        reply = `출발지를 **${updatedDraft.originName}**(으)로 수정했습니다! 🚗\n\n📅 **2단계: 언제 출발하시고, 며칠 동안 여행하시나요?**\n출발 날짜(몇월 몇일)와 여행 기간(당일치기, 1박 2일 등), 그리고 출발 시각을 알려주세요.\n(예: '10월 28일 출발 1박 2일, 오전 9시 30분 출발')`;
        step = 2;
      } else {
        reply = `내용을 정정해 주셔서 감사합니다. 변경할 출발지 또는 도착지를 명확히 말씀해 주세요!`;
      }

      return {
        reply,
        step,
        extracted: updatedDraft,
        isReady: false,
        modelUsed: 'local-nlp-fallback',
      };
    }

    if (step === 1) {
      if (raw.includes('부터')) {
        const parts = raw.split('부터');
        updatedDraft.originName = clean(parts[0]);
        updatedDraft.destinationName = clean(parts.slice(1).join('부터'));
      } else if (raw.includes('에서')) {
        const parts = raw.split('에서');
        updatedDraft.originName = clean(parts[0]);
        updatedDraft.destinationName = clean(parts.slice(1).join('에서'));
      } else {
        const tokens = raw.split(/[\s,]+/);
        if (tokens.length >= 2) {
          updatedDraft.originName = clean(tokens[0]);
          updatedDraft.destinationName = clean(tokens.slice(1).join(' '));
        } else {
          updatedDraft.destinationName = clean(tokens[0]);
        }
      }

      if (!updatedDraft.originName || !updatedDraft.destinationName) {
        reply = `출발지와 도착지를 모두 말씀해 주세요. (예: '서울에서 춘천으로', '수원에서 부산 등')`;
        step = 1;
      } else {
        reply = `네! **${updatedDraft.originName}**에서 출발하여 **${updatedDraft.destinationName}**(으)로 떠나는 여정으로 확인했습니다. 🛣️\n\n📅 **2단계: 언제 출발하시고, 며칠 동안 여행하시나요?**\n정확한 경로 및 식사 시간대별 추천을 위해 **출발 날짜(몇월 몇일)**와 **여행 기간(당일치기, 1박 2일 등)**, 그리고 **출발 시각**을 알려주세요!\n(예: '10월 28일 출발 1박 2일, 오전 9시 30분 출발')`;
        step = 2;
      }
    } else if (step === 2) {
      // 기간 파싱
      let daysCount = 0;
      if (raw.includes('당일')) {
        updatedDraft.durationLabel = '당일치기';
        daysCount = 1;
      } else if (raw.includes('2박 3일') || raw.includes('2박3일')) {
        updatedDraft.durationLabel = '2박 3일';
        daysCount = 3;
      } else if (raw.includes('3박 4일') || raw.includes('3박4일')) {
        updatedDraft.durationLabel = '3박 4일';
        daysCount = 4;
      } else if (raw.includes('1박 2일') || raw.includes('1박2일')) {
        updatedDraft.durationLabel = '1박 2일';
        daysCount = 2;
      } else {
        const ndMatch = raw.match(/(\d+)\s*박\s*(\d+)\s*일/);
        if (ndMatch) {
          updatedDraft.durationLabel = `${ndMatch[1]}박 ${ndMatch[2]}일`;
          daysCount = parseInt(ndMatch[2], 10);
        }
      }

      // 출발 시각 파싱 (HH:mm)
      const timeMatch = raw.match(/(오전|오후|아침|새벽|저녁|낮|밤)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/);
      if (timeMatch) {
        const meridiem = timeMatch[1] || '';
        let hour = parseInt(timeMatch[2], 10);
        const min = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
        if ((meridiem.includes('오후') || meridiem.includes('저녁') || meridiem.includes('밤')) && hour < 12) {
          hour += 12;
        } else if ((meridiem.includes('오전') || meridiem.includes('새벽') || meridiem.includes('아침')) && hour === 12) {
          hour = 0;
        }
        updatedDraft.departureTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      } else {
        const colonMatch = raw.match(/(\d{1,2}):(\d{2})/);
        if (colonMatch) {
          updatedDraft.departureTime = `${colonMatch[1].padStart(2, '0')}:${colonMatch[2]}`;
        }
      }

      // 출발 날짜 파싱
      const currentYear = new Date().getFullYear();
      const mdMatch = raw.match(/(\d{1,2})월\s*(\d{1,2})일/);
      if (mdMatch) {
        const m = String(parseInt(mdMatch[1], 10)).padStart(2, '0');
        const d = String(parseInt(mdMatch[2], 10)).padStart(2, '0');
        updatedDraft.startDate = `${currentYear}-${m}-${d}`;
      } else if (raw.includes('오늘')) {
        updatedDraft.startDate = new Date().toISOString().slice(0, 10);
      } else if (raw.includes('내일')) {
        const tm = new Date(Date.now() + 86400000);
        updatedDraft.startDate = tm.toISOString().slice(0, 10);
      } else if (raw.includes('모레')) {
        const mr = new Date(Date.now() + 86400000 * 2);
        updatedDraft.startDate = mr.toISOString().slice(0, 10);
      }

      // 종료일 계산
      if (updatedDraft.startDate && daysCount > 0) {
        const s = new Date(`${updatedDraft.startDate}T00:00:00`);
        const e = new Date(s.getTime() + (daysCount - 1) * 86400000);
        updatedDraft.endDate = e.toISOString().slice(0, 10);
      } else if (updatedDraft.startDate && !updatedDraft.endDate) {
        updatedDraft.endDate = updatedDraft.startDate;
      }

      // 세부 항목 누락 검증 (SELECT BOX가 없는 대화형 플래너의 핵심!)
      const missingList: string[] = [];
      if (!updatedDraft.startDate) missingList.push('출발 날짜(몇월 몇일)');
      if (!updatedDraft.durationLabel) missingList.push('여행 기간(당일치기, 1박 2일 등)');
      if (!updatedDraft.departureTime) missingList.push('출발 시각(몇 시 몇 분)');

      if (missingList.length > 0) {
        step = 2;
        const known: string[] = [];
        if (updatedDraft.startDate) known.push(`**${updatedDraft.startDate} 출발**`);
        if (updatedDraft.durationLabel) known.push(`**${updatedDraft.durationLabel}**`);
        if (updatedDraft.departureTime) known.push(`**${updatedDraft.departureTime} 출발**`);

        const prefix = known.length > 0 ? `${known.join(', ')} 일정을 확인했습니다! 😊\n\n` : '';
        reply = `${prefix}정확한 경로 탐색과 시간대별 식사/명소 추천을 위해, 아직 확인되지 않은 **${missingList.join(', ')}**을(를) 알려주세요!\n(예: '10월 28일 출발 1박 2일, 오전 9시 30분 출발')`;
      } else {
        step = 3;
        reply = `📅 **${updatedDraft.startDate} ~ ${updatedDraft.endDate} (${updatedDraft.durationLabel})**, **${updatedDraft.departureTime} 출발**로 일정을 완벽히 기록했습니다! ⏰🚗\n\n🚗 **3단계: 어떻게 이동할까요?**\n직접 자동차를 운전하시나요, 대중교통이나 도보를 이용하시나요?`;
      }
    } else if (step === 3) {
      if (raw.includes('대중교통') || raw.includes('버스') || raw.includes('기차') || raw.includes('지하철')) {
        updatedDraft.mode = 'transit';
      } else if (raw.includes('도보') || raw.includes('걸어') || raw.includes('산책')) {
        updatedDraft.mode = 'walking';
      } else {
        updatedDraft.mode = 'driving';
      }
      const modeText = updatedDraft.mode === 'driving' ? '자동차 운전' : updatedDraft.mode === 'transit' ? '대중교통' : '도보';
      reply = `이동 수단은 **${modeText}**(으)로 설정했습니다. 🚙\n\n🎯 **4단계: 길목에서 어떤 곳에 들르고 싶으세요?**\n원하시는 취향이나 방문 희망 장소를 자유롭게 말씀해 주세요. (예: '뷰 좋은 카페, 닭갈비 맛집, 힐링 자연 산책로' 등)\n💡 말씀해 주신 취향을 바탕으로 우리 시스템 추천 카테고리에 딱 맞게 자동 매핑해 드립니다!`;
      step = 4;
    } else if (step === 4) {
      updatedDraft.preferences = raw;

      // 취향 키워드 기반 DB 카테고리 자동 시맨틱 매핑
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
      if (raw.includes('카페') || raw.includes('디저트') || raw.includes('커피') || raw.includes('찻집') || raw.includes('빵')) {
        if (!selectedCategoryIds.includes(FOOD_ID)) selectedCategoryIds.push(FOOD_ID);
        categorySelections[FOOD_ID] = categorySelections[FOOD_ID] || [];
        categorySelections[FOOD_ID].push(CAFE_ID);
        categoryNames.push('카페/ 찻집');
      }

      // 맛집 / 한식 매핑
      if (raw.includes('맛집') || raw.includes('밥') || raw.includes('한식') || raw.includes('닭갈비') || raw.includes('고기') || raw.includes('막국수')) {
        if (!selectedCategoryIds.includes(FOOD_ID)) selectedCategoryIds.push(FOOD_ID);
        categorySelections[FOOD_ID] = categorySelections[FOOD_ID] || [];
        if (!categorySelections[FOOD_ID].includes(KOREAN_FOOD_ID)) {
          categorySelections[FOOD_ID].push(KOREAN_FOOD_ID);
        }
        categoryNames.push('한식(맛집)');
      }

      // 자연 / 힐링 / 공원 매핑
      if (raw.includes('자연') || raw.includes('휴양') || raw.includes('숲') || raw.includes('산책') || raw.includes('힐링') || raw.includes('쉼터')) {
        if (!selectedCategoryIds.includes(NATURE_ID)) selectedCategoryIds.push(NATURE_ID);
        categorySelections[NATURE_ID] = [FOREST_ID, PARK_ID];
        categoryNames.push('자연휴양림 & 자연공원');
      }

      // 문화 / 전시 매핑
      if (raw.includes('박물관') || raw.includes('미술관') || raw.includes('전시') || raw.includes('문화')) {
        if (!selectedCategoryIds.includes(CULTURE_ID)) selectedCategoryIds.push(CULTURE_ID);
        categoryNames.push('문화관광');
      }

      // 체험 / 액티비티 매핑
      if (raw.includes('체험') || raw.includes('액티비티') || raw.includes('레포츠')) {
        if (!selectedCategoryIds.includes(ACTIVITY_ID)) selectedCategoryIds.push(ACTIVITY_ID);
        categoryNames.push('체험관광');
      }

      // 기본 카테고리가 없으면 음식과 자연관광 기본 지정
      if (selectedCategoryIds.length === 0) {
        selectedCategoryIds.push(FOOD_ID, NATURE_ID);
        categorySelections[FOOD_ID] = [CAFE_ID, KOREAN_FOOD_ID];
        categorySelections[NATURE_ID] = [PARK_ID];
        categoryNames.push('카페/ 찻집', '한식(맛집)', '자연공원');
      }

      updatedDraft.selectedCategoryIds = selectedCategoryIds;
      updatedDraft.categorySelections = categorySelections;
      updatedDraft.categoryNames = categoryNames;

      const badgeStr = categoryNames.map((n) => `[${n}]`).join(' ');
      reply = `선호하시는 취향(**${raw}**)을 바탕으로 최적의 추천 카테고리를 자동 매핑했습니다! 🎯\n\n📌 **AI 자동 매핑 카테고리**: ${badgeStr}\n\n이제 여행 계획을 생성하기 위한 모든 조건이 완벽히 준비되었습니다! 🎉\n아래 요약 카드를 확인하시고 **[최적 경로 & 4구간 타임라인 생성하기]** 버튼을 눌러 일정을 완성하세요.`;
      step = 5;
    }

    return {
      reply,
      step,
      extracted: updatedDraft,
      isReady: step === 5,
      modelUsed: 'local-nlp-fallback',
    };
  }
}
