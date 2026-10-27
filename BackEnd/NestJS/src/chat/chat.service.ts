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
        const rows = await this.dataSource.query(
          `SELECT model_name, api_key FROM ai_model_config WHERE is_active = true AND provider = 'google' ORDER BY id DESC LIMIT 1`,
        );
        if (rows && rows.length > 0) {
          if (rows[0].api_key) apiKey = String(rows[0].api_key).trim();
          if (rows[0].model_name) rawModel = String(rows[0].model_name).trim();
        }
      } catch (dbErr: any) {
        this.logger.warn(`ai_model_config DB 조회 실패: ${dbErr.message}. 환경변수 설정을 사용합니다.`);
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
    }

    const systemInstruction = `당신은 대한민국 최고 수준의 지능형 여행 플랫폼 '길벗 AI 여행사'의 전속 여행 큐레이터 에이전트 '길벗(RoadFriend)'입니다.
다음 원칙을 지켜 답변하세요:
1. 사용자가 질문하는 여행지, 이동 경로, 도로변 맛집, 휴게소, 숙소, 여행 일정에 대해 매우 친절하고 전문적이며 위트 있게 답변하세요.
2. 운전자의 이동 경로와 소요 시간을 현실적으로 고려하세요. (예: 9시 30분 출발 시 12시 30분쯤 통과하는 지역을 감안한 맛집 제안 등)
3. 답변은 읽기 편하게 깔끔한 마크다운(강조, 불릿 포인트 등)을 사용하세요.
4. 너무 장황하지 않게 핵심을 짚어 3~5문단 내외로 명확하게 작성하세요.
${contextLines.length ? `\n[사용자의 현재 여행 계획 정보]\n${contextLines.join('\n')}` : ''}`;

    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 30000 } });

    // 대화 내역(history) 구성
    const contents: any[] = [];
    contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
    contents.push({ role: 'model', parts: [{ text: '네, 길벗 AI 전속 큐레이터로서 고객님의 완벽한 여행을 위해 성심껏 안내해 드리겠습니다. 무엇이 궁금하신가요?' }] });

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
