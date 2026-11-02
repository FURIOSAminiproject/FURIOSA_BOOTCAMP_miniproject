import { Type, type FunctionDeclaration } from '@google/genai';
import type { DataSource } from 'typeorm';
import type { DestinationItinerary } from '../route-explorer/destination-itinerary';
import type { SpotPlace } from '../route-explorer/explorer.types';
import type { AiTrace } from './ai-diagnostics';
import {
  parseCandidateSearch,
  searchRevisionCandidates,
  type CandidateSearchSummary,
} from './revision-candidate-search';
import {
  revisionItineraryContext,
  revisionPlaceContext,
} from './revision-context';
import {
  REVISION_POLICY as P,
  RevisionExecutionError,
} from './revision-policy';
import { withRevisionReadOnly } from './revision-readonly';
import { safeDiagnostics } from '../routing-cache/routing.errors';

export const REVISION_TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_current_itinerary',
    description:
      '현재 화면의 일정을 조회합니다. 먼저 호출해 마지막 날과 실제 방문 이름·종류·개수를 확인하세요.',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'search_places',
    description:
      'DB 장소 후보를 읽습니다. SQL·URL은 받지 않습니다. 0건이면 서버가 범위를 한 번 확대합니다. 실패와 0건을 구분하세요.',
    parameters: {
      type: Type.OBJECT,
      required: ['kind'],
      properties: {
        kind: { type: Type.STRING, enum: ['cafe', 'food', 'sightseeing'] },
        dayNumber: {
          type: Type.INTEGER,
          description: '현재 일정에 존재하는 일차',
        },
        keyword: {
          type: Type.STRING,
          description:
            '특정 장소명이나 분류만 50자 이내. 일반 카페 검색에는 생략하세요.',
        },
        expand: {
          type: Type.BOOLEAN,
          description:
            '기존 후보로 부족할 때 범위 확대를 요청합니다. 허용 여부와 범위는 서버가 정합니다.',
        },
      },
    },
  },
];

/** 요청마다 생성합니다. DB 연결·SQL·다른 사람의 일정 ID를 모델에 공개하지 않습니다. */
export class RevisionTools {
  readonly places: SpotPlace[];
  read = false;
  calls = 0;
  stages = 0;
  lastSearch?: CandidateSearchSummary;
  lastSearchDay?: number;
  searchUnavailable = false;
  searchBudgetExhausted = false;
  private cache = new Map<
    string,
    { output: unknown; summary: CandidateSearchSummary; dayNumber?: number }
  >();
  constructor(
    private readonly itinerary: DestinationItinerary,
    private readonly destination: { latitude: number; longitude: number },
    private readonly mode: 'walking' | 'driving',
    private readonly db: DataSource | undefined,
    private readonly trace: AiTrace,
    private readonly checkDeadline: () => void,
  ) {
    this.places = [
      ...new Map(
        itinerary.days.flatMap((d) =>
          d.visits.map((v) => [v.place.id, v.place] as const),
        ),
      ).values(),
    ];
  }

  async execute(name: string, args: unknown): Promise<unknown> {
    this.checkDeadline();
    if (++this.calls > P.maxToolCalls)
      throw new RevisionExecutionError('TOOL_BUDGET_EXCEEDED');
    if (!['get_current_itinerary', 'search_places'].includes(name))
      throw new RevisionExecutionError('TOOL_NOT_ALLOWED');
    if (
      !args ||
      typeof args !== 'object' ||
      Array.isArray(args) ||
      Buffer.byteLength(JSON.stringify(args)) > 1024
    )
      throw new RevisionExecutionError('TOOL_ARGUMENTS_INVALID');
    this.trace.emit('ai_revision_tool_started', {
      tool: name,
      toolCall: this.calls,
    });
    let output: unknown;
    if (name === 'get_current_itinerary') {
      if (Object.keys(args).length)
        throw new RevisionExecutionError('TOOL_ARGUMENTS_INVALID');
      this.read = true;
      output = {
        itinerary: revisionItineraryContext(this.itinerary),
        places: revisionPlaceContext(this.places),
      };
    } else {
      if (!this.read)
        throw new RevisionExecutionError('CURRENT_ITINERARY_NOT_READ');
      output = await this.search(args as Record<string, unknown>);
    }
    this.checkDeadline();
    if (Buffer.byteLength(JSON.stringify(output)) > P.maxToolResultBytes)
      throw new RevisionExecutionError('TOOL_RESULT_TOO_LARGE');
    this.trace.emit('ai_revision_tool_completed', {
      tool: name,
      toolCall: this.calls,
      searchStages: this.stages,
      candidateCount: this.places.length,
    });
    return output;
  }

  private async search(args: Record<string, unknown>) {
    const { expand, ...conditions } = args;
    if (expand !== undefined && typeof expand !== 'boolean')
      throw new RevisionExecutionError('TOOL_ARGUMENTS_INVALID');
    const request = parseCandidateSearch(conditions, this.itinerary);
    if (!request) throw new RevisionExecutionError('TOOL_ARGUMENTS_INVALID');
    const key = JSON.stringify({ ...request, expand: !!expand });
    const cached = this.cache.get(key);
    if (cached) {
      this.searchBudgetExhausted = false;
      this.lastSearch = cached.summary;
      this.lastSearchDay = cached.dayNumber;
      return cached.output;
    }
    if (!this.db) {
      this.searchUnavailable = true;
      return {
        status: 'unavailable',
        reason: '장소 DB 연결이 준비되지 않아 검색하지 못했습니다.',
        places: [],
      };
    }
    if (this.stages >= P.maxSearchStages) {
      this.searchBudgetExhausted = true;
      return {
        status: 'budget_exhausted',
        reason: '장소 검색 횟수 한도에 도달했습니다.',
        places: [],
      };
    }
    this.searchBudgetExhausted = false;
    const radii = this.mode === 'walking' ? [1000, 5000] : [5000, 20000];
    this.lastSearchDay = request.dayNumber;
    const added: SpotPlace[] = [];
    do {
      this.checkDeadline();
      const radius = expand || this.stages > 0 ? radii[1] : radii[0];
      const round = ++this.stages;
      try {
        const result = await withRevisionReadOnly(this.db, (repository) =>
          searchRevisionCandidates(
            repository,
            request,
            this.itinerary,
            this.destination,
            this.mode,
            this.places,
            this.trace,
            round,
            radius,
          ),
        );
        const visible = result.places.slice(
          0,
          Math.min(
            P.maxNewCandidatesPerStage,
            P.maxCandidates - this.places.length,
          ),
        );
        this.places.push(...visible);
        added.push(...visible);
        this.lastSearch = {
          ...result.summary,
          newCandidateCount: visible.length,
          limited:
            result.summary.limited || visible.length < result.places.length,
        };
      } catch (error) {
        this.trace.emit(
          'ai_revision_candidate_search_lookup_failed',
          safeDiagnostics(error),
          'warn',
        );
        this.lastSearch = {
          round,
          status: 'failed',
          kind: request.kind,
          radiusMeters: radius,
          centerCount: 0,
          newCandidateCount: 0,
          failedLookups: 1,
          limited: false,
        };
      }
      // DB 실패를 후보 부재로 판단하지 않습니다. 조회에 성공한 0건만 자동 확대합니다.
      if (
        this.lastSearch.status !== 'completed' ||
        added.length ||
        radius === radii[1]
      )
        break;
    } while (this.stages < P.maxSearchStages);
    const output = {
      ...this.lastSearch,
      dayNumber: request.dayNumber,
      places: revisionPlaceContext(added),
      searchAvailable: this.stages < P.maxSearchStages,
    };
    this.cache.set(key, {
      output,
      summary: this.lastSearch,
      dayNumber: request.dayNumber,
    });
    return output;
  }
}
