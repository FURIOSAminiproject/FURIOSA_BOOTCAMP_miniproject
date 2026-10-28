import type { DataSource } from 'typeorm';
import { configuredGeminiClient } from '../chat/gemini-client';
import {
  parseCuratedDays,
  type CuratedDayChoices,
  type DestinationItineraryRequest,
} from './destination-itinerary';
import type { SpotPlace } from './explorer.types';

type Candidates = {
  sights: SpotPlace[];
  food: SpotPlace[];
  themed: SpotPlace[];
};

/** 모델은 등록 장소의 순서와 날짜별 테마를 고른다. 실제 일정 배치는 검증된 빌더가 담당한다. */
export class DestinationCurator {
  constructor(private readonly dataSource?: Pick<DataSource, 'query'>) {}

  private getGeminiClient() {
    return configuredGeminiClient(this.dataSource);
  }

  async choose(
    request: DestinationItineraryRequest,
    durationSeconds: number,
    candidates: Candidates,
  ): Promise<CuratedDayChoices[]> {
    const places = [
      ...new Map(
        [...candidates.themed, ...candidates.sights, ...candidates.food].map(
          (place) => [place.id, place],
        ),
      ).values(),
    ].slice(0, 60);
    if (!places.length) return [];
    const gemini = await this.getGeminiClient();
    if (!gemini) return [];
    const [hour, minute] = request.departureTime.split(':').map(Number);
    const arrivalMinutes = hour * 60 + minute + Math.ceil(durationSeconds / 60);
    const arrivalDate = new Date(
      Date.parse(request.startDate) +
        Math.floor(arrivalMinutes / 1440) * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    const arrivalTime = `${String(Math.floor((arrivalMinutes % 1440) / 60)).padStart(2, '0')}:${String(arrivalMinutes % 60).padStart(2, '0')}`;
    try {
      const response = await gemini.ai.models.generateContent({
        model: gemini.modelName,
        contents: JSON.stringify({
          travelStyle: request.travelStyle?.slice(0, 500) || '',
          startDate: request.startDate,
          endDate: request.endDate,
          arrivalDate,
          arrivalTime,
          mode: request.mode,
          includeLunch: request.includeLunch !== false,
          includeDinner: request.includeDinner !== false,
          lunchTime: request.lunchTime,
          dinnerTime: request.dinnerTime,
          places: places.map((place) => ({
            id: place.id,
            name: place.name.slice(0, 100),
            category: place.categoryName?.slice(0, 80) || '',
            contentTypeId: place.contentTypeId,
          })),
        }),
        config: {
          systemInstruction:
            '당신은 국내 여행 일정 큐레이터입니다. 사용자의 취향과 도착 시각에 맞춰 각 여행 날짜의 테마, 방문 순서, 시작 시각과 체류 시간을 결정하세요. 제공된 places의 ID만 사용하고 새로운 장소·영업시간·예약 가능 여부를 만들지 마세요. 도착일 전에 방문을 계획하지 말고 같은 ID를 여러 번 쓰지 마세요. 관광은 kind sightseeing(12/14/28/38), 식당은 lunch/dinner(39), 카페는 cafe(39)입니다. 점심·저녁 포함 여부와 요청 시각을 지키세요. 도보면 가까운 동선을 고르세요. 여유 시간도 남겨 두고 하루 최대 6곳, 09:00~20:00 사이에 배치하세요. JSON {days:[{date:"YYYY-MM-DD",title:"짧은 테마",placeIds:["우선순위 ID"],visits:[{placeId:"제공된 ID",kind:"sightseeing|lunch|cafe|dinner",time:"HH:mm",durationMinutes:30~180}]}]}만 반환하세요.',
          responseMimeType: 'application/json',
        },
      });
      const parsed: unknown = JSON.parse(response.text || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return [];
      return parseCuratedDays(
        (parsed as Record<string, unknown>).days,
        request,
        candidates,
      );
    } catch {
      return [];
    }
  }
}
