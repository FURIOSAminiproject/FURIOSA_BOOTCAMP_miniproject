import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, Send, X, Sparkles, MapPin, RotateCcw } from "lucide-react";
import { useTripWorkspace } from "./TripWorkspaceContext";
import { parseDestinationItinerary } from "../services/route-explorer";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

const welcomeMessage = (): ChatMessage => ({
  id: `welcome-msg-${Date.now()}`,
  role: "model",
  text:
    "안녕하세요! 도착 후 날짜별 일정을 수정하는 AI 플래너입니다.\n\n" +
    "관광·식사·카페 방문 장소와 시각을 바꾸고 싶다면 말씀해 주세요. 반영되면 위의 일정 카드도 함께 바뀝니다. 경로와 출발 조건은 조건 수정 화면에서 바꿀 수 있어요.",
  timestamp: new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }),
});

const QUICK_PROMPTS = [
  "🍽️ 첫날 점심 식당을 다른 후보로 바꿔줘",
  "☕ 둘째 날 오후에 카페를 추가해줘",
  "🏞️ 마지막 날 명소를 다른 곳으로 바꿔줘",
  "🔄 첫날 오후 일정을 1시간 늦춰줘",
  "🌿 방문 장소를 줄여서 여유롭게 바꿔줘",
];

export function AiTravelChatWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useTripWorkspace();
  const { draft, result } = state;

  // 결과 화면에서 방해되지 않도록 닫힌 상태로 시작
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const resultRef = useRef(result);
  resultRef.current = result;
  const tripRequestRef = useRef(result?.request);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    welcomeMessage(),
  ]);

  useEffect(() => {
    if (!result) {
      requestRef.current?.abort();
      requestRef.current = null;
      setIsLoading(false);
      setIsOpen(false);
      setMessages([welcomeMessage()]);
    } else if (
      tripRequestRef.current &&
      tripRequestRef.current !== result.request
    ) {
      requestRef.current?.abort();
      requestRef.current = null;
      setIsLoading(false);
      setIsOpen(false);
      setMessages([welcomeMessage()]);
    }
    tripRequestRef.current = result?.request;
  }, [result]);

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
    Boolean(result?.destinationItinerary);

  useEffect(() => {
    if (!isTripResultPage) {
      requestRef.current?.abort();
      requestRef.current = null;
      setIsLoading(false);
    }
  }, [isTripResultPage]);

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
    const baseResult = result;
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      if (!baseResult?.destinationItinerary)
        throw new Error(
          "수정할 도착 후 일정이 없습니다. 여행 조건 화면에서 다시 생성해 주세요.",
        );
      const destination = baseResult.request.points.at(-1);
      if (!destination) throw new Error("도착지 정보가 없습니다.");
      const response = await fetch("/api/chat/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          history: messages
            .filter((m) => !m.id.startsWith("welcome-msg"))
            .slice(-6)
            .map((m) => ({
              role: m.role,
              content: m.text,
            })),
          itinerary: baseResult.destinationItinerary,
          destination: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
          mode: baseResult.request.mode,
        }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류 (${response.status})`);
      }

      const data: unknown = await response.json();
      if (
        !data ||
        typeof data !== "object" ||
        !("changed" in data) ||
        !("reply" in data) ||
        typeof data.changed !== "boolean" ||
        typeof data.reply !== "string"
      )
        throw new Error("서버의 일정 수정 응답 형식이 올바르지 않습니다.");
      if (controller.signal.aborted || resultRef.current !== baseResult) return;
      if (data.changed) {
        if (!("itinerary" in data)) throw new Error("수정된 일정이 없습니다.");
        const revised = parseDestinationItinerary(data.itinerary);
        if (
          revised.days.length !== baseResult.destinationItinerary.days.length ||
          revised.days.some(
            (day, index) =>
              day.date !== baseResult.destinationItinerary!.days[index].date,
          )
        )
          throw new Error("수정된 일정의 날짜가 기존 여행과 다릅니다.");
        dispatch({
          type: "revise-itinerary",
          base: baseResult,
          itinerary: revised,
        });
      }
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
      if (controller.signal.aborted) return;
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "model",
        text: `일정 수정 오류: ${err.message || "연결 상태를 확인해 주세요."}`,
        timestamp: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleResetChat = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsLoading(false);
    setInputText("");
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
              <span>도착 후 일정 수정 플래너</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#064e43] to-[#0d7363] px-5 py-3.5 text-white shadow-2xl hover:shadow-emerald-900/40 transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-emerald-400/40"
            aria-label="I am your J 도착 후 일정 수정 플래너 열기"
          >
            <div className="relative">
              <Bot className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
            </div>
            <span className="text-sm font-bold tracking-tight">
              AI 도착 후 일정 수정
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
                  도착 후 날짜별 방문 장소·시각 수정
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
            {QUICK_PROMPTS.filter(
              (prompt) =>
                (result?.destinationItinerary?.days.length || 0) > 1 ||
                !prompt.includes("둘째 날"),
            ).map((prompt, idx) => (
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
