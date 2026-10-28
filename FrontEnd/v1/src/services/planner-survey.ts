/** 대화 단계는 모델의 완료 선언이 아니라 실제로 확인된 입력으로 결정한다. */
export interface SurveyDraft {
  originName?: string | null;
  destinationName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  durationLabel?: string | null;
  departureTime?: string | null;
  mode?: string | null;
  modeConfirmed?: boolean;
  preferences?: string | null;
}

export function explicitTravelMode(text: string): "driving" | "walking" | null {
  if (/대중교통|버스|기차|지하철|택시|비행기/.test(text)) return null;
  const walking = /도보|걸어|걷|산책|walking/i.test(text);
  const driving = /자동차|자가용|자차|운전|렌[터트]카|driving|차로/i.test(text);
  if (walking === driving) return null;
  if (walking) return "walking";
  if (driving) return "driving";
  return null;
}

export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function surveyStep(draft: SurveyDraft): number {
  if (!draft.originName?.trim() || !draft.destinationName?.trim()) return 1;
  const days =
    validDate(draft.startDate) && validDate(draft.endDate)
      ? (Date.parse(draft.endDate) - Date.parse(draft.startDate)) / 86400000 + 1
      : 0;
  if (
    !draft.durationLabel?.trim() ||
    days < 1 ||
    days > 10 ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.departureTime || "")
  )
    return 2;
  if (
    !draft.modeConfirmed ||
    !["driving", "walking"].includes(draft.mode || "")
  )
    return 3;
  if (!draft.preferences?.trim()) return 4;
  return 5;
}

/** 날짜만 UTC 자정으로 계산해 서버의 운영체제 시간대에 영향받지 않는다. */
export function scheduleFromText(
  text: string,
  draft: SurveyDraft,
  now = new Date(),
) {
  const next = { ...draft };
  const today = new Date(now.getTime() + 9 * 3600000)
    .toISOString()
    .slice(0, 10);
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const md = text.match(/(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일/);
  let date = iso?.[1];
  if (!date && md)
    date = `${md[1] || today.slice(0, 4)}-${md[2].padStart(2, "0")}-${md[3].padStart(2, "0")}`;
  if (!date && /오늘|내일|모레/.test(text)) {
    const offset = text.includes("모레") ? 2 : text.includes("내일") ? 1 : 0;
    date = new Date(Date.parse(today) + offset * 86400000)
      .toISOString()
      .slice(0, 10);
  }
  if (validDate(date)) next.startDate = date;
  const duration = text.match(/(\d+)\s*박\s*(\d+)\s*일/);
  if (text.includes("당일")) next.durationLabel = "당일치기";
  else if (duration && +duration[2] === +duration[1] + 1 && +duration[2] <= 10)
    next.durationLabel = `${+duration[1]}박 ${+duration[2]}일`;
  const clock =
    text.match(
      /(오전|오후|아침|새벽|저녁|낮|밤)?\s*(\d{1,2})시(?:\s*(\d{1,2})분|\s*(반))?/,
    ) || text.match(/()\b(\d{1,2}):(\d{2})\b/);
  if (clock) {
    let hour = +clock[2];
    const minute = clock[4] ? 30 : +(clock[3] || 0);
    if (/오후|저녁|밤/.test(clock[1] || "") && hour < 12) hour += 12;
    if (/오전|새벽|아침/.test(clock[1] || "") && hour === 12) hour = 0;
    if (hour < 24 && minute < 60)
      next.departureTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  const days = next.durationLabel?.includes("당일")
    ? 1
    : Number(next.durationLabel?.match(/(\d+)\s*일/)?.[1]);
  if (validDate(next.startDate) && days >= 1 && days <= 10)
    next.endDate = new Date(Date.parse(next.startDate) + (days - 1) * 86400000)
      .toISOString()
      .slice(0, 10);
  return next;
}

export function surveyPrompt(step: number): string {
  if (step === 1)
    return "출발지와 도착지를 알려주세요. (예: 서울에서 춘천으로)";
  if (step === 2)
    return "출발 날짜, 여행 기간(최대 9박 10일), 출발 시각을 알려주세요. (예: 10월 28일, 1박 2일, 오전 9시 30분)";
  if (step === 3)
    return "이동 수단을 선택해 주세요. 자동차로 운전하시나요, 도보로 여행하시나요?";
  if (step === 4)
    return "도착 후 어떤 여행을 즐기고 싶으세요? 맛집, 카페, 자연, 문화·역사 등 취향을 알려주세요.";
  return "여행 조건을 모두 확인했습니다. 아래 요약을 확인한 뒤 여행 일정 생성 버튼을 눌러 주세요.";
}
