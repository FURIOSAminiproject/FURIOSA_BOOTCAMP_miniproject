import React, { useState } from 'react';
import { TravelRequest } from '../types/travel';
import { Sparkles, Calendar, Wand2 } from 'lucide-react';
import { PRESET_JEJU_REQUEST, PRESET_GYEONGJU_REQUEST, PRESET_GANGNEUNG_REQUEST } from '../data/presetData';

interface TravelRequestFormProps {
  onSubmit: (request: TravelRequest) => void;
  isLoading: boolean;
  initialDestination?: string;
}

const STYLE_OPTIONS = [
  '힐링', '자연·풍경', '맛집 탐방', '카페 투어', '역사·문화', 
  '액티비티', '아이와 함께', '부모님과 함께', '사진 명소', '캠핑·아웃도어', 
  '쇼핑', '야경·조명', '예술·전시', '축제·이벤트', '와인·주류', '스포츠 관람', 
  '테마파크', '휴양·리조트', '도보 여행', '자전거 여행'
];

export const TravelRequestForm: React.FC<TravelRequestFormProps> = ({
  onSubmit,
  isLoading,
  initialDestination = '제주, 전주, 부산, 강릉 등'
}) => {
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [departureCity, setDepartureCity] = useState('서울');
  const [destination, setDestination] = useState(initialDestination === '제주, 전주, 부산, 강릉 등' ? '제주' : initialDestination);
  const [startDate, setStartDate] = useState('2026-11-20');
  const [endDate, setEndDate] = useState('2026-11-23');
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [budgetManwon, setBudgetManwon] = useState(100); // In 만원 as per screenshot
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['힐링', '맛집 탐방', '자연·풍경']);
  const [specialRequests, setSpecialRequests] = useState('부모님이 많이 걷기 힘드세요. 해산물을 좋아해요.');

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter(s => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
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
    setBudgetManwon(Math.round(preset.budget / 10000));
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
      budget: budgetManwon * 10000,
      style: selectedStyles.length > 0 ? selectedStyles : ['힐링'],
      transportType: 'RENTAL_CAR',
      accommodationType: 'HOTEL',
      specialRequests,
      createdAt: new Date().toLocaleString('ko-KR', { hour12: false }),
      status: 'PENDING_APPROVAL'
    };
    onSubmit(req);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title & Subtitle - World-Class Concierge Styling */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-mono font-bold tracking-wider text-emerald-800 uppercase px-2.5 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-200">
              CUSTOM CONCIERGE INQUIRY
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif mt-1">
              여행 의뢰하기
            </h1>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
          조건만 알려주시면 5인의 전문 AI 에이전트가 중복 없는 일정·경비·숙소·교통·로컬 미식·기후까지 완벽히 설계합니다.
        </p>
      </div>

      {/* Main Form Box */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-9 border border-[#e5e0d8] shadow-sm space-y-6">
        {/* Row 1: 여행 제목 */}
        <div className="grid grid-cols-1 sm:grid-cols-1">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              여행 제목
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="자신만의 표현으로 여행을 설명해주세요. 예: 제주도 3박4일 힐링 여행"
              className="w-full text-sm border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43]"
            />
          </div>
        </div>

        {/* Row 2: 출발지 / 가고 싶은 곳 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              출발지
            </label>
            <input
              type="text"
              required
              value={departureCity}
              onChange={(e) => setDepartureCity(e.target.value)}
              placeholder="서울"
              className="w-full text-sm border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              목적지
            </label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="제주, 전주, 부산, 강릉 등"
              className="w-full text-sm border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43]"
            />
          </div>
        </div>

        {/* Row 3: 출발일 / 귀가일 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
              <span>출발일</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
              <span>귀가일</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43]"
            />
          </div>
        </div>

        {/* Row 4: 성인 / 아동 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              성인
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={adultCount}
              onChange={(e) => setAdultCount(parseInt(e.target.value) || 1)}
              className="w-full text-sm border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              아동
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={childCount}
              onChange={(e) => setChildCount(parseInt(e.target.value) || 0)}
              className="w-full text-sm border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43]"
            />
          </div>
        </div>

        {/* Row 5: 총 예산 (만원) */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            총 예산 (만원)
          </label>
          <input
            type="number"
            min="20"
            max="2000"
            step="10"
            value={budgetManwon}
            onChange={(e) => setBudgetManwon(parseInt(e.target.value) || 50)}
            placeholder="100"
            className="w-full text-sm border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43]"
          />
        </div>

        {/* Row 6: 여행 스타일 pills */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-stone-700">
            여행 테마
          </label>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((style) => {
              const active = selectedStyles.includes(style);
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => toggleStyle(style)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all border ${
                    active
                      ? 'bg-[#064e43] text-white border-[#064e43] font-semibold'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {style}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 7: 추가 요청사항 */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            추가 요청사항
          </label>
          <textarea
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            rows={3}
            placeholder="예: 부모님이 많이 걷기 힘드세요. 해산물을 좋아해요."
            className="w-full text-sm border border-stone-200 rounded-xl p-3.5 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43] resize-none"
          />
        </div>

        {/* Row 8: Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-[#064e43] hover:bg-[#043d34] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>AI 에이전트에게 여행 설계 맡기기</span>
          </button>
        </div>
      </form>
    </div>
  );
};
