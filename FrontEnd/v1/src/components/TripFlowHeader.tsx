import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/** 현재 단계와 다음 행동을 알려주는 실제 여행 입력·결과 화면의 이동 링크다. */
export function TripFlowHeader({ step }: { step: "request" | "results" }) {
  return (
    <nav
      aria-label="여행 탐색 단계"
      className="flex items-center gap-3 text-xs sm:text-sm"
    >
      <Link
        to="/trips/new"
        aria-current={step === "request" ? "step" : undefined}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 ${step === "request" ? "bg-emerald-100 font-bold text-emerald-900" : "text-stone-500 hover:bg-stone-100"}`}
      >
        <span className="font-mono">01</span> 여행 조건 선택
      </Link>
      <ArrowRight className="h-4 w-4 text-stone-300" />
      <Link
        to="/trips"
        aria-current={step === "results" ? "step" : undefined}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 ${step === "results" ? "bg-emerald-100 font-bold text-emerald-900" : "text-stone-500 hover:bg-stone-100"}`}
      >
        <span className="font-mono">02</span> 경로·장소 비교
      </Link>
    </nav>
  );
}
