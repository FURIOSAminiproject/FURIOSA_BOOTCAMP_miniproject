import React, { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import type { SearchPlace } from "../services/route-explorer";
import type { LocationRouteMode } from "../types/location";
import { requestLocationRoute } from "../services/location/route-client";

type Estimate =
  | { key: string; status: "loading" }
  | { key: string; status: "success"; seconds: number; meters: number }
  | { key: string; status: "error"; message: string };

function formatDuration(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return minutes < 60
    ? `약 ${minutes}분`
    : `약 ${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ""}`;
}

/** 두 위치와 이동 방식이 확정되면 권장 경로의 예상시간만 미리 조회한다. 장소 추천 DB는 조회하지 않는다. */
export function TripRouteEstimate({
  origin,
  destination,
  mode,
}: {
  origin: SearchPlace | null;
  destination: SearchPlace | null;
  mode: LocationRouteMode;
}) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [retry, setRetry] = useState(0);
  const fromLat = origin?.latitude;
  const fromLon = origin?.longitude;
  const toLat = destination?.latitude;
  const toLon = destination?.longitude;
  // 이름·추천 카테고리·반경 변경에는 재요청하지 않는다. 좌표와 이동 방식만 경로 계산에 사용한다.
  const key =
    origin && destination
      ? JSON.stringify([mode, fromLat, fromLon, toLat, toLon])
      : null;

  useEffect(() => {
    if (!key) {
      setEstimate(null);
      return;
    }
    const controller = new AbortController();
    setEstimate({ key, status: "loading" });
    // 교환·이동 방식 연속 선택을 모아서 불필요한 호출을 줄인다. 같은 경로는 기존 서버 캐시가 재사용된다.
    const timer = window.setTimeout(() => {
      void requestLocationRoute(
        {
          mode,
          preference: "recommended",
          points: [
            { latitude: fromLat!, longitude: fromLon! },
            { latitude: toLat!, longitude: toLon! },
          ],
        },
        { signal: controller.signal },
      )
        .then((route) => {
          if (!controller.signal.aborted)
            setEstimate({
              key,
              status: "success",
              seconds: route.durationSeconds,
              meters: route.distanceMeters,
            });
        })
        .catch((failure) => {
          if (!controller.signal.aborted)
            setEstimate({
              key,
              status: "error",
              message:
                failure instanceof Error
                  ? failure.message
                  : "예상시간을 불러오지 못했습니다.",
            });
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, mode, fromLat, fromLon, toLat, toLon, retry]);

  // effect가 실행되기 전 한 프레임에도 이전 좌표/이동 방식의 시간을 보여주지 않는다.
  const current = estimate?.key === key ? estimate : null;
  const loading = Boolean(key && (!current || current.status === "loading"));
  return (
    <section
      aria-label="예상 이동시간"
      className="border-t border-white/15 pt-4 space-y-2"
    >
      <p className="flex items-center gap-2 text-xs text-emerald-100">
        <Clock3 className="h-4 w-4" />
        예상 이동시간
      </p>
      <div role="status" aria-live="polite" aria-busy={loading}>
        {!key ? (
          <p className="text-xs text-emerald-100/80">
            출발지와 도착지를 선택하면 자동으로 계산해요.
          </p>
        ) : loading ? (
          <p className="text-sm font-semibold">이동시간을 계산하고 있어요…</p>
        ) : current?.status === "success" ? (
          <>
            <p className="text-2xl font-bold tracking-tight">
              {formatDuration(current.seconds)}
            </p>
            <p className="text-xs text-emerald-100">
              {mode === "driving" ? "자동차" : "도보"} 권장 경로 ·{" "}
              {current.meters < 1000
                ? `${Math.round(current.meters)}m`
                : `${(current.meters / 1000).toFixed(1)}km`}
            </p>
          </>
        ) : current?.status === "error" ? (
          <div className="text-xs text-emerald-50">
            <p>{current.message}</p>
            <button
              type="button"
              onClick={() => setRetry((count) => count + 1)}
              className="mt-2 underline"
            >
              예상시간 다시 계산
            </button>
          </div>
        ) : null}
      </div>
      {key && (
        <p className="text-[11px] leading-relaxed text-emerald-100/70">
          선택한 조건에 따라 자동 갱신됩니다. 실시간 교통 정체는 반영하지
          않습니다.
        </p>
      )}
    </section>
  );
}
