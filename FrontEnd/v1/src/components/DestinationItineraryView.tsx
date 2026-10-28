import React from "react";
import { Calendar, MapPin, Clock, BedDouble, ArrowUpRight } from "lucide-react";
import type {
  DestinationItinerary,
  DestinationVisit,
} from "../types/destination-itinerary";
import type { SearchPlace } from "../services/route-explorer";

const LABELS: Record<DestinationVisit["kind"], string> = {
  sightseeing: "관광·산책",
  lunch: "점심 식사",
  cafe: "카페·휴식",
  dinner: "저녁 식사",
};

/** 이동 중 추천과 구분해 실제 여행 날짜별 체류 일정을 보여준다. */
export function DestinationItineraryView({
  itinerary,
  onFocusPlace,
}: {
  itinerary: DestinationItinerary;
  onFocusPlace: (place: SearchPlace) => void;
}) {
  return (
    <section aria-label="도착 후 날짜별 여행 일정" className="space-y-5">
      <header className="rounded-2xl bg-[#064e43] p-5 sm:p-7 text-white">
        <p className="flex items-center gap-2 text-xs text-emerald-100">
          <Calendar className="h-4 w-4" />{" "}
          {itinerary.days.length === 1
            ? "당일 여행"
            : `${itinerary.days.length - 1}박 ${itinerary.days.length}일`}{" "}
          · 도착해서 즐기는 여행
        </p>
        <h2 className="mt-2 text-xl sm:text-2xl font-bold">
          도착 후, 하루하루의 여행 계획
        </h2>
        <p className="mt-3 text-sm text-emerald-100 leading-relaxed">
          {itinerary.arrivalDate} {itinerary.arrivalTime} 도착 예상 ·{" "}
          {itinerary.routePreference === "recommended" ? "권장" : "최단"} 경로
          기준. 도착지 주변 관광·맛집·카페를 날짜별로 나누고, 장소마다 머무를
          시간을 마련했어요.
        </p>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        {itinerary.days.map((day) => (
          <article
            key={day.date}
            className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 space-y-5 shadow-xs"
          >
            <header className="flex items-start gap-3">
              <span className="rounded-xl bg-emerald-50 px-3 py-2 font-bold text-emerald-900 text-sm">
                DAY {day.dayNumber}
              </span>
              <div>
                <p className="text-xs text-stone-500">{day.date}</p>
                <h3 className="mt-1 text-lg font-bold text-stone-900">
                  {day.title}
                </h3>
              </div>
            </header>
            <ol className="space-y-4">
              {day.visits.map((visit) => (
                <li
                  key={visit.place.id}
                  className="border-l-2 border-emerald-100 pl-4 space-y-2"
                >
                  <p className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-emerald-900">
                      {visit.time}–{visit.endTime}
                    </span>
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-stone-600">
                      {LABELS[visit.kind]}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => onFocusPlace(visit.place)}
                    className="text-left inline-flex items-center gap-1 font-bold text-stone-900 hover:text-emerald-800 hover:underline"
                  >
                    {visit.place.name}
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                  </button>
                  <p className="text-xs leading-relaxed text-stone-500">
                    {visit.place.address || "주소 정보가 없습니다."}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-stone-500">
                    <Clock className="h-3 w-3" /> 체류 {visit.durationMinutes}분
                    · 직전 지점에서 이동 여유 약 {visit.travelMinutes}분
                  </p>
                  <a
                    href={`https://map.naver.com/v5/search/${encodeURIComponent(visit.place.name + " " + visit.place.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800"
                  >
                    영업시간·위치 확인
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ol>
            {!!day.notes.length && (
              <ul className="space-y-1 rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-600">
                {day.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      {itinerary.days.length > 1 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
          <h3 className="flex items-center gap-2 font-bold text-stone-900">
            <BedDouble className="h-4 w-4" /> 도착지 주변 숙박 후보
          </h3>
          <p className="text-xs text-stone-500">
            등록된 숙박시설 후보입니다. 가격·잔여 객실·예약은 시설에 직접 확인해
            주세요.
          </p>
          {itinerary.stayOptions.length ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {itinerary.stayOptions.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => onFocusPlace(place)}
                  className="rounded-xl border border-stone-200 p-3 text-left hover:border-emerald-500"
                >
                  <span className="block text-sm font-bold text-stone-800">
                    {place.name}
                  </span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {place.address}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">
              등록된 숙박 후보를 찾지 못했습니다. 숙소는 별도로 정해 주세요.
            </p>
          )}
        </div>
      )}
      <ul className="space-y-1 text-xs leading-relaxed text-stone-500">
        {itinerary.warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </section>
  );
}
