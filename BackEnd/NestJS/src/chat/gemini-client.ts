import { GoogleGenAI } from '@google/genai';
import type { DataSource } from 'typeorm';
import { createAiTrace, diagnosticModel, type AiTrace } from './ai-diagnostics';
import { databaseDiagnostic } from '../routing-cache/routing.errors';

/** 채팅과 일정 큐레이션이 동일한 서버측 모델 설정을 사용한다. */
export async function configuredGeminiClient(
  dataSource?: Pick<DataSource, 'query'>,
  trace: AiTrace = createAiTrace('configuration'),
) {
  let apiKey = process.env.GEMINI_API_KEY;
  let rawModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  let keySource = 'environment';
  let modelSource = process.env.GEMINI_MODEL ? 'environment' : 'default';
  trace.emit('ai_configuration_started', {
    databaseConfigured: !!dataSource,
    environmentKeyPresent: !!apiKey?.trim(),
    environmentModelPresent: !!process.env.GEMINI_MODEL?.trim(),
  });
  if (dataSource) {
    for (const table of ['app_model_config', 'ai_model_config']) {
      const started = performance.now();
      try {
        const rows = await dataSource.query(
          `SELECT model_name, api_key FROM ${table} WHERE is_active = true AND provider = 'google' ORDER BY id DESC LIMIT 1`,
        );
        trace.emit('ai_configuration_lookup_completed', {
          table,
          durationMs: Math.round(performance.now() - started),
          activeRowFound: !!rows?.length,
          rowKeyPresent: !!String(rows?.[0]?.api_key ?? '').trim(),
          rowModelPresent: !!String(rows?.[0]?.model_name ?? '').trim(),
        });
        if (rows?.length) {
          if (rows[0].api_key) {
            apiKey = String(rows[0].api_key).trim();
            keySource = table;
          }
          if (rows[0].model_name) {
            rawModel = String(rows[0].model_name).trim();
            modelSource = table;
          }
          break;
        }
      } catch (error) {
        trace.emit(
          'ai_configuration_lookup_failed',
          {
            table,
            durationMs: Math.round(performance.now() - started),
            ...databaseDiagnostic(error, 'model_configuration_lookup'),
          },
          'warn',
        );
        // 설치된 DB 버전에 없는 설정 테이블은 건너뛴다.
      }
    }
  }
  const modelName = rawModel.toLowerCase().replace(/\s+/g, '-');
  trace.emit(
    'ai_configuration_resolved',
    {
      keySource,
      modelSource,
      keyPresent: !!apiKey?.trim(),
      model: diagnosticModel(modelName),
      timeoutMs: 30000,
    },
    apiKey ? 'log' : 'warn',
  );
  if (!apiKey) return null;
  return {
    ai: new GoogleGenAI({ apiKey, httpOptions: { timeout: 30000 } }),
    modelName,
  };
}
