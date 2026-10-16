import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DayItinerary, TravelPlace } from '../types/travel';
import { MapPin, ExternalLink, Compass, Navigation, Utensils, Coffee, Landmark, Hotel } from 'lucide-react';

interface TravelMapViewProps {
  days: DayItinerary[];
  destinationName: string;
}

const DAY_COLORS = [
  '#2563eb', // Day 1: Royal Blue
  '#059669', // Day 2: Emerald Green
  '#d97706', // Day 3: Amber
  '#7c3aed', // Day 4: Purple
  '#db2777', // Day 5: Rose
  '#0891b2'  // Day 6+: Cyan
];

export const TravelMapView: React.FC<TravelMapViewProps> = ({ days, destinationName }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeDayFilter, setActiveDayFilter] = useState<number | 'ALL'>('ALL');
  const [selectedPlace, setSelectedPlace] = useState<TravelPlace | null>(null);

  // Flatten places
  const allPlacesWithDay: { place: TravelPlace; dayNumber: number; orderInDay: number }[] = [];
  days.forEach(day => {
    day.places.forEach((p, idx) => {
      allPlacesWithDay.push({
        place: p,
        dayNumber: day.dayNumber,
        orderInDay: idx + 1
      });
    });
  });

  // Filter places based on active day
  const filteredPlaces = activeDayFilter === 'ALL'
    ? allPlacesWithDay
    : allPlacesWithDay.filter(item => item.dayNumber === activeDayFilter);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Center of Korea
      const map = L.map(mapContainerRef.current, {
        center: [36.2, 127.8],
        zoom: 7,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      polylineLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // cleanup on unmount
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

    filteredPlaces.forEach(item => {
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
        popupAnchor: [0, -18]
      });

      const marker = L.marker(latLng, { icon: customIcon });

      // Popup Content
      const popupHtml = `
        <div style="font-family: Pretendard, sans-serif; min-width: 200px; padding: 4px;">
          <div style="font-size: 11px; font-weight: 700; color: ${color}; margin-bottom: 2px;">
            ${dayNumber}일차 · #${orderInDay} ${place.categoryLabel}
          </div>
          <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 4px;">
            ${place.name}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
            🕒 ${place.timeSlot}
          </div>
          <div style="font-size: 11px; color: #475569; background: #f1f5f9; padding: 4px 6px; border-radius: 4px; margin-bottom: 8px;">
            ${place.description.slice(0, 50)}...
          </div>
          <div style="display: flex; gap: 4px;">
            <a href="https://map.naver.com/v5/search/${encodeURIComponent(place.name)}" target="_blank" rel="noopener noreferrer" 
               style="display: inline-block; background-color: #03C75A; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-decoration: none; font-weight: 600;">
              네이버 지도
            </a>
            <a href="https://map.kakao.com/link/search/${encodeURIComponent(place.name)}" target="_blank" rel="noopener noreferrer" 
               style="display: inline-block; background-color: #FEE500; color: #191919; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-decoration: none; font-weight: 600;">
              카카오맵
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
    Object.keys(dayGroups).forEach(dayKey => {
      const dNum = parseInt(dayKey, 10);
      const points = dayGroups[dNum];
      if (points.length > 1) {
        const routeLine = L.polyline(points, {
          color: DAY_COLORS[(dNum - 1) % DAY_COLORS.length],
          weight: 4,
          opacity: 0.8,
          dashArray: '6, 8',
          lineJoin: 'round'
        });
        polylineLayer.addLayer(routeLine);
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [filteredPlaces, activeDayFilter]);

  // Center on selected place
  const focusOnPlace = (place: TravelPlace) => {
    setSelectedPlace(place);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([place.lat, place.lng], 14, { duration: 1 });
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'ATTRACTION': return <Landmark className="w-4 h-4 text-indigo-600" />;
      case 'RESTAURANT': return <Utensils className="w-4 h-4 text-amber-600" />;
      case 'CAFE': return <Coffee className="w-4 h-4 text-amber-500" />;
      case 'ACCOMMODATION': return <Hotel className="w-4 h-4 text-purple-600" />;
      default: return <Navigation className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
      {/* Map Control Header */}
      <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base sm:text-lg flex items-center gap-2">
              <span>{destinationName} 인터랙티브 이동 동선 지도</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                실시간 연동
              </span>
            </h3>
            <p className="text-xs text-stone-500">
              총 {filteredPlaces.length}개 행선지가 번호 마커와 순환 경로로 지도에 표시됩니다.
            </p>
          </div>
        </div>

        {/* Day Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          <button
            onClick={() => setActiveDayFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeDayFilter === 'ALL'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            전체 동선 보기
          </button>
          {days.map(day => {
            const color = DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length];
            const isSelected = activeDayFilter === day.dayNumber;
            return (
              <button
                key={day.dayNumber}
                onClick={() => setActiveDayFilter(day.dayNumber)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'text-white shadow-sm'
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

      {/* Leaflet Map Canvas */}
      <div className="relative w-full h-[400px] sm:h-[480px] bg-stone-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        
        {/* Floating Quick Legend */}
        <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm p-2.5 rounded-xl border border-stone-200 shadow-md text-xs text-stone-600 space-y-1 hidden sm:block">
          <div className="font-semibold text-stone-800 border-b border-stone-200 pb-1 mb-1">
            일차별 노선 안내
          </div>
          {days.map(d => (
            <div key={d.dayNumber} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                style={{ backgroundColor: DAY_COLORS[(d.dayNumber - 1) % DAY_COLORS.length] }}
              >
                {d.dayNumber}
              </span>
              <span>{d.dayNumber}일차 ({d.places.length}곳)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Place Strip / Focused Card */}
      <div className="p-4 bg-white border-t border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            {activeDayFilter === 'ALL' ? '전체 일정 행선지 빠른 이동' : `${activeDayFilter}일차 행선지 순서`}
          </span>
          <span className="text-xs text-stone-400">
            카드 클릭 시 지도가 해당 위치로 이동합니다.
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
          {filteredPlaces.map(item => {
            const isCurrent = selectedPlace?.id === item.place.id;
            const color = DAY_COLORS[(item.dayNumber - 1) % DAY_COLORS.length];
            return (
              <button
                key={item.place.id}
                onClick={() => focusOnPlace(item.place)}
                className={`flex-shrink-0 text-left p-3 rounded-xl border transition-all w-52 sm:w-60 flex flex-col justify-between ${
                  isCurrent
                    ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-2 ring-blue-500/20'
                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100 hover:border-stone-300'
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
                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                      {getCategoryIcon(item.place.category)}
                      {item.place.categoryLabel}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 line-clamp-1">
                    {item.place.name}
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                    {item.place.address}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-stone-500 font-medium">🕒 {item.place.timeSlot}</span>
                  <a
                    href={`https://map.naver.com/v5/search/${encodeURIComponent(item.place.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-0.5 hover:underline"
                  >
                    네이버지도 <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
