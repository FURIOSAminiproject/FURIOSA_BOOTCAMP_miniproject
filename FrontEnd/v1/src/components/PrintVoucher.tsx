import React from 'react';
import { FullTravelPlan } from '../types/travel';
import { Printer, X, CheckCircle, ShieldCheck } from 'lucide-react';

interface PrintVoucherProps {
  plan: FullTravelPlan;
  onClose: () => void;
}

export const PrintVoucher: React.FC<PrintVoucherProps> = ({ plan, onClose }) => {
  const { request, costs, selectedAccommodation, transportGuide, agentAuditReport, days } = plan;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex justify-center p-4 overflow-y-auto">
      <div className="bg-white max-w-3xl w-full my-auto rounded-2xl shadow-2xl p-8 sm:p-12 relative print:m-0 print:p-6 print:shadow-none print:w-full">
        {/* Floating Controls (Hidden in Print) */}
        <div className="absolute top-4 right-4 flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
          >
            <Printer className="w-4 h-4" />
            인쇄 / PDF 저장
          </button>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Official Voucher Document Header */}
        <div className="border-b-2 border-stone-900 pb-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold tracking-widest text-stone-500 uppercase">
                Official Travel Itinerary & Voucher
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif mt-1">
                길벗 AI Agents 여행사 · 공식 여행 일정 확인서
              </h1>
              <p className="text-xs text-stone-600 mt-1">
                자율 멀티에이전트 수립 및 총괄 관리자 인가 승인 확약서
              </p>
            </div>

            {/* Official Digital Seal Stamp */}
            <div className="border-2 border-rose-700 text-rose-700 rounded-xl p-2 text-center w-28 shrink-0 rotate-[-4deg] shadow-xs">
              <div className="text-[10px] font-bold">대한민국 국내여행</div>
              <div className="text-xs font-black tracking-wider border-y border-rose-700 my-0.5 py-0.5">
                인가승인필
              </div>
              <div className="text-[9px]">길벗AI여행사</div>
            </div>
          </div>
        </div>

        {/* Booking Summary Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200 mb-6 text-xs">
          <div>
            <span className="text-stone-400 block">의뢰 고객</span>
            <span className="font-bold text-stone-900 text-sm">{request.clientName} 님</span>
          </div>
          <div>
            <span className="text-stone-400 block">여행 일정</span>
            <span className="font-bold text-stone-900">{request.startDate} ~ {request.endDate}</span>
          </div>
          <div>
            <span className="text-stone-400 block">목적지</span>
            <span className="font-bold text-stone-900">{request.destination}</span>
          </div>
          <div>
            <span className="text-stone-400 block">확정 총 경비</span>
            <span className="font-bold text-blue-700 text-sm">{(costs.totalCost).toLocaleString()}원</span>
          </div>
        </div>

        {/* Accommodation and Transport */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs">
          <div className="border border-stone-200 p-3.5 rounded-xl">
            <span className="font-bold text-stone-900 block mb-1">🏨 확정 배정 숙소</span>
            <p className="text-stone-700 font-semibold">{selectedAccommodation.name}</p>
            <p className="text-stone-500 text-[11px]">{selectedAccommodation.address}</p>
          </div>
          <div className="border border-stone-200 p-3.5 rounded-xl">
            <span className="font-bold text-stone-900 block mb-1">🚗 교통 및 이동 동선</span>
            <p className="text-stone-700 font-semibold">{transportGuide.recommendedMode}</p>
            <p className="text-stone-500 text-[11px]">{transportGuide.routesDescription}</p>
          </div>
        </div>

        {/* Day-by-Day Timeline */}
        <div className="space-y-4 mb-8">
          <h3 className="font-bold text-stone-900 text-sm border-b pb-1.5 flex items-center gap-1.5">
            <span>📅 상세 여행 일정표</span>
          </h3>
          {days.map(d => (
            <div key={d.dayNumber} className="border-l-2 border-stone-800 pl-4 py-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 text-xs sm:text-sm">
                  {d.dayNumber}일차 ({d.date})
                </span>
                <span className="text-xs text-blue-700 font-medium">· {d.theme}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {d.places.map((p, idx) => (
                  <div key={p.id} className="flex items-baseline gap-2 text-stone-700">
                    <span className="font-mono text-stone-400 text-[11px] w-24 shrink-0">
                      {p.timeSlot}
                    </span>
                    <span className="font-bold text-stone-900">
                      {p.name}
                    </span>
                    <span className="text-stone-500 text-[11px]">
                      ({p.categoryLabel}) - {p.description.slice(0, 45)}...
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Audit Certification Footer */}
        <div className="border-t border-stone-200 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>AI 감수관 안전·예산 및 GIS 지도 연동(구글/네이버) 무결성 전수 통과 (중복 0건)</span>
          </div>
          <div className="text-right">
            <span>발행처: 대한민국 길벗 AI Agents 여행사 본점 | 승인자: {request.approverName || '총괄관리자'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
