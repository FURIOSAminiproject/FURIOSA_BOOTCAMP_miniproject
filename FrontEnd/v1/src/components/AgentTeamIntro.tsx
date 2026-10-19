import React from 'react';
import { AGENT_TEAM } from '../services/aiTravelAgent';
import { PRESET_JEJU_PLAN, PRESET_GYEONGJU_PLAN } from '../data/presetData';
import { FullTravelPlan } from '../types/travel';
import { Compass, Landmark, UtensilsCrossed, Hotel, Navigation, CalendarDays, ShieldCheck, Feather, Sparkles, MapPin, ArrowRight, Star } from 'lucide-react';

interface AgentTeamIntroProps {
  onSelectPlan: (plan: FullTravelPlan) => void;
  onStartRequest: () => void;
}

export const AgentTeamIntro: React.FC<AgentTeamIntroProps> = ({ onSelectPlan, onStartRequest }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass': return <Compass className="w-5 h-5" />;
      case 'Landmark': return <Landmark className="w-5 h-5" />;
      case 'UtensilsCrossed': return <UtensilsCrossed className="w-5 h-5" />;
      case 'Hotel': return <Hotel className="w-5 h-5" />;
      case 'Navigation': return <Navigation className="w-5 h-5" />;
      case 'CalendarDays': return <CalendarDays className="w-5 h-5" />;
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5" />;
      case 'Feather': return <Feather className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-12">
      {/* 1. Popular Domestic Itinerary Showcase */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Curated Domestic Routes
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
              AI 에이전트가 완결한 인기 국내 여행 코스
            </h2>
          </div>
          <p className="text-xs text-stone-500 max-w-md sm:text-right">
            실시간 지리와 로컬 데이터베이스를 바탕으로 엄선된 추천 일정표를 즉시 열람해보세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preset Card 1: Jeju */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  제주 2박 3일 힐링 미식
                </span>
                <span className="text-xs text-stone-400">
                  {PRESET_JEJU_PLAN.days.length}일 코스 · 행선지 14곳
                </span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 font-serif">
                {PRESET_JEJU_PLAN.title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed line-clamp-2">
                {PRESET_JEJU_PLAN.summary}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_JEJU_PLAN.highlightPoints.slice(0, 3).map((h, i) => (
                  <span key={i} className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                    ✓ {h}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500">총 견적 (2인)</span>
                <span className="text-sm font-bold text-stone-900 ml-1.5">
                  {(PRESET_JEJU_PLAN.costs.totalCost / 10000).toLocaleString()}만원
                </span>
              </div>
              <button
                onClick={() => onSelectPlan(PRESET_JEJU_PLAN)}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <span>지도 & 일정표 보기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preset Card 2: Gyeongju */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                  경주 1박 2일 한옥 역사 낭만
                </span>
                <span className="text-xs text-stone-400">
                  {PRESET_GYEONGJU_PLAN.days.length}일 코스 · 행선지 9곳
                </span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 font-serif">
                {PRESET_GYEONGJU_PLAN.title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed line-clamp-2">
                {PRESET_GYEONGJU_PLAN.summary}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_GYEONGJU_PLAN.highlightPoints.slice(0, 3).map((h, i) => (
                  <span key={i} className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                    ✓ {h}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500">총 견적 (가족 3인)</span>
                <span className="text-sm font-bold text-stone-900 ml-1.5">
                  {(PRESET_GYEONGJU_PLAN.costs.totalCost / 10000).toLocaleString()}만원
                </span>
              </div>
              <button
                onClick={() => onSelectPlan(PRESET_GYEONGJU_PLAN)}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <span>지도 & 일정표 보기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 7 AI Agents + 1 Literary Poet Full Introduction */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100">
            Dedicated Multi-Agent Squad
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-stone-900 font-serif">
            길벗 AI 여행사를 움직이는 7인의 전문 에이전트
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            각 분야의 방대한 관광·미식·교통 빅데이터를 학습한 AI 전문위원들이
            고객님의 요청을 5초 만에 완벽한 맞춤 코스로 직조합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENT_TEAM.map(agent => (
            <div
              key={agent.id}
              className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${agent.avatarColor} shadow-xs`}>
                    {getIcon(agent.avatarIcon)}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                    {agent.title}
                  </span>
                </div>

                <h3 className="font-bold text-stone-900 text-base">
                  {agent.name}
                </h3>
                <p className="text-xs font-semibold text-stone-500 mt-0.5 line-clamp-1">
                  {agent.role}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-100 text-xs text-stone-600 leading-relaxed bg-stone-50/60 p-2.5 rounded-xl">
                {agent.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Card */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-stone-900 to-indigo-950 text-white text-center space-y-4">
        <h3 className="text-xl sm:text-2xl font-bold font-serif">
          지금 바로 나만의 국내 여행을 의뢰해보세요
        </h3>
        <p className="text-xs sm:text-sm text-stone-300 max-w-xl mx-auto">
          제주도, 강릉, 속초, 경주, 부산, 전주, 여수, 남해까지 — 전국 모든 명소와 미식을 담아냅니다.
        </p>
        <button
          onClick={onStartRequest}
          className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
        >
          <span>여행 의뢰서 작성하기</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
