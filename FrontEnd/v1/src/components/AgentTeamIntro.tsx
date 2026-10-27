import React from 'react';
import {
  Bot,
  Compass,
  Utensils,
  Hotel,
  Car,
  Calendar,
  Sparkles,
  ArrowRight,
  MapPin,
  CloudSun,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
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
  onOpenWeatherStudio,
}) => {
  const features = [
    {
      title: 'Gemini 실시간 AI 큐레이션',
      subtitle: 'INTELLIGENT AI AGENT',
      desc: '복잡한 입력 없이 대화 한 번으로 일정, 맛집, 휴게소까지 고려한 1:1 맞춤 일정을 즉시 설계합니다.',
      icon: Bot,
      color: 'from-emerald-500/15 to-teal-500/5',
      border: 'border-emerald-200/80',
      tag: 'Gemini Flash-Lite',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      title: '정밀 도로망 GIS 동선 엔진',
      subtitle: 'GIS ROUTE EXPLORER',
      desc: '국토교통부 표준 도로망과 한국관광공사 데이터를 결합하여 권장·최단 경로와 실제 주행시간을 정밀 연산합니다.',
      icon: Compass,
      color: 'from-sky-500/15 to-blue-500/5',
      border: 'border-sky-200/80',
      tag: '권장·최단 경로 비교',
      badgeColor: 'bg-sky-100 text-sky-800',
    },
    {
      title: '시간대별 도로변 맛집 & 쉼터',
      subtitle: 'TIMELINE CURATION',
      desc: '출발 시각 기준 12:30 점심, 10:15 휴게소 등 동선 반경 15km 도로변의 알짜 맛집과 명소를 타임라인으로 제공합니다.',
      icon: Utensils,
      color: 'from-amber-500/15 to-orange-500/5',
      border: 'border-amber-200/80',
      tag: '도로변 반경 15km 큐레이션',
      badgeColor: 'bg-amber-100 text-amber-900',
    },
    {
      title: '스마트 기상 & 안심 여행 가이드',
      subtitle: 'CLIMATE & SAFETY CARE',
      desc: '여행 일정의 시간대별 날씨 예보를 반영하여 우천 시 대체 명소와 추천 옷차림, 패킹 체크리스트를 제안합니다.',
      icon: CloudSun,
      color: 'from-purple-500/15 to-indigo-500/5',
      border: 'border-purple-200/80',
      tag: '실시간 날씨 연동',
      badgeColor: 'bg-purple-100 text-purple-900',
    },
  ];

  const popularDestinations = [
    {
      id: 'jeju',
      name: '제주도',
      sub: '바다와 오름의 에메랄드 섬',
      description: '애월 한담해변 노을과 비자림 숲길, 감성 카페와 흑돼지 미식 투어',
      imageUrl: 'https://images.unsplash.com/photo-1548115184-bc6544d06a58?auto=format&fit=crop&w=1000&q=85',
      tag: '인기 1위 · 힐링 휴양',
      onClick: () => {
        if (onSelectDestination) onSelectDestination('제주도');
        onSelectPlan(PRESET_JEJU_PLAN);
      },
    },
    {
      id: 'gyeongju',
      name: '경주',
      sub: '천년의 달빛 서라벌 야경',
      description: '동궁과 월지 야경과 대릉원의 고요한 능선, 황리단길 한옥 감성 카페',
      imageUrl: gyeongjuWoljiImg,
      tag: '유네스코 세계유산 · 야경',
      onClick: () => {
        if (onSelectDestination) onSelectDestination('경주');
        onSelectPlan(PRESET_GYEONGJU_PLAN);
      },
    },
    {
      id: 'jeonju',
      name: '전주',
      sub: '한옥마을과 한식 미식의 본향',
      description: '오목대 기와마을 전경과 떡갈비·비빔밥, 한옥 골목길 산책',
      imageUrl: jeonjuHanokImg,
      tag: '로컬 미식 · 한옥 감성',
      onClick: () => {
        if (onSelectDestination) onSelectDestination('전주');
      },
    },
    {
      id: 'busan',
      name: '부산',
      sub: '오션뷰와 해안 드라이브의 낭만',
      description: '해운대 백사장 & 블루라인 해변열차, 광안대교 오션뷰 야경 투어',
      imageUrl: busanHaeundaeImg,
      tag: '해안 드라이브 · 오션뷰',
      onClick: () => {
        if (onSelectDestination) onSelectDestination('부산');
      },
    },
  ];

  return (
    <div className="space-y-16">
      {/* 1. I like your J 핵심 스마트 기능 쇼케이스 */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#e8e4dc] pb-4">
          <div>
            <span className="text-xs font-bold text-[#064e43] uppercase tracking-wider font-mono">
              WHY I LIKE YOUR J
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif mt-1">
              완벽한 여행을 설계하는 스마트 AI 엔진
            </h2>
            <p className="text-sm text-stone-500 mt-1.5">
              생성형 AI와 고정밀 GIS 공간정보가 결합하여 가장 빈틈없고 여유로운 여행 로드맵을 선사합니다.
            </p>
          </div>
        </div>

        {/* 4대 핵심 기술 Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`relative rounded-3xl border ${item.border} bg-gradient-to-b ${item.color} to-white p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between space-y-5`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs border border-stone-100 text-[#064e43]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${item.badgeColor}`}>
                      {item.tag}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-semibold tracking-wider text-stone-400 block">
                      {item.subtitle}
                    </span>
                    <h3 className="mt-1 text-base font-bold text-stone-900 leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. J들이 사랑하는 대한민국 인기 여행지 큐레이션 */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#e8e4dc] pb-4">
          <div>
            <span className="text-xs font-bold text-[#e26a2c] uppercase tracking-wider font-mono">
              CURATED DESTINATIONS
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif mt-1">
              J들이 사랑하는 인기 여행 코스
            </h2>
            <p className="text-sm text-stone-500 mt-1.5">
              원하는 여행지를 선택하면 I like your J 플래너에서 바로 일정을 시작할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularDestinations.map((dest) => (
            <div
              key={dest.id}
              onClick={dest.onClick}
              className="group cursor-pointer rounded-3xl overflow-hidden bg-white border border-[#e8e4dc] shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
            >
              <div className="relative h-48 overflow-hidden bg-stone-100">
                <img
                  src={dest.imageUrl}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-stone-800 shadow-sm">
                    {dest.tag}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 text-white">
                  <h3 className="text-xl font-extrabold tracking-tight drop-shadow-sm">
                    {dest.name}
                  </h3>
                  <p className="text-xs text-stone-200/90 font-light mt-0.5">
                    {dest.sub}
                  </p>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-xs text-stone-600 leading-relaxed">
                  {dest.description}
                </p>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#064e43] group-hover:text-[#e26a2c] transition-colors">
                  <span>이 여행지로 계획하기</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
