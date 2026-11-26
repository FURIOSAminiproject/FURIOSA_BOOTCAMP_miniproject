import React, { useEffect, useRef, useState, useId } from "react";
import { Check, Search } from "lucide-react";
import { searchMapPlaces, type SearchPlace } from "../services/route-explorer";

/** 한글 조합이 끝나고 600ms 동안 입력이 없을 때만 기존 검색 API를 호출한다. */
const AUTOCOMPLETE_DELAY_MS = 600;

/** 입력 문자열과 확정 좌표를 구분한다. 자동완성 목록 선택 전에는 경로를 계산하지 않는다. */
export function MapPlaceSearch({
  label,
  query,
  value,
  onQueryChange,
  onSelect,
  actionButton,
}: {
  label: string;
  query: string;
  value: SearchPlace | null;
  onQueryChange: (query: string) => void;
  onSelect: (place: SearchPlace) => void;
  actionButton?: React.ReactNode;
}) {
  const inputId = useId();
  const listId = `${inputId}-suggestions`;
  const statusId = `${inputId}-status`;
  const [results, setResults] = useState<SearchPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retry, setRetry] = useState(0);
  const request = useRef<AbortController | null>(null);
  const composingRef = useRef(false);

  // 입력 이벤트에서 즉시 지운다. effect 실행 전에도 옛 후보를 선택할 수 없게 한다.
  function clearSuggestions() {
    request.current?.abort();
    setResults([]);
    setSearched(false);
    setError(null);
    setActiveIndex(-1);
    setBusy(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    setResults([]);
    setSearched(false);
    setError(null);
    setActiveIndex(-1);
    setBusy(false);
    const text = query.trim();
    if (!open || composing || value || text.length < 2 || text.length > 100)
      return () => controller.abort();

    // 대기 중 상태도 알린다. 실패는 자동 재시도하지 않아 API 호출이 계속 늘지 않게 한다.
    setBusy(true);
    const timer = window.setTimeout(() => {
      void searchMapPlaces(text, controller.signal)
        .then((places) => {
          if (controller.signal.aborted) return;
          setResults(places);
          setSearched(true);
        })
        .catch((failure) => {
          if (!controller.signal.aborted)
            setError(
              failure instanceof Error
                ? failure.message
                : "장소를 검색하지 못했습니다.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, AUTOCOMPLETE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, value?.id, open, composing, retry]);

  function choose(place: SearchPlace) {
    clearSuggestions();
    setOpen(false);
    onSelect(place);
  }
  const expanded = open && !value && results.length > 0;
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // 한글 확정 Enter로 장소를 잘못 선택하지 않는다. Safari의 조합 중 키 코드도 확인한다.
    if (
      composingRef.current ||
      event.nativeEvent.isComposing ||
      event.keyCode === 229
    )
      return;
    if (event.key === "Escape") {
      event.preventDefault();
      clearSuggestions();
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (results.length)
        setActiveIndex((index) =>
          event.key === "ArrowDown"
            ? (index + 1) % results.length
            : (index <= 0 ? results.length : index) - 1,
        );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (expanded) choose(results[activeIndex < 0 ? 0 : activeIndex]);
      else setOpen(true);
    }
  }

  useEffect(() => {
    if (expanded && activeIndex >= 0)
      document
        .getElementById(`${listId}-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, expanded, listId]);

  return (
    <div
      className="space-y-2 min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          clearSuggestions();
          setOpen(false);
        }
      }}
    >
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-stone-800"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-stone-400"
          />
          <input
            id={inputId}
            aria-label={`${label} 검색어`}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            aria-activedescendant={
              expanded && activeIndex >= 0
                ? `${listId}-${activeIndex}`
                : undefined
            }
            aria-describedby={statusId}
            type="text"
            autoComplete="off"
            maxLength={100}
            value={query}
            placeholder="장소명 또는 주소를 입력하세요"
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            onCompositionStart={() => {
              composingRef.current = true;
              setComposing(true);
              clearSuggestions();
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
              setComposing(false);
            }}
            onChange={(event) => {
              clearSuggestions();
              setOpen(true);
              onQueryChange(event.target.value);
            }}
            className="w-full min-w-0 rounded-xl border border-stone-300 bg-white pl-10 pr-3.5 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        {actionButton}
      </div>
      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} 추천 장소`}
          className="max-h-64 overflow-auto rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 shadow-sm"
        >
          {results.map((place, index) => (
            <li
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              key={place.id}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(place)}
              className={`cursor-pointer px-3.5 py-3 ${index === activeIndex ? "bg-emerald-50" : "hover:bg-emerald-50"}`}
            >
              <span className="block text-sm font-semibold">{place.name}</span>
              <span className="mt-1 block text-xs text-stone-500">
                {place.address}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div
        id={statusId}
        role="status"
        aria-live="polite"
        className="text-xs text-stone-500"
      >
        {value
          ? ""
          : open && busy
            ? "추천 장소를 찾고 있어요…"
            : open && searched
              ? results.length
                ? `${results.length}개 추천 장소. 위아래 방향키와 Enter로 선택할 수 있어요.`
                : "검색 결과가 없습니다. 지역명과 장소명을 함께 입력해 보세요."
              : !error
                ? "두 글자 이상 입력하면 추천 장소가 표시됩니다."
                : ""}
      </div>
      {open && error && (
        <div role="alert" className="text-sm text-red-700">
          {error}
          <button
            type="button"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => setRetry((count) => count + 1)}
            className="ml-2 underline"
          >
            다시 시도
          </button>
        </div>
      )}
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
    </div>
  );
}
