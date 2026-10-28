import React from 'react';
import { Bot, Compass, ArrowRight } from 'lucide-react';
import pebbleBeachImg from '../assets/images/pebble_beach_hero_1792222360356.jpg';

interface HeroBannerProps {
  onStartRequest: () => void;
  onOpenTripArchive?: () => void;
  onQuickExplore?: (destination: string) => void;
  onOpenStudio?: () => void;
  onOpenWeatherStudio?: () => void;
  onStartChat?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onStartRequest,
  onStartChat,
}) => {
  return (
    <div className="w-full">
      {/* Hero Section with Mongdol Pebble Beach Scenery & 2 Action Buttons */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-stone-200/60 min-h-[460px] sm:min-h-[520px] flex flex-col justify-center group p-8 sm:p-14">
        {/* Background photo */}
        <img
          src={pebbleBeachImg}
          alt="맑고 눈부신 대한민국 몽돌해변 조약돌과 에메랄드빛 바다"
          className="absolute inset-0 w-full h-full object-cover object-center scale-100 group-hover:scale-[1.02] transition-transform duration-1000 ease-out"
        />

        {/* Natural daylight gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-950/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-stone-950/20" />

        {/* Center Main Editorial Copy & 2 Action Buttons */}
        <div className="relative z-10 max-w-2xl space-y-7 text-white">
          <div className="space-y-3">
            <span className="inline-block text-xs sm:text-sm font-bold tracking-[0.2em] text-emerald-300 font-mono">
              ROAD TRIP & TRAVEL PLANNER · I AM YOUR J
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.2] text-white font-sans drop-shadow-md">
              계획은 가볍게,<br />
              여행은 완벽하게.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300">
                I am your J
              </span>
            </h1>
          </div>

          <p className="text-sm sm:text-base md:text-lg text-stone-200/90 leading-relaxed font-normal max-w-xl">
            길 위의 숨은 맛집과 동선 비교부터 맞춤형 추천까지,<br className="hidden sm:inline" />
            나에게 가장 편안한 방식으로 여행을 시작해 보세요.
          </p>

          {/* 2개의 메인 버튼: AI 채팅으로 계획 짜기 & 플래너로 계획 짜기 */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            {onStartChat && (
              <button
                type="button"
                onClick={onStartChat}
                className="group/chat inline-flex items-center gap-3 rounded-2xl
                  bg-[#064e43] hover:bg-[#085a4e] border border-emerald-400/50 px-6 py-4
                  text-white text-sm sm:text-base font-bold
                  shadow-2xl shadow-emerald-950/50
                  transition-all duration-300 ease-out
                  hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Bot className="h-5 w-5 text-emerald-300" />
                <span>AI 채팅으로 계획 짜기</span>
                <ArrowRight className="h-4 w-4 text-emerald-300/80 transition-transform duration-300 group-hover/chat:translate-x-1" />
              </button>
            )}

            <button
              type="button"
              onClick={onStartRequest}
              className="group/cta inline-flex items-center gap-3 rounded-2xl
                bg-[#e26a2c] hover:bg-[#c95720] px-6 py-4
                text-white text-sm sm:text-base font-bold
                shadow-2xl shadow-orange-950/40
                transition-all duration-300 ease-out
                hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Compass className="h-5 w-5" />
              <span>플래너로 계획 짜기</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
