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
    mode?: 'driving' | 'transit' | 'walking' | null;
    preferences?: string | null;
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

    const systemInstruction = `당신은 여행 플랫폼 'I like your J'의 [대화형 AI 여행 설계 플래너]입니다.
사용자와 자연스럽고 친절하게 대화하면서 다음 4가지 여행 조건을 순서대로 파악하는 임무를 맡고 있습니다.

[필수 수집 조건 4단계]
1단계. 출발지와 도착지 (originName, destinationName)
   - 예: "서울부터 강원도 춘천" -> originName: "서울", destinationName: "강원도 춘천"
   - 지명 뒤에 붙은 조사(~부터, ~에서, ~까지, ~으로 등)를 깔끔하게 제거한 실제 지명/장소명을 추출하세요. 도/시/군/구(예: 강원도 춘천, 부산 해운대 등)가 포함된 경우 잘리지 않게 완전한 지명으로 추출하세요.
2단계. 여행 기간과 출발 시각 (durationLabel, departureTime)
   - 기간: 당일치기, 1박 2일, 2박 3일 등
   - 출발 시각: HH:mm 형식 (예: 09:30, 08:00, 10:00 등)
   - [중요!] 사용자가 아직 기간이나 출발 시각을 구체적으로 말하지 않았다면 절대로 임의로 '1박 2일'이나 '09:30' 같은 기본값을 확정짓지 말고, 친절하게 기간과 시각을 다시 물어보세요!
3단계. 이동 수단 (mode: "driving" | "transit" | "walking")
   - 자동차 운전: "driving", 대중교통: "transit", 도보: "walking"
4단계. 선호 장소/취향 (preferences)
   - 예: 도로변 맛집, 오션뷰 카페, 힐링 명소, 사진 명소 등

[사용자의 정정 및 변경 발언 처리 - 가장 중요]
- 사용자가 "다시 말할게", "아니 도착지는 춘천이야", "출발지 바꿀래" 등 이전 단계를 정정하는 말을 하면:
  1) 사용자가 정정한 필드(예: destinationName)를 즉시 새 값으로 업데이트하세요.
  2) 기존에 이미 파악해 둔 다른 필드(예: originName)는 그대로 유지하세요.
  3) "도착지를 춘천으로 수정했습니다!"처럼 친절히 확인해 준 뒤, 아직 수집되지 않은 다음 단계 정보를 질문하세요.
  4) 사용자가 언급하지 않은 시각이나 기간을 지어내서 확정하지 마세요.

[현재까지 파악된 여행 조건]
- 출발지(originName): ${currentDraft.originName || '(미정)'}
- 도착지(destinationName): ${currentDraft.destinationName || '(미정)'}
- 여행기간(durationLabel): ${currentDraft.durationLabel || '(미정)'}
- 출발시각(departureTime): ${currentDraft.departureTime || '(미정)'}
- 이동수단(mode): ${currentDraft.mode || '(미정)'}
- 선호취향(preferences): ${currentDraft.preferences || '(미정)'}
- 현재 진행 단계: ${currentStep}단계

[응답 포맷 규칙]
반드시 다음 JSON 형식으로만 응답해야 합니다. 마크다운 코드블록(\`\`\`json) 없이 순수 JSON 문자열만 출력하세요:
{
  "reply": "사용자에게 전할 친절하고 정중한 마크다운 대화 답변 (이모지와 볼드체 활용, 파악/수정된 내용 확인 및 다음 단계 질문 안내)",
  "step": 1 | 2 | 3 | 4 | 5,
  "extracted": {
    "originName": "파악되거나 유지된 출발지 (없으면 null)",
    "destinationName": "파악되거나 유지된 도착지 (없으면 null)",
    "durationLabel": "파악되거나 유지된 기간 (없으면 null)",
    "departureTime": "파악되거나 유지된 출발시각 HH:mm (없으면 null)",
    "mode": "driving | transit | walking (없으면 null)",
    "preferences": "파악되거나 유지된 취향 (없으면 null)"
  },
  "isReady": boolean (4가지 조건이 모두 충족되어 5단계가 되었을 때만 true, 아니면 false)
}`;

    const contents: any[] = [];
    contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
    contents.push({ role: 'model', parts: [{ text: '{"reply": "네! I like your J 전속 플래너로서 여행 설계를 시작하겠습니다.", "step": 1, "extracted": {}, "isReady": false}' }] });

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
          durationLabel: parsed.extracted?.durationLabel || currentDraft.durationLabel || null,
          departureTime: parsed.extracted?.departureTime || currentDraft.departureTime || null,
          mode: parsed.extracted?.mode || currentDraft.mode || null,
          preferences: parsed.extracted?.preferences || currentDraft.preferences || null,
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

    // 사용자의 정정 감지
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
        reply = `도착지를 **${updatedDraft.destinationName}**(으)로 수정했습니다! 🚗\n\n여행 기간(당일치기, 1박 2일 등)과 출발 시각을 알려주세요.`;
        step = 2;
      } else if (origMatch) {
        updatedDraft.originName = clean(origMatch[1]);
        reply = `출발지를 **${updatedDraft.originName}**(으)로 수정했습니다! 🚗\n\n여행 기간(당일치기, 1박 2일 등)과 출발 시각을 알려주세요.`;
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
        reply = `네! **${updatedDraft.originName}**에서 출발하여 **${updatedDraft.destinationName}**(으)로 떠나는 여정으로 확인했습니다. 🛣️\n\n📅 **2단계: 여행 기간은 며칠이고, 몇 시에 출발하시나요?**\n(예: '1박 2일 오전 10시 출발')`;
        step = 2;
      }
    } else if (step === 2) {
      if (raw.includes('당일')) updatedDraft.durationLabel = '당일치기';
      else if (raw.includes('2박 3일') || raw.includes('2박3일')) updatedDraft.durationLabel = '2박 3일';
      else if (raw.includes('3박 4일') || raw.includes('3박4일')) updatedDraft.durationLabel = '3박 4일';
      else if (raw.includes('1박 2일') || raw.includes('1박2일')) updatedDraft.durationLabel = '1박 2일';

      const timeMatch = raw.match(/(\d{1,2})시(?:\s*(\d{1,2})분)?/);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1], 10);
        const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        if (raw.includes('오후') && hour < 12) hour += 12;
        updatedDraft.departureTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      }

      if (!updatedDraft.durationLabel && !updatedDraft.departureTime) {
        reply = `여행 기간(당일치기, 1박 2일 등)과 대략적인 출발 시각을 말씀해 주세요! ⏰`;
        step = 2;
      } else {
        const parts = [];
        if (updatedDraft.durationLabel) parts.push(`**${updatedDraft.durationLabel}**`);
        if (updatedDraft.departureTime) parts.push(`**${updatedDraft.departureTime} 출발**`);
        reply = `${parts.join(', ')} 일정을 확인했습니다. ⏰\n\n🚗 **3단계: 어떻게 이동할까요?**\n직접 운전하시나요, 대중교통을 이용하시나요?`;
        step = 3;
      }
    } else if (step === 3) {
      if (raw.includes('대중교통') || raw.includes('버스') || raw.includes('기차')) {
        updatedDraft.mode = 'transit';
      } else if (raw.includes('도보') || raw.includes('걸어')) {
        updatedDraft.mode = 'walking';
      } else {
        updatedDraft.mode = 'driving';
      }
      reply = `이동 수단 설정을 완료했습니다. 🚙\n\n🎯 **4단계: 길목에서 어떤 곳에 들르고 싶으세요?**\n도로변 맛집, 오션뷰 카페, 힐링 명소 등 취향을 편하게 말씀해 주세요.`;
      step = 4;
    } else if (step === 4) {
      updatedDraft.preferences = raw;
      reply = `선호하시는 테마(**${raw}**)까지 모든 조건이 완벽하게 정리되었습니다! 🎉\n\n아래 [최적 경로 & 4구간 타임라인 생성하기] 버튼을 눌러 일정을 완성하세요.`;
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
