import React, { useState } from 'react';
import {
  Bot,
  Compass,
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Car,
  Coffee,
  Utensils,
  Camera,
  FolderHeart,
} from 'lucide-react';
import { FullTravelPlan } from '../types/travel';
import { AuthUser } from '../services/authService';
import { AgentTeamIntro } from './AgentTeamIntro';
import { TravelerSocialFeed } from './TravelerSocialFeed';

interface UserHomePageProps {
  currentUser?: AuthUser | null;
  onStartRequest: () => void;
  onStartChat: () => void;
  onOpenTripArchive: () => void;
  onQuickExplore: (destination: string) => void;
  onSelectPlan: (plan: FullTravelPlan) => void;
  onSelectDestination: (destination: string) => void;
  onOpenStudio?: () => void;
  onOpenWeatherStudio?: () => void;
}

export const UserHomePage: React.FC<UserHomePageProps> = ({
  currentUser,
  onStartRequest,
  onStartChat,
  onOpenTripArchive,
  onQuickExplore,
  onSelectPlan,
  onSelectDestination,
  onOpenStudio,
  onOpenWeatherStudio,
}) => {
  const userName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : '여행자');

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      {/* 1. 메인 웰컴 & 계획 모드 선택 영웅 섹션 (I am your J) */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#064e43] via-[#095c50] to-[#04332c] text-white p-7 sm:p-12 shadow-2xl border border-emerald-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          {/* 상단 뱃지 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider font-mono">I AM YOUR J</span>
            <span className="text-white/40">·</span>
            <span className="text-white/90">당신의 완벽한 계획형 여행 메이트</span>
          </div>

          {/* 메인 타이틀 */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              반가워요, <span className="text-amber-300">{userName}</span>님!
              <br />
              오늘 여행 계획은 <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-amber-200">어떻게 시작할까요?</span>
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/80 font-light leading-relaxed max-w-2xl">
              원하는 방식을 선택해 보세요. 말하듯 편하게 대화하며 추천받는 <strong>AI 채팅</strong>과,
              지도 위에서 동선과 맛집을 직접 비교하는 <strong>화면 플래너</strong>를 모두 지원합니다.
            </p>
          </div>

          {/* 2가지 선택 카드 (AI 채팅 VS 화면 플래너) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
            {/* 선택지 1: AI 채팅으로 계획 짜기 */}
            <div
              onClick={onStartChat}
              className="group relative cursor-pointer rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 sm:p-7 transition-all duration-300 hover:bg-white/20 hover:scale-[1.02] hover:shadow-2xl flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-300 border border-emerald-300/30">
                    <Bot className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-emerald-400/25 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                    대화형 추천 · Flash
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                    💬 AI 채팅으로 계획 짜기
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                    복잡한 입력 없이 대화하듯 편하게! AI 큐레이터 길벗에게 여행 일정과 먹고 싶은 메뉴를 말하면 1:1 맞춤 코스를 즉시 완성해 드립니다.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-emerald-200">
                    # 1박2일 드라이브
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-emerald-200">
                    # 고속도로 맛집
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-emerald-200">
                    # 오션뷰 카페
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/15">
                <span className="text-xs font-semibold text-emerald-300 group-hover:text-white transition-colors">
                  대화 플래너 바로가기
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#064e43] group-hover:bg-amber-300 transition-all">
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>

            {/* 선택지 2: 화면(플래너)으로 계획 짜기 */}
            <div
              onClick={onStartRequest}
              className="group relative cursor-pointer rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 sm:p-7 transition-all duration-300 hover:bg-white/20 hover:scale-[1.02] hover:shadow-2xl flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-300/30">
                    <Compass className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-amber-400/25 px-2.5 py-1 text-xs font-semibold text-amber-200">
                    지도 비교 & 맞춤 설계
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                    🗺️ 화면(플래너)으로 계획 짜기
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                    출발지와 도착지를 지도에서 직접 검색하고, 권장/최단 경로 비교와 통과 시간대별 도로변 반경 15km 맛집·명소 로드맵을 꼼꼼하게 설계합니다.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-amber-200">
                    # 두 경로 거리/시간 비교
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-amber-200">
                    # 타임라인 로드맵
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-amber-200">
                    # 카테고리 다중선택
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/15">
                <span className="text-xs font-semibold text-amber-300 group-hover:text-white transition-colors">
                  지도 플래너 바로가기
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#064e43] group-hover:bg-amber-300 transition-all">
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* 보관함 바로가기 링크 */}
          <div className="pt-2 flex items-center justify-between text-xs text-emerald-200/80">
            <span>이전에 계획했던 여행 결과가 있으신가요?</span>
            <button
              type="button"
              onClick={onOpenTripArchive}
              className="flex items-center gap-1.5 text-white font-bold hover:underline"
            >
              <FolderHeart className="h-4 w-4 text-amber-300" />
              <span>내 여행 결과 보기</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
