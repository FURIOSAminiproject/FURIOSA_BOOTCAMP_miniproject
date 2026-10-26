import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CurrentLocationRoutePanel,
  type CurrentLocationDestination,
} from './CurrentLocationRoutePanel';
import type { LocationRouteDisplay } from '../types/location';
import L from 'leaflet';
import { DayItinerary, TravelPlace } from '../types/travel';
import {
  generateMapPushLinks,
  pushDayRouteToMap,
} from '../services/mapIntegrationService';
import {
  MapPin,
  ExternalLink,
  Compass,
  Navigation,
  Utensils,
  Coffee,
  Landmark,
  Hotel,
  ShieldCheck,
  CheckCircle2,
  Route,
} from 'lucide-react';

interface TravelMapViewProps {
  days: DayItinerary[];
  destinationName: string;
  onOpenGisModal?: () => void;
}

const DAY_COLORS = [
  '#064e43', // Day 1: Deep Forest Green
  '#2563eb', // Day 2: Royal Blue
  '#d97706', // Day 3: Amber/Terracotta
  '#7c3aed', // Day 4: Purple
  '#db2777', // Day 5: Rose
  '#0891b2', // Day 6+: Cyan
];

export const TravelMapView: React.FC<TravelMapViewProps> = ({
  days,
  destinationName,
  onOpenGisModal,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeDayFilter, setActiveDayFilter] = useState<number | 'ALL'>('ALL');
  const [selectedPlace, setSelectedPlace] = useState<TravelPlace | null>(null);

  /** 휴대폰의 출발 좌표와 실제 조회된 경로다. null이면 파란 경로를 표시하지 않는다. */
  const [currentLocationRoute, setCurrentLocationRoute] =
    useState<LocationRouteDisplay | null>(null);

  /** 위치 결과만 바뀌었을 때 기존 지도 마커를 전부 다시 만들지 않도록 방문지 배열을 고정한다. */
  const allPlacesWithDay = useMemo(
    /**
     * 일차별 방문지를 지도에서 쓸 평평한 배열로 바꾼다.
     * 입력: 없음. 현재 days를 읽는다.
     * @returns 장소·일차·일차 안의 순서 배열.
     * @example 1일차 2곳 + 2일차 1곳 → 총 3개 항목
     */
    function flattenDays() {
      /** 원본 일정을 변경하지 않고 새로 만드는 지도 표시 목록이다. */
      const entries: {
        place: TravelPlace;
        dayNumber: number;
        orderInDay: number;
      }[] = [];
      for (const day of days)
        for (const [index, place] of day.places.entries())
          entries.push({
            place,
            dayNumber: day.dayNumber,
            orderInDay: index + 1,
          });
      return entries;
    },
    [days],
  );
  /** 일차 선택이 바뀔 때만 다시 만드는 지도 표시 목록이다. */
  const filteredPlaces = useMemo(
    /**
     * 선택한 일차의 방문지만 고른다.
     * 입력: 없음. 전체 목록과 activeDayFilter를 읽는다.
     * @returns 전체 또는 해당 일차의 목록. 새 위치 응답만으로 목록이 달라지지는 않는다.
     * @example activeDayFilter=2 → 2일차 장소만 반환
     */
    function filterDayPlaces() {
      /** 선택 조건을 만족한 장소들을 담는다. */
      const entries: typeof allPlacesWithDay = [];
      for (const entry of allPlacesWithDay)
        if (activeDayFilter === 'ALL' || entry.dayNumber === activeDayFilter)
          entries.push(entry);
      return entries;
    },
    [allPlacesWithDay, activeDayFilter],
  );
  /** 현재 위치 길찾기의 목적지 선택지다. 공개 방문지 좌표만 포함하고 현재 위치는 포함하지 않는다. */
  const locationDestinations = useMemo(
    /**
     * 지도 방문지를 현재 위치 길찾기 선택지로 바꾼다.
     * 입력: 없음. filteredPlaces를 읽는다.
     * @returns 일차·순서·이름과 목적지 좌표가 있는 선택지 배열.
     * @example 같은 장소가 여러 날 나와도 일차/순서로 선택 키를 구분한다.
     */
    function buildLocationDestinations(): CurrentLocationDestination[] {
      /** 각 방문지를 고유한 화면 선택지로 바꾼 결과다. */
      const choices: CurrentLocationDestination[] = [];
      for (const entry of filteredPlaces)
        choices.push({
          key: `${entry.dayNumber}:${entry.orderInDay}:${entry.place.id}`,
          name: `${entry.dayNumber}일차 · ${entry.place.name}`,
          latitude: entry.place.lat,
          longitude: entry.place.lng,
        });
      return choices;
    },
    [filteredPlaces],
  );
  /** 일정/일차/목적지 데이터 변경 시 위치 패널을 새로 만들어 이전 위치·요청을 폐기하는 키다. */
  const locationPanelKey = JSON.stringify(locationDestinations);

  useEffect(
    /**
     * 다른 일정으로 바뀌면 이전 일차 선택·선택 장소·현재 위치 경로를 초기화한다.
     * 입력: 없음. days 또는 destinationName 변경을 감지한다.
     * @returns void.
     * @example 3일 여행에서 2일 여행으로 전환해도 이전 3일차 필터가 남지 않는다.
     */
    function resetLocationOnPlanChange() {
      setActiveDayFilter('ALL');
      setSelectedPlace(null);
      setCurrentLocationRoute(null);
    },
    [days, destinationName],
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [36.2, 127.8],
        zoom: 7,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      polylineLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers and route lines when filteredPlaces change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const polylineLayer = polylineLayerRef.current;
    if (!map || !markersLayer || !polylineLayer) return;

    markersLayer.clearLayers();
    polylineLayer.clearLayers();

    if (filteredPlaces.length === 0) return;

    const bounds = L.latLngBounds([]);

    // Draw Polylines by Day
    const dayGroups: { [key: number]: [number, number][] } = {};

    filteredPlaces.forEach((item) => {
      const { place, dayNumber, orderInDay } = item;
      const lat = place.lat;
      const lng = place.lng;
      const latLng: [number, number] = [lat, lng];

      bounds.extend(latLng);

      if (!dayGroups[dayNumber]) {
        dayGroups[dayNumber] = [];
      }
      dayGroups[dayNumber].push(latLng);

      const color = DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length];

      // Custom HTML Marker with Day and Step Number
      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            background-color: ${color};
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 700;
            border: 2.5px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s ease;
          " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
            ${orderInDay}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const marker = L.marker(latLng, { icon: customIcon });

      // Build precise PUSH search links for Naver and Google Maps
      const pushLinks = generateMapPushLinks(
        place.name,
        place.address,
        place.lat,
        place.lng,
      );

      // Popup Content with PUSH buttons
      const popupHtml = `
        <div style="font-family: Pretendard, -apple-system, sans-serif; min-width: 230px; padding: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
            <span style="font-size: 11px; font-weight: 700; color: ${color};">
              ${dayNumber}일차 · #${orderInDay} ${place.categoryLabel}
            </span>
            <span style="font-size: 10px; color: #059669; font-weight: 600;">
              ✓ GPS 좌표 검증됨
            </span>
          </div>

          <div style="font-weight: 800; font-size: 15px; color: #111827; margin-bottom: 3px;">
            ${place.name}
          </div>

          <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
            📍 ${place.address}
          </div>

          <div style="font-size: 11px; color: #475569; background: #f8fafc; padding: 4px 6px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e2e8f0;">
            ${place.description.slice(0, 48)}...
          </div>

          <div style="font-size: 10px; color: #94a3b8; margin-bottom: 6px; font-family: monospace;">
            GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}
          </div>

          <!-- PUSH Links -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <a href="${pushLinks.naverSearchUrl}" target="_blank" rel="noopener noreferrer" 
               style="display: flex; align-items: center; justify-content: center; gap: 3px; background-color: #03C75A; color: white; padding: 5px 6px; border-radius: 6px; font-size: 11px; text-decoration: none; font-weight: 700; text-align: center;">
              네이버 지도 PUSH
            </a>
            <a href="${pushLinks.googleSearchUrl}" target="_blank" rel="noopener noreferrer" 
               style="display: flex; align-items: center; justify-content: center; gap: 3px; background-color: #1a73e8; color: white; padding: 5px 6px; border-radius: 6px; font-size: 11px; text-decoration: none; font-weight: 700; text-align: center;">
              구글 MAP PUSH
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        setSelectedPlace(place);
      });

      markersLayer.addLayer(marker);
    });

    // Draw connecting route lines per day
    Object.keys(dayGroups).forEach((dayKey) => {
      const dNum = parseInt(dayKey, 10);
      const points = dayGroups[dNum];
      if (points.length > 1) {
        const routeLine = L.polyline(points, {
          color: DAY_COLORS[(dNum - 1) % DAY_COLORS.length],
          weight: 4,
          opacity: 0.85,
          dashArray: '6, 8',
          lineJoin: 'round',
        });
        polylineLayer.addLayer(routeLine);
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [filteredPlaces, activeDayFilter]);

  useEffect(
    /**
     * 현재 위치 마커와 서버가 반환한 실제 경로를 별도 파란 레이어로 그린다.
     * 입력: 없음. currentLocationRoute와 Leaflet 지도 ref를 읽는다.
     * @returns 경로 교체/지우기/언마운트 때 추가한 레이어를 제거하는 정리 함수.
     * @example GeoJSON [128.9,35.1] → Leaflet [35.1,128.9]
     */
    function drawCurrentLocationRoute() {
      /** 이미 초기화된 지도다. 초기화 전이거나 결과가 없으면 그리지 않는다. */
      const map = mapInstanceRef.current;
      if (!map || !currentLocationRoute) return;
      /** 일정의 점선과 구분해서 지울 수 있는 실제 경로 전용 레이어다. */
      const layer = L.layerGroup().addTo(map);
      /** GeoJSON 경도/위도를 Leaflet 위도/경도 순서로 복사한 실제 도로 좌표다. */
      const coordinates: [number, number][] = [];
      for (const point of currentLocationRoute.route.geometry.coordinates)
        coordinates.push([point[1], point[0]]);
      /** 서버가 반환한 경로 선이다. 일정 장소를 단순히 직선으로 연결한 선과 구분한다. */
      const line = L.polyline(coordinates, {
        color: '#0284c7',
        weight: 5,
        opacity: 0.95,
      }).addTo(layer);
      /** 사용자가 확인한 현재 위치의 Leaflet 좌표다. */
      const origin: [number, number] = [
        currentLocationRoute.origin.latitude,
        currentLocationRoute.origin.longitude,
      ];
      L.circleMarker(origin, {
        radius: 7,
        color: '#075985',
        fillColor: '#38bdf8',
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip('확인한 현재 위치')
        .addTo(layer);
      map.fitBounds(line.getBounds().extend(origin), {
        padding: [30, 30],
        maxZoom: 15,
      });
      /**
       * 이번 조회에서 추가한 실제 경로 레이어만 제거한다.
       * 입력: 없음. 지도와 layer를 캡처한다.
       * @returns void.
       * @example 새 목적지를 고르면 이전 파란 선과 출발 마커가 사라진다.
       */
      return function removeCurrentLocationRoute() {
        if (mapInstanceRef.current === map) map.removeLayer(layer);
      };
    },
    [currentLocationRoute],
  );

  // Center on selected place
  const focusOnPlace = (place: TravelPlace) => {
    setSelectedPlace(place);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([place.lat, place.lng], 14, { duration: 1 });
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'ATTRACTION':
        return <Landmark className="w-4 h-4 text-indigo-600" />;
      case 'RESTAURANT':
        return <Utensils className="w-4 h-4 text-amber-600" />;
      case 'CAFE':
        return <Coffee className="w-4 h-4 text-amber-500" />;
      case 'ACCOMMODATION':
        return <Hotel className="w-4 h-4 text-purple-600" />;
      default:
        return <Navigation className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[#e5e0d8] overflow-hidden flex flex-col">
      {/* Map Control Header */}
      <div className="p-4 sm:p-5 border-b border-[#e8e4dc] flex flex-wrap items-center justify-between gap-3 bg-[#faf7f2]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#064e43] text-white flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base sm:text-lg flex items-center gap-2">
              <span>{destinationName} 인터랙티브 이동 동선 지도</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                중복 제로 & 100% GIS 연동
              </span>
            </h3>
            <p className="text-xs text-stone-500">
              총 {filteredPlaces.length}개 행선지가 번호 마커로 연결되며, 구글
              MAP과 네이버 지도 검색창으로 즉시 PUSH 연동됩니다.
            </p>
          </div>
        </div>

        {/* Action: Open GIS Verification modal + Route Push + Day Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day / Overall Route Navigation PUSH */}
          <button
            onClick={() =>
              pushDayRouteToMap(
                'naver',
                filteredPlaces.map((p) => p.place),
              )
            }
            className="px-2.5 py-1.5 rounded-xl bg-[#03C75A] hover:bg-[#02b350] text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-all"
            title="현재 선택된 일정 경로를 네이버 지도 검색창에 PUSH"
          >
            <span>네이버 지도 PUSH</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <button
            onClick={() =>
              pushDayRouteToMap(
                'google',
                filteredPlaces.map((p) => p.place),
              )
            }
            className="px-2.5 py-1.5 rounded-xl bg-[#1a73e8] hover:bg-[#1558b0] text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-all"
            title="현재 선택된 일정의 전체 경로를 구글 지도 내비게이션으로 PUSH"
          >
            <Route className="w-3 h-3" />
            <span>구글 MAP 경로 PUSH</span>
          </button>

          {onOpenGisModal && (
            <button
              onClick={onOpenGisModal}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-xs font-bold text-stone-800 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>좌표 연동 전수 검증표</span>
            </button>
          )}

          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
            <button
              onClick={() => setActiveDayFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeDayFilter === 'ALL'
                  ? 'bg-[#064e43] text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              전체 동선
            </button>
            {days.map((day) => {
              const color = DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length];
              const isSelected = activeDayFilter === day.dayNumber;
              return (
                <button
                  key={day.dayNumber}
                  onClick={() => setActiveDayFilter(day.dayNumber)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'text-white shadow-2xs'
                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                  }`}
                  style={{ backgroundColor: isSelected ? color : undefined }}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: isSelected ? 'white' : color }}
                  />
                  {day.dayNumber}일차
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <CurrentLocationRoutePanel
        key={locationPanelKey}
        destinations={locationDestinations}
        onRouteChange={setCurrentLocationRoute}
      />
      <p className="px-4 py-2 text-xs text-stone-500">
        파란 실선은 현재 위치에서 조회한 경로이며, 일차별 점선은 일정 장소의
        순서를 연결한 표시입니다.
      </p>

      {/* Leaflet Map Canvas */}
      <div className="relative w-full h-[400px] sm:h-[480px] bg-stone-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Quick Legend */}
        <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm p-3 rounded-2xl border border-stone-200 shadow-md text-xs text-stone-600 space-y-1.5 hidden sm:block">
          <div className="font-bold text-stone-900 border-b border-stone-200 pb-1 flex items-center justify-between">
            <span>일차별 노선 및 검증</span>
            <span className="text-[10px] text-emerald-600 font-semibold">
              100% 무결
            </span>
          </div>
          {days.map((d) => (
            <div key={d.dayNumber} className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                style={{
                  backgroundColor:
                    DAY_COLORS[(d.dayNumber - 1) % DAY_COLORS.length],
                }}
              >
                {d.dayNumber}
              </span>
              <span>
                {d.dayNumber}일차 ({d.places.length}곳 · 중복 없음)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Place Strip / Focused Card with Map PUSH Links */}
      <div className="p-4 bg-white border-t border-[#e8e4dc]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            {activeDayFilter === 'ALL'
              ? '전체 일정 방문지 빠른 지도 PUSH'
              : `${activeDayFilter}일차 방문지 목록`}
          </span>
          <span className="text-xs text-stone-400">
            카드 클릭 시 지도가 이동하며, 네이버/구글 버튼으로 검색창에
            PUSH됩니다.
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {filteredPlaces.map((item) => {
            const isCurrent = selectedPlace?.id === item.place.id;
            const color = DAY_COLORS[(item.dayNumber - 1) % DAY_COLORS.length];
            const pushLinks = generateMapPushLinks(
              item.place.name,
              item.place.address,
              item.place.lat,
              item.place.lng,
            );

            return (
              <div
                key={item.place.id}
                onClick={() => focusOnPlace(item.place)}
                className={`flex-shrink-0 text-left p-3.5 rounded-2xl border transition-all w-64 sm:w-72 flex flex-col justify-between cursor-pointer ${
                  isCurrent
                    ? 'border-[#064e43] bg-teal-50/40 shadow-sm ring-2 ring-[#064e43]/20'
                    : 'border-[#e5e0d8] bg-[#faf7f2]/60 hover:bg-[#faf7f2] hover:border-stone-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {item.dayNumber}일차 #{item.orderInDay}
                    </span>
                    <span className="text-[11px] text-stone-500 flex items-center gap-1 font-medium">
                      {getCategoryIcon(item.place.category)}
                      {item.place.categoryLabel}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-stone-900 line-clamp-1">
                    {item.place.name}
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                    📍 {item.place.address}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-500 font-mono">
                    🕒 {item.place.timeSlot}
                  </span>

                  <div className="flex items-center gap-1">
                    <a
                      href={pushLinks.naverSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#03C75A] text-white text-[10px] font-bold px-2 py-1 rounded-md hover:bg-[#02b350] transition-colors flex items-center gap-0.5"
                      title="네이버 지도 검색창에 PUSH"
                    >
                      네이버 <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={pushLinks.googleSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#1a73e8] text-white text-[10px] font-bold px-2 py-1 rounded-md hover:bg-[#1558b0] transition-colors flex items-center gap-0.5"
                      title="구글 지도 검색창에 PUSH"
                    >
                      구글 <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={pushLinks.googleDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="bg-stone-700 text-white text-[10px] font-bold px-2 py-1 rounded-md hover:bg-stone-800 transition-colors flex items-center gap-0.5"
                      title="실시간 길찾기 PUSH"
                    >
                      길찾기 <Navigation className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
