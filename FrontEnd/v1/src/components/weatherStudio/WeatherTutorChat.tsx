/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WEATHER_STUDIO_FAQS } from '../../services/weatherStudioService';
import { CloudSun, Sparkles, Send, Bot, User, BookOpen, ArrowRight, HelpCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'student' | 'weather_tutor';
  text: string;
  timestamp: string;
}

export const WeatherTutorChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      sender: 'weather_tutor',
      text: `안녕하세요, 학생 여러분! 길벗 AI 여행사의 기상 인공지능 연구실에 오신 것을 환영합니다! 🌤️

저는 **기상·기후 관리관 '날씨지기'**와 스튜디오 총괄 **지식전달관 '알고리'**입니다.

우리 연구실에서는 **LSTM(장단기 메모리) 게이트가 어떻게 10년치 기후를 기억하는지**, **앙상블 모델이 어떻게 개별 오차를 60% 이상 상쇄시키는지**, 그리고 **일교차·비 예보에 따라 여행 가방 체크리스트가 어떻게 자동 생성되는지**를 친절하게 배울 수 있습니다.

아래 추천 질문을 누르시거나, 궁금한 점을 편하게 질문해보세요!`,
      timestamp: '방금 전'
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSelectFaq = (faqId: string) => {
    const found = WEATHER_STUDIO_FAQS.find((q) => q.id === faqId);
    if (!found) return;

    const studentMsg: ChatMessage = {
      id: `s_${Date.now()}`,
      sender: 'student',
      text: found.question,
      timestamp: '방금 전'
    };
    setMessages((prev) => [...prev, studentMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const tutorMsg: ChatMessage = {
        id: `t_${Date.now()}`,
        sender: 'weather_tutor',
        text: found.answer,
        timestamp: '방금 전'
      };
      setMessages((prev) => [...prev, tutorMsg]);
      setIsTyping(false);
    }, 400);
  };

  const handleSendMessage = () => {
    if (!inputQuery.trim()) return;

    const q = inputQuery.trim();
    setInputQuery('');

    const studentMsg: ChatMessage = {
      id: `s_${Date.now()}`,
      sender: 'student',
      text: q,
      timestamp: '방금 전'
    };
    setMessages((prev) => [...prev, studentMsg]);
    setIsTyping(true);

    setTimeout(() => {
      let ans = '';

      if (q.includes('게이트') || q.includes('gate') || q.includes('Gate') || q.includes('망각')) {
        ans = `**LSTM 게이트의 핵심 요약:**
        
- **망각 게이트(Forget Gate, $f_t$):** 과거 계절 데이터 중 불필요한 단기 노이즈를 지우는 지우개 (Sigmoid로 0~1 결정)
- **입력 게이트(Input Gate, $i_t$):** 오늘 새로 들어온 기온/기압 변칙 중 장기 기억으로 편입할 비중을 고르는 형광펜
- **셀 상태(Cell State, $C_t$):** 덧셈($+$)으로만 이어져 10년 기억을 손실 없이 나르는 컨베이어 벨트
- **출력 게이트(Output Gate, $o_t$):** 내일 여행자에게 안내할 최저/최고 기온만 추출하는 필터`;
      } else if (q.includes('앙상블') || q.includes('ensemble') || q.includes('Ensemble')) {
        ans = `**앙상블 모델이 오차를 줄이는 원리:**

단일 딥러닝 모델은 과적합(Overfitting)이나 예상치 못한 이상 기상에 흔들리기 쉽습니다.

길벗 AI는:
1. **10년 평년 통계 모델(안정적 기저값)**
2. **Bi-LSTM(비선형 시계열 추세)**
3. **XGBoost(이상 기후 변칙 포착)**
4. **실시간 AWS 센서(현재 체감 보정)**
4개 모델을 가중 평균($\\hat{Y} = \\sum w_i M_i$)하여, 개별 모델의 오차 분산을 약 50~65% 상쇄시킵니다!`;
      } else if (q.includes('일교차') || q.includes('준비물') || q.includes('짐싸기')) {
        ans = `**일교차와 짐싸기 체크리스트의 AI 연동:**

LSTM 앙상블 모델이 최고기온($T_{max}$)과 최저기온($T_{min}$)을 예측하면,
$\\Delta T = T_{max} - T_{min} \\ge 9.0^\\circ\\text{C}$ 일 때 시스템이 자동으로 \`[일교차 주의보]\`를 발령합니다.

이때 여행 일정표에:
- '아침/저녁용 레이어드 카디건'
- '해안가 방풍 윈드브레이커'
- '자외선 차단 선글라스'
등이 자동 추천으로 즉각 추가됩니다.`;
      } else {
        ans = `질문해주신 **"${q}"**에 대한 답변입니다.

기상 시계열 예측은 끊임없이 변화하는 대기의 비선형적 물리 방정식을 딥러닝으로 근사하는 매우 흥미로운 분야입니다.

- **게이트 시뮬레이터 탭:** $f_t, i_t, C_t$ 수치 변화를 직접 슬라이더로 조작해 보세요.
- **앙상블 랩 탭:** 모델별 가중치를 바꾸며 오차 분산 감소율을 확인해 보세요.
- **코드 랩 탭:** 실제 PyTorch 신경망 클래스 코드를 바로 실행해 보실 수 있습니다.

추가로 궁금한 수식이나 구현 원리가 있다면 언제든 편하게 물어보세요!`;
      }

      const tutorMsg: ChatMessage = {
        id: `t_${Date.now()}`,
        sender: 'weather_tutor',
        text: ans,
        timestamp: '방금 전'
      };
      setMessages((prev) => [...prev, tutorMsg]);
      setIsTyping(false);
    }, 450);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-teal-700 text-white flex items-center justify-center shadow-md">
            <CloudSun className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold">
              <span>기상 AI 교육 튜터</span>
              <span>·</span>
              <span className="text-emerald-700">학생 연구실 온라인</span>
            </div>
            <h3 className="text-xl font-extrabold text-stone-900">
              기상관리관 &amp; 알고리의 기상 딥러닝 1:1 대화형 튜터
            </h3>
            <p className="text-xs text-stone-600">
              LSTM 게이트 동작 원리, 앙상블 오차 상쇄, 10개년 기상 빅데이터에 대해 무엇이든 질문하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Suggested FAQ Chips */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-sky-600" />
          <span>학생 추천 질문 (클릭 시 상세 해설):</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {WEATHER_STUDIO_FAQS.map((faq) => (
            <button
              key={faq.id}
              onClick={() => handleSelectFaq(faq.id)}
              className="text-xs px-3 py-1.5 rounded-xl bg-sky-50/70 hover:bg-sky-100 text-sky-950 border border-sky-200/70 font-semibold text-left transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>{faq.question}</span>
              <ArrowRight className="w-3 h-3 text-sky-600 shrink-0" />
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
              m.sender === 'student' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                m.sender === 'student'
                  ? 'bg-stone-900 text-white'
                  : 'bg-sky-700 text-white'
              }`}
            >
              {m.sender === 'student' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                m.sender === 'student'
                  ? 'bg-stone-900 text-white rounded-tr-none'
                  : 'bg-white text-stone-800 border border-stone-200/80 shadow-2xs rounded-tl-none space-y-2'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] opacity-70 mb-1 border-b border-stone-100 pb-1">
                <span className="font-bold">
                  {m.sender === 'student' ? '학생 (Learner)' : "기상 AI 튜터 '날씨지기'"}
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
            <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping" />
            <span>기상 AI 튜터가 수식과 쉬운 일상 비유를 준비하고 있습니다...</span>
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
          placeholder="기상 딥러닝 질문을 입력하세요 (예: 왜 셀 상태는 곱셈이 아니라 덧셈으로만 이뤄져 있나요?)"
          className="flex-1 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputQuery.trim() || isTyping}
          className="px-5 py-3 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">질문하기</span>
        </button>
      </div>
    </div>
  );
};
