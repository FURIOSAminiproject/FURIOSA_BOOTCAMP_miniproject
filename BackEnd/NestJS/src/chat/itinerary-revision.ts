import type {
  DestinationItinerary,
  DestinationVisit,
} from '../route-explorer/destination-itinerary';
import type { SpotPlace } from '../route-explorer/explorer.types';

type Kind = DestinationVisit['kind'];

export interface RevisionValidationPosition {
  dayIndex?: number;
  visitIndex?: number;
  requestedKind?: Kind;
  contentTypeId?: number;
  allowedKinds?: Kind[];
}

/** 모델 후보 안내와 서버 검증에서 같은 장소 유형 규칙을 사용한다. */
export function allowedVisitKinds(contentTypeId: number): Kind[] {
  if (contentTypeId === 39) return ['lunch', 'cafe', 'dinner'];
  return [12, 14, 15, 28, 38].includes(contentTypeId) ? ['sightseeing'] : [];
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const minutes = (value: string) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
const clock = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function isSpotPlace(value: unknown): value is SpotPlace {
  if (!record(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 100 &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    value.name.length <= 200 &&
    typeof value.address === 'string' &&
    value.address.length <= 500 &&
    typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.longitude) <= 180 &&
    typeof value.contentTypeId === 'number' &&
    [12, 14, 15, 28, 32, 38, 39].includes(value.contentTypeId) &&
    (value.categoryName === null ||
      (typeof value.categoryName === 'string' &&
        value.categoryName.length <= 100)) &&
    typeof value.distanceMeters === 'number' &&
    Number.isFinite(value.distanceMeters) &&
    value.distanceMeters >= 0
  );
}

/** 화면에서 받은 일정도 길이·시간·장소 구조를 확인한 뒤 모델에 전달한다. */
export function isDestinationItinerary(
  value: unknown,
): value is DestinationItinerary {
  if (
    !record(value) ||
    !Array.isArray(value.days) ||
    value.days.length < 1 ||
    value.days.length > 10 ||
    !datePattern.test(String(value.arrivalDate)) ||
    !timePattern.test(String(value.arrivalTime)) ||
    !['recommended', 'shortest'].includes(String(value.routePreference)) ||
    !Array.isArray(value.stayOptions) ||
    value.stayOptions.length > 20 ||
    !value.stayOptions.every(isSpotPlace) ||
    !Array.isArray(value.warnings) ||
    !value.warnings.every(
      (warning: unknown) =>
        typeof warning === 'string' && warning.length <= 500,
    ) ||
    !['ai', 'local'].includes(String(value.curationSource))
  )
    return false;
  return value.days.every((rawDay: unknown, index: number) => {
    if (
      !record(rawDay) ||
      typeof rawDay.date !== 'string' ||
      !datePattern.test(rawDay.date) ||
      rawDay.dayNumber !== index + 1 ||
      typeof rawDay.title !== 'string' ||
      rawDay.title.length > 100 ||
      !Array.isArray(rawDay.visits) ||
      rawDay.visits.length > 6 ||
      !Array.isArray(rawDay.notes) ||
      !rawDay.notes.every(
        (note: unknown) => typeof note === 'string' && note.length <= 500,
      )
    )
      return false;
    return rawDay.visits.every(
      (rawVisit: unknown) =>
        record(rawVisit) &&
        ['sightseeing', 'lunch', 'cafe', 'dinner'].includes(
          String(rawVisit.kind),
        ) &&
        typeof rawVisit.time === 'string' &&
        timePattern.test(rawVisit.time) &&
        typeof rawVisit.endTime === 'string' &&
        timePattern.test(rawVisit.endTime) &&
        isSpotPlace(rawVisit.place) &&
        Number.isInteger(rawVisit.travelMinutes) &&
        Number(rawVisit.travelMinutes) >= 0 &&
        Number.isInteger(rawVisit.durationMinutes) &&
        Number(rawVisit.durationMinutes) >= 1,
    );
  });
}

function unchangedVisits(
  value: unknown,
  original: DestinationItinerary['days'][number],
): boolean {
  return (
    Array.isArray(value) &&
    value.length === original.visits.length &&
    value.every((raw, index) => {
      const before = original.visits[index];
      return (
        record(raw) &&
        raw.placeId === before.place.id &&
        raw.kind === before.kind &&
        raw.time === before.time &&
        raw.durationMinutes === before.durationMinutes
      );
    })
  );
}

/** 변경한 날짜만 받아 기존 일정에 병합한다. 잘못된 수정은 전체 적용을 취소한다. */
export function applyItineraryRevision(
  itinerary: DestinationItinerary,
  proposedDays: unknown,
  places: SpotPlace[],
  onReject?: (reason: string, position: RevisionValidationPosition) => void,
): DestinationItinerary | null {
  const reject = (
    reason: string,
    dayIndex?: number,
    visitIndex?: number,
    details: Partial<RevisionValidationPosition> = {},
  ): null => {
    onReject?.(reason, { dayIndex, visitIndex, ...details });
    return null;
  };
  if (!Array.isArray(proposedDays)) return reject('invalid_proposed_days');
  if (proposedDays.length === 0) return reject('no_proposed_days');
  if (proposedDays.length > itinerary.days.length)
    return reject('too_many_proposed_days');
  const dates = new Set(itinerary.days.map((day) => day.date));
  const proposals = new Map<string, Record<string, unknown>>();
  for (const [index, proposed] of proposedDays.entries()) {
    if (record(proposed) && typeof proposed.date === 'string') {
      if (!dates.has(proposed.date)) return reject('unknown_date', index);
      if (proposals.has(proposed.date)) return reject('duplicate_date', index);
    }
    if (!record(proposed) || typeof proposed.date !== 'string')
      return reject('invalid_day_structure', index);
    if (!Array.isArray(proposed.visits))
      return reject('invalid_day_visits', index);
    if (proposed.visits.length > 6) return reject('too_many_visits', index);
    proposals.set(proposed.date, proposed);
  }
  const allowed = new Map(places.map((place) => [place.id, place]));
  // 생략되거나 그대로인 날짜의 장소도 예약해 날짜 사이의 중복을 막는다.
  const used = new Set<string>();
  for (const day of itinerary.days) {
    const proposed = proposals.get(day.date);
    if (!proposed || unchangedVisits(proposed.visits, day))
      for (const visit of day.visits) used.add(visit.place.id);
  }
  let changed = false;
  const days = [] as DestinationItinerary['days'];
  for (let dayIndex = 0; dayIndex < itinerary.days.length; dayIndex++) {
    const original = itinerary.days[dayIndex];
    const proposed = proposals.get(original.date);
    if (!proposed || unchangedVisits(proposed.visits, original)) {
      days.push(original);
      continue;
    }
    if (
      !record(proposed) ||
      proposed.date !== original.date ||
      !Array.isArray(proposed.visits) ||
      proposed.visits.length > 6
    )
      return reject('invalid_day_structure', dayIndex);
    if (original.date < itinerary.arrivalDate && proposed.visits.length > 0)
      return reject('before_arrival_date', dayIndex);
    const visits: DestinationVisit[] = [];
    let previousEnd =
      original.date === itinerary.arrivalDate
        ? minutes(itinerary.arrivalTime)
        : 9 * 60;
    for (const [visitIndex, raw] of proposed.visits.entries()) {
      if (!record(raw))
        return reject('invalid_visit_structure', dayIndex, visitIndex);
      if (typeof raw.placeId !== 'string')
        return reject('invalid_place_reference', dayIndex, visitIndex);
      if (record(raw) && typeof raw.placeId === 'string') {
        if (!allowed.has(raw.placeId))
          return reject('unknown_place', dayIndex, visitIndex);
        if (used.has(raw.placeId))
          return reject('duplicate_place', dayIndex, visitIndex);
      }
      if (
        !['sightseeing', 'lunch', 'cafe', 'dinner'].includes(String(raw.kind))
      )
        return reject('invalid_visit_kind', dayIndex, visitIndex);
      if (typeof raw.time !== 'string' || !timePattern.test(raw.time))
        return reject('invalid_visit_time', dayIndex, visitIndex);
      if (
        !Number.isInteger(raw.durationMinutes) ||
        Number(raw.durationMinutes) < 30 ||
        Number(raw.durationMinutes) > 180
      )
        return reject('invalid_visit_duration', dayIndex, visitIndex);
      const place = allowed.get(raw.placeId)!;
      const kind = raw.kind as Kind;
      const allowedKinds = allowedVisitKinds(place.contentTypeId);
      if (!allowedKinds.includes(kind))
        return reject('place_kind_mismatch', dayIndex, visitIndex, {
          requestedKind: kind,
          contentTypeId: place.contentTypeId,
          allowedKinds,
        });
      const start = minutes(raw.time);
      const end = start + Number(raw.durationMinutes);
      if (end > 20 * 60) return reject('after_day_end', dayIndex, visitIndex);
      if (start < 9 * 60)
        return reject('before_day_start', dayIndex, visitIndex);
      if (
        original.date === itinerary.arrivalDate &&
        start < minutes(itinerary.arrivalTime) + 5
      )
        return reject('before_arrival_time', dayIndex, visitIndex);
      if (
        start <
        previousEnd +
          (visits.length || original.date === itinerary.arrivalDate ? 5 : 0)
      )
        return reject('overlapping_time', dayIndex, visitIndex);
      const travelMinutes = visits.length
        ? Math.max(5, Math.min(45, start - previousEnd))
        : 5;
      visits.push({
        kind,
        time: raw.time,
        endTime: clock(end),
        place,
        durationMinutes: Number(raw.durationMinutes),
        travelMinutes,
      });
      used.add(raw.placeId);
      previousEnd = end;
    }
    const dayChanged =
      visits.length !== original.visits.length ||
      visits.some((visit, index) => {
        const before = original.visits[index];
        return (
          !before ||
          before.place.id !== visit.place.id ||
          before.kind !== visit.kind ||
          before.time !== visit.time ||
          before.durationMinutes !== visit.durationMinutes
        );
      });
    if (dayChanged) changed = true;
    days.push({
      ...original,
      visits,
      notes: dayChanged
        ? original.notes.filter((note) => !note.includes('후보가 부족'))
        : original.notes,
    });
  }
  return changed
    ? { ...itinerary, days, curationSource: 'ai' }
    : reject('unchanged');
}
