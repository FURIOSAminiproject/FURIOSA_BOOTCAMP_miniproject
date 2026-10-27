/** 지도와 범례가 함께 쓰는 경로·마커 색상. 한쪽만 바꿔 설명과 실제 표시가 달라지는 것을 막는다. */
export const ROUTE_COLORS = {
  /** 권장 경로의 파란 실선. */
  recommended: "#0369a1",
  /** 최단 경로의 주황 점선. 배경지도 도로 색과 구분한다. */
  shortest: "#c2410c",
} as const;

/** 출발·도착·추천 장소의 점 마커 색상이다. */
export const MAP_POINT_COLORS = {
  origin: "#1d4ed8",
  destination: "#be123c",
  place: "#15803d",
} as const;

/** 범례의 견본이 선/점/면 중 무엇인지 나타낸다. 색을 구분하기 어려워도 모양과 글자로 읽을 수 있다. */
export type LegendSymbol = "line" | "dashed" | "dot" | "area";

export interface MapLegendEntry {
  /** React 목록에서 사용할 고유 키. 외부 장소 ID와는 무관하다. */
  id: string;
  /** 대표 색상. 배경 타일은 확대 수준이나 스타일 변경에 따라 조금 달라질 수 있다. */
  color: string;
  /** 선/점/면의 모양. */
  symbol: LegendSymbol;
  /** 색과 모양을 함께 설명하는 한국어 이름. */
  label: string;
  /** 해당 표시가 나타내는 지도 요소. */
  description: string;
}

/**
 * 현재 사용하는 OpenStreetMap Standard 배경지도의 대표 표기다.
 * 도로 색은 OSM 도로 분류에 따른 표시이며 한국의 법정 도로 등급이나 차량 통행 허가를 보증하지 않는다.
 * 근거: openstreetmap-carto의 road-colors-generated.mss, roads.mss, buildings.mss, landcover.mss.
 * 범례에는 대표 항목만 담는다. 지도 이미지에서 픽셀을 읽어 지물을 판별하는 데이터는 아니다.
 */
export const BASE_MAP_LEGEND: readonly MapLegendEntry[] = [
  {
    id: "motorway",
    color: "#e892a2",
    symbol: "line",
    label: "분홍색 도로",
    description: "고속도로급 도로",
  },
  {
    id: "primary",
    color: "#fcd6a4",
    symbol: "line",
    label: "주황·살구색 도로",
    description: "주요 간선도로",
  },
  {
    id: "secondary",
    color: "#f7fabf",
    symbol: "line",
    label: "노란색 도로",
    description: "간선도로 · 소월로 등",
  },
  {
    id: "local",
    color: "#ffffff",
    symbol: "line",
    label: "흰색 도로",
    description: "일반도로·골목길",
  },
  {
    id: "footway",
    color: "#fa8072",
    symbol: "dashed",
    label: "붉은 점선",
    description: "보행로·산책로 등",
  },
  {
    id: "building",
    color: "#d9d0c9",
    symbol: "area",
    label: "회갈색 영역",
    description: "건물",
  },
  {
    id: "retail",
    color: "#ffd6d1",
    symbol: "area",
    label: "분홍색 영역",
    description: "상점·상업지역",
  },
  {
    id: "green",
    color: "#c8facc",
    symbol: "area",
    label: "녹색 영역",
    description: "공원·숲·녹지",
  },
  {
    id: "water",
    color: "#aad3df",
    symbol: "area",
    label: "하늘색 영역",
    description: "강·호수·바다",
  },
];
