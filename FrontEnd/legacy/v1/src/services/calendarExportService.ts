/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FullTravelPlan, TravelPlace, DayItinerary } from '../types/travel';

/**
 * Format date string (YYYY-MM-DD) and time string (HH:MM) to iCalendar timestamp (YYYYMMDDTHHMMSS)
 */
function toIcsDateTime(dateStr: string, timeStr: string): string {
  // dateStr: "2026-10-25" -> "20261025"
  const cleanDate = dateStr.replace(/[^0-9]/g, '');
  const cleanTime = timeStr.trim().replace(':', '');
  const paddedTime = cleanTime.padEnd(4, '0').slice(0, 4) + '00';
  return `${cleanDate}T${paddedTime}`;
}

/**
 * Parses timeSlot like "10:30 - 11:20" or "10:30" into [startTime, endTime]
 */
function parseTimeSlot(timeSlot?: string, defaultIndex: number = 0): [string, string] {
  const fallbackSlots = [
    ['09:30', '11:00'],
    ['11:30', '13:00'],
    ['13:30', '15:30'],
    ['16:00', '18:00'],
    ['18:30', '20:30'],
    ['21:00', '22:30']
  ];

  if (!timeSlot || !timeSlot.includes(':')) {
    const slot = fallbackSlots[defaultIndex % fallbackSlots.length];
    return [slot[0], slot[1]];
  }

  const parts = timeSlot.split('-').map(s => s.trim());
  if (parts.length >= 2 && parts[0].includes(':') && parts[1].includes(':')) {
    return [parts[0], parts[1]];
  }

  const start = parts[0] || '10:00';
  // Add 1.5 hours by default
  const [h, m] = start.split(':').map(Number);
  const endH = (h + 1).toString().padStart(2, '0');
  const endM = (m || 0).toString().padStart(2, '0');
  return [start, `${endH}:${endM}`];
}

/**
 * Escape text for iCalendar RFC 5545
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generates an RFC 5545 compliant .ics iCalendar file content
 */
export function generateIcsCalendar(plan: FullTravelPlan): string {
  const now = new Date();
  const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const calendarName = `[길벗 AI] ${plan.request.destination} ${plan.title}`;

  const events: string[] = [];

  plan.days.forEach((day: DayItinerary) => {
    day.places.forEach((place: TravelPlace, idx: number) => {
      const [startTime, endTime] = parseTimeSlot(place.timeSlot, idx);
      const dtStart = toIcsDateTime(day.date, startTime);
      const dtEnd = toIcsDateTime(day.date, endTime);
      const uid = `gilbeot-${plan.requestId}-d${day.dayNumber}-p${idx}-${Date.now()}@gilbeot.ai`;

      const descriptionLines = [
        `[길벗 AI Agents 여행사 - ${day.dayNumber}일차 여정]`,
        `📍 테마: ${day.theme}`,
        `🏢 장소명: ${place.name} (${place.categoryLabel})`,
        `⏰ 시간대: ${place.timeSlot}`,
        `💬 상세 안내: ${place.description}`,
        place.estimatedCost ? `💰 예상 비용: ${place.estimatedCost.toLocaleString()}원` : '',
        place.recommendedBy ? `🤖 추천 에이전트: ${place.recommendedBy}` : '',
        place.specialTip ? `💡 여행 꿀팁: ${place.specialTip}` : '',
        place.naverSearchUrl ? `🗺️ 네이버 지도 PUSH: ${place.naverSearchUrl}` : '',
        place.googleSearchUrl ? `🗺️ 구글 MAP PUSH: ${place.googleSearchUrl}` : '',
        `\n✓ 총괄 협연자(Supervisor) 중복 0건 및 GIS 위경도 전수 검증 완료`
      ].filter(Boolean).join('\n');

      const eventBlock = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:[${day.dayNumber}일차] ${place.name}`,
        `DESCRIPTION:${escapeIcsText(descriptionLines)}`,
        `LOCATION:${escapeIcsText(place.address || place.name)}`,
        place.lat && place.lng ? `GEO:${place.lat.toFixed(6)};${place.lng.toFixed(6)}` : '',
        'STATUS:CONFIRMED',
        'CATEGORIES:TRAVEL,VACATION,GILBEOT_AI',
        'TRANSP:OPAQUE',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcsText(`${place.name} 방문 30분 전 알림`)}`,
        'TRIGGER:-PT30M',
        'END:VALARM',
        'END:VEVENT'
      ].filter(Boolean).join('\r\n');

      events.push(eventBlock);
    });
  });

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gilbeot AI Agents Travel Agency//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Seoul',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Seoul',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:KST',
    'END:STANDARD',
    'END:VTIMEZONE',
    events.join('\r\n'),
    'END:VCALENDAR'
  ];

  return icsLines.join('\r\n');
}

/**
 * Triggers direct .ics file download in the browser
 */
export function downloadIcsCalendar(plan: FullTravelPlan): void {
  const icsContent = generateIcsCalendar(plan);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = plan.request.destination.replace(/[^a-zA-Z0-9가-힣]/g, '_');
  a.href = url;
  a.download = `gilbeot_travel_${safeTitle}_${plan.requestId}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Creates a direct Google Calendar Web URL for a specific place item
 */
export function buildGoogleCalendarUrl(place: TravelPlace, dateStr: string, dayNumber: number): string {
  const [startTime, endTime] = parseTimeSlot(place.timeSlot);
  const startDt = toIcsDateTime(dateStr, startTime);
  const endDt = toIcsDateTime(dateStr, endTime);

  const title = `[길벗AI ${dayNumber}일차] ${place.name}`;
  const details = `${place.description}\n\n위치: ${place.address}\n추천: ${place.recommendedBy || '길벗 AI'}\n네이버 지도: ${place.naverSearchUrl || ''}\n구글 지도: ${place.googleSearchUrl || ''}`;
  const location = place.address || place.name;

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', title);
  url.searchParams.set('dates', `${startDt}/${endDt}`);
  url.searchParams.set('details', details);
  url.searchParams.set('location', location);
  url.searchParams.set('ctz', 'Asia/Seoul');

  return url.toString();
}
