/**
 * 장소 수집의 전체 순서와 결과 집계 담당. HTTP·SQL 세부 구현은 주입된 기능에 맡긴다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { TourApiError, TourStoreError, MappingError } from './tour-errors';
import { CONTENT_TYPES, text } from './tour-mapping';
import type { IngestionDependencies } from './tour-ingestion.ports';
import type { TourItem } from './tour-types';
import {
  assertIngestionOptions,
  type IngestionOptions,
} from './tour-ingestion.options';
import { assertCompletePage } from './tour-pagination';

export interface IngestionReport {
  /** 수집 시작 UTC ISO 시각. */
  startedAt: string;
  /** 수집 종료 시 설정하는 UTC ISO 시각. */
  finishedAt?: string;
  /** running=진행, completed=설정 범위 처리 완료, failed=실패. */
  status: 'running' | 'completed' | 'failed';
  /** 목록에서 읽어 처리 대상으로 본 항목 수. detail 모드는 목록을 읽지 않아 0일 수 있다. */
  fetched: number;
  /** 새로 INSERT한 기본 장소 수. */
  inserted: number;
  /** 기존 기본 장소의 내용이 바뀐 수. */
  updated: number;
  /** 기존 기본 장소와 내용이 같았던 수. */
  unchanged: number;
  /** 추가 상세 조회와 저장까지 성공한 수. inserted/updated와 중복될 수 있다. */
  enriched: number;
  /** 매핑 오류로 저장을 건너뛴 항목 수. */
  skipped: number;
  /** 지원하지 않는 관광 타입이라 의도적으로 제외한 수. */
  ignored: number;
  /** 재시도를 포함해 이 클라이언트가 실행한 HTTP 요청 시도 수. */
  apiRequests: number;
  /** 이번에 준비한 분류 코드 수. */
  categoryCount: number;
  /** 조회 파티션별 다음 페이지 번호. null이면 해당 파티션의 마지막까지 처리했다. */
  nextPages: Record<string, number | null>;
  /** 매핑 실패 항목의 외부 ID와 코드. 최대 20건만 보관한다. */
  issues: { contentId: string | null; code: string }[];
  /** 실패 시 안전하게 정리한 사유. 원본 인증정보나 응답 전문은 포함하지 않는다. */
  error?: string;
}
export class IngestionRunError extends Error {
  /**
   * IngestionRunError 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: report: 실패 시점까지 누적된 수집 보고서
   * @returns new로 생성한 IngestionRunError 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // IngestionRunError(report)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new IngestionRunError(report);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(readonly report: IngestionReport) {
    super(report.error ?? 'Ingestion failed');
  }
}
export class TourIngestionService {
  /**
   * TourIngestionService 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: dependencies: API·락·기준정보·상세·장소 저장·목록 전략 묶음
   * @returns new로 생성한 TourIngestionService 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourIngestionService(dependencies)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourIngestionService(dependencies);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(private readonly dependencies: IngestionDependencies) {}

  /**
   * 수집 전체를 조율하고 저장 결과를 집계한다.
   *
   * 입력: options: 초기 목록/증분/행사/상세/기준정보 모드와 지역·페이지 조건.
   * @returns 완료 보고서. 실패하면 부분 집계를 가진 IngestionRunError를 던진다.
   * @example
   * await service.run({ mode: "initial", pageSize: 20, startPage: 1, maxPages: 1, listOnly: true });
   *
   * 락 확보 → 스키마 확인 → 분류·지역 준비 → 목록 저장 → 선택적 상세 저장 순서다. 매핑 오류는 skipped, 지원하지 않는 타입은
   * ignored로 구분한다.
   */
  async run(options: IngestionOptions): Promise<IngestionReport> {
    const { api, gate, references, details, places, plans } = this.dependencies;
    const report: IngestionReport = {
      startedAt: new Date().toISOString(),
      status: 'running',
      fetched: 0,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      enriched: 0,
      skipped: 0,
      ignored: 0,
      apiRequests: 0,
      categoryCount: 0,
      nextPages: {},
      issues: [],
    };
    try {
      assertIngestionOptions(options);
      await gate.withLock(
        /**
         * 잠금이 확보된 동안 기준정보 준비와 페이지별 수집을 실행한다.
         *
         * 입력: 인자 없음. options, report, 주입된 조회기·저장기를 바깥에서 사용한다.
         * @returns Promise<void>. 저장/매핑 결과는 report에 누적한다.
         * @example
         * // reference 모드는 분류·지역 준비 후 바로 종료
         *
         * 락은 수집 중복 방지용이다. 장소별 저장 트랜잭션이 각각 완료되므로 이미 저장한 앞 페이지는 이후 실패해도 남는다.
         */
        async () => {
          // 1. 테이블 준비 확인 후, 현재 실행의 분류·지역 사전을 만든다.
          await gate.assertSchema();
          const context = await references.load();
          const { refs } = context;
          report.categoryCount = context.categoryCount;

          /**
           * 한 장소의 상세 응답을 가져와 기존 장소에 반영한다.
           *
           * 입력: base: contentid가 있는 기본 장소. refs와 context는 현재 수집 실행에서 공유한다.
           * @returns Promise<void>. 저장까지 성공하면 report.enriched를 1 늘린다.
           * @example
           * await enrich({ contentid: "126128" }); // 상세 저장 성공 시 enriched +1
           *
           * 상세 호출 실패 전 목록 기본 정보는 이미 저장되었을 수 있다. 전체 수집을 되돌리지 않는다.
           */
          const enrich = async (base: TourItem) => {
            const { item, snapshots } = await details.load(
              text(base.contentid)!,
            );
            await context.ensureDistrict(item);
            await places.save(item, snapshots, refs);
            report.enriched++;
          };
          if (options.mode === 'reference') return;
          if (options.mode === 'detail') {
            await enrich({ contentid: options.contentId });
            return;
          }
          // 2. 수집 모드별 API와 분할 목록을 고른다. 증분은 공개/비공개를 따로 돈다.
          const { endpoint, params, partitions } = plans.resolve(options);
          for (const { key, params: partition } of partitions) {
            report.nextPages[key] = options.startPage;
            for (
              let pageNo = options.startPage;
              pageNo < options.startPage + options.maxPages;
              pageNo++
            ) {
              const page = await api.page(endpoint, {
                ...params,
                ...partition,
                pageNo,
                numOfRows: options.pageSize,
              });
              // 일부 행만 받은 페이지를 완료로 처리하면 다음 배치에서 장소가 누락될 수 있다.
              assertCompletePage(page, options.pageSize, endpoint, pageNo);
              for (const item of page.items) {
                // 3. 목록 한 건을 기본 저장한 뒤, 요청한 경우에만 상세를 추가한다.
                report.fetched++;
                if (
                  /^\d+$/.test(String(item.contenttypeid)) &&
                  !CONTENT_TYPES.includes(Number(item.contenttypeid))
                ) {
                  report.ignored++;
                  continue;
                }
                try {
                  await context.ensureDistrict(item);
                  const saved = await places.save(
                    item,
                    {
                      [endpoint]: {
                        fetched_at: new Date().toISOString(),
                        items: [item],
                        source_url: page.sourceUrl,
                      },
                    },
                    refs,
                  );
                  report[saved.status]++;
                  if (!options.listOnly && String(item.showflag) !== '0')
                    await enrich(item);
                } catch (error) {
                  if (!(error instanceof MappingError)) throw error;
                  report.skipped++;
                  if (report.issues.length < 20)
                    report.issues.push({
                      contentId: text(item.contentid),
                      code: 'INVALID_PLACE',
                    });
                }
              }
              const more = pageNo * options.pageSize < page.totalCount;
              report.nextPages[key] = more ? pageNo + 1 : null;
              if (!more) break;
            }
          }
        },
      );
      report.status = 'completed';
    } catch (error) {
      report.status = 'failed';
      report.error =
        error instanceof TourApiError || error instanceof TourStoreError
          ? error.message
          : error instanceof MappingError
            ? 'TourAPI reference mapping failed'
            : 'Tour ingestion failed';
    }
    // 4. 전체 HTTP 시도 수와 종료 시각을 넣고 성공 보고서 또는 부분 실패를 반환한다.
    report.apiRequests = api.requests;
    report.finishedAt = new Date().toISOString();
    if (report.status === 'failed') throw new IngestionRunError(report);
    return report;
  }
}
