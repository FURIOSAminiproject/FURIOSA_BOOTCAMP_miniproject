/**
 * 명령행 진입점. 옵션 확인 → Nest 연결 → 장소 수집 → 결과 출력/연결 정리 순서로 읽는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { TourIngestionModule } from './tour-ingestion.module';
import {
  TourIngestionService,
  IngestionRunError,
} from './tour-ingestion.service';
import { parseIngestionOptions } from './tour-ingestion.options';
import { TourApiError, tourConfig } from './tour-api.client';

/**
 * 명령행에서 장소 수집을 실행하고 종료 시 연결을 정리한다.
 *
 * 입력: args: 실행 인자 배열. 생략하면 process.argv의 프로그램 이름 다음 인자를 사용한다.
 * @returns 종료 후 Promise<void>. 결과 보고서는 표준 출력으로 기록한다.
 * @example
 * await main(["--mode", "initial", "--max-pages", "1", "--list-only"]);
 *
 * --help는 안내만 출력한다. 실제 수집은 외부 API와 DB를 사용하며 finally에서 앱을 닫는다.
 */
export async function main(args = process.argv.slice(2)): Promise<void> {
  if (args.length === 1 && args[0] === '--help') {
    console.log(
      'tour:ingest -- <local|dev|prod> [--mode initial|sync|festivals|detail|reference] [--region 26] [--district 380] [--content-type 12] [--page-size 20] [--max-pages 1] [--start-page 1] [--list-only] [--modified-since YYYYMMDD] [--content-id ID] [--event-start YYYYMMDD] [--event-end YYYYMMDD]',
    );
    return;
  }
  const options = parseIngestionOptions(args);
  // DB 연결 전에 API 인증 설정부터 확인해 잘못된 설정을 먼저 알린다.
  tourConfig(process.env);
  const app = await NestFactory.createApplicationContext(TourIngestionModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    console.log(
      JSON.stringify(await app.get(TourIngestionService).run(options)),
    );
  } finally {
    await app.close();
  }
}

main().catch(
  /**
   * CLI 최상위 오류를 안전하게 출력하고 실패 종료 상태를 설정한다.
   *
   * 입력: error: main()에서 거절된 예외.
   * @returns void. process.exitCode=1과 표준 오류 출력을 남긴다.
   * @example
   * // 잘못된 --mode → 오류 안내 출력 후 종료 코드 1
   */
  (error: unknown) => {
    if (error instanceof IngestionRunError)
      console.error(JSON.stringify(error.report));
    else if (error instanceof TourApiError) console.error(error.message);
    else if (
      error instanceof Error &&
      /^(Invalid|Unsupported|Dates must|sync requires|detail requires|festivals requires|--)/.test(
        error.message,
      )
    )
      console.error(error.message);
    else
      console.error(
        'Tour ingestion could not start. Check database configuration, schema v2 and environment settings.',
      );
    process.exitCode = 1;
  },
);
