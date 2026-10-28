import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { configuredGeminiClient } from './gemini-client';
import { ExplorerRepository } from '../route-explorer/explorer.repository';
import type { DestinationItinerary } from '../route-explorer/destination-itinerary';
import type { SpotPlace } from '../route-explorer/explorer.types';
import {
  applyItineraryRevision,
  isDestinationItinerary,
  isSpotPlace,
} from './itinerary-revision';

export interface ItineraryRevisionRequest {
  message?: string;
  history?: { role: 'user' | 'model'; content: string }[];
  itinerary?: unknown;
  destination?: { latitude: number; longitude: number };
  mode?: 'driving' | 'walking';
}

export interface ItineraryRevisionResponse {
  reply: string;
  changed: boolean;
  itinerary: DestinationItinerary | null;
  modelUsed: string;
}

/** 생성된 도착 후 일정에만 적용한다. 모델의 문장이 아닌 검증된 장소 ID·시각을 상태로 반환한다. */
@Injectable()
export class ItineraryRevisionService {
  constructor(
    @Optional() @Inject(DataSource) private readonly db?: DataSource,
  ) {}

  private getGeminiClient() {
    return configuredGeminiClient(this.db);
  }

  async revise(
    input: ItineraryRevisionRequest,
  ): Promise<ItineraryRevisionResponse> {
    const message =
      typeof input?.message === 'string'
        ? input.message.trim().slice(0, 1000)
        : '';
    const center = input?.destination;
    if (
      !message ||
      !isDestinationItinerary(input?.itinerary) ||
      !center ||
      !Number.isFinite(center.latitude) ||
      !Number.isFinite(center.longitude) ||
      Math.abs(center.latitude) > 90 ||
      Math.abs(center.longitude) > 180 ||
      !['driving', 'walking'].includes(String(input.mode))
    )
      throw new BadRequestException(
        '수정할 여행 일정과 도착지 조건을 확인해 주세요.',
      );
    const itinerary = input.itinerary;
    const gemini = await this.getGeminiClient();
    if (!gemini)
      return {
        reply:
          'AI 연결이 준비되지 않아 일정을 변경하지 못했습니다. 잠시 후 다시 시도하거나 조건 수정 화면을 이용해 주세요.',
        changed: false,
        itinerary: null,
        modelUsed: 'unavailable',
      };

    const registered = itinerary.days.flatMap((day) =>
      day.visits.map((visit) => visit.place),
    );
    const nearby: SpotPlace[] = [];
    if (this.db) {
      const repository = new ExplorerRepository(this.db);
      const filters = [
        {
          contentTypeIds: [12, 14, 15, 28, 38],
          categoryIds: [],
          radiusMeters: input.mode === 'walking' ? 5000 : 20000,
          limit: 24,
        },
        {
          contentTypeIds: [39],
          categoryIds: [],
          radiusMeters: input.mode === 'walking' ? 5000 : 20000,
          limit: 24,
        },
      ];
      const results = await Promise.allSettled(
        filters.map((filter) => repository.placesAroundSpot(center, filter)),
      );
      for (const result of results)
        if (result.status === 'fulfilled') nearby.push(...result.value.places);
    }
    const places = [
      ...new Map(
        [...registered, ...nearby]
          .filter(isSpotPlace)
          .map((place) => [place.id, place]),
      ).values(),
    ].slice(0, 80);
    const history = Array.isArray(input.history)
      ? input.history
          .slice(-6)
          .filter(
            (item) =>
              item &&
              ['user', 'model'].includes(item.role) &&
              typeof item.content === 'string',
          )
          .map((item) => ({
            role: item.role,
            content: item.content.slice(0, 500),
          }))
      : [];
    try {
      const response = await gemini.ai.models.generateContent({
        model: gemini.modelName,
        contents: JSON.stringify({
          message,
          history,
          mode: input.mode,
          arrivalDate: itinerary.arrivalDate,
          arrivalTime: itinerary.arrivalTime,
          days: itinerary.days.map((day) => ({
            date: day.date,
            title: day.title,
            visits: day.visits.map((visit) => ({
              placeId: visit.place.id,
              kind: visit.kind,
              time: visit.time,
              durationMinutes: visit.durationMinutes,
            })),
          })),
          places: places.map((place) => ({
            id: place.id,
            name: place.name,
            category: place.categoryName,
            contentTypeId: place.contentTypeId,
          })),
        }),
        config: {
          systemInstruction:
            '당신은 국내 여행의 도착 후 날짜별 일정을 실제로 수정하는 플래너입니다. 사용자 요청에 맞춰 기존 일정을 가능한 한 유지하면서 방문 장소 교체·추가·삭제·시각 재배치를 하세요. 반드시 제공된 places의 ID만 사용하고, 기존 날짜를 모두 같은 순서로 반환하세요. 하루 최대 6곳, 전체에서 장소 ID 중복 금지, 도착 시각 이후·09:00~20:00 범위, 방문 간 최소 5분 여유를 지키세요. 관광지는 sightseeing, 음식점은 lunch/cafe/dinner입니다. 경로선·이동 수단·출발지·날짜·숙박 예약은 이 기능으로 바꿀 수 없습니다. 그 요청이라면 수정하지 말고 안내만 하세요. 일정 수정 요청이 아니라 질문이면 days를 생략하고 답하세요. 수정한다면 JSON {reply:"짧은 수정 설명",days:[{date:"YYYY-MM-DD",visits:[{placeId:"제공 ID",kind:"sightseeing|lunch|cafe|dinner",time:"HH:mm",durationMinutes:30~180}]}]} 형식으로 전체 날짜와 방문을 반환하세요. 수정 불가하거나 질문일 때 JSON {reply:"사유 또는 답변"}을 반환하세요. 실제 수정 없이 완료했다고 말하지 마세요.',
          responseMimeType: 'application/json',
        },
      });
      const value: unknown = JSON.parse(response.text || '{}');
      const parsed =
        value && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const revised = applyItineraryRevision(itinerary, parsed.days, places);
      const reply =
        typeof parsed.reply === 'string'
          ? parsed.reply.trim().slice(0, 1000)
          : '';
      return revised
        ? {
            reply: `일정에 반영했습니다. ${reply || '변경된 날짜별 방문 장소와 시각을 확인해 주세요.'}`,
            changed: true,
            itinerary: revised,
            modelUsed: gemini.modelName,
          }
        : {
            reply: Array.isArray(parsed.days)
              ? '요청한 수정안을 안전하게 적용할 수 없었습니다. 현재 화면의 일정은 변경되지 않았습니다.'
              : `${reply || '수정할 내용이 확인되지 않았습니다.'}\n현재 화면의 일정은 변경되지 않았습니다.`,
            changed: false,
            itinerary: null,
            modelUsed: gemini.modelName,
          };
    } catch {
      return {
        reply:
          'AI 수정 요청을 처리하지 못했습니다. 현재 일정은 변경되지 않았습니다. 다시 시도해 주세요.',
        changed: false,
        itinerary: null,
        modelUsed: gemini.modelName,
      };
    }
  }
}
