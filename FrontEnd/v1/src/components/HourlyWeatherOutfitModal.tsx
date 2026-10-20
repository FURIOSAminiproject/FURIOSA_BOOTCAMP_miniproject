/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sun, CloudSun, Cloud, CloudRain, Wind, Thermometer, ShieldCheck, Shirt, Umbrella, Sparkles, Check, ChevronRight, Clock } from 'lucide-react';
import { FullTravelPlan } from '../types/travel';

interface HourlyWeatherOutfitModalProps {
  plan: FullTravelPlan;
  isOpen: boolean;
  onClose: () => void;
}

export const HourlyWeatherOutfitModal: React.FC<HourlyWeatherOutfitModalProps> = ({
  plan,
  isOpen,
  onClose
}) => {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  if (!isOpen) return null;

  const currentDay = plan.days[selectedDayIdx] || plan.days[0];
  const weatherRep = plan.weatherAgentReport;
  const fusedDaily = weatherRep?.fusedDailyList[selectedDayIdx] || weatherRep?.fusedDailyList[0];

  const baseMin = fusedDaily?.finalPredictedTemp?.min || 11;
  const baseMax = fusedDaily?.finalPredictedTemp?.max || 21;
  const baseWind = fusedDaily?.windSpeed || 4.2;

  // Generate realistic 24-hour simulation points
  const hourlyData = [
    { hour: '06:00', label: '새벽/일출', temp: baseMin, feelsLike: baseMin - 1.5, rain: 10, wind: baseWind - 0.8, uv: 0, condition: '청명한 아침', icon: 'Sun' },
    { hour: '09:00', label: '오전 산책', temp: baseMin + 4, feelsLike: baseMin + 3, rain: 15, wind: baseWind - 0.2, uv: 3, condition: '온화하고 맑음', icon: 'CloudSun' },
    { hour: '12:00', label: '정오/점심', temp: baseMax - 1, feelsLike: baseMax - 1, rain: 20, wind: baseWind, uv: 6, condition: '햇살 가득', icon: 'Sun' },
    { hour: '15:00', label: '오후 관람', temp: baseMax, feelsLike: baseMax - 0.5, rain: 25, wind: baseWind + 0.6, uv: 5, condition: '구름 조금', icon: 'CloudSun' },
    { hour: '18:00', label: '일몰/저녁', temp: baseMin + 5, feelsLike: baseMin + 3.5, rain: 20, wind: baseWind + 0.8, uv: 1, condition: '선선한 해안 바람', icon: 'Wind' },
    { hour: '21:00', label: '야경 투어', temp: baseMin + 2, feelsLike: baseMin + 0.5, rain: 15, wind: baseWind, uv: 0, condition: '차분한 밤 공기', icon: 'Cloud' },
    { hour: '24:00', label: '심야/휴식', temp: baseMin + 1, feelsLike: baseMin - 1, rain: 10, wind: baseWind - 0.5, uv: 0, condition: '고요함', icon: 'Cloud' }
  ];

  const outfitGuides = [
    {
      timeSlot: '오전 (06:00 ~ 11:00)',
      tempLabel: `${baseMin}~${baseMin + 5}℃`,
      title: '가벼운 레이어드 & 보온 카디건',
      desc: '일교차로 인해 아침 공기가 선선합니다. 얇은 이너웨어 위에 탈착 가능한 카디건이나 셔츠를 걸치시는 것을 추천합니다.',
      items: ['면 셔츠/롱슬리브', '니트 카디건 또는 린넨 자켓', '편안한 슬랙스/면바지']
    },
    {
      timeSlot: '낮 (12:00 ~ 17:00)',
      tempLabel: `${baseMax - 1}~${baseMax}℃`,
      title: '자외선 차단 & 통기성 쾌적 룩',
      desc: '가장 따뜻하고 활동량이 많은 시간입니다. 통기성이 좋은 옷차림과 자외선 차단 모자, 선글라스를 착용하세요.',
      items: ['자외선 차단 선글라스', '챙 있는 버킷햇/모자', '가벼운 도보용 운동화']
    },
    {
      timeSlot: '저녁/밤 (18:00 ~ 24:00)',
      tempLabel: `${baseMin + 1}~${baseMin + 5}℃`,
      title: '바람막이 아우터 & 스카프',
      desc: '해가 지고 바닷바람이 불어오면 체감온도가 급격히 떨어집니다. 방풍 윈드브레이커를 필수로 지참하세요.',
      items: ['방풍 윈드브레이커/자켓', '가벼운 스카프', '보온용 양말']
    }
  ];

  const bagEssentials = [
    { name: '초경량 접이식 3단 우산', reason: `오후 국지성 소나기 대비 (강수확률 20~25%)` },
    { name: '10,000mAh 고속 보조배터리', reason: '네이버 지도 PUSH 및 카메라 연속 사용 대비' },
    { name: '자외선 차단 선크림 & 립밤', reason: '자외선 지수(UV 5~6) 피부 보호 및 건조 예방' },
    { name: '개인 텀블러', reason: '도보 산책 중 수분 섭취 및 제로웨이스트 카페 할인' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-sky-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sun className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-extrabold text-[10px]">
                  날씨관리 에이전트 브리핑
                </span>
                <h3 className="font-bold text-base sm:text-lg">
                  시간대별 날씨 변화 & 오늘의 복장/준비물 가이드
                </h3>
              </div>
              <p className="text-xs text-sky-100 font-light mt-0.5">
                {plan.request.destination} · {currentDay.date} ({selectedDayIdx + 1}일차: {currentDay.theme})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Day Selector Bar */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-xs font-bold text-stone-500 shrink-0">일차 선택:</span>
          {plan.days.map((d, idx) => (
            <button
              key={d.dayNumber}
              onClick={() => setSelectedDayIdx(idx)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                selectedDayIdx === idx
                  ? 'bg-[#064e43] text-white shadow-2xs font-bold'
                  : 'bg-white hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
            >
              {d.dayNumber}일차 ({d.date.slice(5)})
            </button>
          ))}
        </div>

        {/* Modal Body Scrollable */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-7">
          {/* 1. Hourly Weather Horizontal Strip */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <span>시간대별 정밀 기상 시뮬레이션</span>
              </h4>
              <span className="text-xs text-stone-500 font-medium">
                일교차: <b className="text-rose-600">{baseMax - baseMin}℃</b> (최저 {baseMin}℃ / 최고 {baseMax}℃)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {hourlyData.map((h, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 text-center space-y-1.5 hover:border-sky-400 transition-colors"
                >
                  <div className="text-[11px] font-bold text-stone-700">{h.hour}</div>
                  <div className="text-[10px] text-stone-400">{h.label}</div>
                  <div className="py-1 flex justify-center">
                    {h.icon === 'Sun' ? (
                      <Sun className="w-6 h-6 text-amber-500" />
                    ) : h.icon === 'CloudSun' ? (
                      <CloudSun className="w-6 h-6 text-amber-600" />
                    ) : h.icon === 'Wind' ? (
                      <Wind className="w-6 h-6 text-teal-600" />
                    ) : (
                      <Cloud className="w-6 h-6 text-stone-400" />
                    )}
                  </div>
                  <div className="text-sm font-black text-stone-900">{h.temp}℃</div>
                  <div className="text-[10px] text-stone-500">체감 {h.feelsLike}℃</div>
                  <div className="text-[10px] font-semibold text-blue-600">비 {h.rain}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Today's Outfit Guide by Time Slot */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Shirt className="w-4 h-4 text-[#064e43]" />
              <span>오늘의 시간대별 맞춤 복장 가이드</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {outfitGuides.map((guide, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-[#e8e4dc] shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-500">{guide.timeSlot}</span>
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {guide.tempLabel}
                    </span>
                  </div>

                  <h5 className="font-bold text-stone-900 text-sm">{guide.title}</h5>
                  <p className="text-xs text-stone-600 leading-relaxed">{guide.desc}</p>

                  <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-1">
                    {guide.items.map((it, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-stone-100 text-[10px] text-stone-700 font-medium">
                        ✓ {it}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Essential Bag Items */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Umbrella className="w-4 h-4 text-emerald-700" />
              <span>오늘 가방 속에 꼭 챙겨야 할 필수 아이템</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bagEssentials.map((b, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 flex items-start gap-2.5"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    ✓
                  </div>
                  <div>
                    <div className="font-bold text-xs text-stone-900">{b.name}</div>
                    <div className="text-[11px] text-stone-600 mt-0.5 leading-snug">{b.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#064e43] hover:bg-[#085f52] text-white font-bold text-xs shadow-xs"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
