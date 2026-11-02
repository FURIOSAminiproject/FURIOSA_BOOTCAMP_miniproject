import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { GenerateContentParameters } from '@google/genai';
import { configuredGeminiClient } from './gemini-client';
import {
  revisionErrorReply,
  revisionUnchangedReply,
} from './itinerary-revision-reply';
import {
  aiErrorDiagnostic,
  createAiTrace,
  generateGeminiContent,
  type AiTrace,
} from './ai-diagnostics';
import { databaseDiagnostic } from '../routing-cache/routing.errors';
import { ExplorerRepository } from '../route-explorer/explorer.repository';
import type { DestinationItinerary } from '../route-explorer/destination-itinerary';
import type { SpotPlace } from '../route-explorer/explorer.types';
import {
  applyItineraryRevision,
  allowedVisitKinds,
  isDestinationItinerary,
  isSpotPlace,
  type RevisionValidationPosition,
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

  private getGeminiClient(trace?: AiTrace) {
    return configuredGeminiClient(this.db, trace);
  }

  /** 구조화 요청이 거부되면 스키마를 제외한 JSON 모드로 최대 한 번만 요청한다. */
  private async generateRevisionContent(
    client: NonNullable<Awaited<ReturnType<typeof configuredGeminiClient>>>,
    request: GenerateContentParameters,
    trace: AiTrace,
  ) {
    try {
      return {
        response: await generateGeminiContent(client, request, trace),
        request,
      };
    } catch (error) {
      const diagnostic = aiErrorDiagnostic(error);
      if (
        !request.config?.responseJsonSchema ||
        diagnostic.httpStatus !== 400 ||
        diagnostic.providerCode !== 'INVALID_ARGUMENT' ||
        diagnostic.credentialRelated ||
        (Array.isArray(diagnostic.providerReasons) &&
          diagnostic.providerReasons.length > 0)
      )
        throw error;
      trace.emit(
        'ai_revision_json_mode_retry',
        {
          reason: 'invalid_argument_with_structured_output',
          attempt: 2,
        },
        'warn',
      );
      const config = { ...request.config };
      delete config.responseJsonSchema;
      const jsonRequest = { ...request, config };
      return {
        response: await generateGeminiContent(client, jsonRequest, trace),
        request: jsonRequest,
      };
    }
  }

  private parseProposal(text: string, trace: AiTrace, proposalAttempt: number) {
    trace.emit('ai_revision_parse_started', {
      responseLength: text.length,
      proposalAttempt,
    });
    const value: unknown = JSON.parse(text);
    const parsed =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    trace.emit('ai_revision_parse_completed', {
      objectResponse:
        !!value && typeof value === 'object' && !Array.isArray(value),
      daysArrayPresent: Array.isArray(parsed.days),
      proposedDayCount: Array.isArray(parsed.days) ? parsed.days.length : 0,
      proposalAttempt,
    });
    return parsed;
  }

  private validateProposal(
    itinerary: DestinationItinerary,
    proposedDays: unknown,
    places: SpotPlace[],
    trace: AiTrace,
    proposalAttempt: number,
  ) {
    const result: {
      itinerary: DestinationItinerary | null;
      rejection?: { reason: string; position: RevisionValidationPosition };
    } = { itinerary: null };
    result.itinerary = applyItineraryRevision(
      itinerary,
      proposedDays,
      places,
      (reason, position) => {
        result.rejection = { reason, position };
        const noChange =
          reason === 'no_proposed_days' || reason === 'unchanged';
        trace.emit(
          noChange
            ? 'ai_revision_no_change'
            : 'ai_revision_validation_rejected',
          { reason, ...position, proposalAttempt },
          noChange ? 'log' : 'warn',
        );
      },
    );
    return result;
  }

  async revise(
    input: ItineraryRevisionRequest,
  ): Promise<ItineraryRevisionResponse> {
    const trace = createAiTrace('revision');
    const message =
      typeof input?.message === 'string'
        ? input.message.trim().slice(0, 1000)
        : '';
    const center = input?.destination;
    trace.emit('ai_revision_received', {
      messageLength: message.length,
      historyCount: Array.isArray(input?.history) ? input.history.length : 0,
    });
    if (
      !message ||
      !isDestinationItinerary(input?.itinerary) ||
      !center ||
      !Number.isFinite(center.latitude) ||
      !Number.isFinite(center.longitude) ||
      Math.abs(center.latitude) > 90 ||
      Math.abs(center.longitude) > 180 ||
      !['driving', 'walking'].includes(String(input.mode))
    ) {
      trace.emit('ai_revision_input_rejected', {}, 'warn');
      throw new BadRequestException(
        '수정할 여행 일정과 도착지 조건을 확인해 주세요.',
      );
    }
    const itinerary = input.itinerary;
    trace.emit('ai_revision_input_validated', {
      dayCount: itinerary.days.length,
      visitCount: itinerary.days.reduce(
        (sum, day) => sum + day.visits.length,
        0,
      ),
      mode: input.mode,
    });
    const gemini = await this.getGeminiClient(trace);
    if (!gemini) {
      trace.emit(
        'ai_revision_completed',
        { changed: false, reason: 'no_api_key' },
        'warn',
      );
      return {
        reply: revisionUnchangedReply('no_api_key', ''),
        changed: false,
        itinerary: null,
        modelUsed: 'unavailable',
      };
    }

    const registered = itinerary.days.flatMap((day) =>
      day.visits.map((visit) => visit.place),
    );
    const nearby: SpotPlace[] = [];
    const candidatesStarted = performance.now();
    let failedLookups = 0;
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
      for (const result of results) {
        if (result.status === 'fulfilled') nearby.push(...result.value.places);
        else {
          failedLookups++;
          trace.emit(
            'ai_revision_candidates_lookup_failed',
            {
              ...databaseDiagnostic(result.reason, 'revision_candidates'),
            },
            'warn',
          );
        }
      }
    }
    const places = [
      ...new Map(
        [...registered, ...nearby]
          .filter(isSpotPlace)
          .map((place) => [place.id, place]),
      ).values(),
    ].slice(0, 80);
    const usedPlaceIds = new Set(registered.map((place) => place.id));
    const foodCandidates = places.filter((place) => place.contentTypeId === 39);
    const recognizedCafes = foodCandidates.filter((place) =>
      /카페|커피|찻집|다방|디저트|베이커리|cafe|coffee/i.test(
        `${place.name} ${place.categoryName || ''}`,
      ),
    );
    const candidateCoverage = {
      foodCount: foodCandidates.length,
      unusedFoodCount: foodCandidates.filter(
        (place) => !usedPlaceIds.has(place.id),
      ).length,
      recognizedCafeCount: recognizedCafes.length,
      unusedRecognizedCafeCount: recognizedCafes.filter(
        (place) => !usedPlaceIds.has(place.id),
      ).length,
    };
    trace.emit('ai_revision_candidates_loaded', {
      durationMs: Math.round(performance.now() - candidatesStarted),
      registeredCount: registered.length,
      nearbyCount: nearby.length,
      candidateCount: places.length,
      failedLookups,
      databaseConfigured: !!this.db,
      ...candidateCoverage,
    });
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
    let stage = 'provider';
    try {
      const generated = await this.generateRevisionContent(
        gemini,
        {
          model: gemini.modelName,
          contents: JSON.stringify({
            message,
            history,
            candidateCoverage,
            mode: input.mode,
            arrivalDate: itinerary.arrivalDate,
            arrivalTime: itinerary.arrivalTime,
            days: itinerary.days.map((day) => ({
              dayNumber: day.dayNumber,
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
              allowedKinds: allowedVisitKinds(place.contentTypeId),
            })),
          }),
          config: {
            systemInstruction:
              '당신은 국내 여행의 도착 후 날짜별 일정을 실제로 수정하는 플래너입니다. 사용자 요청에 맞춰 기존 일정을 가능한 한 유지하면서 방문 장소 교체·추가·삭제·시각 재배치를 하세요. 반드시 제공된 places의 ID만 사용하고 각 장소의 allowedKinds에 있는 kind만 지정하세요. allowedKinds가 빈 장소는 방문에 넣지 마세요. 관광지를 점심·카페·저녁으로 배정하거나 음식점을 sightseeing으로 배정하면 수정 전체가 거부됩니다. candidateCoverage는 후보 중 음식점·이름이나 분류로 확인되는 카페와 아직 일정에 없는 후보의 개수입니다. 카페 추가 요청에 실제 카페 후보가 없으면 식당이나 관광지를 카페로 꾸미지 말고 reply에 후보 부족을 구체적으로 설명하세요. 최신 message를 현재 days와 places 기준으로 판단하세요. dayNumber가 첫날·둘째 날의 기준입니다. days에는 변경한 날짜만 넣고, 각 날짜의 visits에는 유지할 방문까지 포함한 그 날의 최종 전체 방문 목록을 넣으세요. 생략한 날짜는 그대로 유지되며, visits=[]는 해당 날짜 방문 전체 삭제입니다. 하루 최대 6곳, 생략한 날짜를 포함해 전체에서 장소 ID 중복 금지, 도착일·도착 시각 이후·09:00~20:00 범위, 방문 간 최소 5분 여유를 지키세요. 관광지는 sightseeing, 음식점은 lunch/cafe/dinner입니다. 경로선·이동 수단·출발지·날짜·숙박 예약은 이 기능으로 바꿀 수 없습니다. 그 요청이라면 수정하지 말고 안내만 하세요. JSON {reply:"짧은 수정 설명",days:[{date:"YYYY-MM-DD",visits:[{placeId:"제공 ID",kind:"sightseeing|lunch|cafe|dinner",time:"HH:mm",durationMinutes:30~180}]}]} 형식으로 반환하세요. 수정 불가하거나 질문일 때는 days=[]로 답하고 reply에 후보 부족·추가 질문·지원 범위·이미 반영됨 중 실제 이유를 설명하세요. 실제 수정 없이 완료했다고 말하지 마세요.',
            responseMimeType: 'application/json',
            responseJsonSchema: {
              type: 'object',
              required: ['reply', 'days'],
              properties: {
                reply: { type: 'string' },
                days: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['date', 'visits'],
                    properties: {
                      date: {
                        type: 'string',
                      },
                      visits: {
                        type: 'array',
                        items: {
                          type: 'object',
                          required: [
                            'placeId',
                            'kind',
                            'time',
                            'durationMinutes',
                          ],
                          properties: {
                            placeId: {
                              type: 'string',
                            },
                            kind: {
                              type: 'string',
                              enum: ['sightseeing', 'lunch', 'cafe', 'dinner'],
                            },
                            time: { type: 'string' },
                            durationMinutes: {
                              type: 'integer',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        trace,
      );
      stage = 'parse';
      let parsed = this.parseProposal(
        generated.response.text || '{}',
        trace,
        1,
      );
      stage = 'validation';
      let validated = this.validateProposal(
        itinerary,
        parsed.days,
        places,
        trace,
        1,
      );
      if (
        !validated.itinerary &&
        validated.rejection?.reason === 'place_kind_mismatch'
      ) {
        trace.emit(
          'ai_revision_repair_started',
          {
            reason: validated.rejection.reason,
            ...validated.rejection.position,
            repairAttempt: 1,
          },
          'warn',
        );
        stage = 'repair_provider';
        const repaired = await generateGeminiContent(
          gemini,
          {
            ...generated.request,
            contents: JSON.stringify({
              ...JSON.parse(generated.request.contents as string),
              rejectedDays: parsed.days,
              validationFeedback: validated.rejection,
              repairInstruction:
                '이전 수정안은 장소 유형과 방문 kind가 맞지 않아 적용되지 않았습니다. 원래 사용자 요청과 수정 범위를 유지하고, 모든 방문의 kind가 해당 장소의 allowedKinds에 속하도록 수정안을 한 번 보정하세요. 방문 목적이 식사·카페라면 그 목적을 관광으로 바꾸지 말고 해당 kind를 허용하는 places 후보를 선택하세요. 유지할 방문을 포함한 수정 날짜의 최종 전체 visits를 반환하고, 생략할 날짜는 원래 일정을 유지합니다. 날짜·중복·도착 시각·방문 시간 규칙도 모두 지키세요. 유효한 변경을 만들 수 없으면 days=[]로 답하세요.',
            }),
          },
          trace,
        );
        stage = 'repair_parse';
        parsed = this.parseProposal(repaired.text || '{}', trace, 2);
        stage = 'validation';
        validated = this.validateProposal(
          itinerary,
          parsed.days,
          places,
          trace,
          2,
        );
        trace.emit(
          'ai_revision_repair_completed',
          {
            changed: !!validated.itinerary,
            repairAttempt: 1,
            reason: validated.itinerary
              ? 'validated'
              : (validated.rejection?.reason ?? 'rejected'),
          },
          validated.itinerary ? 'log' : 'warn',
        );
      }
      const revised = validated.itinerary;
      const reply =
        typeof parsed.reply === 'string'
          ? parsed.reply.trim().slice(0, 1000)
          : '';
      const noProposal = Array.isArray(parsed.days) && parsed.days.length === 0;
      const unchanged = validated.rejection?.reason === 'unchanged';
      const ordinaryNoChange = noProposal || unchanged;
      trace.emit(
        'ai_revision_completed',
        {
          changed: !!revised,
          reason: revised
            ? 'applied'
            : (validated.rejection?.reason ?? 'rejected'),
          modelReplyPresent: !!reply,
          modelReplyLength: reply.length,
        },
        revised || ordinaryNoChange ? 'log' : 'warn',
      );
      return revised
        ? {
            reply: `일정에 반영했습니다. ${reply || '변경된 날짜별 방문 장소와 시각을 확인해 주세요.'}`,
            changed: true,
            itinerary: revised,
            modelUsed: gemini.modelName,
          }
        : {
            reply: revisionUnchangedReply(
              validated.rejection?.reason ?? 'unknown',
              reply,
              validated.rejection?.position,
            ),
            changed: false,
            itinerary: null,
            modelUsed: gemini.modelName,
          };
    } catch (error) {
      const diagnostic = aiErrorDiagnostic(error);
      trace.emit('ai_revision_failed', { stage, ...diagnostic }, 'error');
      return {
        reply: revisionErrorReply(diagnostic, stage),
        changed: false,
        itinerary: null,
        modelUsed: gemini.modelName,
      };
    }
  }
}
