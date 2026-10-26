import React from "react";

/** 검색 결과와 경로를 표시하는 두 화면에서 공통 출처·라이선스 표기를 유지한다. */
export function RouteAttribution() {
  return (
    <footer className="border-t border-stone-200 pt-4 text-[11px] leading-relaxed text-stone-500 space-y-1">
      <p>
        검색·경로:{" "}
        <a
          className="underline"
          href="https://openrouteservice.org/"
          target="_blank"
          rel="noreferrer"
        >
          © openrouteservice.org by HeiGIT
        </a>{" "}
        · 지도:{" "}
        <a
          className="underline"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>{" "}
        · 장소: 한국관광공사 TourAPI
      </p>
      <p>
        경로 결과:{" "}
        <a
          className="underline"
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY-SA 4.0
        </a>{" "}
        · 검색 데이터: OpenStreetMap, OpenAddresses, GeoNames, Who’s On First —{" "}
        <a
          className="underline"
          href="https://account.heigit.org/info/tos"
          target="_blank"
          rel="noreferrer"
        >
          이용 조건·출처
        </a>
      </p>
    </footer>
  );
}
