/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, CalendarDays, ClipboardList, MapPin, Plus, Wallet } from 'lucide-react';
import { FullTravelPlan, TravelStatus } from '../types/travel';

interface TravelArchivePageProps {
  plans: FullTravelPlan[];
  userName?: string;
  onCreatePlan: () => void;
  onOpenPlan: (plan: FullTravelPlan) => void;
}

const STATUS_LABELS: Record<TravelStatus, string> = {
  ANALYZING: '일정 설계 중',
  PENDING_APPROVAL: '승인 대기',
  APPROVED: '여행 확정',
  REVISING: '일정 수정 중',
  REJECTED: '반려됨',
};

const STATUS_STYLES: Record<TravelStatus, string> = {
  ANALYZING: 'bg-sky-50 text-sky-700',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REVISING: 'bg-orange-50 text-orange-700',
  REJECTED: 'bg-rose-50 text-rose-700',
};

const formatDate = (date: string) => {
  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return date;
  return parsedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatBudget = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;

const getDuration = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return '';

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return `${days}일 일정`;
};

export const TravelArchivePage: React.FC<TravelArchivePageProps> = ({
  plans,
  userName,
  onCreatePlan,
  onOpenPlan,
}) => (
  <section className="space-y-8">
    <div className="rounded-3xl bg-gradient-to-r from-[#064e43] to-[#0b6656] px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
            <ClipboardList className="h-4 w-4" />
            여행 보관함
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {userName ? `${userName}님의 여행 일정` : '내 여행 일정'}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-emerald-50/90 sm:text-base">
            여행 계획과 일정을 한곳에서 확인하고, 원하는 여행을 이어서 살펴보세요.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreatePlan}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#064e43] shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-50"
        >
          <Plus className="h-4 w-4" />
          새로운 여행 의뢰
        </button>
      </div>
    </div>

    <div className="flex items-end justify-between gap-3 border-b border-[#e8e4dc] pb-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#064e43]">MY TRIPS</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-stone-900 sm:text-2xl">여행 일정 보관함</h2>
      </div>
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#064e43]">
        {plans.length}개 일정
      </span>
    </div>

    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      <button
        type="button"
        onClick={onCreatePlan}
        className="group flex min-h-72 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-8 text-center transition hover:border-[#0b6656] hover:bg-emerald-50"
      >
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#064e43] shadow-sm transition group-hover:scale-105">
          <Plus className="h-7 w-7" />
        </span>
        <span className="text-base font-bold text-stone-800">새로운 여행 계획하기</span>
        <span className="mt-2 max-w-xs text-sm leading-relaxed text-stone-500">
          여행 조건을 입력하고 AI 맞춤 일정을 만들어보세요.
        </span>
      </button>

      {plans.map((plan) => {
        const status = plan.request.status;
        const duration = getDuration(plan.request.startDate, plan.request.endDate);

        return (
          <article
            key={plan.requestId}
            className="flex min-h-72 flex-col rounded-3xl border border-[#e8e4dc] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>
                {STATUS_LABELS[status]}
              </span>
              <span className="text-xs font-medium text-stone-400">
                {plan.request.style.slice(0, 2).join(' · ')}
              </span>
            </div>

            <h3 className="mt-4 line-clamp-2 text-lg font-extrabold leading-snug text-stone-900">
              {plan.title}
            </h3>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-sm font-semibold text-[#064e43]">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{plan.request.departureCity} → {plan.request.destination}</span>
            </div>

            <div className="mt-4 space-y-2 text-sm text-stone-600">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#0b6656]" />
                <span>
                  {formatDate(plan.request.startDate)} ~ {formatDate(plan.request.endDate)}
                  {duration ? ` (${duration})` : ''}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Wallet className="h-4 w-4 shrink-0 text-[#0b6656]" />
                <span>예상 경비 {formatBudget(plan.costs.totalCost)}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenPlan(plan)}
              className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#064e43] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#085a4e]"
            >
              일정 상세 보기
              <ArrowRight className="h-4 w-4" />
            </button>
          </article>
        );
      })}
    </div>
  </section>
);
