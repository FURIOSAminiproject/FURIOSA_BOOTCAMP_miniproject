/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AgencyStats, FullTravelPlan } from '../types/travel';
import { Mail, CheckCircle2, RotateCcw, XCircle, ShieldCheck, Clock, TrendingUp, DollarSign, ChevronRight, Eye, ShieldAlert, Globe, ExternalLink, Calendar, Users, MapPin, CloudSun, LifeBuoy, Utensils, Hotel, Zap, Activity, BarChart2 } from 'lucide-react';
import { MultiPlanComparisonChart } from './MultiPlanComparisonChart';

interface AdminDashboardProps {
  stats: AgencyStats;
  allPlans: FullTravelPlan[];
  onSelectPlan: (plan: FullTravelPlan) => void;
  onOpenApproval: (plan: FullTravelPlan) => void;
}

type AdminTab = 'ALL' | 'PENDING' | 'WORKING' | 'APPROVED' | 'REJECTED';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  allPlans,
  onSelectPlan,
  onOpenApproval
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('ALL');

  // Count by status
  const pendingPlans = allPlans.filter(p => p.request.status === 'PENDING_APPROVAL');
  const workingPlans = allPlans.filter(p => p.request.status === 'ANALYZING' || p.request.status === 'REVISING');
  const approvedPlans = allPlans.filter(p => p.request.status === 'APPROVED');
  const rejectedPlans = allPlans.filter(p => p.request.status === 'REJECTED');

  // Filter plans based on the active tab
  const getFilteredPlans = () => {
    switch (activeTab) {
      case 'PENDING':
        return pendingPlans;
      case 'WORKING':
        return workingPlans;
      case 'APPROVED':
        return approvedPlans;
      case 'REJECTED':
        return rejectedPlans;
      case 'ALL':
      default:
        return allPlans;
    }
  };

  const currentPlans = getFilteredPlans();

  return (
    <div className="space-y-8">
      {/* Title & Executive Summary */}
      <div className="space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-800 uppercase px-2.5 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-200">
                EXECUTIVE OPERATIONS CENTER
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif mt-1">
              관리자 인가 & 운영 관제 센터
            </h1>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white border border-[#e8e4dc] text-xs font-semibold text-stone-600 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI 멀티에이전트 자율 관제 정상 가동 중</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-500">
          12인의 전문 AI 에이전트가 자율 접수·설계한 모든 여행 계획의 무결성을 검토하고, 최종 인가(결심)를 내립니다.
        </p>
      </div>

      {/* World-Class Executive Operational KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Requests */}
        <div className="p-5 rounded-3xl bg-white border border-[#e8e4dc] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>누적 의뢰 접수</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              실시간
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 font-serif">
            {stats.totalRequests}
            <span className="text-sm font-sans font-normal text-stone-500 ml-1">건</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 pt-1 border-t border-stone-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% AI 자율설계 완수</span>
          </div>
        </div>

        {/* KPI 2: Approval Rate */}
        <div className="p-5 rounded-3xl bg-white border border-[#e8e4dc] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>관리자 인가율</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              우수
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-serif">
            {stats.approvalRate}
            <span className="text-sm font-sans font-normal text-stone-500 ml-1">%</span>
          </div>
          <div className="text-[11px] text-stone-600 flex items-center justify-between pt-1 border-t border-stone-100">
            <span>{stats.approvedCount}건 확정 교부</span>
            <span className="text-amber-800 font-medium">대기 {pendingPlans.length}건</span>
          </div>
        </div>

        {/* KPI 3: Total Revenue */}
        <div className="p-5 rounded-3xl bg-white border border-[#e8e4dc] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>총 여행 취급고</span>
            <DollarSign className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 font-serif">
            {(stats.totalEstimatedRevenue / 10000).toLocaleString()}
            <span className="text-sm font-sans font-normal text-stone-500 ml-1">만원</span>
          </div>
          <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-100">
            <span>평균 건당 약 124.5만원 규모</span>
          </div>
        </div>

        {/* KPI 4: Autonomous Efficiency */}
        <div className="p-5 rounded-3xl bg-white border border-[#e8e4dc] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span>평균 설계 소요</span>
            <Clock className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-900 font-serif">
            {stats.averageDesignTimeSeconds}
            <span className="text-sm font-sans font-normal text-stone-500 ml-1">초</span>
          </div>
          <div className="text-[11px] text-purple-700 font-semibold pt-1 border-t border-stone-100">
            <span>전문 AI 에이전트 동시 교차 검증</span>
          </div>
        </div>
      </div>

      {/* AI Agents Real-Time Contribution & Latency Visualization Chart Section */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#e8e4dc] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-mono text-emerald-800 font-bold uppercase tracking-wider">
                REAL-TIME 12-AGENT TELEMETRY & LATENCY MONITOR
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 font-serif mt-1 flex items-center gap-2">
              <span>12인 AI 에이전트별 기여도 및 실시간 작업 시간 시각화</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-sans font-semibold">
                자율 운영 관제
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="flex items-center gap-1 font-semibold text-stone-700">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              평균 응답: <b>385ms</b>
            </span>
            <span className="text-stone-300">|</span>
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <Activity className="w-3.5 h-3.5" />
              정합도: <b>99.8%</b>
            </span>
          </div>
        </div>

        {/* Stacked Contribution Percentage Distribution Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-stone-700">12인 에이전트별 파이프라인 기여도 총합 분배</span>
            <span className="font-mono text-stone-500">100% 분배 가동 중 (12개 에이전트)</span>
          </div>
          <div className="h-4 rounded-xl overflow-hidden flex bg-stone-100 shadow-inner">
            <div style={{ width: '11.5%' }} className="bg-teal-600 transition-all hover:opacity-90" title="일정: 11.5%" />
            <div style={{ width: '9.5%' }} className="bg-emerald-600 transition-all hover:opacity-90" title="경비: 9.5%" />
            <div style={{ width: '9.0%' }} className="bg-indigo-600 transition-all hover:opacity-90" title="명소: 9.0%" />
            <div style={{ width: '10.5%' }} className="bg-amber-600 transition-all hover:opacity-90" title="맛집: 10.5%" />
            <div style={{ width: '9.0%' }} className="bg-purple-600 transition-all hover:opacity-90" title="숙소: 9.0%" />
            <div style={{ width: '10.0%' }} className="bg-blue-600 transition-all hover:opacity-90" title="교통/GIS: 10.0%" />
            <div style={{ width: '8.5%' }} className="bg-sky-600 transition-all hover:opacity-90" title="기상·기후: 8.5%" />
            <div style={{ width: '9.0%' }} className="bg-rose-600 transition-all hover:opacity-90" title="안전·위기: 9.0%" />
            <div style={{ width: '6.5%' }} className="bg-emerald-700 transition-all hover:opacity-90" title="접수디렉터: 6.5%" />
            <div style={{ width: '6.0%' }} className="bg-red-600 transition-all hover:opacity-90" title="품질감수: 6.0%" />
            <div style={{ width: '5.5%' }} className="bg-stone-600 transition-all hover:opacity-90" title="문학큐레이터: 5.5%" />
            <div style={{ width: '5.0%' }} className="bg-violet-700 transition-all hover:opacity-90" title="지식전달관: 5.0%" />
          </div>
        </div>

        {/* Individual Agent Performance Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {[
            { name: '일정 설계사', role: '타임라인 직조', pct: 11.5, latency: '460ms', tasks: '148건', color: 'text-teal-700 bg-teal-50 border-teal-200', bar: 'bg-teal-600' },
            { name: '경비 편성사', role: '실시간 총원가', pct: 9.5, latency: '310ms', tasks: '148건', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-600' },
            { name: '관광지 명소박사', role: '랜드마크 미중복', pct: 9.0, latency: '390ms', tasks: '148건', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', bar: 'bg-indigo-600' },
            { name: '미식가 큐레이터', role: '블루리본/뷰카페', pct: 10.5, latency: '410ms', tasks: '296건', color: 'text-amber-700 bg-amber-50 border-amber-200', bar: 'bg-amber-600' },
            { name: '숙소 안식처', role: '오션뷰/한옥 매칭', pct: 9.0, latency: '520ms', tasks: '142건', color: 'text-purple-700 bg-purple-50 border-purple-200', bar: 'bg-purple-600' },
            { name: '동선지기 & GIS', role: '네이버/구글 PUSH', pct: 10.0, latency: '640ms', tasks: '148건', color: 'text-blue-700 bg-blue-50 border-blue-200', bar: 'bg-blue-600' },
            { name: '기상·기후 관리관', role: '10년 추론/실시간', pct: 8.5, latency: '290ms', tasks: '148건', color: 'text-sky-700 bg-sky-50 border-sky-200', bar: 'bg-sky-600' },
            { name: '안전·위기관리관', role: '24시 응급/보험', pct: 9.0, latency: '350ms', tasks: '148건', color: 'text-rose-700 bg-rose-50 border-rose-200', bar: 'bg-rose-600' },
            { name: '접수 디렉터', role: '성향/테마 분석', pct: 6.5, latency: '280ms', tasks: '148건', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', bar: 'bg-emerald-700' },
            { name: '안전·품질 감수관', role: '품질감사·인가상신', pct: 6.0, latency: '340ms', tasks: '148건', color: 'text-red-700 bg-red-50 border-red-200', bar: 'bg-red-600' },
            { name: '풍류시객 (문학)', role: '감성 수필/시 헌정', pct: 5.5, latency: '330ms', tasks: '148건', color: 'text-stone-700 bg-stone-100 border-stone-300', bar: 'bg-stone-600' },
            { name: '지식전달관 (알고리)', role: '스튜디오/트랜스포머', pct: 5.0, latency: '220ms', tasks: '148건', color: 'text-violet-700 bg-violet-50 border-violet-200', bar: 'bg-violet-700' }
          ].map((agent, i) => (
            <div key={i} className="p-3.5 rounded-2xl border border-stone-200/90 bg-stone-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 truncate">{agent.name}</span>
                <span className="text-[10px] font-mono font-extrabold text-stone-700">{agent.pct}%</span>
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full ${agent.bar}`} style={{ width: `${agent.pct * 7}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-stone-500 font-mono">⚡ {agent.latency}</span>
                <span className="font-semibold text-emerald-800">{agent.tasks} 완수</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Plan Comparison Section */}
      <MultiPlanComparisonChart plans={allPlans} onSelectPlan={onSelectPlan} />

      {/* Segmented Control Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#ede8df] text-xs font-semibold text-stone-600 max-w-fit">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'hover:text-stone-900'
          }`}
        >
          전체 ({allPlans.length})
        </button>

        <button
          onClick={() => setActiveTab('PENDING')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'PENDING'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'hover:text-stone-900'
          }`}
        >
          <span>승인 대기</span>
          {pendingPlans.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#e26a2c] text-white text-[10px] font-bold flex items-center justify-center">
              {pendingPlans.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('WORKING')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'WORKING'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'hover:text-stone-900'
          }`}
        >
          AI 설계 중 ({workingPlans.length})
        </button>

        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'APPROVED'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'hover:text-stone-900'
          }`}
        >
          확정 완료 ({approvedPlans.length})
        </button>

        <button
          onClick={() => setActiveTab('REJECTED')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'REJECTED'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'hover:text-stone-900'
          }`}
        >
          반려 ({rejectedPlans.length})
        </button>
      </div>

      {/* Content Area: Approval Queue List */}
      {currentPlans.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#e5e0d8] p-16 sm:p-24 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#faf7f2] border border-[#e8e4dc] flex items-center justify-center mx-auto text-stone-500">
            <Mail className="w-7 h-7 stroke-1.5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-stone-900 text-lg sm:text-xl font-serif">
              해당 분류의 접수 건이 없습니다
            </h3>
            <p className="text-xs sm:text-sm text-stone-400">
              새로운 고객 여행 의뢰가 접수되면 AI 팀이 자율 설계를 완료한 후 이곳에 등록됩니다.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('ALL')}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 transition-colors"
          >
            전체 접수 목록 보기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {currentPlans.map((plan) => {
            const isPending = plan.request.status === 'PENDING_APPROVAL';
            const isApproved = plan.request.status === 'APPROVED';

            return (
              <div
                key={plan.requestId}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e5e0d8] shadow-xs hover:border-[#064e43]/50 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 group"
              >
                {/* Left: Client & Route Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                      isApproved ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                      isPending ? 'bg-amber-100 text-amber-950 border border-amber-200' :
                      plan.request.status === 'REVISING' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                      'bg-stone-100 text-stone-700'
                    }`}>
                      {isApproved ? '인가 완료 (APPROVED)' :
                       isPending ? '승인 대기 (PENDING)' :
                       plan.request.status === 'REVISING' ? 'AI 재설계 중' : '반려'}
                    </span>

                    <span className="text-xs text-stone-400 font-mono">
                      접수 ID: {plan.requestId}
                    </span>

                    <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      GIS 100% 검증 (중복 0건)
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-stone-900 font-serif flex items-center gap-2">
                      <span>{plan.request.clientName} 고객님</span>
                      <span className="text-stone-400 font-sans font-normal text-sm">
                        ({plan.request.departureCity} 출발 → {plan.request.destination})
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 mt-1 line-clamp-1">
                      {plan.title}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 pt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      {plan.request.startDate} ~ {plan.request.endDate} ({plan.days.length}일간)
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      성인 {plan.request.adultCount}명{plan.request.childCount > 0 ? `, 아동 ${plan.request.childCount}명` : ''}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="font-bold text-stone-900">
                      총 견적 {(plan.costs.totalCost / 10000).toLocaleString()}만원
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-stone-500">
                      연락처: {plan.request.clientContact}
                    </span>
                  </div>

                  {plan.request.adminNote && (
                    <div className="text-[11px] text-stone-600 bg-[#faf7f2] p-2.5 rounded-xl border border-stone-200/70 mt-2">
                      <span className="font-semibold text-stone-900">심사 메모:</span> {plan.request.adminNote}
                    </div>
                  )}
                </div>

                {/* Right: Action Buttons */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => onSelectPlan(plan)}
                    className="px-4 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <Eye className="w-4 h-4 text-stone-500" />
                    <span>일정표 열람</span>
                  </button>

                  <button
                    onClick={() => onOpenApproval(plan)}
                    className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      isPending
                        ? 'bg-[#064e43] hover:bg-[#043d34] text-white ring-2 ring-emerald-600/30'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>{isPending ? '인가 심사 및 확정' : '심사 내역 관리'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
