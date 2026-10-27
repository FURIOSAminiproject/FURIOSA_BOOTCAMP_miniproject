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

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Optional() @Inject(DataSource) private readonly dataSource?: DataSource,
  ) {}

  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const userMessage = (dto.message || dto.text || '').trim();
    if (!userMessage) {
      return {
        reply: '안녕하세요! 여행에 대해 궁금한 점이 있으시면 언제든 편하게 물어보세요. (예: "서울에서 부산 갈 때 12시 반 맛집 추천해줘")',
        modelUsed: 'local-fallback',
      };
    }

    // 1. DB(ai_model_config 테이블)에서 활성화된 Google 모델 및 API Key 우선 조회
    let apiKey = process.env.GEMINI_API_KEY;
    let rawModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

    if (this.dataSource) {
      try {
        // app_model_config 또는 ai_model_config 테이블에서 활성 설정 조회
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
          this.logger.log(`[DB 설정 로드 성공] Model: ${rawModel}, API Key 앞자리: ${apiKey?.slice(0, 10)}***`);
        }
      } catch (dbErr: any) {
        this.logger.warn(`DB 모델 설정 조회 실패: ${dbErr.message}. 환경변수 설정을 사용합니다.`);
      }
    }

    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is not configured in DB or environment.');
      return {
        reply: '안녕하세요! 현재 시스템에 GEMINI_API_KEY가 등록되지 않은 상태입니다. DB의 ai_model_config 테이블 또는 환경 설정을 확인해 주세요.',
        modelUsed: 'local-fallback',
      };
    }

    // 모델명 공백 및 대소문자 정규화
    const modelName = rawModel.toLowerCase().replace(/\s+/g, '-');

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

    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 30000 } });

    // 대화 내역(history) 구성
    const contents: any[] = [];
    contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
    contents.push({ role: 'model', parts: [{ text: '네, I like your J 전속 플래너로서 고객님의 완벽한 여행을 위해 일정 수정 및 코스 조율을 성심껏 도와드리겠습니다. 어떤 부분을 변경하고 싶으신가요?' }] });

    if (dto.history && Array.isArray(dto.history)) {
      for (const h of dto.history.slice(-8)) { // 최근 8개 턴 유지
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
}
