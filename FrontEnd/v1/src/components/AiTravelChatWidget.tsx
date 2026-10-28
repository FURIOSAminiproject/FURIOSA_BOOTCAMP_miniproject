import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  MessageSquare,
  Send,
  X,
  Sparkles,
  MapPin,
  Clock,
  RotateCcw,
  Minimize2,
  ChevronDown,
  Wand2,
} from "lucide-react";
import { useTripWorkspace } from "./TripWorkspaceContext";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "🍽️ 점심 식사 장소를 다른 길목 맛집으로 바꿔줘",
  "☕ 이동 길목에 뷰 좋은 카페 하나 더 추가해줘",
  "⏰ 운전 피로를 줄이게 휴게소 정차 시간 늘려줘",
  "🏞️ 도착지 인근에 꼭 가볼 만한 명소로 변경해줘",
  "🔄 오후 일정을 1시간 늦춰서 여유롭게 재배치해줘",
  "🌿 가족과 함께 가기 좋은 한적한 쉼터 추천해줘",
];

export function AiTravelChatWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useTripWorkspace();
  const { draft, result } = state;

  // 결과 화면에서 방해되지 않도록 닫힌 상태로 시작
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "model",
      text:
        "안녕하세요! 완성된 여행 계획의 **AI 일정 수정 & 코스 조율 플래너**입니다. 🚗✨\n\n" +
        "현재 계획된 동선, 출발 시각, 식사 장소, 카페, 경유지 등을 변경하고 싶으시면 편하게 말씀해 주세요. 실시간으로 최적의 대안과 맞춤 수정을 도와드립니다!",
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  // 스크롤 자동 이동
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // 메인페이지('/', '/user') 및 신규 계획짜기('/trips/new', '/routes')에서는 숨기고,
  // 이미 생성된 계획 결과 화면('/trips', '/trips/archive')에서만 수정용으로 노출
  const isExcludedPage =
    location.pathname === "/" ||
    location.pathname === "/user" ||
    location.pathname.startsWith("/trips/new") ||
    location.pathname === "/routes";

  const isTripResultPage =
    !isExcludedPage &&
    (location.pathname === "/trips" ||
      location.pathname === "/trips/archive") &&
    Boolean(result);

  if (!isTripResultPage) return null;

  // 현재 사용자 여행 상태를 컨텍스트로 추출
  const originName = draft.origin?.name || result?.request?.points?.[0]?.name;
  const destinationName =
    draft.destination?.name || result?.request?.points?.[1]?.name;
  const hasTripContext = Boolean(originName && destinationName);

  const handleSendMessage = async (textToSend?: string) => {
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
      const timelineStops = result?.timeline?.stops || [];
      const timelineSummary =
        timelineStops.length > 0
          ? timelineStops
              .map(
                (s) =>
                  `${s.targetTime} [${s.label}]: 추천 ${
                    s.places
                      ?.slice(0, 2)
                      .map((p) => p.name)
                      .join(", ") || "없음"
                  }`,
              )
              .join(" | ")
          : undefined;

      const activeRoute =
        result?.comparison?.routes?.find(
          (r) => r.preference === state.active,
        ) || result?.comparison?.routes?.[0];
      const routeDistanceText = activeRoute?.route
        ? `${(activeRoute.route.distanceMeters / 1000).toFixed(1)}km`
        : undefined;
      const routeDurationText = activeRoute?.route
        ? `${Math.round(activeRoute.route.durationSeconds / 60)}분`
        : undefined;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.text,
          })),
          context: {
            origin: originName,
            destination: destinationName,
            startDate: draft.startDate,
            endDate: draft.endDate,
            departureTime: draft.departureTime,
            durationLabel: result?.durationLabel,
            mode: draft.mode === "driving" ? "자동차" : "도보",
            distanceText: routeDistanceText,
            durationText: routeDurationText,
            timelineSummary: timelineSummary,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류 (${response.status})`);
      }

      const data = await response.json();
      const aiReply =
        data.reply ||
        "죄송합니다. 답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";

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
        id: "welcome-msg-reset",
        role: "model",
        text: "대화가 초기화되었습니다. 일정 수정에 대해 무엇이든 말씀해 주세요! 😊",
        timestamp: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[99999] print:hidden font-sans pointer-events-auto">
      {/* 1. 플로팅 트리거 버튼 (창이 닫혀 있을 때) */}
      {!isOpen && (
        <div className="relative group">
          {hasTripContext && (
            <div className="absolute -top-10 right-0 whitespace-nowrap rounded-xl bg-stone-900/90 text-white text-[11px] font-medium px-3 py-1 shadow-lg backdrop-blur-xs flex items-center gap-1.5 animate-bounce">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span>AI 일정 수정 플래너 대기 중</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#064e43] to-[#0d7363] px-5 py-3.5 text-white shadow-2xl hover:shadow-emerald-900/40 transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-emerald-400/40"
            aria-label="I am your J AI 일정 수정 플래너 열기"
          >
            <div className="relative">
              <Bot className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
            </div>
            <span className="text-sm font-bold tracking-tight">
              AI 일정 수정·조율
            </span>
          </button>
        </div>
      )}

      {/* 2. 채팅 팝업 윈도우 */}
      {isOpen && (
        <div className="flex flex-col w-[360px] sm:w-[420px] h-[580px] max-h-[85vh] rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#064e43] via-[#085a4e] to-[#0a6659] text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs">
                <Bot className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm">
                    I am your J 일정 수정 플래너
                  </h3>
                  <span className="rounded-full bg-emerald-400/25 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                    Flash-Lite
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/90">
                  완성된 여행 일정 및 코스 실시간 수정·조율
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="대화 초기화"
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="창 닫기"
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 현재 선택된 여행 컨텍스트 배지 및 조건 직접 수정 링크 */}
          {hasTripContext && (
            <div className="flex items-center justify-between px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-[11px] text-emerald-900">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                <span className="font-medium truncate">
                  {originName} ➔ {destinationName}
                  {draft.startDate &&
                    ` (${draft.startDate.slice(5)} ~ ${draft.endDate.slice(5)})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/trips/new?mode=planner")}
                className="shrink-0 text-emerald-700 font-bold hover:text-emerald-900 hover:underline flex items-center gap-1 ml-2"
                title="입력 폼에서 직접 일정 조건 수정하기"
              >
                직접 수정 ➔
              </button>
            </div>
          )}

          {/* 메시지 본문 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === "user"
                      ? "bg-[#064e43] text-white rounded-br-xs shadow-xs"
                      : "bg-white text-stone-800 border border-stone-200/80 rounded-bl-xs shadow-xs"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="mt-1 px-1 text-[10px] text-stone-400 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* 로딩 인디케이터 */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-stone-500 bg-white border border-stone-200/80 rounded-2xl px-4 py-3 w-fit shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>AI 플래너가 최적의 수정안을 찾고 있어요…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 빠른 추천 질문 칩 (사용자가 클릭 시 즉시 질문) */}
          <div className="px-3 py-2 bg-white border-t border-stone-100 flex gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => void handleSendMessage(prompt)}
                className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] text-stone-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 transition disabled:opacity-40"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* 입력창 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className="flex items-center gap-2 p-3 bg-white border-t border-stone-200"
          >
            <input
              type="text"
              value={inputText}
              disabled={isLoading}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="여행이나 경로에 대해 물어보세요…"
              className="flex-1 rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#064e43] text-white transition hover:bg-[#085a4e] disabled:opacity-30 disabled:hover:bg-[#064e43]"
              aria-label="메시지 전송"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
