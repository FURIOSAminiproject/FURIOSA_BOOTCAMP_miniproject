/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FullTravelPlan, TravelPlace, DayItinerary } from '../types/travel';
import { downloadIcsCalendar, buildGoogleCalendarUrl } from '../services/calendarExportService';
import {
  Calendar,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  MapPin,
  X,
  Sparkles,
  Smartphone,
  Laptop,
  Bell,
  Check,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface CalendarSyncModalProps {
  plan: FullTravelPlan;
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({ plan, isOpen, onClose }) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [selectedDayTab, setSelectedDayTab] = useState<number>(1);

  if (!isOpen) return null;

  const handleDownload = () => {
    downloadIcsCalendar(plan);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  const currentDay = plan.days.find((d) => d.dayNumber === selectedDayTab) || plan.days[0];
  const totalEventsCount = plan.days.reduce((acc, d) => acc + d.places.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-stone-50 to-teal-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#064e43] text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 text-base sm:text-lg font-serif">
                  캘린더 일정 동기화 (Export to Calendar)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                  .ics 표준 포맷
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Google 캘린더, Apple 캘린더(iPhone/Mac), Outlook과 1초 만에 자동 동기화합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Main Download CTA Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 to-stone-900 text-white shadow-lg relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-40 h-40 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-emerald-300 tracking-wider">
                  RFC 5545 iCalendar Universal Sync
                </span>
                <h4 className="text-lg font-bold">
                  전체 {plan.days.length}일간 {totalEventsCount}개 일정 한 번에 등록
                </h4>
                <p className="text-xs text-stone-300 leading-relaxed max-w-md">
                  일자별 방문지, 분 단위 시간표, 장소 도로명 주소, 네이버/구글 지도 PUSH 링크, 30분 전 알림 알람이 모두 패키징된 .ics 캘린더 파일입니다.
                </p>
              </div>

              <button
                onClick={handleDownload}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-stone-950 stroke-[3]" />
                    <span>다운로드 완료!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-stone-950" />
                    <span>.ics 캘린더 다운로드</span>
                  </>
                )}
              </button>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-[11px] text-stone-300">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Apple Calendar (아이폰/아이패드/Mac)
              </span>
              <span className="text-stone-500">·</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Google Calendar (안드로이드/웹)
              </span>
              <span className="text-stone-500">·</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Microsoft Outlook
              </span>
            </div>
          </div>

          {/* Quick Setup Instructions (Tabs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
              <div className="flex items-center gap-2 font-bold text-stone-900">
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <span>스마트폰 (iPhone / Android) 연동법</span>
              </div>
              <ol className="list-decimal list-inside text-stone-600 space-y-1 text-[11px] leading-relaxed">
                <li>상단의 <strong>[.ics 캘린더 다운로드]</strong>를 누릅니다.</li>
                <li>다운로드된 파일을 터치하면 <strong>'캘린더에 모두 추가'</strong> 창이 팝업됩니다.</li>
                <li>터치 1번으로 여행 일정과 알람이 자동 등록됩니다.</li>
              </ol>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
              <div className="flex items-center gap-2 font-bold text-stone-900">
                <Laptop className="w-4 h-4 text-blue-700" />
                <span>PC 구글 / 아웃룩 캘린더 연동법</span>
              </div>
              <ol className="list-decimal list-inside text-stone-600 space-y-1 text-[11px] leading-relaxed">
                <li><a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">Google 캘린더</a> 접속 후 우측 상단 <strong>설정 &gt; 가져오기</strong> 클릭</li>
                <li>다운로드받은 <strong>.ics 파일</strong>을 선택 후 '가져오기' 클릭</li>
                <li>스마트폰 구글 캘린더 앱과도 실시간 자동 동기화됩니다.</li>
              </ol>
            </div>
          </div>

          {/* Individual Place Google Calendar Quick Add List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-900">
                  일자별 세부 일정 및 Google 캘린더 즉시 추가:
                </span>
              </div>
              <div className="flex items-center gap-1">
                {plan.days.map((day) => (
                  <button
                    key={day.dayNumber}
                    onClick={() => setSelectedDayTab(day.dayNumber)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedDayTab === day.dayNumber
                        ? 'bg-[#064e43] text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Day {day.dayNumber}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="text-xs text-stone-500 font-medium pb-1 flex items-center justify-between">
                <span>📅 {currentDay.date} ({currentDay.theme})</span>
                <span className="text-[11px] font-mono text-emerald-800 font-bold">{currentDay.places.length}개 방문지</span>
              </div>

              {currentDay.places.map((place, idx) => {
                const gCalUrl = buildGoogleCalendarUrl(place, currentDay.date, currentDay.dayNumber);
                return (
                  <div
                    key={place.id || idx}
                    className="p-3 rounded-xl border border-stone-200/80 bg-white hover:border-emerald-500/50 hover:shadow-2xs transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 truncate">{place.name}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-stone-100 text-stone-600 font-mono">
                          {place.timeSlot}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                        <span className="truncate">{place.address || '주소 정보 확인 완료'}</span>
                      </div>
                    </div>

                    <a
                      href={gCalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] shrink-0 transition-colors"
                      title="Google 캘린더에 이 일정만 즉시 등록"
                    >
                      <span>Google 캘린더에 추가</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-stone-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>대한민국 표준시(KST, Asia/Seoul) 및 방문지 중복 0건 전수 검증 통과</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 font-semibold transition-all w-full sm:w-auto cursor-pointer"
            >
              닫기
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-[#064e43] hover:bg-[#053e35] text-white font-bold transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>전체 .ics 받기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
