import React, { useEffect, useRef, useState, useId } from "react";
import { Check, Search } from "lucide-react";
import { searchMapPlaces, type SearchPlace } from "../services/route-explorer";

/** 검색어는 공유 초안에 보관하고, 검색 결과를 선택한 경우에만 출발·도착 좌표를 확정한다. */
export function MapPlaceSearch({
  label,
  query,
  value,
  onQueryChange,
  onSelect,
}: {
  label: string;
  query: string;
  value: SearchPlace | null;
  onQueryChange: (query: string) => void;
  onSelect: (place: SearchPlace) => void;
}) {
  const inputId = useId();
  const [results, setResults] = useState<SearchPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setResults([]);
    setSearched(false);
    setError(null);
  }, [query, value?.id]);
  useEffect(() => () => request.current?.abort(), []);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2 || query.trim().length > 100) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setResults([]);
    setSearched(false);
    setError(null);
    try {
      const places = await searchMapPlaces(query, controller.signal);
      if (controller.signal.aborted || request.current !== controller) return;
      setResults(places);
      setSearched(true);
    } catch (failure) {
      if (!controller.signal.aborted && request.current === controller)
        setError(
          failure instanceof Error
            ? failure.message
            : "장소를 검색하지 못했습니다.",
        );
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <div className="space-y-2 min-w-0">
      <form onSubmit={search}>
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-stone-800 mb-2"
        >
          {label}
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            aria-label={`${label} 검색어`}
            type="search"
            autoComplete="off"
            maxLength={100}
            value={query}
            placeholder="장소명 또는 주소를 입력하세요"
            onChange={(event) => {
              request.current?.abort();
              onQueryChange(event.target.value);
            }}
            className="w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={busy || query.trim().length < 2}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-stone-800 px-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Search className="h-4 w-4" />
            {busy ? "검색 중" : "검색"}
          </button>
        </div>
      </form>
      {value && (
        <p className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
          <Check className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong className="block">{value.name}</strong>
            <span className="mt-1 block text-xs leading-relaxed">
              {value.address}
            </span>
          </span>
        </p>
      )}
      <div aria-live="polite">
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {results.length > 0 && (
          <ul
            aria-label={`${label} 검색 결과`}
            className="max-h-64 overflow-auto rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 shadow-sm"
          >
            {results.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => {
                    // 같은 장소를 다시 선택해도 검색 목록을 닫는다. 부모 값이 같으면 effect가 다시 실행되지 않는다.
                    request.current?.abort();
                    request.current = null;
                    setBusy(false);
                    setResults([]);
                    setSearched(false);
                    setError(null);
                    onSelect(place);
                  }}
                  className="w-full text-left px-3.5 py-3 hover:bg-emerald-50 focus:bg-emerald-50"
                >
                  <span className="block text-sm font-semibold">
                    {place.name}
                  </span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {place.address}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {searched && !results.length && (
          <p className="text-sm text-stone-500">
            검색 결과가 없습니다. 지역명과 장소명을 함께 입력해 보세요.
          </p>
        )}
      </div>
    </div>
  );
}
