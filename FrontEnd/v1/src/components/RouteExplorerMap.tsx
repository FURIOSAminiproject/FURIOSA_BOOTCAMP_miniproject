import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  ComparedRoute,
  Preference,
  SearchPlace,
} from "../services/route-explorer";

export const ROUTE_COLORS = {
  recommended: "#0369a1",
  shortest: "#c2410c",
} as const;

/** 검색 좌표, 두 ORS 경로와 선택 경로의 추천 장소를 표시한다. 팝업은 textContent만 쓴다. */
export function RouteExplorerMap({
  origin,
  destination,
  routes,
  active,
  focusedPlace,
  compact = false,
}: {
  origin: SearchPlace | null;
  destination: SearchPlace | null;
  routes: ComparedRoute[];
  active: Preference;
  focusedPlace: SearchPlace | null;
  compact?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.CircleMarker>());

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current).setView([36.3, 127.8], 7);
    map.current = instance;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const layer = L.layerGroup().addTo(instance);
    const bounds = L.latLngBounds([]);
    markers.current.clear();
    const point = (
      place: SearchPlace,
      title: string,
      color: string,
      radius = 7,
    ) => {
      const text = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = title;
      const address = document.createElement("p");
      address.textContent = place.address;
      text.append(name, address);
      const marker = L.circleMarker([place.latitude, place.longitude], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindPopup(text)
        .addTo(layer);
      bounds.extend([place.latitude, place.longitude]);
      return marker;
    };
    // 선택하지 않은 경로부터 그리고 선택한 선을 마지막에 겹쳐 표시한다.
    const ordered = [...routes].sort(
      (a, b) =>
        Number(a.preference === active) - Number(b.preference === active),
    );
    for (const item of ordered) {
      if (!item.route) continue;
      const positions: [number, number][] = item.route.geometry.coordinates.map(
        ([lon, lat]) => [lat, lon],
      );
      const line = L.polyline(positions, {
        color: ROUTE_COLORS[item.preference],
        weight: item.preference === active ? 6 : 4,
        opacity: item.preference === active ? 0.95 : 0.55,
        dashArray: item.preference === "shortest" ? "9 7" : undefined,
      }).addTo(layer);
      bounds.extend(line.getBounds());
    }
    const selected = routes.find((item) => item.preference === active);
    for (const place of selected?.places ?? [])
      markers.current.set(place.id, point(place, place.name, "#15803d", 6));
    if (origin) point(origin, `출발 · ${origin.name}`, "#1d4ed8", 9);
    if (destination)
      point(destination, `도착 · ${destination.name}`, "#be123c", 9);
    if (bounds.isValid())
      instance.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
    return () => {
      instance.removeLayer(layer);
      markers.current.clear();
    };
  }, [origin, destination, routes, active]);

  useEffect(() => {
    if (!focusedPlace || !map.current) return;
    map.current.setView(
      [focusedPlace.latitude, focusedPlace.longitude],
      Math.max(14, map.current.getZoom()),
    );
    markers.current.get(focusedPlace.id)?.openPopup();
  }, [focusedPlace]);

  return (
    <div
      ref={container}
      aria-label="출발·도착지와 권장·최단 경로 및 추천 장소 지도"
      className={`${compact ? 'h-[220px]' : 'h-[420px] sm:h-[520px]'} w-full rounded-2xl border border-stone-200 z-0`}
    />
  );
}
