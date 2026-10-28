import type { SpotPlace } from './explorer.types';
import type { RouteResponse } from '../routing-cache/routing.types';

export interface DestinationItineraryRequest {
  mode: 'driving' | 'walking';
  points: { latitude: number; longitude: number }[];
  preference: 'recommended' | 'shortest';
  startDate: string;
  endDate: string;
  departureTime: string;
  categoryIds: string[];
  includeLunch?: boolean;
  includeDinner?: boolean;
  lunchTime?: string;
  dinnerTime?: string;
}
export interface DestinationVisit {
  kind: 'sightseeing' | 'lunch' | 'cafe' | 'dinner';
  time: string;
  endTime: string;
  place: SpotPlace;
  travelMinutes: number;
  durationMinutes: number;
}
export interface DestinationDay {
  date: string;
  dayNumber: number;
  title: string;
  visits: DestinationVisit[];
  notes: string[];
}
export interface DestinationItinerary {
  arrivalDate: string;
  arrivalTime: string;
  routePreference: 'recommended' | 'shortest';
  days: DestinationDay[];
  stayOptions: SpotPlace[];
  warnings: string[];
}

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const dateAt = (start: string, offset: number) =>
  new Date(Date.parse(start) + offset * 86400000).toISOString().slice(0, 10);

/** 장소 사이의 직선거리이며 실제 도로 이동거리는 아니다. */
function distance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * rad;
  const lon = (b.longitude - a.longitude) * rad;
  const value =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(lon / 2) ** 2;
  return (
    6371008.8 *
    2 *
    Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)))
  );
}

/** 실제 DB 후보로 도착 이후 날짜별 일정을 만든다. 같은 장소는 전체 일정에서 한 번만 쓴다. */
export function buildDestinationItinerary(
  request: DestinationItineraryRequest,
  route: Pick<RouteResponse, 'durationSeconds'>,
  candidates: {
    sights: SpotPlace[];
    food: SpotPlace[];
    themed: SpotPlace[];
    stays: SpotPlace[];
  },
  warnings: string[] = [],
): DestinationItinerary {
  const [hour, minute] = request.departureTime.split(':').map(Number);
  const arrival = hour * 60 + minute + Math.ceil(route.durationSeconds / 60);
  const arrivalDay = Math.floor(arrival / 1440);
  const count =
    (Date.parse(request.endDate) - Date.parse(request.startDate)) / 86400000 +
    1;
  const unique = (places: SpotPlace[]) => [
    ...new Map(places.map((p) => [p.id, p])).values(),
  ];
  const cafe = (p: SpotPlace) =>
    /카페|커피|찻집|다방|디저트|베이커리|cafe|coffee/i.test(
      `${p.name} ${p.categoryName || ''}`,
    );
  const sights = unique([...candidates.themed, ...candidates.sights]).filter(
    (p) => ![32, 39].includes(p.contentTypeId),
  );
  const food = unique([...candidates.food, ...candidates.themed]).filter(
    (p) => p.contentTypeId === 39,
  );
  const used = new Set<string>();
  const days: DestinationDay[] = [];
  // 식사·휴식 사이에 체류 시간을 두며 다음 날은 도착지에서 다시 시작한다.
  const mealTime = (value: string | undefined, fallback: number) =>
    value ? value.split(':').reduce((h, m) => h * 60 + Number(m), 0) : fallback;
  const slots: {
    time: number;
    kind: DestinationVisit['kind'];
    duration: number;
  }[] = [
    { time: 9 * 60 + 30, kind: 'sightseeing', duration: 90 },
    { time: mealTime(request.lunchTime, 12 * 60), kind: 'lunch', duration: 60 },
    { time: 13 * 60 + 30, kind: 'sightseeing', duration: 90 },
    { time: 15 * 60 + 30, kind: 'cafe', duration: 45 },
    { time: 16 * 60 + 30, kind: 'sightseeing', duration: 60 },
    {
      time: mealTime(request.dinnerTime, 18 * 60),
      kind: 'dinner',
      duration: 60,
    },
  ]
    .filter(
      (slot) =>
        !(slot.kind === 'lunch' && request.includeLunch === false) &&
        !(slot.kind === 'dinner' && request.includeDinner === false),
    )
    .sort((a, b) => a.time - b.time) as typeof slots;
  for (let day = 0; day < count; day++) {
    const result: DestinationDay = {
      date: dateAt(request.startDate, day),
      dayNumber: day + 1,
      title:
        day < arrivalDay
          ? '목적지로 이동'
          : day === arrivalDay
            ? '도착 후 여행'
            : '도착지에서 보내는 하루',
      visits: [],
      notes: [],
    };
    if (day < arrivalDay) {
      result.notes.push(
        '예상 이동시간에 따라 이 날은 목적지 도착 전입니다. 이동·휴식 시간을 먼저 확보해 주세요.',
      );
      days.push(result);
      continue;
    }
    let available = day === arrivalDay ? (arrival % 1440) + 30 : 9 * 60;
    let previous = request.points[request.points.length - 1];
    for (const slot of slots) {
      // 이미 지난 식사 시간이나 관광 시간대를 다음 날 일정처럼 되풀이하지 않는다.
      if (day === arrivalDay && slot.time + 90 < available) continue;
      const pool =
        slot.kind === 'sightseeing'
          ? sights
          : slot.kind === 'cafe'
            ? food.filter(cafe)
            : food.filter((p) => !cafe(p));
      const nearest = pool
        .filter((p) => !used.has(p.id))
        .sort((a, b) => distance(previous, a) - distance(previous, b))[0];
      if (!nearest) {
        result.notes.push(
          `${slot.kind === 'sightseeing' ? '관광' : slot.kind === 'cafe' ? '카페' : slot.kind === 'lunch' ? '점심' : '저녁'} 후보가 부족해 이 시간은 자유 일정으로 남겼습니다.`,
        );
        continue;
      }
      const travelMinutes = Math.max(
        5,
        Math.ceil(
          (distance(previous, nearest) /
            (request.mode === 'walking' ? 4000 : 25000)) *
            60,
        ),
      );
      // 도보는 하루 이동 부담을 제한하고 자정 이후로 일정을 밀어 넣지 않는다.
      if (request.mode === 'walking' && travelMinutes > 45) {
        result.notes.push(
          '도보 이동 부담이 큰 후보는 제외했습니다. 가까운 장소를 추가로 찾아보세요.',
        );
        continue;
      }
      const start = Math.max(slot.time, available + travelMinutes);
      if (start + slot.duration > 20 * 60) continue;
      result.visits.push({
        kind: slot.kind,
        time: clock(start),
        endTime: clock(start + slot.duration),
        place: nearest,
        travelMinutes,
        durationMinutes: slot.duration,
      });
      used.add(nearest.id);
      previous = nearest;
      available = start + slot.duration;
    }
    if (!result.visits.length)
      result.notes.push(
        '도착 시각이 늦거나 등록된 장소가 부족합니다. 숙소 이동과 휴식을 우선해 주세요.',
      );
    if (day < count - 1)
      result.notes.push(
        '저녁 이후 숙소 체크인·휴식 시간을 확보하세요. 아래 숙박 후보는 예약 전 확인이 필요합니다.',
      );
    else
      result.notes.push(
        '마지막 날입니다. 귀가 이동시간은 별도로 확보해 여행 종료 시각을 조정해 주세요.',
      );
    result.notes = [...new Set(result.notes)];
    days.push(result);
  }
  if (arrivalDay >= count)
    warnings.push(
      '예상 도착일이 여행 종료일 이후입니다. 여행 기간 또는 이동 수단을 다시 확인해 주세요.',
    );
  warnings.push(
    '장소 간 이동시간은 직선거리 기반의 여유시간 추정입니다. 영업시간·휴무·예약 가능 여부와 실제 도로 이동시간은 방문 전에 확인해 주세요.',
  );
  return {
    arrivalDate: dateAt(request.startDate, arrivalDay),
    arrivalTime: clock(arrival % 1440),
    routePreference: request.preference,
    days,
    stayOptions: count > 1 ? unique(candidates.stays).slice(0, 3) : [],
    warnings,
  };
}
