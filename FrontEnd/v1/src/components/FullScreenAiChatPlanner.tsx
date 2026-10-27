import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  CheckCircle2,
  Check,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useTripWorkspace } from "./TripWorkspaceContext";
import {
  searchMapPlaces,
  compareRoutes,
  getRouteTimeline,
  type SearchPlace,
  type TimelineStopRequest,
} from "../services/route-explorer";
import {
  calculateTripDuration,
  tripCompareRequest,
  type TripDraft,
} from "../services/trip-workspace";
import type { LocationRouteMode } from "../types/location";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  step?: number;
  isSummaryCard?: boolean;
}

interface FullScreenAiChatPlannerProps {
  onSwitchToPlanner: () => void;
  onComplete?: () => void;
}

const STORAGE_KEY = "roadfriend_chat_planner_data_v2";

interface StepOption {
  label: string;
  value: string;
}

// 4단계 순차 질문별 빠른 선택 칩
const STEP_CHIPS: Record<number, StepOption[]> = {
  1: [
    { label: "서울 ➔ 부산", value: "서울에서 부산으로 가고 싶어요" },
    { label: "서울 ➔ 강릉", value: "서울에서 강릉으로 가고 싶어요" },
    { label: "수원 ➔ 경주", value: "수원에서 경주로 가고 싶어요" },
    { label: "인천 ➔ 전주", value: "인천에서 전주로 가고 싶어요" },
    { label: "대전 ➔ 여수", value: "대전에서 여수로 가고 싶어요" },
  ],
  2: [
    { label: "당일치기 · 오전 9시 출발", value: "당일치기 일정이고, 오전 9시 정각에 출발할게요" },
    { label: "1박 2일 · 오전 9시 30분 출발", value: "1박 2일 일정이고, 오전 9시 30분에 출발할게요" },
    { label: "2박 3일 · 오전 8시 30분 출발", value: "2박 3일 일정이고, 오전 8시 30분에 일찍 출발할게요" },
    { label: "1박 2일 · 오전 10시 출발", value: "1박 2일 일정이고, 오전 10시쯤 여유롭게 출발할게요" },
  ],
  3: [
    { label: "🚗 자동차 운전 (권장/최단 비교)", value: "자동차로 직접 운전해서 갈게요. 권장 경로와 최단 경로를 비교해 주세요" },
    { label: "🚆 대중교통 + 도보 연계", value: "대중교통과 도보를 연계해서 이동할게요" },
    { label: "🚶 도보 / 산책 중심", value: "도보 산책 위주로 편안하게 걷고 싶어요" },
  ],
  4: [
    { label: "🍽️ 길목 맛집 & 휴게소 별미", value: "이동 경로 주변의 길목 맛집과 고속도로 휴게소 맛있는 곳 위주로 추천해줘" },
    { label: "☕ 뷰 좋은 카페 & 디저트", value: "바다나 산 전망이 탁 트인 분위기 좋은 카페 위주로 추천해줘" },
    { label: "🏞️ 필수 관광명소 & 문화재", value: "이동하는 길목의 대표적인 역사 유적지와 관광 명소 위주로 들르고 싶어" },
    { label: "💆 힐링 쉼터 & 자연휴양림", value: "사람 많지 않고 조용히 쉴 수 있는 힐링 자연 쉼터 위주로 추천해줘" },
    { label: "✨ 맛집 + 카페 + 명소 골고루", value: "맛집, 전망 좋은 카페, 대표 명소까지 골고루 균형 있게 추천해줘" },
  ],
};

const STEP_LABELS = [
  "출발·도착지",
  "기간 & 출발시각",
  "이동 수단",
  "선호 장소",
  "완성 및 경로 생성",
];

export function FullScreenAiChatPlanner({
  onSwitchToPlanner,
  onComplete,
}: FullScreenAiChatPlannerProps) {
  const navigate = useNavigate();
  const { state, dispatch: workspaceDispatch } = useTripWorkspace();
  const { draft: currentWorkspaceDraft } = state;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 로컬 상태로 보관하는 수집 데이터
  const [chatDraft, setChatDraft] = useState<{
    originName: string;
    destinationName: string;
    originPlace: SearchPlace | null;
    destinationPlace: SearchPlace | null;
    durationLabel: string;
    departureTime: string;
    startDate: string;
    endDate: string;
    mode: LocationRouteMode;
    preferences: string;
  }>(() => {
    return {
      originName: currentWorkspaceDraft.origin?.name || "",
      destinationName: currentWorkspaceDraft.destination?.name || "",
      originPlace: currentWorkspaceDraft.origin,
      destinationPlace: currentWorkspaceDraft.destination,
      durationLabel: "",
      departureTime: "",
      startDate: currentWorkspaceDraft.startDate || "",
      endDate: currentWorkspaceDraft.endDate || "",
      mode: currentWorkspaceDraft.mode || "driving",
      preferences: "",
    };
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "step-1-prompt",
      role: "model",
      step: 1,
      text:
        "안녕하세요! 당신의 완벽한 계획형 여행 메이트 **'I like your J'**의 AI 큐레이터입니다. 🚗✨\n\n" +
        "최적의 여행 경로와 식사 시간대별 추천 일정을 완성하기 위해 **4가지 질문**을 순서대로 드릴게요.\n\n" +
        "📍 **1단계: 어디에서 출발하여 어디로 떠나시나요?**\n" +
        "출발지와 도착지를 편하게 말씀해 주세요. (예: '서울에서 부산으로', '수원에서 경주 등')",
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  // 브라우저 로컬 캐시(localStorage) 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.chatDraft) setChatDraft(parsed.chatDraft);
        if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          setMessages(parsed.messages);
        }
        if (parsed.savedAt) setLastSavedTime(parsed.savedAt);
      }
    } catch (e) {
      console.warn("로컬 캐시 복원 실패:", e);
    }
  }, []);

  // 브라우저 로컬 캐시 자동 동기화 (비로그인 사용자 지원)
  const saveToLocalStorage = (stepNum: number, draftData: typeof chatDraft, msgList: ChatMessage[]) => {
    try {
      const timeStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      const payload = {
        currentStep: stepNum,
        chatDraft: draftData,
        messages: msgList,
        savedAt: timeStr,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSavedTime(timeStr);
    } catch (e) {
      console.warn("로컬 캐시 저장 오류:", e);
    }
  };

  // 스크롤 맨 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isGeneratingPlan]);

  const cleanPlaceName = (str: string): string => {
    if (!str) return "";
    let s = str.trim();
    s = s.replace(/^(?:출발지?|도착지?|출발은|도착은|출발|도착|여기서|거기서|장소)[:\s]*/i, "");
    s = s.replace(/(?:에서부터|부터|에서|으로|로|까지|행|쪽으로|방면|가고|떠나|향해|가자|갈래|가려고|갈거야|갈거|갑니다|가요|이야|야|입니다|으로의|로의)+$/i, "");
    s = s.replace(/[.,!?~]+$/g, "");
    return s.trim();
  };

  // 1단계 로컬 파싱 (폴백용): 출발지 및 도착지 추출
  const parseOriginAndDest = (text: string) => {
    let origin = "";
    let destination = "";

    const raw = text.trim();

    // 1. 출발 / 도착 명시 패턴
    const depMatch = raw.match(/출발(?:지|은|:)?\s*([가-힣a-zA-Z0-9\s]+?)(?=\s*도착|\s*,|\s*$)/);
    const arrMatch = raw.match(/도착(?:지|은|:)?\s*([가-힣a-zA-Z0-9\s]+?)(?=\s*출발|\s*,|\s*$)/);
    if (depMatch && arrMatch) {
      origin = cleanPlaceName(depMatch[1]);
      destination = cleanPlaceName(arrMatch[1]);
      return { origin, destination };
    }

    // 2. 구분자 (➔, ->, ~, -)
    if (raw.includes("➔") || raw.includes("->") || raw.includes("~") || (raw.includes("-") && !raw.match(/\d+-\d+/))) {
      const sep = raw.includes("➔") ? "➔" : raw.includes("->") ? "->" : raw.includes("~") ? "~" : "-";
      const parts = raw.split(sep);
      if (parts.length >= 2) {
        origin = cleanPlaceName(parts[0]);
        destination = cleanPlaceName(parts.slice(1).join(" "));
        return { origin, destination };
      }
    }

    // 3. '부터' 조사 (예: '서울부터 강원도 춘천', '서울부터 춘천까지')
    if (raw.includes("부터")) {
      const parts = raw.split("부터");
      origin = cleanPlaceName(parts[0]);
      destination = cleanPlaceName(parts.slice(1).join("부터"));
      return { origin, destination };
    }

    // 4. '에서' 조사 (예: '서울에서 강원도 춘천으로')
    if (raw.includes("에서")) {
      const parts = raw.split("에서");
      origin = cleanPlaceName(parts[0]);
      destination = cleanPlaceName(parts.slice(1).join("에서"));
      return { origin, destination };
    }

    // 5. '까지' 조사
    if (raw.includes("까지")) {
      const parts = raw.split("까지");
      const beforeKkaji = parts[0].trim();
      const tokens = beforeKkaji.split(/\s+/);
      if (tokens.length >= 2) {
        origin = cleanPlaceName(tokens[0]);
        destination = cleanPlaceName(tokens.slice(1).join(" "));
      } else {
        destination = cleanPlaceName(beforeKkaji);
      }
      return { origin, destination };
    }

    // 6. '(으)로' 조사
    const roMatch = raw.match(/^(.*?)\s+([^\s]+(?:으로|로))(?:\s.*)?$/);
    if (roMatch) {
      origin = cleanPlaceName(roMatch[1]);
      destination = cleanPlaceName(roMatch[2]);
      return { origin, destination };
    }

    // 7. 공백 분리 토큰 (예: '서울 강원도 춘천')
    const tokens = raw.split(/[\s,]+/);
    if (tokens.length === 2) {
      origin = cleanPlaceName(tokens[0]);
      destination = cleanPlaceName(tokens[1]);
    } else if (tokens.length >= 3) {
      origin = cleanPlaceName(tokens[0]);
      destination = cleanPlaceName(tokens.slice(1).join(" "));
    }

    return {
      origin: origin.replace(/[^가-힣a-zA-Z0-9\s]/g, "").trim(),
      destination: destination.replace(/[^가-힣a-zA-Z0-9\s]/g, "").trim(),
    };
  };

  // 2단계 로컬 파싱 (폴백용): 기간 및 출발 시각 추출
  const parseDurationAndTime = (text: string) => {
    let durationLabel = "";
    let daysCount = 0;
    let departureTime = "";

    if (text.includes("당일")) {
      durationLabel = "당일치기";
      daysCount = 1;
    } else if (text.includes("2박 3일") || text.includes("2박3일")) {
      durationLabel = "2박 3일";
      daysCount = 3;
    } else if (text.includes("3박 4일") || text.includes("3박4일")) {
      durationLabel = "3박 4일";
      daysCount = 4;
    } else if (text.includes("1박 2일") || text.includes("1박2일")) {
      durationLabel = "1박 2일";
      daysCount = 2;
    }

    const timeMatch = text.match(/(\d{1,2})시(?:\s*(\d{1,2})분)?/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      if (text.includes("오후") && hour < 12) hour += 12;
      departureTime = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    }

    let startDate = "";
    let endDate = "";
    if (daysCount > 0) {
      const today = new Date();
      const end = new Date(today.getTime() + (daysCount - 1) * 86400000);
      startDate = today.toISOString().slice(0, 10);
      endDate = end.toISOString().slice(0, 10);
    }

    return { durationLabel, departureTime, startDate, endDate };
  };

  // 3단계 로컬 파싱 (폴백용): 이동 수단
  const parseMode = (text: string): LocationRouteMode => {
    if (text.includes("대중교통") || text.includes("버스") || text.includes("기차") || text.includes("지하철")) {
      return "transit";
    }
    if (text.includes("도보") || text.includes("걸어") || text.includes("산책")) {
      return "walking";
    }
    return "driving";
  };

  // 사용자 답변 처리: 백엔드 Gemini 대화형 플래너(/api/chat/planner)와 실시간 연동
  const handleUserResponse = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: userText,
      step: currentStep,
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputText("");
    setIsLoading(true);

    let updatedDraft = { ...chatDraft };
    let nextStep = currentStep;
    let aiReply = "";

    try {
      // 1. 백엔드 AI 대화형 플래너(/api/chat/planner) 호출
      try {
        const response = await fetch("/api/chat/planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            history: messages.slice(-6).map((m) => ({
              role: m.role,
              content: m.text,
            })),
            currentDraft: {
              originName: chatDraft.originName,
              destinationName: chatDraft.destinationName,
              durationLabel: chatDraft.durationLabel,
              departureTime: chatDraft.departureTime,
              startDate: chatDraft.startDate,
              endDate: chatDraft.endDate,
              mode: chatDraft.mode,
              preferences: chatDraft.preferences,
            },
            currentStep,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiReply = data.reply;
          nextStep = typeof data.step === "number" ? data.step : currentStep + 1;

          if (data.extracted) {
            if (data.extracted.originName) {
              updatedDraft.originName = data.extracted.originName;
            }
            if (data.extracted.destinationName) {
              updatedDraft.destinationName = data.extracted.destinationName;
            }
            if (data.extracted.durationLabel) {
              updatedDraft.durationLabel = data.extracted.durationLabel;
              const daysCount = data.extracted.durationLabel.includes("당일")
                ? 1
                : data.extracted.durationLabel.includes("2박 3일")
                ? 3
                : data.extracted.durationLabel.includes("3박 4일")
                ? 4
                : 2;
              const today = new Date();
              const end = new Date(today.getTime() + (daysCount - 1) * 86400000);
              updatedDraft.startDate = today.toISOString().slice(0, 10);
              updatedDraft.endDate = end.toISOString().slice(0, 10);
            }
            if (data.extracted.departureTime) {
              updatedDraft.departureTime = data.extracted.departureTime;
            }
            if (data.extracted.mode) {
              updatedDraft.mode = data.extracted.mode as LocationRouteMode;
            }
            if (data.extracted.preferences) {
              updatedDraft.preferences = data.extracted.preferences;
            }
          }
        }
      } catch (apiErr) {
        console.warn("AI 플래너 API 연결 실패, 로컬 파서로 폴백:", apiErr);
      }

      // 2. 만약 API 호출이 실패했거나 답변이 없을 경우 로컬 스마트 파서 폴백
      if (!aiReply) {
        const raw = userText.trim();
        const isCorrection =
          raw.includes("다시") ||
          raw.includes("아니") ||
          raw.includes("도착지") ||
          raw.includes("출발지") ||
          raw.includes("수정");

        if (isCorrection) {
          const destMatch = raw.match(/도착(?:지|은|:)?\s*([가-힣a-zA-Z0-9\s]+)/);
          const origMatch = raw.match(/출발(?:지|은|:)?\s*([가-힣a-zA-Z0-9\s]+)/);

          if (destMatch) {
            updatedDraft.destinationName = cleanPlaceName(destMatch[1]);
            aiReply = `도착지를 **${updatedDraft.destinationName}**(으)로 수정했습니다! 🚗\n\n📅 **2단계: 여행 기간은 며칠이고, 몇 시에 출발하시나요?**\n(예: '1박 2일 오전 10시 출발')`;
            nextStep = 2;
          } else if (origMatch) {
            updatedDraft.originName = cleanPlaceName(origMatch[1]);
            aiReply = `출발지를 **${updatedDraft.originName}**(으)로 수정했습니다! 🚗\n\n📅 **2단계: 여행 기간은 며칠이고, 몇 시에 출발하시나요?**\n(예: '1박 2일 오전 10시 출발')`;
            nextStep = 2;
          } else {
            aiReply = `수정할 출발지 또는 도착지를 명확히 말씀해 주세요! 😊`;
          }
        } else if (currentStep === 1) {
          const parsed = parseOriginAndDest(userText);
          if (parsed.origin) updatedDraft.originName = parsed.origin;
          if (parsed.destination) updatedDraft.destinationName = parsed.destination;

          if (!updatedDraft.originName || !updatedDraft.destinationName) {
            aiReply = `출발지와 도착지를 모두 말씀해 주세요. (예: '서울에서 춘천으로', '수원에서 부산 등')`;
            nextStep = 1;
          } else {
            aiReply =
              `네! **${updatedDraft.originName}**에서 출발하여 **${updatedDraft.destinationName}**(으)로 떠나는 여정으로 확인했습니다. 🛣️\n\n` +
              `📅 **2단계: 여행 기간은 며칠이고, 몇 시에 출발하시나요?**\n` +
              `시간대에 맞춰 점심 식사와 휴게소 경유지를 추천해 드립니다. (예: '1박 2일 오전 10시 출발')`;
            nextStep = 2;
          }
        } else if (currentStep === 2) {
          const parsed = parseDurationAndTime(userText);
          if (parsed.durationLabel) updatedDraft.durationLabel = parsed.durationLabel;
          if (parsed.departureTime) updatedDraft.departureTime = parsed.departureTime;
          if (parsed.startDate) updatedDraft.startDate = parsed.startDate;
          if (parsed.endDate) updatedDraft.endDate = parsed.endDate;

          if (!updatedDraft.durationLabel && !updatedDraft.departureTime) {
            aiReply = `여행 기간(당일치기, 1박 2일 등)과 대략적인 출발 시각을 말씀해 주세요! ⏰`;
            nextStep = 2;
          } else {
            const parts = [];
            if (updatedDraft.durationLabel) parts.push(`**${updatedDraft.durationLabel}**`);
            if (updatedDraft.departureTime) parts.push(`**${updatedDraft.departureTime} 출발**`);
            aiReply =
              `${parts.join(", ")} 일정을 확인했습니다. ⏰\n\n` +
              `🚗 **3단계: 어떻게 이동할까요?**\n` +
              `직접 운전하시나요, 대중교통을 이용하시나요? 자동차 경로 시 권장 경로와 최단 경로를 함께 비교해 드립니다.`;
            nextStep = 3;
          }
        } else if (currentStep === 3) {
          const mode = parseMode(userText);
          updatedDraft.mode = mode;
          const modeLabel = mode === "driving" ? "자동차 운전" : mode === "transit" ? "대중교통" : "도보";
          aiReply =
            `이동 수단은 **${modeLabel}**(으)로 설정했습니다. 🚙\n\n` +
            `🎯 **4단계: 길목에서 어떤 곳에 들르고 싶으세요?**\n` +
            `도로변 맛집, 오션뷰 카페, 힐링 명소 등 마음에 드는 여행 테마를 편하게 말씀해 주세요.`;
          nextStep = 4;
        } else if (currentStep === 4) {
          updatedDraft.preferences = userText;
          aiReply =
            `선호하시는 테마(**${userText}**)까지 모든 설정이 완벽하게 정리되었습니다! 🎉\n\n` +
            `수집된 모든 여행 조건을 바탕으로 우리 서버의 경로 탐색 엔진과 1:1 매핑할 준비가 끝났습니다. 아래 요약을 확인해 주세요.`;
          nextStep = 5;
        }
      }

      // 3. 지명이 바뀌었으면 백그라운드에서 실제 지도 좌표 검색 연동
      if (updatedDraft.originName && (!updatedDraft.originPlace || updatedDraft.originPlace.name !== updatedDraft.originName)) {
        void searchMapPlaces(updatedDraft.originName).then((places) => {
          if (places && places.length > 0) {
            setChatDraft((prev) => ({ ...prev, originPlace: places[0] }));
          }
        }).catch(() => {});
      }
      if (updatedDraft.destinationName && (!updatedDraft.destinationPlace || updatedDraft.destinationPlace.name !== updatedDraft.destinationName)) {
        void searchMapPlaces(updatedDraft.destinationName).then((places) => {
          if (places && places.length > 0) {
            setChatDraft((prev) => ({ ...prev, destinationPlace: places[0] }));
          }
        }).catch(() => {});
      }

      setChatDraft(updatedDraft);
      setCurrentStep(nextStep);

      const aiMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: "model",
        text: aiReply,
        step: nextStep,
        isSummaryCard: nextStep === 5,
        timestamp: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const finalMessages = [...nextMessages, aiMessage];
      setMessages(finalMessages);
      saveToLocalStorage(nextStep, updatedDraft, finalMessages);
    } catch (err: any) {
      console.error("챗봇 단계 처리 오류:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 대화 초기화
  const handleResetChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(1);
    setGenerationError(null);

    const initialDraft = {
      originName: "",
      destinationName: "",
      originPlace: null,
      destinationPlace: null,
      durationLabel: "",
      departureTime: "",
      startDate: "",
      endDate: "",
      mode: "driving" as LocationRouteMode,
      preferences: "",
    };
    setChatDraft(initialDraft);

    const initialMsg: ChatMessage = {
      id: "step-1-prompt-reset",
      role: "model",
      step: 1,
      text:
        "새로운 대화가 시작되었습니다! 🚗✨\n\n" +
        "📍 **1단계: 어디에서 출발하여 어디로 떠나시나요?**\n" +
        "출발지와 도착지를 편하게 말씀해 주세요. (예: '서울에서 춘천으로')",
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([initialMsg]);
    setLastSavedTime("");
  };

  // 최종 서버 API 호출하여 경로 & 타임라인 생성
  const handleGenerateFinalPlan = async () => {
    setIsGeneratingPlan(true);
    setGenerationError(null);

    try {
      if (!chatDraft.originName || !chatDraft.originName.trim()) {
        throw new Error("출발지가 설정되지 않았습니다. 출발지를 먼저 입력해 주세요.");
      }
      if (!chatDraft.destinationName || !chatDraft.destinationName.trim()) {
        throw new Error("도착지가 설정되지 않았습니다. 도착지를 먼저 입력해 주세요.");
      }

      // 1. 출발지 & 도착지 실제 지도 좌표 검색
      let originPlace = chatDraft.originPlace;
      if (!originPlace || originPlace.name !== chatDraft.originName.trim()) {
        const originSearch = await searchMapPlaces(chatDraft.originName.trim());
        if (originSearch && originSearch.length > 0) {
          originPlace = originSearch[0];
        } else {
          throw new Error(`'${chatDraft.originName}'에 대한 지도 위치를 찾지 못했습니다. 보다 명확한 지명으로 입력해 주세요.`);
        }
      }

      let destPlace = chatDraft.destinationPlace;
      if (!destPlace || destPlace.name !== chatDraft.destinationName.trim()) {
        const destSearch = await searchMapPlaces(chatDraft.destinationName.trim());
        if (destSearch && destSearch.length > 0) {
          destPlace = destSearch[0];
        } else {
          throw new Error(`'${chatDraft.destinationName}'에 대한 지도 위치를 찾지 못했습니다. 보다 명확한 지명으로 입력해 주세요.`);
        }
      }

      // 2. Draft 구성
      const today = new Date().toISOString().slice(0, 10);
      const startDate = chatDraft.startDate || today;
      const endDate = chatDraft.endDate || startDate;
      const depTime = chatDraft.departureTime || "09:00";
      const duration = calculateTripDuration(startDate, endDate);
      const updatedDraft: TripDraft = {
        ...currentWorkspaceDraft,
        title: `${originPlace.name}에서 ${destPlace.name}까지 (${duration.label})`,
        originQuery: originPlace.name,
        destinationQuery: destPlace.name,
        origin: originPlace,
        destination: destPlace,
        mode: chatDraft.mode || "driving",
        startDate,
        endDate,
        departureTime: depTime,
        radiusMeters: 15000,
        selectedCategoryIds: [],
        categorySelections: {},
      };

      workspaceDispatch({ type: "edit", patch: updatedDraft });

      // 3. 서버 API 호출: 경로 비교 (/api/routes/compare)
      const input = tripCompareRequest(updatedDraft);
      if (!input) throw new Error("경로 비교 요청 파라미터가 유효하지 않습니다.");

      const comparison = await compareRoutes(input);

      // 4. 서버 API 호출: 타임라인 구간 추천 (/api/routes/timeline)
      const addMinutes = (timeStr: string, mins: number) => {
        const [hStr, mStr] = (timeStr || "09:30").split(":");
        const total = (((Number(hStr) || 9) * 60 + (Number(mStr) || 30) + mins) % (24 * 60) + 24 * 60) % (24 * 60);
        return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
      };

      const stops: TimelineStopRequest[] = [
        {
          label: "1구간 · 출발지 인근 쉼터 & 명소",
          targetTime: addMinutes(depTime, 45),
          contentTypeIds: [12, 14, 38, 39],
          radiusMeters: 15000,
          limit: 5,
        },
        {
          label: "2구간 · 점심 식사 & 길목 맛집",
          targetTime: "12:30",
          contentTypeIds: [39],
          radiusMeters: 15000,
          limit: 5,
        },
        {
          label: "3구간 · 오후 힐링 여행지 & 관광 명소",
          targetTime: addMinutes("12:30", 120),
          contentTypeIds: [12, 14, 28],
          radiusMeters: 15000,
          limit: 5,
        },
        {
          label: "4구간 · 도착지 인근 저녁 식사 및 숙소",
          targetTime: "18:30",
          contentTypeIds: [39, 32],
          radiusMeters: 15000,
          limit: 5,
        },
      ];

      let timeline = null;
      try {
        timeline = await getRouteTimeline({
          mode: chatDraft.mode,
          points: [
            { longitude: originPlace.longitude, latitude: originPlace.latitude },
            { longitude: destPlace.longitude, latitude: destPlace.latitude },
          ],
          departureTime: depTime,
          stops,
        });
      } catch (timelineErr) {
        console.warn("Timeline fetch error:", timelineErr);
      }

      // 5. 완료 결과 저장
      workspaceDispatch({
        type: "complete",
        result: {
          request: input,
          comparison,
          startDate: chatDraft.startDate,
          endDate: chatDraft.endDate,
          departureTime: chatDraft.departureTime,
          durationLabel: duration.label,
          timeline,
          categoryGroups: [],
          title: updatedDraft.title,
        },
      });

      // 6. 결과 페이지(/trips)로 이동
      if (onComplete) {
        onComplete();
      } else {
        navigate("/trips");
      }
    } catch (err: any) {
      console.error("일정 자동 생성 에러:", err);
      setGenerationError(err.message || "경로 탐색 서버 응답에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <div className="flex flex-col h-[780px] max-h-[85vh] rounded-3xl border border-stone-200 bg-white shadow-xl overflow-hidden animate-in fade-in duration-300">
      {/* 1. 상단 헤더 & 진행 단계 인디케이터 */}
      <div className="flex flex-col gap-3 px-6 py-4 bg-gradient-to-r from-[#064e43] via-[#085a4e] to-[#0a6659] text-white shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs border border-white/20">
              <Bot className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base tracking-tight">
                  대화형 AI 여행 플래너
                </h2>
                <span className="rounded-full bg-emerald-400/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                  4단계 순차 문답 모드
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/80">
                출발·도착 ➔ 기간·출발시각 ➔ 이동수단 ➔ 선호장소를 차례대로 묻고 최적 코스를 완성합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastSavedTime && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-200/90 bg-white/10 px-2.5 py-1 rounded-full">
                <Check className="h-3 w-3 text-emerald-300" />
                <span>브라우저 자동 저장 ({lastSavedTime})</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetChat}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition cursor-pointer"
              title="새로 시작하기"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>처음부터 다시</span>
            </button>
            <button
              type="button"
              onClick={onSwitchToPlanner}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-[#064e43] hover:bg-emerald-50 transition shadow-sm cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>지도 화면 플래너</span>
            </button>
          </div>
        </div>

        {/* 4단계 순차 프로그레스 바 */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/15">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            const isDone = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;
            return (
              <div
                key={idx}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  isCurrent
                    ? "bg-white/25 text-amber-300 font-bold border border-white/30"
                    : isDone
                    ? "text-emerald-200"
                    : "text-white/40"
                }`}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-white/20">
                  {isDone ? "✓" : stepNum}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 대화 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-stone-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="flex items-start gap-3 max-w-[92%] sm:max-w-[85%]">
              {msg.role === "model" && (
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-[#064e43] text-white shadow-xs">
                  <Bot className="h-4 w-4 text-emerald-300" />
                </div>
              )}

              <div className="space-y-2">
                <div
                  className={`rounded-2xl px-5 py-3.5 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words shadow-xs ${
                    msg.role === "user"
                      ? "bg-[#064e43] text-white rounded-br-xs"
                      : "bg-white text-stone-800 border border-stone-200/90 rounded-bl-xs"
                  }`}
                >
                  {msg.text}
                </div>

                {/* 5단계 요약 카드 & 최종 생성 버튼 */}
                {msg.isSummaryCard && (
                  <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-950 via-[#064e43] to-[#04332c] text-white p-5 sm:p-6 shadow-xl border border-emerald-600/40 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between border-b border-white/20 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-amber-300" />
                        <h4 className="font-bold text-base text-white">
                          수집 완료된 여행 계획 프로필
                        </h4>
                      </div>
                      <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full text-emerald-200">
                        브라우저 저장됨
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-emerald-100/90">
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10">
                        <MapPin className="h-4 w-4 text-amber-300 shrink-0" />
                        <div>
                          <span className="text-white/60 text-[11px] block">경로</span>
                          <span className="font-bold text-white">
                            {chatDraft.originName || "출발지 미정"} ➔ {chatDraft.destinationName || "도착지 미정"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10">
                        <Clock className="h-4 w-4 text-emerald-300 shrink-0" />
                        <div>
                          <span className="text-white/60 text-[11px] block">기간 및 출발시각</span>
                          <span className="font-bold text-white">
                            {chatDraft.durationLabel || "일정 미지정"}{" "}
                            {chatDraft.departureTime ? `(${chatDraft.departureTime} 출발)` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10">
                        <Car className="h-4 w-4 text-emerald-300 shrink-0" />
                        <div>
                          <span className="text-white/60 text-[11px] block">이동 수단</span>
                          <span className="font-bold text-white">
                            {chatDraft.mode === "driving"
                              ? "자동차 운전 (권장/최단 비교)"
                              : chatDraft.mode === "transit"
                              ? "대중교통 + 도보"
                              : "도보 산책"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10">
                        <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
                        <div>
                          <span className="text-white/60 text-[11px] block">취향 테마</span>
                          <span className="font-bold text-white truncate max-w-[180px] block">
                            {chatDraft.preferences || "추천 코스 및 명소"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {generationError && (
                      <div className="rounded-xl bg-red-500/20 border border-red-400/40 p-3 text-xs text-red-200">
                        {generationError}
                      </div>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        type="button"
                        disabled={isGeneratingPlan}
                        onClick={handleGenerateFinalPlan}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-bold px-5 py-3.5 text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingPlan ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>서버 API 최적 경로 & 타임라인 계산 중...</span>
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4" />
                            <span>최적 경로 & 4구간 타임라인 생성하기</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={onSwitchToPlanner}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-3.5 text-xs transition cursor-pointer"
                      >
                        <Compass className="h-4 w-4 text-emerald-300" />
                        <span>지도 플래너에서 수정</span>
                      </button>
                    </div>
                  </div>
                )}

                <span className="mt-1 block px-1 text-[11px] text-stone-400 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-stone-600 bg-white border border-stone-200/90 rounded-2xl px-5 py-3.5 w-fit shadow-xs animate-pulse">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-ping" />
            <span>AI 플래너가 다음 질문을 준비하고 있습니다…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. 단계별 빠른 선택 칩 바 */}
      {currentStep <= 4 && STEP_CHIPS[currentStep] && (
        <div className="px-5 py-2.5 bg-[#fbf9f5] border-t border-stone-200/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[11px] font-bold text-stone-500 shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-700" />
            빠른 답변:
          </span>
          {STEP_CHIPS[currentStep].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => void handleUserResponse(chip.value)}
              className="shrink-0 flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-950 transition shadow-2xs disabled:opacity-40 cursor-pointer"
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 4. 메시지 입력 영역 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleUserResponse(inputText);
        }}
        className="flex items-center gap-3 p-4 bg-white border-t border-stone-200 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          disabled={isLoading || currentStep > 4}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            currentStep === 1
              ? "출발지와 도착지를 입력하세요 (예: 서울에서 부산으로)"
              : currentStep === 2
              ? "여행 기간과 출발 시각을 입력하세요 (예: 1박 2일 오전 9시 30분)"
              : currentStep === 3
              ? "이동 수단을 입력하세요 (예: 자동차 운전)"
              : currentStep === 4
              ? "들르고 싶은 곳이나 취향을 입력하세요 (예: 길목 맛집과 카페)"
              : "모든 질문이 완료되었습니다. 위의 생성 버튼을 눌러주세요!"
          }
          className="flex-1 rounded-2xl border border-stone-300 bg-stone-50/60 px-5 py-3.5 text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading || currentStep > 4}
          className="flex items-center gap-2 rounded-2xl bg-[#064e43] px-6 py-3.5 text-sm sm:text-base font-bold text-white transition hover:bg-[#085a4e] shadow-md hover:shadow-lg disabled:opacity-40 cursor-pointer"
        >
          <span>보내기</span>
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
