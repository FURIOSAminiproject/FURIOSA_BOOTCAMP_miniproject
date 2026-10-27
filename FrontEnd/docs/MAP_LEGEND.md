# 지도 색상·기호 범례

2026-10-27 기준. 배포 앱 `FrontEnd/v1`의 `RouteExplorerMap` 아래에서 경로 표시와 OpenStreetMap 배경지도 색상을 구분해 설명한다.

## 화면 위치와 사용법

- `/trips` 결과 화면과 `/routes` 호환 화면: 지도 아래 **지도 색상 안내**. 배경지도 설명을 처음부터 펼쳐 표시한다.
- `/trips/new`의 작은 출발·도착 미리보기: 같은 범례를 표시하되 배경 설명은 처음에 접어둔다.
- **배경지도 색상** 제목을 누르거나 키보드로 초점을 옮겨 Enter/Space를 누르면 접고 펼칠 수 있다. 별도 API 호출이나 지도 재생성은 하지 않는다.
- 범례를 지도 아래에 두어 길찾기 선·줌 버튼·추천 장소를 가리지 않는다. 좁은 화면에서 줄바꿈하며 색과 함께 실선/점선/점/면 및 한국어 설명을 표시한다.

## 우리 서비스가 추가한 표시

| 표시 | 의미 |
|---|---|
| 파란 실선 | 권장 경로 |
| 주황 점선 | 최단 경로 |
| 파란 점 | 출발지 |
| 붉은 점 | 도착지 |
| 초록 점 | 현재 선택 경로의 추천 장소 |

실제로 응답이 있는 경로와 현재 지도에 있는 마커의 항목만 표시한다. 예를 들어 한 경로가 실패하면 해당 선의 설명은 숨기고, 추천 장소가 없으면 초록 점 항목도 숨긴다. 출발지만 선택한 입력 미리보기에서는 출발지 항목만 보인다.

권장/최단 색상은 자동차/도보 선택과 별개다. 파란 선이 곧 자동차 경로라는 의미는 아니다. 현재 선택한 이동 방식으로 계산한 권장 경로를 뜻한다.

## 배경지도의 대표 색상

| 색·모양 | 대표 의미 |
|---|---|
| 분홍색 도로 | 고속도로급 도로 |
| 주황·살구색 도로 | 주요 간선도로 |
| 노란색 도로 | 간선도로. 앞서 확인한 소월로는 OSM `highway=secondary` |
| 흰색 도로 | 일반도로·골목길 |
| 붉은 점선 | 보행로·산책로 등 |
| 회갈색 영역 | 건물 |
| 분홍색 영역 | 상점·상업지역 |
| 녹색 영역 | 공원·숲·녹지 |
| 하늘색 영역 | 강·호수·바다 |

현재 사용하는 OpenStreetMap Standard 스타일의 대표 항목이다. 모든 지물을 포함하는 공식 전체 범례나 한국의 법정 도로 등급표가 아니다. 확대 수준과 지도 스타일 버전에 따라 색·표현이 달라질 수 있다.

화면에는 색상 견본과 항목별 의미만 표시한다. 지도 스타일의 일반 설명, 교량·터널 관련 주의 문장, 데이터 갱신 시점 설명은 표시하지 않는다.

표기 근거는 OSM Standard 스타일의 원본이다:

- [도로 색상](https://github.com/openstreetmap-carto/openstreetmap-carto/blob/master/style/road-colors-generated.mss)
- [일반도로·보행로 스타일](https://github.com/openstreetmap-carto/openstreetmap-carto/blob/master/style/roads.mss)
- [건물 색상](https://github.com/openstreetmap-carto/openstreetmap-carto/blob/master/style/buildings.mss)
- [상업지역·녹지 색상](https://github.com/openstreetmap-carto/openstreetmap-carto/blob/master/style/landcover.mss)

## 코드 구조와 수정 방법

`FrontEnd/v1/src/components/` 기준:

| 파일 | 역할 |
|---|---|
| `route-map-palette.ts` | 지도와 범례가 공유하는 경로·점 색상, 배경 색상 정의 |
| `RouteMapLegend.tsx` | 견본과 한국어 설명, 접기/펼치기 UI |
| `RouteExplorerMap.tsx` | 실제 Leaflet 선/마커와 같은 색상을 사용하고 현재 표시 항목을 범례에 전달 |
| `TripResultsPage.tsx` | 기존 중복 범례를 제거하고 지도 컴포넌트의 공통 범례 사용 |

`RouteMapLegend`의 입력은 `compact`, 성공 경로 목록 `routePreferences`, 출발/도착/추천 장소 표시 여부 `showOrigin/showDestination/showPlaces`다. 출력은 React 범례 요소이며 네트워크 요청·위치 조회·DB 저장은 수행하지 않는다. `LegendSwatch`는 `color`와 `symbol`을 받아 선/점/면 견본을 만든다. 두 함수 위에 입력·출력·예시 주석을 작성했다.

경로·점 색상을 변경할 때는 `route-map-palette.ts`를 수정한다. 지도와 설명이 다른 색을 사용하지 않도록 공통 상수를 유지한다. `RouteExplorerMap`의 기존 `ROUTE_COLORS` 재내보내기는 결과 카드의 import 호환용이다. 배경 타일 제공자를 바꾸면 이 표와 `BASE_MAP_LEGEND`도 재검토한다.

## 검증

- Node 22 전체 타입 검사, 기존 여행 상태·분류 테스트 11개, 운영 빌드 통과.
- 실제 React DOM·Leaflet에 연결한 브라우저 검증 6개를 1280px와 390px 환경에서 통과: 표시 항목, 실제 선/점 색상, 접기/펼치기 시 지도 유지, 경로 실패·선택 변경 시 항목 갱신, 입력 미리보기의 초기 상태, 가로 넘침을 확인했다.
- 브라우저에서 Enter 키로 배경 설명을 접고 다시 펼치는 동작도 확인했다.
- 브라우저 검증의 경로·장소는 모의 데이터이며, 외부 지도 타일은 빈 레이어로 대체했다. 실지도 전체 지물의 색을 자동 판정한 검증이나 운영 배포 완료를 의미하지 않는다. 실제 휴대폰은 사용하지 않았다.
- 검증 전용 코드·로컬 서버는 저장소 밖에 보관한다. 새 의존성이나 새 API는 추가하지 않았다.
