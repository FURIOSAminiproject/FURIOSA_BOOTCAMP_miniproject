import React, { useState } from 'react';
import { Sparkles, MapPin, ClipboardCheck, ArrowRight, Compass, Calendar, Users, ChevronRight, Award, CloudSun } from 'lucide-react';
import pebbleBeachImg from '../assets/images/pebble_beach_hero_1792222360356.jpg';

interface HeroBannerProps {
  onStartRequest: () => void;
  onOpenTripArchive?: () => void;
  onQuickExplore?: (destination: string) => void;
  onOpenStudio?: () => void;
  onOpenWeatherStudio?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onStartRequest,
  onOpenTripArchive,
  onQuickExplore,
  onOpenStudio,
  onOpenWeatherStudio
}) => {
  const [selectedDestination, setSelectedDestination] = useState('제주도');
  const [travelTheme, setTravelTheme] = useState('힐링/휴양');

  const popularDestinations = ['제주도', '경주', '강릉·속초', '부산', '전주', '여수·순천'];

  return (
    <div className="space-y-16">
      {/* 1. World-Class Luxury Hero Section with Sunlit Mongdol Pebble Beach Scenery */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-stone-200/60 min-h-[440px] sm:min-h-[500px] flex flex-col justify-between group">
        {/* Background photo: Bright and pristine Korean Mongdol Pebble Beach with crystal azure sea */}
        <img
          src={pebbleBeachImg}
          alt="맑고 눈부신 대한민국 몽돌해변 조약돌과 에메랄드빛 바다"
          className="absolute inset-0 w-full h-full object-cover object-center scale-100 group-hover:scale-[1.02] transition-transform duration-1000 ease-out"
        />

        {/* Clean, Bright Nature Sunlight Gradient: preserves natural daylight and beautiful pebble stones */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/70 via-stone-900/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-stone-950/15" />

        {/* Top Badges Bar inside Hero - Bright Glass */}
        <div className="relative z-10 p-6 sm:p-10 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-white/60 text-xs text-stone-800 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-emerald-800">대한민국 최초</span>
            <span className="text-stone-300">·</span>
            <span className="font-semibold text-stone-700">AI 멀티에이전트 자율운영 여행사</span>
          </div>
        </div>

        {/* Center Main Editorial Copy */}
        <div className="relative z-10 px-6 sm:px-12 md:px-16 py-4 max-w-3xl space-y-6 text-white">
          <div className="space-y-2">
            <span className="inline-block text-xs sm:text-sm font-bold tracking-[0.25em] text-[#e87a41] uppercase font-mono">
              PREMIUM DOMESTIC TRAVEL CONCIERGE · GILBEOT AI AGENTS
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15] text-white font-serif drop-shadow-md">
              여행 계획은 AI 팀이,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-stone-100 via-emerald-200 to-amber-200">
                확정은 사람이.
              </span>
            </h1>
          </div>

          <p className="text-sm sm:text-base md:text-lg text-stone-200/90 leading-relaxed max-w-2xl font-light">
            일정, 경비, 숙소, 교통, 맛집, 카페, 기상정보까지<br />
            5인의 지능형 멀티에이전트가 중복 없이 자율 설계하고,<br />
            전담 관리자가 최종 인가하는 대한민국 럭셔리 국내 여행의 새로운 기준.
          </p>
        </div>

        {/* 우측 하단 여행 의뢰 CTA */}
        <div className="absolute bottom-[30px] right-5 sm:right-8 z-20 flex flex-col items-end gap-3">
          {onOpenTripArchive && (
            <button
              onClick={onOpenTripArchive}
              className="group/archive flex items-center gap-2 rounded-full
                bg-white/95 px-5 py-3 sm:px-6 sm:py-3.5
                text-[#064e43] text-sm sm:text-base font-semibold
                shadow-xl transition-all duration-300 ease-out
                hover:bg-white hover:scale-105 hover:shadow-2xl
                active:scale-95"
            >
              <span>내 여행 보관함</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/archive:translate-x-1.5" />
            </button>
          )}
          <button
            onClick={onStartRequest}
            className="group/cta flex items-center gap-2 rounded-full
              bg-[#e26a2c] px-5 py-3 sm:px-6 sm:py-3.5
              text-white text-sm sm:text-base font-medium
              shadow-xl shadow-orange-950/25
              transition-all duration-300 ease-out
              hover:bg-[#c95720] hover:scale-105 hover:shadow-2xl
              active:scale-95"
          >
            <span className="transition-all duration-300 group-hover/cta:font-extrabold group-hover/cta:tracking-wide">
              여행 의뢰하기
            </span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1.5" />
          </button>
        </div>
      </div>

      {/* 2. "이렇게 진행돼요" - High-End Editorial 3-Step Journey */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#e8e4dc] pb-4">
          <div>
            <span className="text-xs font-bold text-[#064e43] uppercase tracking-wider font-mono">
              HOW IT WORKS
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif mt-1">
              이렇게 진행돼요
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="relative bg-white rounded-3xl p-7 border border-[#e8e4dc] shadow-sm space-y-4 hover:border-[#064e43]/40 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#064e43] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-3xl font-black text-stone-200 font-serif">01</span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">
                1. 조건만 입력
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 mt-2 leading-relaxed">
                희망 여행지, 날짜, 인원(성인/아동), 예산 및 취향(미식, 힐링, 역사, 액티비티)을 1분 만에 알려주세요.
              </p>
            </div>
            <div className="pt-2 border-t border-stone-100 flex items-center text-xs font-semibold text-[#064e43]">
              <span>초간편 AI 여행 의뢰</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative bg-white rounded-3xl p-7 border border-[#e8e4dc] shadow-sm space-y-4 hover:border-[#064e43]/40 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#064e43] flex items-center justify-center group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <span className="text-3xl font-black text-stone-200 font-serif">02</span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">
                2. 에이전트 팀이 설계
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 mt-2 leading-relaxed">
                관광지·맛집·숙소·교통 전문 AI가 일차별 중복을 전수 차단하고, 정밀 GIS 좌표와 예산 최적화를 자율 수행합니다.
              </p>
            </div>
            <div className="pt-2 border-t border-stone-100 flex items-center text-xs font-semibold text-[#064e43]">
              <span>실시간 멀티에이전트 협업</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative bg-white rounded-3xl p-7 border border-[#e8e4dc] shadow-sm space-y-4 hover:border-[#064e43]/40 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#064e43] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <span className="text-3xl font-black text-stone-200 font-serif">03</span>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">
                3. 담당자가 최종 승인
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 mt-2 leading-relaxed">
                AI 초안을 여행사 전문 관리자가 직접 심사·인가해야 고객에게 정식 교부되어 안전하고 완벽한 일정을 보장합니다.
              </p>
            </div>
            <div className="pt-2 border-t border-stone-100 flex items-center text-xs font-semibold text-[#064e43]">
              <span>관리자 최종 결심(인가) 보증제</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
