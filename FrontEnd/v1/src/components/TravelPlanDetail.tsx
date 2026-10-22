import React, { useState } from 'react';
import { FullTravelPlan, TravelPlace } from '../types/travel';
import { TravelMapView } from './TravelMapView';
import { LocalExpertChatModal } from './LocalExpertChatModal';
import { SmartPackingChecklistModal } from './SmartPackingChecklistModal';
import { HourlyWeatherOutfitModal } from './HourlyWeatherOutfitModal';
import { CalendarSyncModal } from './CalendarSyncModal';
import { generateMapPushLinks } from '../services/mapIntegrationService';
import { buildGoogleCalendarUrl } from '../services/calendarExportService';
import { ShieldCheck, CheckCircle2, Clock, RotateCcw, Printer, Share2, DollarSign, Calendar, Users, MapPin, Hotel, Navigation, Utensils, Coffee, Landmark, ChevronDown, ChevronUp, ExternalLink, Globe, MessageSquare, Sparkles, Sun, Shirt, Briefcase, LifeBuoy } from 'lucide-react';

interface TravelPlanDetailProps {
  plan: FullTravelPlan;
  isAdmin: boolean;
  onOpenApprovalModal: () => void;
  onOpenShareModal: () => void;
  onPrint: () => void;
  onOpenGisModal: () => void;
}

export const TravelPlanDetail: React.FC<TravelPlanDetailProps> = ({
  plan,
  isAdmin,
  onOpenApprovalModal,
  onOpenShareModal,
  onPrint,
  onOpenGisModal
}) => {
  const { request, costs, selectedAccommodation, transportGuide, agentAuditReport, days, gisMapAudit } = plan;
  const [collapsedDays, setCollapsedDays] = useState<{ [key: number]: boolean }>({});
  const [isExpertChatOpen, setIsExpertChatOpen] = useState(false);
  const [isSmartPackingOpen, setIsSmartPackingOpen] = useState(false);
  const [isHourlyWeatherOpen, setIsHourlyWeatherOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const toggleDayCollapse = (dayNum: number) => {
    setCollapsedDays(prev => ({ ...prev, [dayNum]: !prev[dayNum] }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ATTRACTION': return <Landmark className="w-4 h-4 text-indigo-600" />;
      case 'RESTAURANT': return <Utensils className="w-4 h-4 text-amber-600" />;
      case 'CAFE': return <Coffee className="w-4 h-4 text-amber-500" />;
      case 'ACCOMMODATION': return <Hotel className="w-4 h-4 text-purple-600" />;
      default: return <Navigation className="w-4 h-4 text-blue-600" />;
    }
  };

  // Collect culinary places for poetic reviews
  const culinaryPlaces: TravelPlace[] = [];
  days.forEach(d => {
    d.places.forEach(p => {
      if (p.category === 'RESTAURANT' || p.category === 'CAFE') {
        culinaryPlaces.push(p);
      }
    });
  });

  return (
    <div className="space-y-8">
      {/* 2. Highlights & Plan Overview Cards */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e5e0d8] shadow-xs space-y-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-[#064e43] border border-teal-100">
            AI 에이전트 종합 일정 브리핑
          </span>
          <h1 className="text-xl sm:text-3xl font-bold text-stone-900 mt-2 font-serif">
            {plan.title}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
            {plan.summary}
          </p>
        </div>

        {/* 4 Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {plan.highlightPoints.map((point, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e8e4dc] flex items-start gap-2.5"
            >
              <div className="w-5 h-5 rounded-full bg-[#064e43] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <span className="text-xs text-stone-800 font-medium leading-snug">
                {point}
              </span>
            </div>
          ))}
        </div>

        {/* Info Grid (Hotel, Transport, Costs, and Supervisor/Auditor Report) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-stone-100">
          {/* Accommodation Card */}
          <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2">
            <div className="flex items-center gap-2 text-purple-900 text-xs font-bold">
              <Hotel className="w-4 h-4" />
              추천 맞춤 숙소
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-sm">
                {selectedAccommodation.name}
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                {selectedAccommodation.type} · {selectedAccommodation.address}
              </p>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed bg-white/70 p-2 rounded-xl border border-purple-100">
              {selectedAccommodation.recommendedReason}
            </p>
          </div>

          {/* Transport Guide Card */}
          <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 text-xs font-bold">
              <Navigation className="w-4 h-4" />
              스마트 교통 및 최적 동선
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-sm">
                {transportGuide.recommendedMode}
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                {transportGuide.routesDescription}
              </p>
            </div>
            <p className="text-[11px] text-stone-600 bg-white/70 p-2 rounded-xl border border-blue-100">
              지그재그 낭비와 일차 간 중복 방문을 배제한 최적의 순환 코스입니다.
            </p>
          </div>

          {/* Cost Summary Card */}
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2">
            <div className="flex items-center justify-between text-emerald-900 text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                예산 대비 총 견적
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px]">
                {costs.budgetStatus === 'OPTIMAL' ? '예산 최적화 완료' : '예산 내 집행'}
              </span>
            </div>
            <div>
              <div className="text-xl font-black text-stone-900">
                {(costs.totalCost / 10000).toLocaleString()}만원
              </div>
              <p className="text-xs text-stone-500">
                1인당 약 {(costs.costPerPerson / 10000).toFixed(1)}만원 (총 {request.adultCount + (request.childCount || 0)}인)
              </p>
            </div>
            <div className="text-[11px] text-stone-600 flex justify-between bg-white/70 p-2 rounded-xl border border-emerald-100">
              <span>희망 예산 {(request.budget / 10000).toLocaleString()}만원</span>
              <span className="font-bold text-emerald-700">
                {request.budget - costs.totalCost > 0
                  ? `+${((request.budget - costs.totalCost) / 10000).toLocaleString()}만원 절감`
                  : '예산 100% 매칭'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Leaflet Map View with Verification button */}
      <TravelMapView
        days={days}
        destinationName={request.destination}
        onOpenGisModal={onOpenGisModal}
      />

      {/* 5. Day-by-Day Detailed Itinerary with Map PUSH Buttons */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#064e43]" />
            <h3 className="text-lg sm:text-xl font-bold text-stone-900">
              일자별 상세 일정 및 타임라인 (중복 없는 연속 여정)
            </h3>
          </div>
          <span className="text-xs text-stone-500">
            총 {days.length}일간 · 모든 일차 고유 명소 배정 완료
          </span>
        </div>

        <div className="space-y-4">
          {days.map(day => {
            const isCollapsed = collapsedDays[day.dayNumber];
            return (
              <div
                key={day.dayNumber}
                className="bg-white rounded-3xl border border-[#e5e0d8] shadow-xs overflow-hidden"
              >
                {/* Day Header */}
                <div
                  onClick={() => toggleDayCollapse(day.dayNumber)}
                  className="p-4 sm:p-5 bg-[#faf7f2] border-b border-[#e8e4dc] flex items-center justify-between cursor-pointer hover:bg-stone-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-2xl bg-[#064e43] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {day.dayNumber}일
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500 font-mono">{day.date}</span>
                        <span className="text-xs font-bold text-[#064e43]">
                          {day.theme}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5 line-clamp-1">
                        {day.daySummary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 font-medium">
                      {day.places.length}곳 (중복 없음)
                    </span>
                    {isCollapsed ? (
                      <ChevronDown className="w-5 h-5 text-stone-400" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-stone-400" />
                    )}
                  </div>
                </div>

                {/* Day Places Timeline */}
                {!isCollapsed && (
                  <div className="p-5 sm:p-6 space-y-4">
                    {day.places.map((place, pIdx) => {
                      const pushLinks = generateMapPushLinks(place.name, place.address, place.lat, place.lng);

                      return (
                        <div
                          key={place.id}
                          className="flex flex-col md:flex-row items-start gap-4 p-4 rounded-2xl border border-stone-100 hover:border-[#064e43]/30 hover:bg-[#faf7f2]/40 transition-colors"
                        >
                          {/* Time slot and badge */}
                          <div className="md:w-36 shrink-0 space-y-1">
                            <span className="text-xs font-bold text-stone-900 block font-mono">
                              {place.timeSlot}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                              {getCategoryIcon(place.category)}
                              {place.categoryLabel}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="flex-1 space-y-1.5 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <h4 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
                                <span>#{pIdx + 1} {place.name}</span>
                              </h4>

                              {/* PUSH to Naver, Google Maps & KakaoMap Buttons */}
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                <a
                                  href={pushLinks.naverSearchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#03C75A] text-white hover:bg-[#02b350] transition-colors flex items-center gap-1 shadow-2xs"
                                  title="네이버 지도 검색창에 정확한 장소명과 주소 PUSH"
                                >
                                  <span>네이버 지도 PUSH</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>

                                <a
                                  href={pushLinks.googleSearchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#1a73e8] text-white hover:bg-[#1558b0] transition-colors flex items-center gap-1 shadow-2xs"
                                  title="구글 지도 검색창에 정확한 장소명과 주소 PUSH"
                                >
                                  <span>구글 MAP PUSH</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>

                                <a
                                  href={pushLinks.googleDirectionsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-stone-700 text-white hover:bg-stone-800 transition-colors flex items-center gap-1 shadow-2xs"
                                  title="실시간 길찾기 네비게이션 연동"
                                >
                                  <span>길찾기</span>
                                  <Navigation className="w-3 h-3" />
                                </a>

                                <a
                                  href={buildGoogleCalendarUrl(place, day.date, day.dayNumber)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 transition-colors flex items-center gap-1 shadow-2xs"
                                  title="이 방문 일정을 Google 캘린더에 바로 추가"
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span>캘린더</span>
                                </a>
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                              {place.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 pt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-stone-400" />
                                {place.address}
                              </span>
                              <span className="text-[11px] font-mono text-stone-400">
                                GPS: {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                              </span>
                              {place.estimatedCost > 0 && (
                                <span className="font-semibold text-stone-800">
                                  예상 비용: {place.estimatedCost.toLocaleString()}원
                                </span>
                              )}
                              <span className="text-stone-400">
                                추천: {place.recommendedBy}
                              </span>
                            </div>

                            {place.specialTip && (
                              <div className="text-[11px] text-amber-900 bg-amber-50 rounded-xl p-2.5 border border-amber-200/60 mt-1">
                                💡 <span className="font-semibold">여행 팁:</span> {place.specialTip}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Cost Breakdown Table */}
      <div className="bg-white rounded-3xl border border-[#e5e0d8] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-stone-900" />
            <h3 className="font-bold text-stone-900 text-base sm:text-lg">
              세부 항목별 여행 경비 내역서
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            (단위: 원, 부가세 포함)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-stone-700">
            <thead>
              <tr className="border-b border-stone-200 bg-[#faf7f2] text-stone-600 font-bold">
                <th className="py-2.5 px-3 text-left">항목</th>
                <th className="py-2.5 px-3 text-left">상세 내역</th>
                <th className="py-2.5 px-3 text-right">금액</th>
                <th className="py-2.5 px-3 text-right">비중</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr>
                <td className="py-3 px-3 font-semibold text-stone-900">숙박비</td>
                <td className="py-3 px-3 text-stone-600">{selectedAccommodation.name} ({days.length - 1}박)</td>
                <td className="py-3 px-3 text-right font-medium">{costs.accommodationTotal.toLocaleString()}원</td>
                <td className="py-3 px-3 text-right text-stone-400">
                  {Math.round((costs.accommodationTotal / costs.totalCost) * 100)}%
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-stone-900">식비 및 카페</td>
                <td className="py-3 px-3 text-stone-600">일정 전 식사(조/중/석식) 및 감성 카페 디저트</td>
                <td className="py-3 px-3 text-right font-medium">{costs.foodAndCafeTotal.toLocaleString()}원</td>
                <td className="py-3 px-3 text-right text-stone-400">
                  {Math.round((costs.foodAndCafeTotal / costs.totalCost) * 100)}%
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-stone-900">교통비</td>
                <td className="py-3 px-3 text-stone-600">{transportGuide.recommendedMode}</td>
                <td className="py-3 px-3 text-right font-medium">{costs.transportTotal.toLocaleString()}원</td>
                <td className="py-3 px-3 text-right text-stone-400">
                  {Math.round((costs.transportTotal / costs.totalCost) * 100)}%
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-stone-900">관광지 입장료</td>
                <td className="py-3 px-3 text-stone-600">유적지, 문화관람, 체험 및 명소 입장료</td>
                <td className="py-3 px-3 text-right font-medium">{costs.attractionTotal.toLocaleString()}원</td>
                <td className="py-3 px-3 text-right text-stone-400">
                  {Math.round((costs.attractionTotal / costs.totalCost) * 100)}%
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-stone-900">비상 예비비</td>
                <td className="py-3 px-3 text-stone-600">간식, 유류비 보정, 응급 상황 대비 버퍼</td>
                <td className="py-3 px-3 text-right font-medium">{costs.reserveTotal.toLocaleString()}원</td>
                <td className="py-3 px-3 text-right text-stone-400">
                  {Math.round((costs.reserveTotal / costs.totalCost) * 100)}%
                </td>
              </tr>
              <tr className="bg-[#faf7f2] font-bold text-stone-900 text-sm">
                <td className="py-3.5 px-3">합계 총액</td>
                <td className="py-3.5 px-3 text-stone-600">1인당 {costs.costPerPerson.toLocaleString()}원</td>
                <td className="py-3.5 px-3 text-right text-[#064e43]">{costs.totalCost.toLocaleString()}원</td>
                <td className="py-3.5 px-3 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Poetic Review Section: 수필 & 시 한 수 */}
      {/* <PoeticReviewSection
        reviews={plan.literaryReviews || []}
        culinaryPlaces={culinaryPlaces}
      /> */}

      {/* 7. Modals: Local Expert Chat, Smart Packing Checklist, Hourly Weather & Outfit */}
      <LocalExpertChatModal
        plan={plan}
        isOpen={isExpertChatOpen}
        onClose={() => setIsExpertChatOpen(false)}
      />

      <SmartPackingChecklistModal
        plan={plan}
        isOpen={isSmartPackingOpen}
        onClose={() => setIsSmartPackingOpen(false)}
      />

      <HourlyWeatherOutfitModal
        plan={plan}
        isOpen={isHourlyWeatherOpen}
        onClose={() => setIsHourlyWeatherOpen(false)}
      />

      {/* 8. Export to Calendar (.ics) & Google Calendar Sync Modal */}
      <CalendarSyncModal
        plan={plan}
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
      />
    </div>
  );
};
