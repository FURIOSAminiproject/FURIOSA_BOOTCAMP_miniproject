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
            <span className="inline-block text-xs sm:text-sm font-bold tracking-[0.25em] text-[#e87a41] uppercase font-mono">
              PREMIUM DOMESTIC TRAVEL CONCIERGE · I LIKE YOUR J
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15] text-white font-serif drop-shadow-md">
              여행 계획은 AI 팀이,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-stone-100 via-emerald-200 to-amber-200">
                I like your J.
              </span>
            </h1>
          </div>

          <p className="text-sm sm:text-base md:text-lg text-stone-200/90 leading-relaxed font-light">
            당신의 완벽한 계획형(J) 여행 메이트.<br />
            대화하듯 편하게 짜는 AI 채팅과 지도 위에서 비교하는 플래너로 나만의 맞춤 여행을 완성해보세요.
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
