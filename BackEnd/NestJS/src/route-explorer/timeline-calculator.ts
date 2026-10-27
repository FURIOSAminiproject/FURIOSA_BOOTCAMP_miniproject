import type { Coordinate, TimeSpan } from '../routing-cache/routing.types';

const TIME_FORMAT = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:mm" 형식 문자열을 0시 기준 초(second)로 변환한다. */
export function parseTimeToSeconds(timeStr: string): number {
  const match = TIME_FORMAT.exec(timeStr.trim());
  if (!match) {
    throw new Error('시간 형식이 올바르지 않습니다. (예: 09:30, 14:00)');
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 3600 + minutes * 60;
}

/** 초를 "HH:mm" 형식으로 변환한다. 자정을 넘기면 24시간 주기로 순환한다. */
export function formatSecondsToTime(totalSeconds: number): string {
  const normalized = ((Math.floor(totalSeconds) % 86400) + 86400) % 86400;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * 경로의 timeSpans를 따라 경과 시간(elapsedSeconds)에 해당하는 정확한 위경도 좌표를 선형 보간한다.
 * - elapsedSeconds <= 0이면 출발지 반환
 * - elapsedSeconds >= totalDuration이면 도착지 반환
 */
export function findCoordinateAtElapsedSeconds(
  coordinates: Coordinate[],
  timeSpans: TimeSpan[],
  totalDurationSeconds: number,
  elapsedSeconds: number,
): Coordinate {
  if (!coordinates.length) return [127, 37];
  if (elapsedSeconds <= 0) return coordinates[0];
  if (elapsedSeconds >= totalDurationSeconds)
    return coordinates[coordinates.length - 1];

  let cumulative = 0;
  for (const span of timeSpans) {
    const prev = cumulative;
    cumulative += span.durationSeconds;
    if (cumulative >= elapsedSeconds) {
      const spanDuration = span.durationSeconds;
      if (spanDuration <= 0) {
        return coordinates[span.toIndex] ?? coordinates[span.fromIndex] ?? coordinates[0];
      }
      const alpha = Math.max(0, Math.min(1, (elapsedSeconds - prev) / spanDuration));
      const pFrom = coordinates[span.fromIndex] ?? coordinates[0];
      const pTo = coordinates[span.toIndex] ?? pFrom;
      const lon = pFrom[0] + alpha * (pTo[0] - pFrom[0]);
      const lat = pFrom[1] + alpha * (pTo[1] - pFrom[1]);
      return [
        Math.round(lon * 10000000) / 10000000,
        Math.round(lat * 10000000) / 10000000,
      ];
    }
  }

  return coordinates[coordinates.length - 1];
}
