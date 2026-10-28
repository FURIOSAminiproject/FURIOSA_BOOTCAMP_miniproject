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
import { searchMapPlaces, type SearchPlace } from "../services/route-explorer";
import type { TripDraft } from "../services/trip-workspace";
import {
  explicitTravelMode,
  scheduleFromText,
  surveyStep,
  surveyPrompt,
  validDate,
} from "../services/planner-survey";
import { planTrip } from "../services/trip-planning";
import type { LocationRouteMode } from "../types/location";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  step?: number;
  isSummaryCard?: boolean;
}

function isLatestQuestion(message: ChatMessage, index: number, total: number) {
  return (
    message.role === "model" &&
    !!message.step &&
    !message.isSummaryCard &&
    index === total - 1
  );
}

interface FullScreenAiChatPlannerProps {
  onSwitchToPlanner: () => void;
  onComplete?: () => void;
}

const STORAGE_KEY = "roadfriend_chat_planner_data_v3";

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
    {
      label: "당일치기 · 오전 9시 출발",
      value: "당일치기 일정이고, 오전 9시 정각에 출발할게요",
    },
    {
      label: "1박 2일 · 오전 9시 30분 출발",
      value: "1박 2일 일정이고, 오전 9시 30분에 출발할게요",
    },
    {
      label: "2박 3일 · 오전 8시 30분 출발",
      value: "2박 3일 일정이고, 오전 8시 30분에 일찍 출발할게요",
    },
    {
      label: "1박 2일 · 오전 10시 출발",
      value: "1박 2일 일정이고, 오전 10시쯤 여유롭게 출발할게요",
    },
  ],
  3: [
    {
      label: "🚗 자동차 운전 (권장/최단 비교)",
      value:
        "자동차로 직접 운전해서 갈게요. 권장 경로와 최단 경로를 비교해 주세요",
    },
    {
      label: "🚶 도보 / 산책 중심",
      value: "도보 산책 위주로 편안하게 걷고 싶어요",
    },
  ],
  4: [
    {
      label: "🍽️ 도착지 로컬 맛집",
      value: "도착한 뒤 지역 대표 맛집과 향토 음식 위주로 여행하고 싶어요",
    },
    {
      label: "☕ 뷰 좋은 카페 & 디저트",
      value: "바다나 산 전망이 탁 트인 분위기 좋은 카페 위주로 추천해줘",
    },
    {
      label: "🏞️ 필수 관광명소 & 문화재",
      value: "도착지의 대표적인 역사 유적지와 관광 명소 위주로 둘러보고 싶어요",
    },
    {
      label: "💆 힐링 쉼터 & 자연휴양림",
      value: "사람 많지 않고 조용히 쉴 수 있는 힐링 자연 쉼터 위주로 추천해줘",
    },
    {
      label: "✨ 맛집 + 카페 + 명소 골고루",
      value: "맛집, 전망 좋은 카페, 대표 명소까지 골고루 균형 있게 추천해줘",
    },
  ],
};

const STEP_LABELS = [
  "출발·도착지",
  "날짜·기간·출발시각",
  "이동 수단",
  "선호 장소",
  "완성 및 경로 생성",
];

const KOREA_CITY_COORDINATES: Record<
  string,
  { name: string; address: string; latitude: number; longitude: number }
> = {
  서울: {
    name: "서울특별시청",
    address: "서울특별시 중구 세종대로 110",
    latitude: 37.5665,
    longitude: 126.978,
  },
  춘천: {
    name: "춘천시청",
    address: "강원특별자치도 춘천시 시청길 11",
    latitude: 37.8813,
    longitude: 127.7298,
  },
  부산: {
    name: "부산광역시청",
    address: "부산광역시 연제구 중앙대로 1001",
    latitude: 35.1796,
    longitude: 129.0756,
  },
  강릉: {
    name: "강릉시청",
    address: "강원특별자치도 강릉시 강릉대로 33",
    latitude: 37.7519,
    longitude: 128.8761,
  },
  속초: {
    name: "속초시청",
    address: "강원특별자치도 속초시 중앙로 183",
    latitude: 38.207,
    longitude: 128.5918,
  },
  인천: {
    name: "인천광역시청",
    address: "인천광역시 남동구 정각로 29",
    latitude: 37.4563,
    longitude: 126.7052,
  },
  수원: {
    name: "수원시청",
    address: "경기도 수원시 팔달구 효원로 241",
    latitude: 37.2636,
    longitude: 127.0286,
  },
  대구: {
    name: "대구광역시청",
    address: "대구광역시 중구 공평로 88",
    latitude: 35.8714,
    longitude: 128.6014,
  },
  대전: {
    name: "대전광역시청",
    address: "대전광역시 서구 둔산로 100",
    latitude: 36.3504,
    longitude: 127.3845,
  },
  광주: {
    name: "광주광역시청",
    address: "광주광역시 서구 내방로 111",
    latitude: 35.1595,
    longitude: 126.8526,
  },
  울산: {
    name: "울산광역시청",
    address: "울산광역시 남구 중앙로 201",
    latitude: 35.5384,
    longitude: 129.3114,
  },
  제주: {
    name: "제주시청",
    address: "제주특별자치도 제주시 이도2동 광양9길 10",
    latitude: 33.4996,
    longitude: 126.5312,
  },
  서귀포: {
    name: "서귀포시청",
    address: "제주특별자치도 서귀포시 중앙로 105",
    latitude: 33.2541,
    longitude: 126.5601,
  },
  경주: {
    name: "경주시청",
    address: "경상북도 경주시 양정로 260",
    latitude: 35.8562,
    longitude: 129.2248,
  },
  전주: {
    name: "전주시청",
    address: "전북특별자치도 전주시 완산구 노송광장로 10",
    latitude: 35.8242,
    longitude: 127.148,
  },
  여수: {
    name: "여수시청",
    address: "전라남도 여수시 시청로 1",
    latitude: 34.7604,
    longitude: 127.6622,
  },
  포항: {
    name: "포항시청",
    address: "경상북도 포항시 남구 시청로 1",
    latitude: 36.019,
    longitude: 129.3435,
  },
  안동: {
    name: "안동시청",
    address: "경상북도 안동시 퇴계로 115",
    latitude: 36.5684,
    longitude: 128.7294,
  },
  가평: {
    name: "가평군청",
    address: "경기도 가평군 가평읍 석봉로 181",
    latitude: 37.8315,
    longitude: 127.5095,
  },
  양평: {
    name: "양평군청",
    address: "경기도 양평군 양평읍 군청앞길 2",
    latitude: 37.4917,
    longitude: 127.4876,
  },
};

function findFallbackCity(query: string): SearchPlace | null {
  if (!query) return null;
  const trimmed = query.trim();
  for (const [key, val] of Object.entries(KOREA_CITY_COORDINATES)) {
    if (trimmed.includes(key) || key.includes(trimmed)) {
      return {
        id: `fallback-${key}`,
        name: val.name,
        address: val.address,
        latitude: val.latitude,
        longitude: val.longitude,
      };
    }
  }
  return null;
}

async function resolvePlace(
  place: SearchPlace | null | undefined,
  name: string | undefined,
  signal?: AbortSignal,
): Promise<SearchPlace | null> {
  if (place && place.latitude && place.longitude) return place;
  if (!name || !name.trim()) return null;
  try {
    const results = await searchMapPlaces(name.trim(), signal);
    if (results && results.length > 0) return results[0];
  } catch (e) {
    console.warn("searchMapPlaces fallback for:", name, e);
  }
  return findFallbackCity(name);
}

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
  const [step2SelectedDuration, setStep2SelectedDuration] =
    useState<string>("1박 2일");
  const [step2SelectedTime, setStep2SelectedTime] = useState<string>("09:30");
  const [step2SelectedDate, setStep2SelectedDate] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeOperation = useRef<AbortController | null>(null);
  useEffect(() => () => activeOperation.current?.abort(), []);

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
    mode: LocationRouteMode | null;
    modeConfirmed: boolean;
    preferences: string;
    selectedCategoryIds?: string[];
    categorySelections?: Record<string, string[]>;
    categoryNames?: string[];
  }>(() => {
    return {
      originName: currentWorkspaceDraft.origin?.name || "",
      destinationName: currentWorkspaceDraft.destination?.name || "",
      originPlace: currentWorkspaceDraft.origin,
      destinationPlace: currentWorkspaceDraft.destination,
      durationLabel: "",
      departureTime: "",
      startDate: "",
      endDate: "",
      mode: null,
      modeConfirmed: false,
      preferences: "",
      selectedCategoryIds: currentWorkspaceDraft.selectedCategoryIds || [],
      categorySelections: currentWorkspaceDraft.categorySelections || {},
      categoryNames: [],
    };
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "step-1-prompt",
      role: "model",
      step: 1,
      text:
        "안녕하세요! 당신의 완벽한 계획형 여행 메이트 **'I am your J'**의 AI 큐레이터입니다. 🚗✨\n\n" +
        "이동 경로와 도착 후 날짜별 여행 일정을 완성하기 위해 **4가지 질문**을 순서대로 드릴게요.\n\n" +
        "📍 **1단계: 어디에서 출발하여 어디로 떠나시나요?**\n" +
        "출발지와 도착지를 편하게 말씀해 주세요. (예: '서울에서 춘천으로', '수원에서 부산 등')",
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
        if (!parsed.chatDraft || !Array.isArray(parsed.messages)) return;
        const restoredDraft = { ...chatDraft, ...parsed.chatDraft };
        if (restoredDraft.modeConfirmed !== true) restoredDraft.mode = null;
        const restoredStep = surveyStep(restoredDraft);
        setCurrentStep(restoredStep);
        setChatDraft(restoredDraft);
        if (parsed.messages.length)
          setMessages(
            parsed.messages.map((message: ChatMessage) => ({
              ...message,
              isSummaryCard: restoredStep === 5 && message.isSummaryCard,
            })),
          );
        if (parsed.savedAt) setLastSavedTime(parsed.savedAt);
      }
    } catch (e) {
      console.warn("로컬 캐시 복원 실패:", e);
    }
  }, []);

  // 브라우저 로컬 캐시 자동 동기화 (비로그인 사용자 지원)
  const saveToLocalStorage = (
    stepNum: number,
    draftData: typeof chatDraft,
    msgList: ChatMessage[],
  ) => {
    try {
      const timeStr = new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });
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
    s = s.replace(
      /^(?:출발지?|도착지?|출발은|도착은|출발|도착|여기서|거기서|장소)[:\s]*/i,
      "",
    );
    s = s.replace(
      /(?:에서부터|부터|에서|으로|로|까지|행|쪽으로|방면|가고|떠나|향해|가자|갈래|가려고|갈거야|갈거|갑니다|가요|이야|야|입니다|으로의|로의)+$/i,
      "",
    );
    s = s.replace(/[.,!?~]+$/g, "");
    return s.trim();
  };

  // 1단계 로컬 파싱 (폴백용): 출발지 및 도착지 추출
  const parseOriginAndDest = (text: string) => {
    let origin = "";
    let destination = "";

    const raw = text.trim();

    // 1. 출발 / 도착 명시 패턴
    const depMatch = raw.match(
      /출발(?:지|은|:)?\s*([가-힣a-zA-Z0-9\s]+?)(?=\s*도착|\s*,|\s*$)/,
    );
    const arrMatch = raw.match(
      /도착(?:지|은|:)?\s*([가-힣a-zA-Z0-9\s]+?)(?=\s*출발|\s*,|\s*$)/,
    );
    if (depMatch && arrMatch) {
      origin = cleanPlaceName(depMatch[1]);
      destination = cleanPlaceName(arrMatch[1]);
      return { origin, destination };
    }

    // 2. 구분자 (➔, ->, ~, -)
    if (
      raw.includes("➔") ||
      raw.includes("->") ||
      raw.includes("~") ||
      (raw.includes("-") && !raw.match(/\d+-\d+/))
    ) {
      const sep = raw.includes("➔")
        ? "➔"
        : raw.includes("->")
          ? "->"
          : raw.includes("~")
            ? "~"
            : "-";
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

  // 모델은 장소 표현을 도와주고, 다음 단계는 확인된 사용자 답변으로만 결정한다.
  const handleUserResponse = async (userText: string) => {
    if (!userText.trim() || isLoading || isGeneratingPlan) return;
    activeOperation.current?.abort();
    const controller = new AbortController();
    activeOperation.current = controller;
    const userMessage: ChatMessage = {
      id: "user-" + Date.now(),
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
    let extracted: Record<string, any> = {};
    try {
      try {
        const response = await fetch("/api/chat/planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(35000),
          ]),
          body: JSON.stringify({
            message: userText,
            currentStep,
            history: messages
              .slice(-6)
              .map((m) => ({ role: m.role, content: m.text })),
            currentDraft: { ...chatDraft, mode: chatDraft.mode || undefined },
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.extracted && typeof data.extracted === "object")
            extracted = data.extracted;
        }
      } catch {
        /* 연결 실패 시 같은 단계의 로컬 파서로 진행한다. */
      }
      if (controller.signal.aborted) return;
      if (currentStep === 1) {
        const local = parseOriginAndDest(userText);
        const origin =
          typeof extracted.originName === "string"
            ? extracted.originName
            : local.origin;
        const destination =
          typeof extracted.destinationName === "string"
            ? extracted.destinationName
            : local.destination;
        if (origin) {
          updatedDraft.originName = origin;
          updatedDraft.originPlace = findFallbackCity(origin);
          searchMapPlaces(origin)
            .then((places) => {
              if (places && places[0]) {
                setChatDraft((prev) => ({ ...prev, originPlace: places[0] }));
                workspaceDispatch({
                  type: "edit",
                  patch: { origin: places[0], originQuery: places[0].name },
                });
              }
            })
            .catch(() => {});
        }
        if (destination) {
          updatedDraft.destinationName = destination;
          updatedDraft.destinationPlace = findFallbackCity(destination);
          searchMapPlaces(destination)
            .then((places) => {
              if (places && places[0]) {
                setChatDraft((prev) => ({
                  ...prev,
                  destinationPlace: places[0],
                }));
                workspaceDispatch({
                  type: "edit",
                  patch: {
                    destination: places[0],
                    destinationQuery: places[0].name,
                  },
                });
              }
            })
            .catch(() => {});
        }
      } else if (currentStep === 2) {
        Object.assign(updatedDraft, scheduleFromText(userText, updatedDraft));
      } else if (currentStep === 3) {
        const mode = explicitTravelMode(userText);
        if (mode) {
          updatedDraft.mode = mode;
          updatedDraft.modeConfirmed = true;
        }
      } else if (currentStep === 4) {
        updatedDraft.preferences = userText.trim();
        if (
          Array.isArray(extracted.selectedCategoryIds) &&
          extracted.categorySelections &&
          Array.isArray(extracted.categoryNames)
        ) {
          updatedDraft.selectedCategoryIds = extracted.selectedCategoryIds;
          updatedDraft.categorySelections = extracted.categorySelections;
          updatedDraft.categoryNames = extracted.categoryNames;
        } else {
          const FOOD_ID = "dd608518-f993-4a23-bd10-2c59a24fa674";
          const CAFE_ID = "f63cd46c-13db-465b-923d-4f064ab05feb";
          const KOREAN_FOOD_ID = "917f7b5a-5f95-414d-8ca6-9dc8c5535199";
          const NATURE_ID = "6486b07a-4e08-4f42-9942-eec0b631592b";
          const FOREST_ID = "b1c0732e-15d7-4837-ad8c-b5f3a88af4b2";
          const PARK_ID = "a44a0670-6aa4-4794-8b7d-0126f260e439";
          const CULTURE_ID = "1cd55dd3-084a-4f30-aa37-b9f772807d90";
          const ACTIVITY_ID = "02e5b4c1-7434-48a1-8712-76cba3e09ad8";

          const selectedCategoryIds: string[] = [];
          const categorySelections: Record<string, string[]> = {};
          const categoryNames: string[] = [];

          if (
            userText.includes("카페") ||
            userText.includes("디저트") ||
            userText.includes("커피") ||
            userText.includes("찻집") ||
            userText.includes("빵")
          ) {
            if (!selectedCategoryIds.includes(FOOD_ID))
              selectedCategoryIds.push(FOOD_ID);
            categorySelections[FOOD_ID] = categorySelections[FOOD_ID] || [];
            categorySelections[FOOD_ID].push(CAFE_ID);
            categoryNames.push("카페/ 찻집");
          }
          if (
            userText.includes("맛집") ||
            userText.includes("밥") ||
            userText.includes("한식") ||
            userText.includes("닭갈비") ||
            userText.includes("고기")
          ) {
            if (!selectedCategoryIds.includes(FOOD_ID))
              selectedCategoryIds.push(FOOD_ID);
            categorySelections[FOOD_ID] = categorySelections[FOOD_ID] || [];
            if (!categorySelections[FOOD_ID].includes(KOREAN_FOOD_ID))
              categorySelections[FOOD_ID].push(KOREAN_FOOD_ID);
            categoryNames.push("한식(맛집)");
          }
          if (
            userText.includes("자연") ||
            userText.includes("휴양") ||
            userText.includes("숲") ||
            userText.includes("산책") ||
            userText.includes("힐링")
          ) {
            if (!selectedCategoryIds.includes(NATURE_ID))
              selectedCategoryIds.push(NATURE_ID);
            categorySelections[NATURE_ID] = [FOREST_ID, PARK_ID];
            categoryNames.push("자연휴양림 & 자연공원");
          }
          if (
            userText.includes("박물관") ||
            userText.includes("미술관") ||
            userText.includes("전시") ||
            userText.includes("문화")
          ) {
            if (!selectedCategoryIds.includes(CULTURE_ID))
              selectedCategoryIds.push(CULTURE_ID);
            categoryNames.push("문화관광");
          }
          if (
            userText.includes("체험") ||
            userText.includes("액티비티") ||
            userText.includes("레포츠")
          ) {
            if (!selectedCategoryIds.includes(ACTIVITY_ID))
              selectedCategoryIds.push(ACTIVITY_ID);
            categoryNames.push("체험관광");
          }
          if (selectedCategoryIds.length === 0) {
            selectedCategoryIds.push(FOOD_ID, NATURE_ID);
            categorySelections[FOOD_ID] = [CAFE_ID, KOREAN_FOOD_ID];
            categorySelections[NATURE_ID] = [PARK_ID];
            categoryNames.push("카페/ 찻집", "한식(맛집)", "자연공원");
          }

          updatedDraft.selectedCategoryIds = selectedCategoryIds;
          updatedDraft.categorySelections = categorySelections;
          updatedDraft.categoryNames = categoryNames;
        }
      }
      const nextStep = surveyStep(updatedDraft);
      const reply =
        nextStep === 3 && currentStep === 3 && !explicitTravelMode(userText)
          ? "이동 수단을 임의로 정하지 않았어요. 자동차 또는 도보를 직접 골라 주세요."
          : surveyPrompt(nextStep, updatedDraft);
      const aiMessage: ChatMessage = {
        id: "model-" + Date.now(),
        role: "model",
        text: reply,
        step: nextStep,
        isSummaryCard: nextStep === 5,
        timestamp: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      const finalMessages = [...nextMessages, aiMessage];
      setChatDraft(updatedDraft);
      setCurrentStep(nextStep);
      setMessages(finalMessages);
      saveToLocalStorage(nextStep, updatedDraft, finalMessages);

      // 플래너 화면과 상태 동기화 (화면 전환 시에도 출발지/도착지 및 입력값이 보존됨)
      workspaceDispatch({
        type: "edit",
        patch: {
          originQuery:
            updatedDraft.originPlace?.name ||
            updatedDraft.originName ||
            currentWorkspaceDraft.originQuery,
          destinationQuery:
            updatedDraft.destinationPlace?.name ||
            updatedDraft.destinationName ||
            currentWorkspaceDraft.destinationQuery,
          origin: updatedDraft.originPlace || currentWorkspaceDraft.origin,
          destination:
            updatedDraft.destinationPlace || currentWorkspaceDraft.destination,
          startDate: updatedDraft.startDate || currentWorkspaceDraft.startDate,
          endDate: updatedDraft.endDate || currentWorkspaceDraft.endDate,
          departureTime:
            updatedDraft.departureTime || currentWorkspaceDraft.departureTime,
          mode: updatedDraft.mode || currentWorkspaceDraft.mode,
          selectedCategoryIds:
            updatedDraft.selectedCategoryIds ||
            currentWorkspaceDraft.selectedCategoryIds,
          categorySelections:
            updatedDraft.categorySelections ||
            currentWorkspaceDraft.categorySelections,
        },
      });
    } finally {
      if (activeOperation.current === controller) {
        activeOperation.current = null;
        setIsLoading(false);
      }
    }
  };

  // 대화 초기화
  const handleResetChat = () => {
    activeOperation.current?.abort();
    activeOperation.current = null;
    setIsLoading(false);
    setIsGeneratingPlan(false);
    setInputText("");
    workspaceDispatch({ type: "new" });
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("roadfriend_chat_planner_data_v2");
    setStep2SelectedDuration("1박 2일");
    setStep2SelectedTime("09:30");
    setStep2SelectedDate("");
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
      mode: null,
      modeConfirmed: false,
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

  // 지도 화면 플래너로 전환 시 수집된 데이터를 워크스페이스에 즉시 반영
  const handleSwitchToPlanner = async () => {
    let origin = chatDraft.originPlace || currentWorkspaceDraft.origin;
    const originName =
      chatDraft.originName || currentWorkspaceDraft.originQuery;
    if (!origin && originName) {
      origin = await resolvePlace(null, originName);
    }
    if (!origin && originName) origin = findFallbackCity(originName);

    let destination =
      chatDraft.destinationPlace || currentWorkspaceDraft.destination;
    const destName =
      chatDraft.destinationName || currentWorkspaceDraft.destinationQuery;
    if (!destination && destName) {
      destination = await resolvePlace(null, destName);
    }
    if (!destination && destName) destination = findFallbackCity(destName);

    workspaceDispatch({
      type: "edit",
      patch: {
        originQuery: origin
          ? origin.name
          : originName || currentWorkspaceDraft.originQuery,
        destinationQuery: destination
          ? destination.name
          : destName || currentWorkspaceDraft.destinationQuery,
        origin: origin || currentWorkspaceDraft.origin,
        destination: destination || currentWorkspaceDraft.destination,
        startDate: chatDraft.startDate || currentWorkspaceDraft.startDate,
        endDate: chatDraft.endDate || currentWorkspaceDraft.endDate,
        departureTime:
          chatDraft.departureTime || currentWorkspaceDraft.departureTime,
        mode: chatDraft.mode || currentWorkspaceDraft.mode,
        selectedCategoryIds:
          chatDraft.selectedCategoryIds ||
          currentWorkspaceDraft.selectedCategoryIds,
        categorySelections:
          chatDraft.categorySelections ||
          currentWorkspaceDraft.categorySelections,
      },
    });

    onSwitchToPlanner();
  };

  // 요약을 확인한 뒤 사용자가 직접 눌렀을 때만 여행 일정을 생성한다.
  const handleGenerateFinalPlan = async () => {
    if (isGeneratingPlan || isLoading) return;
    activeOperation.current?.abort();
    const controller = new AbortController();
    activeOperation.current = controller;
    setIsGeneratingPlan(true);
    setGenerationError(null);
    try {
      // 1. 출발지 좌표 확보
      let origin = chatDraft.originPlace || currentWorkspaceDraft.origin;
      const originName =
        chatDraft.originName ||
        currentWorkspaceDraft.originQuery ||
        currentWorkspaceDraft.origin?.name ||
        "서울";
      if (!origin && originName) {
        origin = await resolvePlace(null, originName, controller.signal);
      }
      if (!origin) origin = findFallbackCity("서울");

      // 2. 도착지 좌표 확보
      let destination =
        chatDraft.destinationPlace || currentWorkspaceDraft.destination;
      const destName =
        chatDraft.destinationName ||
        currentWorkspaceDraft.destinationQuery ||
        currentWorkspaceDraft.destination?.name ||
        "춘천";
      if (!destination && destName) {
        destination = await resolvePlace(null, destName, controller.signal);
      }
      if (!destination) destination = findFallbackCity("춘천");

      if (!origin || !destination)
        throw new Error(
          "출발지 또는 도착지를 찾지 못했습니다. 장소명을 다시 입력해 주세요.",
        );

      const mode = chatDraft.mode || currentWorkspaceDraft.mode || "driving";
      const startDate =
        chatDraft.startDate || currentWorkspaceDraft.startDate;
      const endDate = chatDraft.endDate || currentWorkspaceDraft.endDate;
      const departureTime =
        chatDraft.departureTime ||
        currentWorkspaceDraft.departureTime ||
        "09:30";

      const updatedWorkspaceDraft: TripDraft = {
        ...currentWorkspaceDraft,
        title: `${origin.name}에서 ${destination.name}까지`,
        originQuery: origin.name,
        destinationQuery: destination.name,
        origin,
        destination,
        mode,
        startDate,
        endDate,
        departureTime,
        selectedCategoryIds:
          chatDraft.selectedCategoryIds ||
          currentWorkspaceDraft.selectedCategoryIds ||
          [],
        categorySelections:
          chatDraft.categorySelections ||
          currentWorkspaceDraft.categorySelections ||
          {},
        radiusMeters: 5000,
      };

      // 워크스페이스에 즉시 저장하여 플래너 상태 완성
      workspaceDispatch({ type: "edit", patch: updatedWorkspaceDraft });

      // 일정 생성 API 호출
      const result = await planTrip(updatedWorkspaceDraft, controller.signal);
      if (controller.signal.aborted || activeOperation.current !== controller)
        return;
      workspaceDispatch({ type: "complete", result });
      if (onComplete) onComplete();
      else navigate("/trips");
    } catch (error) {
      if (!controller.signal.aborted)
        setGenerationError(
          error instanceof Error
            ? error.message
            : "일정을 생성하지 못했습니다. 다시 시도해 주세요.",
        );
    } finally {
      if (activeOperation.current === controller) {
        activeOperation.current = null;
        setIsGeneratingPlan(false);
      }
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
                출발·도착 ➔ 날짜·기간·출발시각 ➔ 이동수단 ➔ 선호장소를 차례대로
                묻고 최적 코스를 완성합니다.
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
              onClick={handleSwitchToPlanner}
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
        {messages.map((msg, index) => (
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
                  <div>
                    {msg.role === "model" &&
                    msg.step === 2 &&
                    currentStep === 2 &&
                    index === messages.length - 1
                      ? surveyPrompt(2, chatDraft)
                      : msg.text}
                  </div>

                  {/* 챗봇 대화 버블 안의 인터랙티브 선택 버튼들 */}
                  {isLatestQuestion(msg, index, messages.length) && (
                    <div className="mt-3.5 pt-3 border-t border-stone-200/80">
                      {msg.step === 1 && currentStep === 1 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            추천 인기 경로 바로 선택하기:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              {
                                fromTo: "서울 ➔ 강원 춘천",
                                desc: "호반의 도시, 닭갈비 & 호수 뷰 카페",
                                value: "서울에서 강원도 춘천으로 가고 싶어요",
                              },
                              {
                                fromTo: "서울 ➔ 강원 강릉",
                                desc: "동해안 바다 & 안목해변 커피거리",
                                value: "서울에서 강원도 강릉으로 가고 싶어요",
                              },
                              {
                                fromTo: "서울 ➔ 부산",
                                desc: "해운대 바다 & 미식 식도락 여행",
                                value: "서울에서 부산으로 가고 싶어요",
                              },
                              {
                                fromTo: "수원 ➔ 경주",
                                desc: "천년고도 역사 유적 & 황리단길 카페",
                                value: "수원에서 경주로 가고 싶어요",
                              },
                              {
                                fromTo: "인천 ➔ 전주",
                                desc: "전주 한옥마을 & 전통 한식 맛집",
                                value: "인천에서 전주로 가고 싶어요",
                              },
                              {
                                fromTo: "대전 ➔ 여수",
                                desc: "낭만 여수 밤바다 & 해안 드라이브",
                                value: "대전에서 여수로 가고 싶어요",
                              },
                            ].map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                disabled={isLoading}
                                onClick={() =>
                                  void handleUserResponse(item.value)
                                }
                                className="flex items-start gap-2.5 p-2.5 rounded-xl border border-stone-200 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-600 text-left transition shadow-2xs group cursor-pointer disabled:opacity-50"
                              >
                                <div className="p-1 rounded-lg bg-emerald-800 text-white shrink-0 group-hover:scale-110 transition">
                                  <MapPin className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-stone-900 group-hover:text-emerald-950">
                                    {item.fromTo}
                                  </div>
                                  <div className="text-[11px] text-stone-500 truncate">
                                    {item.desc}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                          <div className="text-[11px] text-stone-400 pt-1">
                            💡 직접 가고 싶은 곳이 있다면 아래 입력창에 편하게
                            입력해 주세요.
                          </div>
                        </div>
                      )}

                      {msg.step === 2 && currentStep === 2 && (
                        <div className="space-y-3">
                          {chatDraft.durationLabel &&
                          chatDraft.departureTime &&
                          !validDate(chatDraft.startDate) ? (
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-emerald-800">
                                {chatDraft.durationLabel} ·{" "}
                                {chatDraft.departureTime} 출발 확인됨
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {["오늘", "내일", "모레"].map((day) => (
                                  <button
                                    key={day}
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => void handleUserResponse(day)}
                                    className="rounded-lg border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
                                  >
                                    {day} 출발
                                  </button>
                                ))}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <label
                                  htmlFor="chat-departure-date"
                                  className="text-xs font-semibold text-stone-600"
                                >
                                  직접 날짜 선택
                                </label>
                                <input
                                  id="chat-departure-date"
                                  type="date"
                                  value={step2SelectedDate}
                                  min={new Date(Date.now() + 9 * 3600000)
                                    .toISOString()
                                    .slice(0, 10)}
                                  onChange={(event) =>
                                    setStep2SelectedDate(event.target.value)
                                  }
                                  className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-800"
                                />
                                <button
                                  type="button"
                                  disabled={!step2SelectedDate || isLoading}
                                  onClick={() =>
                                    void handleUserResponse(step2SelectedDate)
                                  }
                                  className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                                >
                                  이 날짜로 출발
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div>
                                <p className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                                  인기 기간·시각 선택:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {[
                                    {
                                      title: "1박 2일 · 오전 09:30 출발",
                                      badge: "가장 인기",
                                      desc: "여유로운 1박 2일 힐링 코스",
                                      value:
                                        "1박 2일 일정이고, 오전 9시 30분에 출발할게요",
                                    },
                                    {
                                      title: "당일치기 · 오전 09:00 출발",
                                      badge: "알찬 하루",
                                      desc: "하루를 꽉 채우는 근교 당일치기",
                                      value:
                                        "당일치기 일정이고, 오전 9시 정각에 출발할게요",
                                    },
                                    {
                                      title: "2박 3일 · 오전 08:30 출발",
                                      badge: "여유로운 여행",
                                      desc: "2박 3일 넉넉한 힐링 투어",
                                      value:
                                        "2박 3일 일정이고, 오전 8시 30분에 일찍 출발할게요",
                                    },
                                    {
                                      title: "1박 2일 · 오전 10:00 출발",
                                      badge: "브런치 출발",
                                      desc: "여유롭게 아침 먹고 출발",
                                      value:
                                        "1박 2일 일정이고, 오전 10시쯤 여유롭게 출발할게요",
                                    },
                                  ].map((item, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() =>
                                        void handleUserResponse(item.value)
                                      }
                                      className="flex flex-col p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-emerald-50 hover:border-emerald-600 text-left transition shadow-2xs group cursor-pointer disabled:opacity-50"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-xs text-stone-900 group-hover:text-emerald-950">
                                          {item.title}
                                        </span>
                                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                                          {item.badge}
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-stone-500">
                                        {item.desc}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 직접 조합 선택 박스 */}
                              <div className="p-3.5 rounded-xl bg-stone-50/90 border border-stone-200 space-y-3">
                                <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                                  <span>또는 기간과 시각을 직접 조합:</span>
                                  <span className="text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md font-mono text-[11px]">
                                    {step2SelectedDuration} ·{" "}
                                    {step2SelectedTime} 출발
                                  </span>
                                </div>

                                <div>
                                  <span className="text-[11px] font-semibold text-stone-500 block mb-1.5">
                                    여행 기간:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {[
                                      "당일치기",
                                      "1박 2일",
                                      "2박 3일",
                                      "3박 4일",
                                    ].map((dur) => (
                                      <button
                                        key={dur}
                                        type="button"
                                        onClick={() =>
                                          setStep2SelectedDuration(dur)
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                          step2SelectedDuration === dur
                                            ? "bg-emerald-800 text-white shadow-2xs"
                                            : "bg-white border border-stone-200 text-stone-700 hover:border-emerald-500 hover:bg-emerald-50/50"
                                        }`}
                                      >
                                        {dur}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[11px] font-semibold text-stone-500 block mb-1.5">
                                    출발 시각:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {[
                                      "08:00",
                                      "08:30",
                                      "09:00",
                                      "09:30",
                                      "10:00",
                                      "11:00",
                                      "13:00",
                                    ].map((t) => (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => setStep2SelectedTime(t)}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition cursor-pointer ${
                                          step2SelectedTime === t
                                            ? "bg-emerald-800 text-white shadow-2xs"
                                            : "bg-white border border-stone-200 text-stone-700 hover:border-emerald-500 hover:bg-emerald-50/50"
                                        }`}
                                      >
                                        {t}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() =>
                                    void handleUserResponse(
                                      `${step2SelectedDuration} 일정이고, 오전 ${step2SelectedTime}에 출발할게요`,
                                    )
                                  }
                                  className="w-full py-2.5 px-4 rounded-xl bg-[#064e43] hover:bg-[#085a4e] text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="h-4 w-4" />
                                  <span>
                                    {step2SelectedDuration} ·{" "}
                                    {step2SelectedTime} 선택하기
                                  </span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {msg.step === 3 && currentStep === 3 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 text-amber-500" />
                            이동 수단 선택:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {[
                              {
                                title: "🚗 자동차 운전 (추천)",
                                badge: "가장 추천",
                                desc: "권장 경로 & 최단 경로를 비교하고 길목 휴게소와 맛집을 탐색합니다.",
                                value:
                                  "자동차로 직접 운전해서 갈게요. 권장 경로와 최단 경로를 비교해 주세요",
                              },
                              {
                                title: "🚶 도보 산책 & 걷기",
                                badge: "산책 여행",
                                desc: "보행자 전용 경로와 도보로 들르기 좋은 주변 쉼터를 탐색합니다.",
                                value: "도보 산책 위주로 편안하게 걷고 싶어요",
                              },
                            ].map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                disabled={isLoading}
                                onClick={() =>
                                  void handleUserResponse(item.value)
                                }
                                className="flex flex-col p-3 rounded-xl border border-stone-200 bg-white hover:bg-emerald-50 hover:border-emerald-600 text-left transition shadow-2xs group cursor-pointer disabled:opacity-50"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-emerald-950">
                                    {item.title}
                                  </span>
                                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                                    {item.badge}
                                  </span>
                                </div>
                                <span className="text-[11px] text-stone-500 leading-relaxed">
                                  {item.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.step === 4 && currentStep === 4 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            희망하시는 여행 취향 테마를 바로 선택해 보세요:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              {
                                title: "✨ 맛집 + 카페 + 명소 골고루 (추천)",
                                badge: "밸런스 코스",
                                desc: "식사, 전망 카페, 대표 명소를 균형 있게 구성",
                                value:
                                  "맛집, 전망 좋은 카페, 대표 명소까지 골고루 균형 있게 추천해줘",
                              },
                              {
                                title: "☕ 뷰 좋은 감성 카페 & 디저트",
                                badge: "카페 투어",
                                desc: "바다나 호수, 산 전망이 탁 트인 분위기 좋은 카페",
                                value:
                                  "바다나 산 전망이 탁 트인 분위기 좋은 카페 위주로 추천해줘",
                              },
                              {
                                title: "🍽️ 도착지 로컬 맛집 & 향토 음식",
                                badge: "식도락 여행",
                                desc: "도착지에서 즐기는 지역 대표 맛집과 향토 음식",
                                value:
                                  "도착한 뒤 지역 대표 맛집과 향토 음식 위주로 여행하고 싶어요",
                              },
                              {
                                title: "🏞️ 필수 관광명소 & 문화재",
                                badge: "랜드마크",
                                desc: "도착지의 대표 역사 명소와 볼거리",
                                value:
                                  "도착지의 대표적인 역사 유적지와 관광 명소 위주로 둘러보고 싶어요",
                              },
                              {
                                title: "💆 힐링 쉼터 & 자연휴양림",
                                badge: "힐링 쉼",
                                desc: "조용하고 쾌적하게 쉴 수 있는 숲길과 자연공원",
                                value:
                                  "사람 많지 않고 조용히 쉴 수 있는 힐링 자연 쉼터 위주로 추천해줘",
                              },
                              {
                                title: "🛍️ 전통시장 & 로컬 쇼핑",
                                badge: "로컬 마켓",
                                desc: "지역 특산품과 정겨운 시장 먹거리",
                                value:
                                  "전통시장과 지역 특산물 구경할 수 있는 곳 위주로 추천해줘",
                              },
                            ].map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                disabled={isLoading}
                                onClick={() =>
                                  void handleUserResponse(item.value)
                                }
                                className="flex flex-col p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-emerald-50 hover:border-emerald-600 text-left transition shadow-2xs group cursor-pointer disabled:opacity-50"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-xs text-stone-900 group-hover:text-emerald-950">
                                    {item.title}
                                  </span>
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                                    {item.badge}
                                  </span>
                                </div>
                                <span className="text-[11px] text-stone-500 truncate">
                                  {item.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                          <div className="text-[11px] text-stone-400 pt-1">
                            💡 직접 가고 싶은 곳이나 취향이 있다면 아래 입력창에
                            말씀해 주셔도 됩니다.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 5단계 요약 카드 & 최종 생성 버튼 */}
                {msg.isSummaryCard && (
                  <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-950 via-[#064e43] to-[#04332c] text-white p-5 sm:p-6 shadow-xl border border-emerald-600/40 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    {/* 자동 생성 중 안내 배너 */}
                    {isGeneratingPlan && (
                      <div className="p-3.5 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center gap-3 animate-pulse">
                        <Loader2 className="h-5 w-5 text-amber-300 animate-spin shrink-0" />
                        <div className="text-xs text-amber-100">
                          <p className="font-bold text-white text-sm">
                            최적의 여행 경로와 타임라인을 자동 생성하고
                            있습니다...
                          </p>
                          <p className="text-[11px] text-amber-200/90 mt-0.5">
                            ORS 권장/최단 주행 경로 비교 및 길목 명소·식사
                            타임라인 구간 산출 중입니다. 잠시만 기다려 주세요!
                            🚗💨
                          </p>
                        </div>
                      </div>
                    )}
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
                          <span className="text-white/60 text-[11px] block">
                            경로
                          </span>
                          <span className="font-bold text-white">
                            {chatDraft.originName || "출발지 미정"} ➔{" "}
                            {chatDraft.destinationName || "도착지 미정"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10">
                        <Clock className="h-4 w-4 text-emerald-300 shrink-0" />
                        <div>
                          <span className="text-white/60 text-[11px] block">
                            기간 및 출발시각
                          </span>
                          <span className="font-bold text-white">
                            {chatDraft.startDate
                              ? `${chatDraft.startDate} · `
                              : ""}
                            {chatDraft.durationLabel || "일정 미지정"}{" "}
                            {chatDraft.departureTime
                              ? `(${chatDraft.departureTime} 출발)`
                              : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10">
                        <Car className="h-4 w-4 text-emerald-300 shrink-0" />
                        <div>
                          <span className="text-white/60 text-[11px] block">
                            이동 수단
                          </span>
                          <span className="font-bold text-white">
                            {chatDraft.mode === "driving"
                              ? "자동차 운전 (권장/최단 비교)"
                              : "도보 산책"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10">
                        <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
                        <div>
                          <span className="text-white/60 text-[11px] block">
                            취향 테마
                          </span>
                          <span className="font-bold text-white truncate max-w-[180px] block">
                            {chatDraft.preferences || "추천 코스 및 명소"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* AI 자동 매핑된 카테고리 태그 */}
                    {chatDraft.categoryNames &&
                      chatDraft.categoryNames.length > 0 && (
                        <div className="p-3 rounded-xl bg-white/10 border border-white/15">
                          <span className="text-amber-200 text-[11px] font-semibold flex items-center gap-1.5 mb-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                            추천 카테고리 (도착지 여행에 반영)
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {chatDraft.categoryNames.map((name, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/25 text-emerald-100 border border-emerald-400/40 text-[11px] font-medium"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {generationError && (
                      <div className="rounded-xl bg-red-500/20 border border-red-400/40 p-3 text-xs text-red-200">
                        {generationError}
                      </div>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        type="button"
                        disabled={isGeneratingPlan}
                        onClick={() => void handleGenerateFinalPlan()}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-bold px-5 py-3.5 text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingPlan ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>
                              서버 API 최적 경로 & 타임라인 계산 중...
                            </span>
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4" />
                            <span>
                              최적 경로 &{" "}
                              {chatDraft.durationLabel
                                ? `${chatDraft.durationLabel} 맞춤`
                                : "일정별"}{" "}
                              타임라인 생성하기
                            </span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSwitchToPlanner}
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
      {currentStep <= 4 &&
        STEP_CHIPS[currentStep] &&
        !(
          currentStep === 2 &&
          chatDraft.durationLabel &&
          chatDraft.departureTime &&
          !validDate(chatDraft.startDate)
        ) && (
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
        className="flex flex-wrap items-center gap-2 p-3 sm:p-4 bg-white border-t border-stone-200 shrink-0"
      >
        <button
          type="button"
          onClick={handleResetChat}
          className="inline-flex items-center gap-1 rounded-xl border border-stone-300 px-3 py-3 text-xs font-semibold text-stone-600 hover:bg-stone-50"
          aria-label="대화 초기화"
        >
          <RotateCcw className="h-4 w-4" />
          <span>초기화</span>
        </button>
        <input
          type="text"
          maxLength={5000}
          value={inputText}
          disabled={isLoading || currentStep > 4}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            currentStep === 1
              ? "출발지와 도착지를 입력하세요 (예: 서울에서 부산으로)"
              : currentStep === 2
                ? chatDraft.durationLabel &&
                  chatDraft.departureTime &&
                  !validDate(chatDraft.startDate)
                  ? "출발 날짜만 입력하세요 (예: 내일 또는 10월 29일)"
                  : "출발 날짜·기간·시각을 입력하세요 (예: 내일 1박 2일 오전 9시 30분)"
                : currentStep === 3
                  ? "이동 수단을 입력하세요 (예: 자동차 운전)"
                  : currentStep === 4
                    ? "도착 후 즐기고 싶은 여행을 알려주세요 (예: 맛집과 호수 산책)"
                    : "모든 질문이 완료되었습니다. 위의 생성 버튼을 눌러주세요!"
          }
          className="min-w-0 flex-1 rounded-2xl border border-stone-300 bg-stone-50/60 px-3 py-3.5 text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition disabled:opacity-50"
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
