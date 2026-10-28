import {
  compareRoutes,
  getRouteTimeline,
  getDestinationItinerary,
  type TimelineStopRequest,
} from "./route-explorer";
import {
  tripCompareRequest,
  calculateTripDuration,
  type TripDraft,
  type TripResult,
} from "./trip-workspace";
import { validDate } from "./planner-survey";

/** 지도 입력과 채팅이 동일한 경로/도착 후 일정 생성 흐름을 사용한다. */
export async function planTrip(
  draft: TripDraft,
  signal?: AbortSignal,
): Promise<TripResult> {
  const input = tripCompareRequest(draft);
  if (!input) throw new Error("출발지와 도착지를 검색해 선택해 주세요.");
  const duration = calculateTripDuration(draft.startDate, draft.endDate);
  if (
    !validDate(draft.startDate) ||
    !validDate(draft.endDate) ||
    draft.endDate < draft.startDate ||
    duration.days > 10 ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.departureTime)
  )
    throw new Error("출발 날짜·시각과 여행 기간(1~10일)을 확인해 주세요.");
  const comparison = await compareRoutes(input, signal);
  const selected = comparison.routes.find((item) => item.route);
  if (!selected?.route) throw new Error("사용할 수 있는 경로가 없습니다.");
  const points = input.points.map(({ latitude, longitude }) => ({
    latitude,
    longitude,
  }));
  const [hour, minute] = draft.departureTime.split(":").map(Number);
  const start = hour * 60 + minute;
  const minutes = Math.ceil(selected.route.durationSeconds / 60);
  const at = (elapsed: number) => {
    const value = (start + Math.round(elapsed)) % 1440;
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  };
  const stops: TimelineStopRequest[] =
    minutes > 45
      ? [
          {
            label: "이동 중 잠깐 쉬어가기",
            targetTime: at(minutes / 2),
            contentTypeIds: [12, 14, 39],
            categoryIds: [],
            radiusMeters: 5000,
            limit: 3,
          },
        ]
      : [];
  const [timelineResult, destinationResult] = await Promise.allSettled([
    stops.length
      ? getRouteTimeline(
          {
            mode: input.mode,
            points,
            preference: selected.preference,
            departureTime: draft.departureTime,
            stops,
          },
          signal,
        )
      : Promise.resolve(null),
    getDestinationItinerary(
      {
        mode: input.mode,
        points,
        preference: selected.preference,
        startDate: draft.startDate,
        endDate: draft.endDate,
        departureTime: draft.departureTime,
        travelStyle: draft.travelStyle,
        categoryIds: input.categoryIds,
        includeLunch: draft.includeLunch,
        includeDinner: draft.includeDinner,
        lunchTime: draft.lunchTime,
        dinnerTime: draft.dinnerTime,
      },
      signal,
    ),
  ]);
  if (signal?.aborted)
    throw new DOMException("취소된 요청입니다.", "AbortError");
  return {
    title:
      draft.title.trim() ||
      `${draft.origin!.name}에서 ${draft.destination!.name}까지 (${duration.label})`,
    request: input,
    comparison,
    startDate: draft.startDate,
    endDate: draft.endDate,
    departureTime: draft.departureTime,
    durationLabel: duration.label,
    timeline:
      timelineResult.status === "fulfilled" ? timelineResult.value : null,
    destinationItinerary:
      destinationResult.status === "fulfilled" ? destinationResult.value : null,
    destinationItineraryError:
      destinationResult.status === "rejected"
        ? "도착 후 일정을 불러오지 못했습니다. 여행 조건 화면에서 다시 생성해 주세요."
        : null,
  };
}
