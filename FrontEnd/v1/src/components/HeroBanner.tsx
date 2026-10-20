import React from 'react';
import { Sparkles, Compass, ShieldCheck, MapPin, Feather, ArrowRight, HeartHandshake } from 'lucide-react';

interface HeroBannerProps {
  onStartRequest: () => void;
  onExplorePreset: (presetId: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onStartRequest, onExplorePreset }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-indigo-950 text-white shadow-xl border border-stone-800">
      {/* Background Subtle Gradient & Glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14 max-w-4xl space-y-6">
        {/* Sub-badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-amber-300 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>대한민국 국내 여행 전문 · AI 멀티에이전트 자율운영</span>
        </div>

        {/* Main Title & Slogan */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-serif tracking-tight leading-tight">
            여행 계획은 <span className="text-amber-400">AI 팀</span>이,<br />
            최종 확정은 <span className="text-emerald-400">사람</span>이.
          </h1>
          <p className="text-xs sm:text-base text-stone-300 max-w-2xl leading-relaxed">
            고객님의 조건만 입력하면 7인의 AI 전문위원단이 일정, 숙소, 교통, 맛집, 예산을 스스로 기획합니다.
            식당과 카페를 위한 감성 수필과 시(詩) 한 수를 선사하며, 여행사 총괄 관리자의 엄격한 인가를 거쳐 비로소 확정됩니다.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs text-stone-200">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>7인 AI 자율 협업</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <span>지도 동선 & 네이버 연동</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
            <Feather className="w-4 h-4 text-amber-400 shrink-0" />
            <span>식당·카페 수필 & 시 한 수</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
            <span>관리자 최종 결심(인가)</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={onStartRequest}
            className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
          >
            <span>내 맞춤 여행 의뢰하기</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onExplorePreset('jeju')}
            className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition-all"
          >
            제주 힐링 미식 2박 3일 미리보기
          </button>
        </div>
      </div>
    </div>
  );
};
