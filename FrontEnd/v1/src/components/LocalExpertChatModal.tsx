/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, User } from 'lucide-react';
import { FullTravelPlan } from '../types/travel';
import { getLocalExpertFallback } from '../services/localExpertData';

interface LocalExpertChatModalProps {
  plan: FullTravelPlan;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'AGENT' | 'USER';
  text: string;
  timestamp: string;
}

export const LocalExpertChatModal: React.FC<LocalExpertChatModalProps> = ({
  plan,
  isOpen,
  onClose
}) => {
  const destination = plan.request.destination;
  const isJeju = destination.includes('제주');
  const isGyeongju = destination.includes('경주');
  const isGangneung = destination.includes('강릉') || destination.includes('속초');
  const isBusan = destination.includes('부산');

  const expertTitle = isJeju
    ? '제주 토박이 로컬 큐레이터 & 24시 안심 비상대응관'
    : isGyeongju
    ? '경주 역사문화 해설사 & 안심 비상대응관'
    : isGangneung
    ? '강원 동해안 로컬 마스터 & 해양안전 대응관'
    : isBusan
    ? '부산 해양문화 큐레이터 & 24시 안심 대응관'
    : `${destination} 현지 로컬 전문가 & 비상대응관`;

  const initialGreeting = isJeju
    ? `혼저옵서예! ${plan.request.clientName}님, 제주 전담 로컬 전문가이자 24시 안심 대응관입니다. 제주 고유의 풍습, 현지 식당 에티켓, 숨은 비경부터 응급 상황 대처까지 무엇이든 편안하게 물어보세요!`
    : isGyeongju
    ? `반갑습니다, ${plan.request.clientName}님! 천년고도 경주 현지 전문 에이전트입니다. 고즈넉한 한옥 문화재 관람 예절, 로컬 맛집 숨은 팁, 야간 보행 안전과 응급실 비상망까지 친절히 안내해 드리겠습니다.`
    : isGangneung
    ? `반갑습니다, ${plan.request.clientName}님! 강원 동해안 로컬 전문가입니다. 시원한 바다 비경과 초당 순두부 미식 에티켓, 해안 안전 수칙까지 꼼꼼하게 도와드리겠습니다.`
    : `반갑습니다, ${plan.request.clientName}님! ${destination} 현지 로컬 마스터입니다. 지역 특유의 문화와 에티켓, 이동 꿀팁, 만약의 비상 상황 대처법까지 즉시 답변해 드립니다.`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'AGENT',
      text: initialGreeting,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const presetQuestions = [
    '현지 식사 시 꼭 알아야 할 에티켓이나 예약 팁은?',
    '야간에 갑작스러운 부상이나 응급상황 시 행동 요령은?',
    '현지인들만 아는 숨은 조망 포인트나 포토스팟이 있나요?',
    '이 지역 고유의 문화나 풍습, 주의할 점을 알려주세요'
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'USER',
      text,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      let agentReplyText = '';

      // Try server-side Gemini API proxy route
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            destination,
            clientName: plan.request.clientName,
            startDate: plan.request.startDate,
            endDate: plan.request.endDate,
            style: plan.request.style
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.reply && typeof data.reply === 'string') {
            agentReplyText = data.reply.trim();
          }
        }
      } catch {
        // Fetch failed or server offline; seamlessly fall back to local expert engine
      }

      // Intelligent regional fallback if no server reply
      if (!agentReplyText) {
        agentReplyText = getLocalExpertFallback(text, destination);
      }

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'AGENT',
        text: agentReplyText,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `agent-fallback-${Date.now()}`,
        sender: 'AGENT',
        text: getLocalExpertFallback(text, destination),
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full h-[620px] shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#064e43] to-[#0a6657] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  {destination} 1:1 로컬 전문가 & 비상 에이전트 챗
                </h3>
              </div>
              <p className="text-[11px] text-emerald-100 font-light mt-0.5">
                {expertTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Preset Question Chips */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 overflow-x-auto scrollbar-none flex items-center gap-2">
          <span className="text-[11px] font-bold text-stone-500 shrink-0">추천 질문:</span>
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-[#064e43] hover:text-white border border-stone-200 text-stone-700 text-xs shrink-0 transition-all font-medium shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-stone-100/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 max-w-[85%] ${
                msg.sender === 'USER' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === 'USER'
                    ? 'bg-amber-600 text-white'
                    : 'bg-[#064e43] text-white shadow-xs'
                }`}
              >
                {msg.sender === 'USER' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>

              <div>
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'USER'
                      ? 'bg-amber-700 text-white rounded-tr-none shadow-xs'
                      : 'bg-white text-stone-800 border border-stone-200 rounded-tl-none shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>
                <div
                  className={`text-[10px] text-stone-400 mt-1 ${
                    msg.sender === 'USER' ? 'text-right' : 'text-left'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 mr-auto">
              <div className="w-8 h-8 rounded-full bg-[#064e43] text-white flex items-center justify-center shrink-0 text-xs">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-stone-200 rounded-tl-none text-xs text-stone-500 flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>현지 전문가 에이전트가 맞춤 답변을 작성 중입니다...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 sm:p-4 bg-white border-t border-stone-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`${destination}의 문화, 맛집 팁, 비상 프로토콜에 대해 물어보세요...`}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#064e43] bg-stone-50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="px-5 py-2.5 rounded-2xl bg-[#064e43] hover:bg-[#085f52] text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">전송</span>
          </button>
        </form>
      </div>
    </div>
  );
};
