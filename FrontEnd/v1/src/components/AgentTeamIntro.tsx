/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Send, Compass, Utensils, Hotel, Car, Calendar, ShieldCheck, Feather, ShieldAlert, Sparkles, ArrowRight, MapPin, Eye, CloudSun, LifeBuoy } from 'lucide-react';
import { FullTravelPlan } from '../types/travel';
import { PRESET_JEJU_PLAN, PRESET_GYEONGJU_PLAN } from '../data/presetData';
import gyeongjuWoljiImg from '../assets/images/gyeongju_wolji_pond_1792364655793.jpg';
import jeonjuHanokImg from '../assets/images/jeonju_hanok_village_1792364671931.jpg';
import busanHaeundaeImg from '../assets/images/busan_haeundae_beach_1792363918149.jpg';

interface AgentTeamIntroProps {
  onSelectPlan: (plan: FullTravelPlan) => void;
  onSelectDestination?: (dest: string) => void;
  onOpenStudio?: () => void;
  onOpenWeatherStudio?: () => void;
}

export const AgentTeamIntro: React.FC<AgentTeamIntroProps> = ({
  onSelectPlan,
  onSelectDestination,
  onOpenStudio,
  onOpenWeatherStudio
}) => {
  const agents = [
    {
      name: '총괄 협연자',
      role: 'LEAD ORCHESTRATOR',
      desc: '사용자의 여행 의뢰를 분석하고 다섯 전문 AI 에이전트의 결과를 통합해 최종 여행 계획을 조율합니다.',
      icon: <ShieldAlert className="w-6 h-6" />,
      badge: '총괄 에이전트',
      highlight: true
    },
    {
      name: '기상기후 관리관',
      role: 'WEATHER & CLIMATE',
      desc: '여행 날짜의 날씨와 기후 정보를 분석해 여행 일정과 준비물에 반영합니다.',
      icon: <CloudSun className="w-5 h-5" />,
      badge: '기상 분석'
    },
    {
      name: '관광지 명소박사',
      role: 'ATTRACTIONS & SIGHTSEEING',
      desc: '여행 목적과 취향에 맞는 관광 명소와 숨은 여행지를 추천합니다.',
      icon: <Compass className="w-5 h-5" />,
      badge: '명소 추천'
    },
    {
      name: '미식가 큐레이터',
      role: 'FOOD & LOCAL GOURMET',
      desc: '지역 맛집과 카페를 탐색하고 여행 동선에 어울리는 식사 장소를 제안합니다.',
      icon: <Utensils className="w-5 h-5" />,
      badge: '미식 추천'
    },
    {
      name: '숙소 안식처',
      role: 'ACCOMMODATION',
      desc: '여행 예산과 위치, 숙박 선호도에 맞는 숙소 선택을 지원합니다.',
      icon: <Hotel className="w-5 h-5" />,
      badge: '숙소 추천'
    },
    {
      name: '일정 및 경비 설계사',
      role: 'ITINERARY & BUDGET',
      desc: '이동 순서와 시간대별 일정을 구성하고 예상 경비를 정리합니다.',
      icon: <Calendar className="w-5 h-5" />,
      badge: '일정·예산'
    }
  ];

  const popularDestinations = [
    {
      id: 'jeju',
      name: '제주',
      sub: '바다와 오름의 섬',
      description: '에메랄드빛 애월 해안과 천년 비자나무 숲, 성산일출봉의 비경',
      imageUrl: 'https://images.unsplash.com/photo-1548115184-bc6544d06a58?auto=format&fit=crop&w=1000&q=85',
      tag: '인기 1위 · 힐링 휴양',
      onClick: () => {
        if (onSelectDestination) onSelectDestination('제주도');
        onSelectPlan(PRESET_JEJU_PLAN);
      }
    },
    {
      id: 'gyeongju',
      name: '경주',
      sub: '천년의 달빛 서라벌',
      description: '황금빛 동궁과 월지 야경과 대릉원의 고요한 능선, 황리단길 한옥',
      imageUrl: gyeongjuWoljiImg,
      tag: '유네스코 세계유산 · 야경',
      onClick: () => {
        if (onSelectDestination) onSelectDestination('경주');
        onSelectPlan(PRESET_GYEONGJU_PLAN);
      }
    },
    {
      id: 'jeonju',
      name: '전주',
      sub: '한옥마을과 한식의 본향',
      description: '오목대에서 굽어보는 700채 기와 한옥마을과 정갈한 떡갈비 비빔밥 미식',
      imageUrl: jeonjuHanokImg,
      tag: '전주 한옥마을 · 로컬 미식',
      onClick: () => {
        if (onSelectDestination) onSelectDestination('전주');
      }
    },
    {
      id: 'busan',
      name: '부산',
      sub: '해안 도시의 낭만',
      description: '해운대 백사장 & 블루라인파크 해변열차, 광안대교 오션뷰 야경, 흰여울문화마을',
      imageUrl: busanHaeundaeImg,
      tag: '해운대 해변 · 야경 투어',
      onClick: () => {
        if (onSelectDestination) onSelectDestination('부산');
      }
    }
  ];

  return (
    <div className="space-y-16">
      {/* 다이어그램 */}
      <section className="space-y-8">
        {/* AI 멀티 에이전트 구조 */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#e8e4dc] pb-4">
              <div>
                <span className="text-xs font-bold text-[#064e43] uppercase tracking-wider font-mono">
                  MULTI AI AGENT SYSTEM
                </span>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif mt-1">
                  우리 여행사의 AI 에이전트 팀
                </h2>

                <p className="text-sm text-stone-500 mt-2">
                  총괄 협연자와 5명의 전문 AI 에이전트가 협업해 여행 계획을 완성합니다.
                </p>
              </div>
            </div>

            {/* 1. 총괄 에이전트 */}
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-md rounded-3xl border border-emerald-600 bg-gradient-to-br from-emerald-800 via-[#064e43] to-teal-900 p-6 sm:p-7 text-white shadow-xl shadow-emerald-950/15">
                <div className="absolute right-5 top-5">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold tracking-wide text-emerald-50">
                    LEAD AGENT
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                    {agents[0].icon}
                  </div>

                  <div>
                    <p className="text-[10px] font-mono tracking-widest text-emerald-200">
                      {agents[0].role}
                    </p>

                    <h3 className="mt-1 text-xl font-extrabold">
                      {agents[0].name}
                    </h3>

                    <p className="mt-1 text-xs text-emerald-100">
                      전체 의뢰 분석 · 전문 에이전트 조율 · 결과 통합
                    </p>
                  </div>
                </div>

                <p className="mt-4 border-t border-white/15 pt-4 text-sm leading-relaxed text-emerald-50">
                  {agents[0].desc}
                </p>
              </div>

              {/* 총괄 에이전트에서 전문 에이전트로 연결 */}
              <div className="h-6 w-px bg-emerald-500" />

              <div className="relative hidden h-5 w-[81%] lg:block">
                <div className="absolute inset-x-0 top-0 h-px bg-emerald-400" />
              </div>
            </div>

            {/* 2. 전문 AI 에이전트 5개 */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 lg:pt-0">
              {agents.slice(1).map((agent) => (
                <div key={agent.name} className="relative">
                  <div className="mx-auto h-5 w-px bg-emerald-400 lg:absolute lg:top-0 lg:left-1/2 lg:-translate-y-full" />

                  <div className="h-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[#064e43]">
                      {agent.icon}
                    </div>

                    <p className="mt-4 text-[10px] font-mono font-semibold tracking-wider text-stone-400">
                      {agent.role}
                    </p>

                    <h3 className="mt-1 text-base font-extrabold text-stone-900">
                      {agent.name}
                    </h3>

                    <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                      {agent.badge}
                    </span>

                    <p className="mt-3 text-xs leading-relaxed text-stone-600">
                      {agent.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 협업 구조 안내 */}
            <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span>
                1개 총괄 에이전트 + 5개 전문 에이전트 협업 구조
              </span>
            </div>
      </section>

      {/* 2. "인기 여행지" - World-Class Curated Destinations Gallery */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#e8e4dc] pb-4">
          <div>
            <span className="text-xs font-bold text-[#064e43] uppercase tracking-wider font-mono">
              CURATED KOREAN DESTINATIONS
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif mt-1">
              인기 여행지
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 max-w-md">
            클릭하시면 7인의 AI 에이전트가 완성한 정밀 일정표 및 10년 기후 기반 예측 정보를 즉시 열람할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularDestinations.map((dest) => (
            <div
              key={dest.id}
              onClick={dest.onClick}
              className="group relative rounded-3xl overflow-hidden shadow-sm border border-[#e8e4dc] h-80 cursor-pointer hover:shadow-xl hover:border-stone-400 transition-all duration-500 flex flex-col justify-between p-6"
            >
              {/* Background Photography with Zoom Effect */}
              <img
                src={dest.imageUrl}
                alt={dest.name}
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
              />

              {/* Ambient Luxury Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-stone-950/20 group-hover:from-stone-950/95 transition-colors duration-300" />

              {/* Top Tag Badge */}
              <div className="relative z-10 self-start">
                <span className="px-3 py-1 rounded-full bg-stone-900/70 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white">
                  {dest.tag}
                </span>
              </div>

              {/* Bottom Content */}
              <div className="relative z-10 space-y-1.5 text-white">
                <span className="text-xs font-mono text-emerald-300 uppercase tracking-wider">
                  {dest.sub}
                </span>
                <h3 className="text-2xl font-bold tracking-tight font-serif flex items-center justify-between">
                  <span>{dest.name}</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-[#e26a2c] group-hover:translate-x-1 transition-all">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed line-clamp-2 pt-0.5">
                  {dest.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
