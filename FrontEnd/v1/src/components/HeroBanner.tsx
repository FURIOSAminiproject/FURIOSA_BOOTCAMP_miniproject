import React, { useState } from 'react';
import { Sparkles, MapPin, ClipboardCheck, ArrowRight, ShieldCheck, Compass, Calendar, Users, ChevronRight, Globe, Award, CloudSun } from 'lucide-react';
import pebbleBeachImg from '../assets/images/pebble_beach_hero_1792222360356.jpg';

interface HeroBannerProps {
  onStartRequest: () => void;
  onQuickExplore?: (destination: string) => void;
  onOpenStudio?: () => void;
  onOpenWeatherStudio?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onStartRequest,
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
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-stone-200/60 min-h-[540px] sm:min-h-[620px] flex flex-col justify-between group">
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

          <div className="hidden sm:flex items-center gap-3 text-xs text-white drop-shadow-md">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-950/40 backdrop-blur-md border border-white/20">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              관리자 인가 보증
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-950/40 backdrop-blur-md border border-white/20">
              <Globe className="w-4 h-4 text-sky-300" />
              네이버 & 구글 MAP 100% PUSH 연동
            </span>
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
            일정, 경비, 숙소, 교통, 맛집, 카페, 기상, 안전, 문학, 지식전달까지 — 12인의 지능형 멀티에이전트가 중복 없이 자율 설계하고, 전담 관리자가 최종 인가하는 대한민국 럭셔리 국내 여행의 새로운 기준.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onStartRequest}
              className="px-7 py-4 rounded-2xl bg-gradient-to-r from-[#e26a2c] to-[#d05c20] hover:from-[#d05c20] hover:to-[#ba4e16] text-white font-bold text-sm sm:text-base shadow-xl shadow-orange-950/30 transition-all flex items-center gap-2.5 group cursor-pointer active:scale-95"
            >
              <span>내 여행 의뢰하기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                if (onQuickExplore) onQuickExplore('제주도');
              }}
              className="px-6 py-4 rounded-2xl bg-stone-900/60 hover:bg-stone-900/80 backdrop-blur-md border border-stone-600/70 text-white font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>제주 시그니처 여정 보기</span>
            </button>

            {onOpenStudio && (
              <button
                onClick={onOpenStudio}
                className="px-5 py-3.5 rounded-2xl bg-violet-950/70 hover:bg-violet-900/90 backdrop-blur-md border border-violet-500/50 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Sparkles className="w-4 h-4 text-violet-300" />
                <span>AI 트랜스포머 스튜디오</span>
                <span className="text-[10px] bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full font-extrabold">
                  코드 공개
                </span>
              </button>
            )}

            {onOpenWeatherStudio && (
              <button
                onClick={onOpenWeatherStudio}
                className="px-5 py-3.5 rounded-2xl bg-sky-950/70 hover:bg-sky-900/90 backdrop-blur-md border border-sky-500/50 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <CloudSun className="w-4 h-4 text-sky-300" />
                <span>기상예보 기술 분석</span>
                <span className="text-[10px] bg-sky-400 text-stone-950 px-2 py-0.5 rounded-full font-extrabold">
                  LSTM·앙상블
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Floating Luxury Concierge Bar - Bright Glass */}
        <div className="relative z-10 p-4 sm:p-6 bg-white/90 backdrop-blur-md border-t border-white/70 shadow-sm">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-stone-600 font-bold shrink-0">추천 여행지:</span>
              {popularDestinations.map((dest) => (
                <button
                  key={dest}
                  onClick={() => {
                    setSelectedDestination(dest);
                    if (onQuickExplore) onQuickExplore(dest);
                  }}
                  className={`px-3 py-1.5 rounded-full transition-all shrink-0 font-medium ${
                    selectedDestination === dest
                      ? 'bg-[#064e43] text-white font-bold shadow-xs'
                      : 'bg-stone-100/90 hover:bg-stone-200 text-stone-700 border border-stone-200/60'
                  }`}
                >
                  {dest}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 text-stone-600 font-medium">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-stone-900">99.8%</span>
                <span className="text-stone-500">동선 정합도</span>
              </div>
              <span className="text-stone-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-emerald-700">0건</span>
                <span className="text-stone-500">일차별 장소 중복률</span>
              </div>
            </div>
          </div>
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
          <p className="text-xs sm:text-sm text-stone-500 max-w-md">
            자율적인 AI 에이전트의 정밀한 설계와 전문 관리자의 철저한 검증으로 완성되는 3단계 안심 프로세스
          </p>
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
