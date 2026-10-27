import React from "react";
import {
  BASE_MAP_LEGEND,
  MAP_POINT_COLORS,
  ROUTE_COLORS,
  type LegendSymbol,
} from "./route-map-palette";

interface RouteMapLegendProps {
  /** 결과 지도는 배경 안내를 처음부터 펼치고, 작은 입력 미리보기 지도는 접어둔다. */
  compact?: boolean;
  /** 실제로 반환된 경로만 범례에 표시한다. 실패한 경로를 지도에 있는 것처럼 설명하지 않는다. */
  routePreferences: readonly (keyof typeof ROUTE_COLORS)[];
  /** 지도에 출발 마커가 있을 때 true. */
  showOrigin: boolean;
  /** 지도에 도착 마커가 있을 때 true. */
  showDestination: boolean;
  /** 현재 선택 경로의 추천 장소 마커가 있을 때 true. */
  showPlaces: boolean;
}

/**
 * 색상뿐 아니라 선/점/면의 모양을 보여 주는 장식용 견본이다.
 * 입력: color=견본 색, symbol=표시 모양. 실제 경로/지도 데이터는 읽지 않는다.
 * 출력: 화면용 React 요소. 옆에 글자 설명이 있으므로 견본은 스크린리더에서 숨긴다.
 * 예: <LegendSwatch color="#0369a1" symbol="line" /> → 파란 실선.
 */
function LegendSwatch({
  color,
  symbol,
}: {
  color: string;
  symbol: LegendSymbol;
}) {
  if (symbol === "dot")
    return (
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full border border-black/15"
        style={{ backgroundColor: color }}
      />
    );
  if (symbol === "area")
    return (
      <span
        aria-hidden="true"
        className="h-4 w-7 shrink-0 rounded border border-stone-400"
        style={{ backgroundColor: color }}
      />
    );
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-8 shrink-0 items-center rounded bg-stone-200 px-0.5"
    >
      <span
        className="block w-full border-t-[4px]"
        style={{
          borderTopColor: color,
          borderTopStyle: symbol === "dashed" ? "dashed" : "solid",
        }}
      />
    </span>
  );
}

/**
 * 여행 경로·마커와 배경지도 색상을 구분해 지도 아래에서 설명한다.
 * 입력: compact=작은 미리보기 여부, routePreferences=성공 경로 목록,
 * showOrigin/showDestination/showPlaces=현재 표시 중인 마커 여부.
 * 출력: 한국어 범례와 기본 지도 색상 접기/펼치기 UI. API 호출·지도 이동·좌표 저장은 하지 않는다.
 * 예: routePreferences=['recommended'], showPlaces=false → 권장 경로만 표시하고 추천 장소 항목은 생략.
 */
export function RouteMapLegend({
  compact = false,
  routePreferences,
  showOrigin,
  showDestination,
  showPlaces,
}: RouteMapLegendProps) {
  /** 실제 지도에 있는 경로·점에 대한 설명이다. 색상은 지도와 같은 상수를 읽는다. */
  const overlays: {
    id: string;
    color: string;
    symbol: LegendSymbol;
    label: string;
  }[] = [];
  if (routePreferences.includes("recommended"))
    overlays.push({
      id: "recommended",
      color: ROUTE_COLORS.recommended,
      symbol: "line",
      label: "파란 실선 · 권장 경로",
    });
  if (routePreferences.includes("shortest"))
    overlays.push({
      id: "shortest",
      color: ROUTE_COLORS.shortest,
      symbol: "dashed",
      label: "주황 점선 · 최단 경로",
    });
  if (showOrigin)
    overlays.push({
      id: "origin",
      color: MAP_POINT_COLORS.origin,
      symbol: "dot",
      label: "파란 점 · 출발지",
    });
  if (showDestination)
    overlays.push({
      id: "destination",
      color: MAP_POINT_COLORS.destination,
      symbol: "dot",
      label: "붉은 점 · 도착지",
    });
  if (showPlaces)
    overlays.push({
      id: "place",
      color: MAP_POINT_COLORS.place,
      symbol: "dot",
      label: "초록 점 · 추천 장소",
    });

  return (
    <aside
      aria-label="지도 색상과 기호 안내"
      className="rounded-2xl border border-stone-200 bg-white p-4 text-xs text-stone-600 space-y-3"
    >
      <h3 className="text-sm font-bold text-stone-900">지도 색상 안내</h3>
      {overlays.length > 0 && (
        <div className="space-y-2">
          <p className="font-semibold text-stone-800">이동 경로와 장소</p>
          <ul
            aria-label="이동 경로와 장소 범례"
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            {overlays.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2">
                <LegendSwatch color={entry.color} symbol={entry.symbol} />
                <span>{entry.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <details open={!compact} className="group border-t border-stone-100 pt-3">
        <summary className="cursor-pointer font-semibold text-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
          배경지도 색상{" "}
          <span className="font-normal text-stone-500">
            · 눌러서 접기/펼치기
          </span>
        </summary>
        <ul
          aria-label="배경지도 색상 범례"
          className="mt-3 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3"
        >
          {BASE_MAP_LEGEND.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2.5 min-w-0">
              <LegendSwatch color={entry.color} symbol={entry.symbol} />
              <div className="min-w-0 leading-relaxed">
                <p className="font-medium text-stone-800">{entry.label}</p>
                <p>{entry.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </details>
    </aside>
  );
}
