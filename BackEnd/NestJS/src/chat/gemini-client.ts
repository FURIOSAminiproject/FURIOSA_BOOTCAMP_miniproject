import { GoogleGenAI } from '@google/genai';
import type { DataSource } from 'typeorm';

/** 채팅과 일정 큐레이션이 동일한 서버측 모델 설정을 사용한다. */
export async function configuredGeminiClient(
  dataSource?: Pick<DataSource, 'query'>,
) {
  let apiKey = process.env.GEMINI_API_KEY;
  let rawModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  if (dataSource) {
    for (const table of ['app_model_config', 'ai_model_config']) {
      try {
        const rows = await dataSource.query(
          `SELECT model_name, api_key FROM ${table} WHERE is_active = true AND provider = 'google' ORDER BY id DESC LIMIT 1`,
        );
        if (rows?.length) {
          if (rows[0].api_key) apiKey = String(rows[0].api_key).trim();
          if (rows[0].model_name) rawModel = String(rows[0].model_name).trim();
          break;
        }
      } catch {
        // 설치된 DB 버전에 없는 설정 테이블은 건너뛴다.
      }
    }
  }
  if (!apiKey) return null;
  return {
    ai: new GoogleGenAI({ apiKey, httpOptions: { timeout: 30000 } }),
    modelName: rawModel.toLowerCase().replace(/\s+/g, '-'),
  };
}
