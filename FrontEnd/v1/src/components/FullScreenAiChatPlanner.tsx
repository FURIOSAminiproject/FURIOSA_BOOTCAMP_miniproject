import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  RotateCcw,
  Sparkles,
  MapPin,
  Calendar,
  Compass,
  ArrowRight,
  Clock,
  Car,
  Coffee,
  Utensils,
  Camera,
} from "lucide-react";
import { useTripWorkspace } from "./TripWorkspaceContext";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

interface FullScreenAiChatPlannerProps {
  onSwitchToPlanner: () => void;
}

const CATEGORY_PROMPTS = [
  {
    icon: Car,
    title: "1박 2일 로드트립",
    prompt: "서울에서 부산까지 1박 2일 운전해서 갈 건데, 고속도로 휴게소와 점심 맛집, 꼭 들러야 할 포토스팟 포함해서 완벽한 일정 짜줘!",
  },
  {
    icon: Coffee,
    title: "동해 바다뷰 힐링",
    prompt: "강릉과 속초 2박 3일 힐링 여행 일정 추천해줘. 바다가 보이는 오션뷰 카페와 현지인 생선구이 맛집 중심으로 부탁해.",
  },
  {
    icon: Camera,
    title: "경주 역사·야경",
    prompt: "아이와 함께 가는 경주 당일치기 코스 추천해줘. 불국사와 대릉원, 첨성대 야경까지 무리하지 않는 동선으로 부탁해.",
  },
  {
    icon: Utensils,
    title: "전라도 미식 로드",
    prompt: "전주 한옥마을과 여수 밤바다를 잇는 2박 3일 식도락 드라이브 코스 짜줘. 각 지역 대표 별미 맛집 추천도 꼭 포함해줘!",
  },
];

export function FullScreenAiChatPlanner({ onSwitchToPlanner }: FullScreenAiChatPlannerProps) {
  const { state } = useTripWorkspace();
  const { draft } = state;

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-planner",
      role: "model",
      text:
        "안녕하세요! 대한민국 전속 여행 큐레이터 **'길벗(RoadFriend)'**입니다. 🚗✨\n\n" +
        "어디로 떠나고 싶으신지, 며칠 일정인지, 혹은 특별히 원하시는 테마(맛집, 힐링, 카페, 아이 동반 등)를 편하게 말씀해 주세요.\n" +
        "출발부터 도착까지 실제 운전 경로와 식사 시간대를 고려한 **최적의 1:1 맞춤형 여행 코스**를 즉시 설계해 드립니다!",
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  // 스크롤 맨 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8).map((m) => ({
            role: m.role,
            content: m.text,
          })),
          context: {
            origin: draft.origin?.name,
            destination: draft.destination?.name,
            startDate: draft.startDate,
            endDate: draft.endDate,
            departureTime: draft.departureTime,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류 (${response.status})`);
      }

      const data = await response.json();
      const aiReply =
        data.reply || "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";

      const aiMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: "model",
        text: aiReply,
        timestamp: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "model",
        text: `네트워크 오류가 발생했습니다: ${err.message || "연결 상태를 확인해 주세요."}`,
        timestamp: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "model",
        text: "대화가 새로 시작되었습니다! 이번엔 어떤 여행을 계획해 볼까요? 원하시는 목적지나 일정을 편하게 말씀해 주세요. 😊",
        timestamp: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[750px] max-h-[82vh] rounded-3xl border border-stone-200 bg-white shadow-xl overflow-hidden animate-in fade-in duration-300">
      {/* 1. 상단 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-gradient-to-r from-[#064e43] via-[#085a4e] to-[#0a6659] text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs border border-white/20">
            <Bot className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base sm:text-lg tracking-tight">
                길벗 AI 전속 큐레이터 대화형 여행 플래너
              </h2>
              <span className="rounded-full bg-emerald-400/25 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                Gemini Flash-Lite
              </span>
            </div>
            <p className="text-xs text-emerald-100/80">
              말하듯 자연스럽게 질문하시면 소요 시간과 경로를 감안한 완벽한 코스를 설계해 드립니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetChat}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>대화 초기화</span>
          </button>
          <button
            type="button"
            onClick={onSwitchToPlanner}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#064e43] hover:bg-emerald-50 transition shadow-sm"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>지도 플래너로 가기</span>
          </button>
        </div>
      </div>

      {/* 2. 추천 빠른 질문 칩 바 */}
      <div className="px-6 py-3 bg-[#fbf9f5] border-b border-stone-200/80 flex items-center gap-2.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-xs font-bold text-stone-500 shrink-0 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
          추천 코스:
        </span>
        {CATEGORY_PROMPTS.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => void handleSend(cat.prompt)}
              className="shrink-0 flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs text-stone-700 hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-950 transition shadow-2xs disabled:opacity-40"
            >
              <Icon className="h-3.5 w-3.5 text-emerald-800" />
              <span>{cat.title}</span>
            </button>
          );
        })}
      </div>

      {/* 3. 대화 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-stone-50/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="flex items-start gap-2.5 max-w-[90%] sm:max-w-[82%]">
              {msg.role === "model" && (
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-[#064e43] text-white shadow-xs">
                  <Bot className="h-4 w-4 text-emerald-300" />
                </div>
              )}
              <div>
                <div
                  className={`rounded-2xl px-5 py-3.5 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words shadow-xs ${
                    msg.role === "user"
                      ? "bg-[#064e43] text-white rounded-br-xs"
                      : "bg-white text-stone-800 border border-stone-200/90 rounded-bl-xs"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="mt-1 block px-1 text-[11px] text-stone-400 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs sm:text-sm text-stone-600 bg-white border border-stone-200/90 rounded-2xl px-5 py-4 w-fit shadow-xs animate-pulse">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-ping" />
            <span>길벗 AI가 경로와 식사 시간대를 고려하여 최적의 여행 일정을 구성하고 있습니다…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. 메시지 입력 영역 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="flex items-center gap-3 p-4 bg-white border-t border-stone-200 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          disabled={isLoading}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="원하시는 여행지나 코스를 편하게 물어보세요… (예: '서울에서 부산 갈 때 12시 30분쯤 맛집 추천해줘')"
          className="flex-1 rounded-2xl border border-stone-300 bg-stone-50/60 px-5 py-3.5 text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="flex items-center gap-2 rounded-2xl bg-[#064e43] px-6 py-3.5 text-sm sm:text-base font-bold text-white transition hover:bg-[#085a4e] shadow-md hover:shadow-lg disabled:opacity-40"
        >
          <span>보내기</span>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
