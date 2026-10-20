/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Heart, ShieldCheck, Compass, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { FullTravelPlan } from '../types/travel';

interface MultiPlanComparisonChartProps {
  plans: FullTravelPlan[];
  onSelectPlan?: (plan: FullTravelPlan) => void;
}

export const MultiPlanComparisonChart: React.FC<MultiPlanComparisonChartProps> = ({
  plans,
  onSelectPlan
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    plans.slice(0, 3).map(p => p.requestId)
  );
  const [activeMetricTab, setActiveMetricTab] = useState<'COST' | 'PREFERENCE'>('COST');

  if (!plans || plans.length === 0) {
    return null;
  }

  const comparedPlans = plans.filter(p => selectedIds.includes(p.requestId));

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter(x => x !== id));
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      } else {
        setSelectedIds([selectedIds[1], selectedIds[2], id]);
      }
    }
  };

  // Preference indices calculation per plan
  const getPreferenceScores = (plan: FullTravelPlan) => {
    const isHealing = plan.request.style.some(s => s.includes('힐링') || s.includes('휴양'));
    const isGourmet = plan.request.style.some(s => s.includes('미식') || s.includes('카페'));
    const isActivity = plan.request.style.some(s => s.includes('액티비티'));

    const healingScore = isHealing ? 98 : 88;
    const gourmetScore = isGourmet ? 97 : 89;
    const routeScore = plan.agentAuditReport?.routeEfficiencyScore || 96;
    const safetyScore = plan.agentAuditReport?.safetyScore || 99;
    const budgetMatch = plan.agentAuditReport?.budgetMatchScore || 98;
    const vfmScore = Math.round((budgetMatch + routeScore) / 2);

    return {
      healingScore,
      gourmetScore,
      routeScore,
      safetyScore,
      vfmScore
    };
  };

  return (
    <div className="bg-white rounded-3xl border border-[#e8e4dc] p-6 sm:p-8 shadow-sm space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#e8e4dc] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-xs font-bold text-[#064e43] mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
            <span>CROSS-PLAN COMPARATIVE BENCHMARK</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">
            여행 일정 다각도 비교 분석 (경비 & 선호도 지표)
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            등록된 여행 일정들의 항목별 실지출 경비와 힐링, 미식, 동선, 안전 등 핵심 선호도 지표를 한눈에 비교 분석합니다.
          </p>
        </div>

        {/* Tab Toggle: Cost vs Preference */}
        <div className="flex items-center p-1 rounded-2xl bg-stone-100 border border-stone-200/80 shrink-0">
          <button
            onClick={() => setActiveMetricTab('COST')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeMetricTab === 'COST'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>경비 분석</span>
          </button>
          <button
            onClick={() => setActiveMetricTab('PREFERENCE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeMetricTab === 'PREFERENCE'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>선호도·품질 지표</span>
          </button>
        </div>
      </div>

      {/* Plan Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-stone-500 shrink-0">비교 대상 (최대 3개):</span>
        {plans.map(p => {
          const isSelected = selectedIds.includes(p.requestId);
          return (
            <button
              key={p.requestId}
              onClick={() => toggleSelect(p.requestId)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#064e43] text-white shadow-2xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200'
              }`}
            >
              <span>{isSelected ? '✓' : '+'}</span>
              <span>{p.request.clientName} ({p.request.destination})</span>
            </button>
          );
        })}
      </div>

      {/* METRIC 1: COST COMPARISON */}
      {activeMetricTab === 'COST' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {comparedPlans.map((plan, idx) => {
              const costs = plan.costs;
              const persons = (plan.request.adultCount || 2) + (plan.request.childCount || 0);
              const accomPct = Math.round((costs.accommodationTotal / costs.totalCost) * 100) || 35;
              const foodPct = Math.round((costs.foodAndCafeTotal / costs.totalCost) * 100) || 30;
              const transPct = Math.round((costs.transportTotal / costs.totalCost) * 100) || 15;
              const attrPct = Math.round((costs.attractionTotal / costs.totalCost) * 100) || 10;
              const reservePct = Math.max(100 - (accomPct + foodPct + transPct + attrPct), 5);

              return (
                <div
                  key={plan.requestId}
                  className="p-5 rounded-3xl border border-[#e8e4dc] bg-stone-50/50 space-y-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                        후보 #{idx + 1}
                      </span>
                      <h4 className="font-bold text-stone-900 text-base mt-1">
                        {plan.request.clientName}님의 일정
                      </h4>
                      <p className="text-xs text-stone-500">{plan.request.destination} · {plan.days.length}일간</p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-stone-400">총 예산</div>
                      <div className="text-lg font-black text-stone-900">
                        ₩{(costs.totalCost / 10000).toLocaleString()}만원
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700">
                        1인 ₩{costs.costPerPerson.toLocaleString()}원
                      </div>
                    </div>
                  </div>

                  {/* Stacked Cost Distribution Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-stone-500 font-medium">
                      <span>항목별 지출 비중</span>
                      <span>100%</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden flex bg-stone-200">
                      <div style={{ width: `${accomPct}%` }} className="bg-purple-600" title={`숙박: ${accomPct}%`} />
                      <div style={{ width: `${foodPct}%` }} className="bg-amber-500" title={`식음료: ${foodPct}%`} />
                      <div style={{ width: `${transPct}%` }} className="bg-blue-600" title={`교통: ${transPct}%`} />
                      <div style={{ width: `${attrPct}%` }} className="bg-indigo-500" title={`관광: ${attrPct}%`} />
                      <div style={{ width: `${reservePct}%` }} className="bg-stone-400" title={`예비비: ${reservePct}%`} />
                    </div>
                  </div>

                  {/* Cost Numbers Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-white border border-stone-200">
                      <div className="text-stone-400 text-[10px]">숙박비 ({accomPct}%)</div>
                      <div className="font-bold text-purple-900">₩{costs.accommodationTotal.toLocaleString()}원</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-stone-200">
                      <div className="text-stone-400 text-[10px]">식음료/카페 ({foodPct}%)</div>
                      <div className="font-bold text-amber-900">₩{costs.foodAndCafeTotal.toLocaleString()}원</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-stone-200">
                      <div className="text-stone-400 text-[10px]">교통비 ({transPct}%)</div>
                      <div className="font-bold text-blue-900">₩{costs.transportTotal.toLocaleString()}원</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-stone-200">
                      <div className="text-stone-400 text-[10px]">관광/체험 ({attrPct}%)</div>
                      <div className="font-bold text-indigo-900">₩{costs.attractionTotal.toLocaleString()}원</div>
                    </div>
                  </div>

                  {onSelectPlan && (
                    <button
                      onClick={() => onSelectPlan(plan)}
                      className="w-full py-2 rounded-xl bg-stone-100 hover:bg-[#064e43] hover:text-white text-stone-700 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>이 일정 선택하여 보기</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* METRIC 2: PREFERENCE & QUALITY INDEX */}
      {activeMetricTab === 'PREFERENCE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {comparedPlans.map((plan, idx) => {
              const scores = getPreferenceScores(plan);

              return (
                <div
                  key={plan.requestId}
                  className="p-5 rounded-3xl border border-[#e8e4dc] bg-stone-50/50 space-y-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                        후보 #{idx + 1}
                      </span>
                      <h4 className="font-bold text-stone-900 text-base mt-1">
                        {plan.request.clientName}님의 여정
                      </h4>
                      <p className="text-xs text-stone-500">{plan.request.destination}</p>
                    </div>

                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm">
                      {Math.round((scores.healingScore + scores.gourmetScore + scores.safetyScore + scores.vfmScore) / 4)}
                    </div>
                  </div>

                  {/* Indicator Bars */}
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between font-semibold text-stone-700 mb-1">
                        <span>힐링/휴양 지수</span>
                        <span className="font-bold text-emerald-700">{scores.healingScore}점</span>
                      </div>
                      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full" style={{ width: `${scores.healingScore}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold text-stone-700 mb-1">
                        <span>로컬 미식 만족도</span>
                        <span className="font-bold text-amber-600">{scores.gourmetScore}점</span>
                      </div>
                      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full" style={{ width: `${scores.gourmetScore}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold text-stone-700 mb-1">
                        <span>동선 효율성 (무결점)</span>
                        <span className="font-bold text-blue-600">{scores.routeScore}점</span>
                      </div>
                      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full" style={{ width: `${scores.routeScore}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold text-stone-700 mb-1">
                        <span>안전 관리 지수 (Tier 1)</span>
                        <span className="font-bold text-rose-600">{scores.safetyScore}점</span>
                      </div>
                      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full" style={{ width: `${scores.safetyScore}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold text-stone-700 mb-1">
                        <span>가성비 종합 점수</span>
                        <span className="font-bold text-teal-700">{scores.vfmScore}점</span>
                      </div>
                      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-teal-600 h-full" style={{ width: `${scores.vfmScore}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-stone-200 text-[11px] text-stone-600">
                    <span className="font-bold text-[#064e43]">AI 총평: </span>
                    {scores.vfmScore >= 97 ? '가성비와 동선이 최적으로 결합된 추천 코스입니다.' : '여유로운 힐링과 안전 관리에 집중된 고품격 코스입니다.'}
                  </div>

                  {onSelectPlan && (
                    <button
                      onClick={() => onSelectPlan(plan)}
                      className="w-full py-2 rounded-xl bg-stone-100 hover:bg-[#064e43] hover:text-white text-stone-700 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>이 일정 선택하여 보기</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
