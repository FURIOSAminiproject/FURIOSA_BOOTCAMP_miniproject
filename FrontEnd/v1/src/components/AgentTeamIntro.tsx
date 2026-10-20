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
      name: '총괄 협연자 (마에스트로)',
      role: 'SUPERVISOR & ORCHESTRATOR',
      desc: '전체 에이전트 총괄 지휘·일차별 중복 차단 및 지도 연동 전수 감수, 무결점 오류 복구',
      icon: <ShieldAlert className="w-5 h-5 text-emerald-700" />,
      badge: '총괄 지휘',
      highlight: true
    },
    {
      name: '지식전달관 (알고리)',
      role: 'STUDIO & TRANSFORMER',
      desc: '트랜스포머 Self-Attention 및 딥러닝 원리 해설, 12개 에이전트 소스코드 전격 시현',
      icon: <Sparkles className="w-5 h-5 text-violet-700" />,
      badge: '스튜디오 총괄',
      highlight: true
    },
    {
      name: '기상·기후 관리관 (날씨지기)',
      role: 'CLIMATE & REALTIME WEATHER',
      desc: '10개년 ML 모델 장기 예측과 실시간 기상 관측 동시 분석, 기후 특보 경보 및 준비물',
      icon: <CloudSun className="w-5 h-5 text-sky-600" />,
      badge: '기상 관리',
      highlight: true
    },
    {
      name: '안전·위기관리 총괄관 (안전지킴이)',
      role: 'SAFETY & EMERGENCY RISK',
      desc: '최근 사건사고 빅데이터 정밀 분석, 24시 응급의료 연동 및 세계 최고 수준 안전 보장',
      icon: <LifeBuoy className="w-5 h-5 text-emerald-600" />,
      badge: '세계 최고 안전',
      highlight: true
    },
    {
      name: '접수 총괄 길라잡이',
      role: 'INTAKE & CONCIERGE',
      desc: '고객 의뢰 분석, 여행 스타일·동행자 특성 맞춤 전략 수립',
      icon: <Send className="w-5 h-5 text-[#064e43]" />,
      badge: '의뢰 분석'
    },
    {
      name: '관광지 명소박사',
      role: 'ATTRACTIONS & NATURE',
      desc: '권역별 핵심 랜드마크와 숨은 비경 탐색 (일차 간 중복 0건)',
      icon: <Compass className="w-5 h-5 text-[#064e43]" />,
      badge: '명소 엄선'
    },
    {
      name: '미식가 큐레이터',
      role: 'GOURMET & CAFES',
      desc: '블루리본 로컬 향토 맛집과 오션/마운틴 파노라마 뷰 카페 엄선',
      icon: <Utensils className="w-5 h-5 text-[#064e43]" />,
      badge: '로컬 미식'
    },
    {
      name: '숙소 안식처',
      role: 'BOUTIQUE & STAYS',
      desc: '오션뷰 호텔, 전통 한옥스테이, 프라이빗 독채 풀빌라 매칭',
      icon: <Hotel className="w-5 h-5 text-[#064e43]" />,
      badge: '맞춤 숙소'
    },
    {
      name: '동선지기 & 지도 연동관',
      role: 'MOBILITY & GIS PUSH',
      desc: '최단 이동 경로 계산, 네이버 & 구글 MAP 검색창 100% PUSH 연동',
      icon: <Car className="w-5 h-5 text-[#064e43]" />,
      badge: 'GIS 지도'
    },
    {
      name: '일정 & 경비 설계사',
      role: 'TIMELINE & BUDGET',
      desc: '시간대별 분 단위 타임라인 및 항목별 실시간 총경비 투명 산출',
      icon: <Calendar className="w-5 h-5 text-[#064e43]" />,
      badge: '경비 편성'
    },
    {
      name: '안전 & 품질 감수관',
      role: 'AUDITOR & SAFETY',
      desc: '예산 준수율·동선 안전성 감사 및 관리자 인가(승인) 상신',
      icon: <ShieldCheck className="w-5 h-5 text-[#064e43]" />,
      badge: '품질 감사'
    },
    {
      name: '풍류시객 (문학 큐레이터)',
      role: 'LITERARY ESSAY & POETRY',
      desc: '선정된 음식점과 카페마다 감성 수필 3~4문장과 시(詩) 한 수 헌정',
      icon: <Feather className="w-5 h-5 text-[#064e43]" />,
      badge: '감성 문학'
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
      {/* 1. "우리 여행사의 AI 에이전트 팀" - Elevated World-Class Roster */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#e8e4dc] pb-4">
          <div>
            <span className="text-xs font-bold text-[#064e43] uppercase tracking-wider font-mono">
              AUTONOMOUS SPECIALISTS
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif mt-1">
              우리 여행사의 AI 에이전트 팀
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-xs sm:text-sm text-stone-500 max-w-md">
              총괄 협연자와 지식전달관의 지휘 아래 12인의 특화 에이전트가 완벽한 하모니로 고객 한 분만을 위한 맞춤 일정을 직조합니다.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {onOpenStudio && (
                <button
                  onClick={onOpenStudio}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold shrink-0 transition-all shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>트랜스포머 스튜디오</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              {onOpenWeatherStudio && (
                <button
                  onClick={onOpenWeatherStudio}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shrink-0 transition-all shadow-xs cursor-pointer"
                >
                  <CloudSun className="w-3.5 h-3.5 text-sky-200" />
                  <span>기상예보 기술 분석</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className={`rounded-3xl p-6 border shadow-xs space-y-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                agent.highlight
                  ? 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 border-emerald-500/50 ring-1 ring-emerald-500/20'
                  : 'bg-white border-[#e8e4dc] hover:border-[#064e43]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                  agent.highlight ? 'bg-emerald-700 text-white shadow-xs' : 'bg-teal-50 text-[#064e43]'
                }`}>
                  {agent.icon}
                </div>
                <div className="flex items-center gap-1.5">
                  {agent.highlight && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    agent.highlight
                      ? 'bg-emerald-700 text-white'
                      : 'bg-stone-100 text-stone-600 border border-stone-200'
                  }`}>
                    {agent.badge}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono tracking-wider text-stone-400 uppercase font-semibold">
                  {agent.role}
                </div>
                <h3 className="font-bold text-stone-900 text-base sm:text-lg mt-0.5">
                  {agent.name}
                </h3>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                  {agent.desc}
                </p>
              </div>
            </div>
          ))}
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
