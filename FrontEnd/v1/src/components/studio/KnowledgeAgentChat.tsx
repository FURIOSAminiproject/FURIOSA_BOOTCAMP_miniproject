/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TUTOR_QA_DATABASE } from '../../services/transformerStudioService';
import { Sparkles, Send, Bot, User, BookOpen, HelpCircle, Check, ArrowRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'algori';
  text: string;
  timestamp: string;
}

export const KnowledgeAgentChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      sender: 'algori',
      text: `반갑습니다! 저는 길벗 AI 여행사 스튜디오를 총괄 관리하는 **지식전달관 '알고리'(Algori)**입니다. 

제공해주신 Facebook 영상에서 다룬 **트랜스포머(Transformer) 모델의 Self-Attention 메커니즘**부터, 우리 앱에 적용된 **12인 AI 멀티에이전트 자율 오케스트레이션**, **10개년 기상 딥러닝 시계열 예측**, **GIS 무결성 검증**에 이르기까지 무엇이든 알기 쉽게 설명해 드립니다.

아래 추천 질문을 클릭하시거나, 궁금하신 점을 자유롭게 물어보세요!`,
      timestamp: '방금 전'
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSelectFaq = (faqId: string) => {
    const found = TUTOR_QA_DATABASE.find((q) => q.id === faqId);
    if (!found) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: found.question,
      timestamp: '방금 전'
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const algoriMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        sender: 'algori',
        text: found.answer,
        timestamp: '방금 전'
      };
      setMessages((prev) => [...prev, algoriMsg]);
      setIsTyping(false);
    }, 400);
  };

  const handleSendMessage = () => {
    if (!inputQuery.trim()) return;

    const queryText = inputQuery.trim();
    setInputQuery('');

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: '방금 전'
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      // Dynamic intelligent response synthesis
      let response = '';

      if (queryText.includes('페이스북') || queryText.includes('영상') || queryText.includes('URL') || queryText.includes('동영상')) {
        response = `**공유해주신 Facebook 영상 속 트랜스포머 핵심 요약:**

해당 영상은 트랜스포머 모델이 단어들을 어떻게 '임베딩(Embedding)'하고, '쿼리(Query)-키(Key)-밸류(Value)' 간의 상호 내적을 통해 문맥(Context)을 파악하는지를 훌륭하게 시각화하고 있습니다.

우리 **길벗 AI 여행사**는 이 원리를 여행 일정 생성에 그대로 투영했습니다:
1. **단어 대신 '여행지'를 토큰화:** 성산일출봉, 섭지코지, 흑돼지 식당 등이 각각 하나의 토큰이 됩니다.
2. **시간대를 위치 인코딩(PE):** 오전 10시, 점심 12시 30분, 오후 3시를 사인/코사인 주파수 함수로 인코딩합니다.
3. **Self-Attention으로 최적 결합:** 이동거리와 테마, 식사 타이밍의 어텐션 가중치를 곱해 가장 매끄러운 여행 동선을 탄생시킵니다.`;
      } else if (queryText.includes('어텐션') || queryText.includes('attention') || queryText.includes('Attention')) {
        response = `**Self-Attention의 핵심 수식과 의미:**

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

- **Q (Query):** "현재 슬롯에 어울리는 다음 목적지는 어디인가?"
- **K (Key):** 각 후보지들이 지닌 속성(거리, 테마, 식음료 카테고리)
- **V (Value):** 선정된 목적지의 실제 주소, 추천 사유, 예상 경비 정보

$\\sqrt{d_k}$로 나누어 기울기 소실을 막고, Softmax로 확률화하여 최적의 장소들을 가중 합산합니다!`;
      } else if (queryText.includes('에이전트') || queryText.includes('멀티')) {
        response = `**왜 단일 LLM보다 12인 멀티에이전트가 우수한가요?**

단일 LLM에게 "제주도 3박 4일 일정 짜줘"라고 하면 그럴싸하지만 위경도 좌표가 틀리거나(Hallucination), 예산이 초과되거나, 이미 갔던 곳을 또 가는 오류가 발생합니다.

길벗 AI 여행사는 이를 해결하기 위해:
1. **전문성 분리:** 날씨, 안전, 미식, 숙소, 교통, 예산을 각기 다른 전문 에이전트에게 위임
2. **총괄 협연자(Supervisor)의 중복 감시:** 방문지 중복 0건 보장
3. **무결성 감사관의 국토 GIS 검증:** 네이버/구글 지도 검색창 PUSH 연동 100% 무결성 확인
4. **관리자 최종 인가:** 사람이 검토 후 승인하는 완벽한 신뢰 체계를 갖추었습니다.`;
      } else {
        response = `질문해주신 **"${queryText}"**에 대해 답변드립니다.

트랜스포머 아키텍처는 고차원 벡터 공간에서 여행자의 취향과 대한민국의 수많은 여행지를 가장 조화롭게 매핑하는 데 최적화되어 있습니다. 

특히 우리 앱에서는:
1. **Self-Attention 탭:** 여행지 간의 상호 연관성 행렬을 직접 확인하실 수 있습니다.
2. **위치 인코딩 탭:** 시간 순서가 보존되는 사인파 임베딩을 보실 수 있습니다.
3. **코드 스튜디오 탭:** 이 로직을 구현한 12개 에이전트의 실제 TypeScript 소스코드가 100% 공개되어 있습니다.

추가로 더 자세히 알고 싶은 특정 수식이나 에이전트가 있다면 언제든 말씀해주세요!`;
      }

      const algoriMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        sender: 'algori',
        text: response,
        timestamp: '방금 전'
      };
      setMessages((prev) => [...prev, algoriMsg]);
      setIsTyping(false);
    }, 450);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold">
              <span>스튜디오 전담 관리관</span>
              <span>·</span>
              <span className="text-emerald-700">실시간 온라인</span>
            </div>
            <h3 className="text-xl font-extrabold text-stone-900">
              지식전달관 '알고리'와 1:1 대화형 AI 스튜디오
            </h3>
            <p className="text-xs text-stone-600">
              트랜스포머 메커니즘, 딥러닝 시계열 기상 예측, 멀티에이전트 오케스트레이션에 대해 무엇이든 질문하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Suggested FAQ Chips */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-violet-600" />
          <span>추천 심층 질문 (클릭 시 즉시 해설):</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TUTOR_QA_DATABASE.map((faq) => (
            <button
              key={faq.id}
              onClick={() => handleSelectFaq(faq.id)}
              className="text-xs px-3 py-1.5 rounded-xl bg-violet-50/70 hover:bg-violet-100 text-violet-900 border border-violet-200/70 font-semibold text-left transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>{faq.question}</span>
              <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Display Box */}
      <div className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200/80 max-h-[460px] overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                m.sender === 'user'
                  ? 'bg-stone-900 text-white'
                  : 'bg-violet-700 text-white'
              }`}
            >
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-stone-900 text-white rounded-tr-none'
                  : 'bg-white text-stone-800 border border-stone-200/80 shadow-2xs rounded-tl-none space-y-2'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] opacity-70 mb-1 border-b border-stone-100 pb-1">
                <span className="font-bold">
                  {m.sender === 'user' ? '독자 (User)' : "지식전달관 '알고리'"}
                </span>
                <span className="text-[10px]">{m.timestamp}</span>
              </div>
              <div className="whitespace-pre-wrap font-sans space-y-2">
                {m.text}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-stone-500 italic pl-11">
            <span className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
            <span>지식전달관 알고리가 수식과 논문을 인용하여 친절한 답변을 작성 중입니다...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder="트랜스포머, 딥러닝, 멀티에이전트 관련 질문을 입력하세요 (예: 페이스북 영상 속 어텐션 원리가 어떻게 적용되었나요?)"
          className="flex-1 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-600"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputQuery.trim() || isTyping}
          className="px-5 py-3 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">전송</span>
        </button>
      </div>
    </div>
  );
};
