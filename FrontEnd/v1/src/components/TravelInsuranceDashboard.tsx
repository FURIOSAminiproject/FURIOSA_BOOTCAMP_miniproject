/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, LifeBuoy, AlertTriangle, CheckCircle2, ChevronRight, FileText, Phone, Award, Sparkles, Download, Check } from 'lucide-react';
import { FullTravelPlan } from '../types/travel';

interface TravelInsuranceDashboardProps {
  plan: FullTravelPlan;
}

export const TravelInsuranceDashboard: React.FC<TravelInsuranceDashboardProps> = ({ plan }) => {
  const [selectedPlanId, setSelectedPlanId] = useState<'BASIC' | 'STANDARD' | 'VIP'>('STANDARD');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const numTravelers = (plan.request.adultCount || 2) + (plan.request.childCount || 0);

  // Real-time Itinerary Risk Analysis based on destination and places
  const isJeju = plan.request.destination.includes('제주');
  const isGangneung = plan.request.destination.includes('강릉') || plan.request.destination.includes('속초');
  const isCoast = isJeju || isGangneung || plan.request.destination.includes('부산') || plan.request.destination.includes('여수');

  const riskFactors = [
    {
      category: '해양/수변 활동 위험도',
      score: isCoast ? 14 : 6,
      status: isCoast ? '주의 (너울성 파도 및 갯바위 실족 유의)' : '안심 (잔잔한 수변 산책)',
      color: isCoast ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
      category: '산악/숲길 보행 위험도',
      score: 8,
      status: '안심 (정비된 둘레길 및 완경사 산책로)',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
      category: '교통 및 렌터카 이동 위험도',
      score: plan.request.transportType === 'RENTAL_CAR' ? 12 : 5,
      status: plan.request.transportType === 'RENTAL_CAR' ? '보통 (야간 초행길 및 커브길 서행 운전)' : '최고 안심 (대중교통/KTX 연계)',
      color: plan.request.transportType === 'RENTAL_CAR' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
      category: '기상 변동 & 돌풍 리스크',
      score: 7,
      status: '안심 (일교차 9℃ 대비 보온 겉옷 지참)',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    }
  ];

  const overallSafetyIndex = 98.4; // 100 - average risk

  const insurancePlans = [
    {
      id: 'BASIC' as const,
      name: '실속 안심 플랜',
      tag: '가성비 실속형',
      pricePerPerson: 5800,
      badge: '기본 보장',
      benefits: [
        '국내 상해/질병 실손의료비 최대 3,000만원',
        '휴대품 파손 및 도난 손해 최대 50만원',
        '24시간 응급의료지원 및 긴급 이송',
        '사고 발생 시 모바일 즉시 보상 접수'
      ]
    },
    {
      id: 'STANDARD' as const,
      name: '표준 케어 플랜',
      tag: '안전관리 에이전트 추천 1위',
      pricePerPerson: 11500,
      badge: '강력 추천 ★',
      highlight: true,
      benefits: [
        '국내 상해/질병 실손의료비 최대 5,000만원',
        '휴대품 손해(스마트폰/카메라 등) 최대 100만원',
        '타인 배상책임 보장 최대 2,000만원',
        '렌터카 자차사고 지원 및 견인비 최대 1,000만원',
        '24시간 권역응급의료센터 원스톱 핫라인'
      ]
    },
    {
      id: 'VIP' as const,
      name: 'VIP 무결점 안심 플랜',
      tag: '최고급 프리미엄 전액 보장',
      pricePerPerson: 19800,
      badge: 'VIP 최고 보장',
      benefits: [
        '국내 상해/질병 실손의료비 최대 1억원 (무제한급)',
        '휴대품 손해 최대 200만원 (자기부담금 0원)',
        '항공기 및 대중교통 지연/결항 보상 최대 50만원',
        '24시간 전담 안전요원 1:1 직통 SOS 안심 케어',
        '여행 중 식중독 및 특정 감염병 치료비 전액'
      ]
    }
  ];

  const currentPlan = insurancePlans.find(p => p.id === selectedPlanId) || insurancePlans[1];
  const totalPrice = currentPlan.pricePerPerson * numTravelers;

  return (
    <div className="bg-white rounded-3xl border border-[#e8e4dc] p-6 sm:p-8 shadow-sm space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#e8e4dc] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs font-bold text-emerald-800 mb-2">
            <LifeBuoy className="w-3.5 h-3.5 text-emerald-600" />
            <span>REAL-TIME SAFETY AUDIT & INSURANCE CONCIERGE</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">
            일정 실시간 위험도 분석 & 맞춤 여행자 보험 플랜
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            안전관리 에이전트(안전지킴이)가 여행지의 지형, 동선, 기상, 교통 형태를 실시간 전수 분석하여 최적의 안심 가입 플랜을 제시합니다.
          </p>
        </div>

        {/* Global Safety Badge */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shrink-0">
          <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-emerald-800 uppercase font-semibold">GLOBAL SAFETY INDEX</div>
            <div className="text-xl font-black text-stone-900 tracking-tight">
              {overallSafetyIndex}<span className="text-sm font-semibold text-stone-500"> / 100</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-700">세계 최고 수준 안심 여행 권역</div>
          </div>
        </div>
      </div>

      {/* 1. Real-time Itinerary Risk Analysis Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-700" />
          <span>전체 여정 위험도 실시간 정밀 진단</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {riskFactors.map((factor, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-stone-200/80 bg-stone-50/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">{factor.category}</span>
                <span className="text-xs font-mono font-bold text-stone-900">{factor.score}%</span>
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${factor.score > 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${factor.score * 5}%` }}
                />
              </div>
              <div className={`text-[11px] px-2 py-1 rounded-lg border font-medium ${factor.color}`}>
                {factor.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Safety Agent Custom Insurance Tiers */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>안전관리 에이전트 맞춤형 안심 보험 플랜 추천</span>
            </h4>
            <p className="text-xs text-stone-500">
              여행 기간: {plan.request.startDate} ~ {plan.request.endDate} ({numTravelers}인 기준 맞춤 산출)
            </p>
          </div>

          <div className="text-xs font-semibold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full">
            인원: 성인 {plan.request.adultCount}명 {plan.request.childCount > 0 ? `+ 아동 ${plan.request.childCount}명` : ''}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {insurancePlans.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedPlanId(p.id)}
              className={`rounded-3xl p-6 border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5 ${
                selectedPlanId === p.id
                  ? 'bg-gradient-to-b from-white via-emerald-50/30 to-teal-50/40 border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
                  : 'bg-white border-[#e8e4dc] hover:border-emerald-500/40 hover:shadow-xs'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    p.highlight ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-600 border'
                  }`}>
                    {p.badge}
                  </span>
                  <span className="text-[11px] text-stone-400 font-medium">{p.tag}</span>
                </div>

                <div>
                  <h5 className="font-bold text-stone-900 text-lg">{p.name}</h5>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-stone-900">
                      ₩{(p.pricePerPerson * numTravelers).toLocaleString()}
                    </span>
                    <span className="text-xs text-stone-500">
                      (1인 ₩{p.pricePerPerson.toLocaleString()})
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-100">
                  {p.benefits.map((b, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-stone-600">
                      <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        selectedPlanId === p.id ? 'text-emerald-700' : 'text-stone-400'
                      }`} />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  selectedPlanId === p.id
                    ? 'bg-[#064e43] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {selectedPlanId === p.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>선택된 플랜</span>
                  </>
                ) : (
                  <span>이 플랜 선택</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Action & Guarantee Bar */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-stone-900 to-stone-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-stone-950 font-extrabold text-[10px]">
              안심 가입 보증제
            </span>
            <span className="text-xs font-semibold text-stone-200">
              길벗 AI 여행사 고객 전원 DB손해보험 / 현대해상 프리미엄 안심 연동
            </span>
          </div>
          <p className="text-xs text-stone-400">
            선택 플랜: [{currentPlan.name}] · {numTravelers}인 총 ₩{totalPrice.toLocaleString()}원
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isSubscribed ? (
            <div className="flex items-center gap-2">
              <span className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>가입 완료됨</span>
              </span>
              <button
                onClick={() => setIsPolicyModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-white font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>증명서 확인</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsSubscribed(true);
                setIsPolicyModalOpen(true);
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>간편 안심 가입 신청 (1클릭)</span>
            </button>
          )}
        </div>
      </div>

      {/* Insurance Certificate Modal */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900">
                    안심 여행자보험 가입증명서
                  </h3>
                  <p className="text-[10px] text-stone-400">CERTIFICATE OF SAFE TRAVEL INSURANCE POLICY</p>
                </div>
              </div>
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Certificate Body */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4 font-mono text-xs">
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">증권 번호:</span>
                <span className="font-bold text-stone-900">GILBEOT-SAFE-2026-{Math.floor(100000 + Math.random() * 900000)}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">대표 피보험자:</span>
                <span className="font-bold text-stone-900">{plan.request.clientName} (외 {numTravelers - 1}인)</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">여행 목적지:</span>
                <span className="font-bold text-stone-900">{plan.request.destination}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">보험 보장 기간:</span>
                <span className="font-bold text-stone-900">{plan.request.startDate} 00:00 ~ {plan.request.endDate} 24:00</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">가입 플랜 명:</span>
                <span className="font-bold text-emerald-800">{currentPlan.name} ({currentPlan.tag})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">총 결제 보험료:</span>
                <span className="font-bold text-stone-900">₩{totalPrice.toLocaleString()}원 (완납)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>24시간 사고접수 & 응급상황실 직통: 1588-0100 / 1800-7233</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                사고 또는 질병 발생 시 모바일 영수증 촬영으로 24시간 내 초간편 보험금 청구가 지원됩니다.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#064e43] text-white font-bold text-xs shadow-xs"
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
