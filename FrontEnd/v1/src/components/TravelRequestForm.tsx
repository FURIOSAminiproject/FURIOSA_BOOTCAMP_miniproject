import React, { useState } from 'react';
import { TravelRequest } from '../types/travel';
import { PRESET_JEJU_REQUEST, PRESET_GYEONGJU_REQUEST, PRESET_GANGNEUNG_REQUEST } from '../data/presetData';
import { Sparkles, MapPin, Calendar, Users, DollarSign, Car, Hotel, Compass, Wand2 } from 'lucide-react';

interface TravelRequestFormProps {
  onSubmit: (request: TravelRequest) => void;
  isLoading: boolean;
}

const STYLE_OPTIONS = [
  '힐링/휴양', '미식/카페', '역사/문화', '인스타감성', '가족/효도', '액티비티/체험', '자연/트레킹', '야경/낭만'
];

export const TravelRequestForm: React.FC<TravelRequestFormProps> = ({ onSubmit, isLoading }) => {
  const [clientName, setClientName] = useState('김서연');
  const [clientContact, setClientContact] = useState('010-8254-9123');
  const [departureCity, setDepartureCity] = useState('서울(김포공항)');
  const [destination, setDestination] = useState('제주도 (애월 & 서귀포)');
  const [startDate, setStartDate] = useState('2026-10-25');
  const [endDate, setEndDate] = useState('2026-10-27');
  const [adultCount, setAdultCount] = useState(2);
  const [childCount, setChildCount] = useState(0);
  const [budget, setBudget] = useState(1300000);
  const [style, setStyle] = useState<string[]>(['힐링/휴양', '미식/카페', '인스타감성']);
  const [transportType, setTransportType] = useState<TravelRequest['transportType']>('RENTAL_CAR');
  const [accommodationType, setAccommodationType] = useState<TravelRequest['accommodationType']>('HOTEL');
  const [specialRequests, setSpecialRequests] = useState('바다가 보이는 오션뷰 숙소와 신선한 흑돼지, 딱새우 맛집, 일몰이 아름다운 감성 카페를 꼭 포함해주세요.');

  const toggleStyle = (tag: string) => {
    if (style.includes(tag)) {
      setStyle(style.filter(s => s !== tag));
    } else {
      setStyle([...style, tag]);
    }
  };

  const loadPreset = (preset: TravelRequest) => {
    setClientName(preset.clientName);
    setClientContact(preset.clientContact);
    setDepartureCity(preset.departureCity);
    setDestination(preset.destination);
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
    setAdultCount(preset.adultCount);
    setChildCount(preset.childCount);
    setBudget(preset.budget);
    setStyle(preset.style);
    setTransportType(preset.transportType);
    setAccommodationType(preset.accommodationType);
    setSpecialRequests(preset.specialRequests);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const req: TravelRequest = {
      id: `req-${Date.now()}`,
      clientName,
      clientContact,
      departureCity,
      destination,
      startDate,
      endDate,
      adultCount,
      childCount,
      budget,
      style: style.length > 0 ? style : ['힐링/휴양'],
      transportType,
      accommodationType,
      specialRequests,
      createdAt: new Date().toLocaleString('ko-KR', { hour12: false }),
      status: 'PENDING_APPROVAL'
    };
    onSubmit(req);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Header with Quick Presets */}
      <div className="bg-gradient-to-r from-stone-900 to-indigo-950 text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                1:1 맞춤 여행 접수창구
              </span>
              <span className="text-xs text-stone-300">자율형 멀티에이전트 수립 시스템</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold">
              대한민국 국내 여행 맞춤 의뢰서
            </h3>
            <p className="text-xs text-stone-300 mt-0.5">
              원하시는 여행 조건만 입력하시면 7인의 AI 전문위원단이 일정, 숙소, 교통, 맛집을 스스로 기획합니다.
            </p>
          </div>

          {/* Quick Preset Selector */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:pt-0">
            <span className="text-xs text-stone-400 mr-1 flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              추천 프리셋:
            </span>
            <button
              type="button"
              onClick={() => loadPreset(PRESET_JEJU_REQUEST)}
              className="px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
            >
              제주 2박3일 힐링
            </button>
            <button
              type="button"
              onClick={() => loadPreset(PRESET_GYEONGJU_REQUEST)}
              className="px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
            >
              경주 1박2일 한옥
            </button>
            <button
              type="button"
              onClick={() => loadPreset(PRESET_GANGNEUNG_REQUEST)}
              className="px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
            >
              강릉 2박3일 커피
            </button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
        {/* Section 1: Client Info & Cities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              의뢰인 성함
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full text-xs sm:text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              placeholder="예: 홍길동"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              연락처 (알림톡 수신)
            </label>
            <input
              type="text"
              required
              value={clientContact}
              onChange={(e) => setClientContact(e.target.value)}
              className="w-full text-xs sm:text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              placeholder="010-0000-0000"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              출발 지역 / 교통 거점
            </label>
            <input
              type="text"
              required
              value={departureCity}
              onChange={(e) => setDepartureCity(e.target.value)}
              className="w-full text-xs sm:text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              placeholder="예: 서울역, 김포공항, 대전"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              희망 여행 목적지
            </label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full text-xs sm:text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-stone-900 font-semibold text-blue-700"
              placeholder="예: 제주도, 강릉·속초, 경주, 부산"
            />
          </div>
        </div>

        {/* Section 2: Dates, People, Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200/70">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              출발일
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs sm:text-sm border border-stone-200 bg-white rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              복귀일
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs sm:text-sm border border-stone-200 bg-white rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-stone-500" />
              참가 인원 (성인 / 아동)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center border border-stone-200 bg-white rounded-xl px-2 py-1.5">
                <span className="text-[11px] text-stone-400 mr-1">성인</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={adultCount}
                  onChange={(e) => setAdultCount(parseInt(e.target.value) || 1)}
                  className="w-full text-xs sm:text-sm text-center font-bold"
                />
              </div>
              <div className="flex-1 flex items-center border border-stone-200 bg-white rounded-xl px-2 py-1.5">
                <span className="text-[11px] text-stone-400 mr-1">아동</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={childCount}
                  onChange={(e) => setChildCount(parseInt(e.target.value) || 0)}
                  className="w-full text-xs sm:text-sm text-center font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-stone-500" />
                희망 총 예산
              </span>
              <span className="text-xs font-bold text-blue-700">
                {(budget / 10000).toLocaleString()}만원
              </span>
            </label>
            <div className="space-y-1.5">
              <input
                type="range"
                min="300000"
                max="4000000"
                step="50000"
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value))}
                className="w-full accent-stone-900"
              />
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>30만원</span>
                <span>150만원</span>
                <span>400만원</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Styles, Transport, Accommodation */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-stone-700">
            선호 여행 테마 & 스타일 (복수 선택 가능)
          </label>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((tag) => {
              const active = style.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleStyle(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Transport and Accommodation Preferences */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-stone-500" />
              선호 교통 수단
            </label>
            <select
              value={transportType}
              onChange={(e) => setTransportType(e.target.value as any)}
              className="w-full text-xs sm:text-sm border border-stone-200 rounded-xl px-3 py-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-stone-900"
            >
              <option value="RENTAL_CAR">완전자차 렌터카 (추천)</option>
              <option value="KTX_TRAIN">KTX / SRT 고속열차 연계</option>
              <option value="OWN_CAR">자가용 / 자차 드라이브</option>
              <option value="FLIGHT">국내선 항공 + 현지 교통</option>
              <option value="PUBLIC_TRANSIT">스마트 대중교통 & 택시 투어</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
              <Hotel className="w-3.5 h-3.5 text-stone-500" />
              선호 숙소 형태
            </label>
            <select
              value={accommodationType}
              onChange={(e) => setAccommodationType(e.target.value as any)}
              className="w-full text-xs sm:text-sm border border-stone-200 rounded-xl px-3 py-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-stone-900"
            >
              <option value="HOTEL">오션뷰/시티뷰 호텔</option>
              <option value="HANOK">고즈넉한 전통 한옥스테이</option>
              <option value="RESORT">가족형 프리미엄 리조트</option>
              <option value="POOL_VILLA">프라이빗 독채 풀빌라</option>
              <option value="PENSION">감성 독채 펜션</option>
            </select>
          </div>
        </div>

        {/* Special Requests */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5">
            특별 요청사항 (식단, 노약자/반려견 배려, 희망 방문지 등)
          </label>
          <textarea
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            rows={2}
            className="w-full text-xs sm:text-sm border border-stone-200 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-stone-900 resize-none"
            placeholder="예: 해산물 위주의 식단, 아이가 걸어 다니기 편한 완만한 경사로, 야경이 예쁜 카페"
          />
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 group disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>AI 7인 멀티에이전트 자율 설계 가동하기</span>
          </button>
          <p className="text-center text-[11px] text-stone-400 mt-2">
            ※ AI 팀이 일정을 수립한 후 '승인 대기' 상태로 저장되며, 여행사 담당 관리자의 최종 인가를 거쳐 확정됩니다.
          </p>
        </div>
      </form>
    </div>
  );
};
