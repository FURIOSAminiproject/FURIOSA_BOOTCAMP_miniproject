import React from 'react';
import { AgencyStats, FullTravelPlan } from '../types/travel';
import { TrendingUp, CheckCircle, Clock, Users, ArrowUpRight, ShieldCheck, DollarSign, Sparkles, MapPin, ChevronRight } from 'lucide-react';

interface AdminDashboardProps {
  stats: AgencyStats;
  allPlans: FullTravelPlan[];
  onSelectPlan: (plan: FullTravelPlan) => void;
  onOpenApproval: (plan: FullTravelPlan) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  allPlans,
  onSelectPlan,
  onOpenApproval
}) => {
  const pendingPlans = allPlans.filter(p => p.request.status === 'PENDING_APPROVAL');
  const approvedPlans = allPlans.filter(p => p.request.status === 'APPROVED');
  const revisingPlans = allPlans.filter(p => p.request.status === 'REVISING');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-stone-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                자율 에이전트 시스템 가동 중
              </span>
              <span className="text-xs text-stone-400">길벗 AI 관제 센터</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              인공지능 자율 운영 통계 및 인가 관제소
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
              7인의 AI 에이전트가 고객 접수부터 명소, 미식, 숙소, 교통, 일정, 감수까지 100% 자율 수립하며,
              최종 승인은 관리자의 정밀 결심을 거쳐 고객에게 확정 교부됩니다.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
            <div className="text-right">
              <span className="text-xs text-stone-300 block">승인 대기 건수</span>
              <span className="text-2xl font-black text-amber-300">{pendingPlans.length}건</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold">총 접수 의뢰</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-stone-900">{stats.totalRequests}건</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> AI 100% 자동 설계
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold">관리자 최종 승인율</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">{stats.approvalRate}%</div>
            <p className="text-[11px] text-stone-500 mt-1">
              승인 {stats.approvedCount}건 / 수정 {stats.revisingCount}건
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold">누적 예상 여행 매출</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-stone-900">
              {(stats.totalEstimatedRevenue / 10000).toLocaleString()}만원
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              평균 단가 124만원 / 건
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold">AI 평균 설계 소요 시간</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-700">{stats.averageDesignTimeSeconds}초</div>
            <p className="text-[11px] text-stone-500 mt-1">
              7인 에이전트 동시 협력
            </p>
          </div>
        </div>
      </div>

      {/* Main Split: Pending Approvals & Popular Destinations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Approval Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-stone-900 text-base">
                승인 인가 대기열 ({pendingPlans.length})
              </h3>
            </div>
            <span className="text-xs text-stone-500">
              관리자 서명 후 고객 바우처가 즉시 발행됩니다
            </span>
          </div>

          {pendingPlans.length === 0 ? (
            <div className="py-12 text-center text-stone-400 space-y-2">
              <CheckCircle className="w-10 h-10 mx-auto text-emerald-500/70" />
              <p className="text-sm font-medium text-stone-600">현재 대기 중인 인가 건이 모두 처리되었습니다.</p>
              <p className="text-xs text-stone-400">새로운 여행 의뢰가 접수되면 AI가 자동 설계 후 이곳에 등록됩니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPlans.map(plan => (
                <div
                  key={plan.requestId}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        인가 대기
                      </span>
                      <h4 className="font-bold text-stone-900 text-sm sm:text-base">
                        {plan.request.clientName} 고객님 ({plan.request.destination})
                      </h4>
                    </div>
                    <p className="text-xs text-stone-600 line-clamp-1">
                      {plan.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 pt-0.5">
                      <span>🕒 {plan.request.startDate} ~ {plan.request.endDate}</span>
                      <span>👥 {plan.request.adultCount}명</span>
                      <span className="font-semibold text-blue-700">
                        견적 {(plan.costs.totalCost / 10000).toLocaleString()}만원
                      </span>
                      <span className="text-emerald-700 font-medium">
                        안전도 {plan.agentAuditReport.safetyScore}점
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onSelectPlan(plan)}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-white text-xs font-semibold transition-colors"
                    >
                      상세 보기
                    </button>
                    <button
                      onClick={() => onOpenApproval(plan)}
                      className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      인가 심사
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recently Approved Mini Table */}
          {approvedPlans.length > 0 && (
            <div className="pt-4 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">
                최근 확정 완료 건 ({approvedPlans.length})
              </h4>
              <div className="space-y-2">
                {approvedPlans.slice(0, 3).map(plan => (
                  <div
                    key={plan.requestId}
                    onClick={() => onSelectPlan(plan)}
                    className="p-3 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-stone-800">{plan.request.clientName}</span>
                      <span className="text-stone-500">| {plan.request.destination}</span>
                      <span className="text-stone-400 hidden sm:inline">
                        (승인자: {plan.request.approverName || '총괄관리자'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900">
                        {(plan.costs.totalCost / 10000).toLocaleString()}만원
                      </span>
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Top Regions Breakdown */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              인기 국내 권역 분석
            </h3>
            <span className="text-xs text-stone-400">실시간 통계</span>
          </div>

          <div className="space-y-3.5">
            {stats.topDestinations.map(item => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-800">{item.name}</span>
                  <span className="text-stone-500">{item.count}건 ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Agency Policy Note */}
          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-100 text-xs text-stone-600 space-y-1.5 mt-4">
            <div className="font-bold text-stone-800 flex items-center gap-1.5">
              <span>📋 자율 운영 규정</span>
            </div>
            <p className="leading-relaxed text-[11px] text-stone-500">
              모든 의뢰는 AI 7인 전문위원단의 교차 검증을 거쳐 5초 내 초안이 수립되며,
              최종 승인 권한은 고객 신뢰와 안전을 위해 전속 관리자 1인 이상에게 전속되어 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
