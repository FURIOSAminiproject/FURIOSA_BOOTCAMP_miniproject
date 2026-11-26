/** Actual FastAPI model predictions only. No synthetic weather or persistent legacy cache. */
export interface DailyWeatherInference {
  date: string; avgTemp: number; minTemp: number; maxTemp: number;
  rainfallMm: number; windSpeed: number;
}
export interface WeatherPredictionReport {
  source: 'model-api'; destination: string; localityName: string;
  startDate: string; endDate: string; fetchedAt: string;
  dailyForecast: DailyWeatherInference[];
}
export interface WeatherDestination { name: string; latitude: number; longitude: number }
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function weatherDates(start: string, end: string): string[] {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end)) throw new Error('날씨를 조회할 여행 날짜를 선택해 주세요.');
  const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  if (days < 1 || days > 31) throw new Error('날씨 조회 기간은 1~31일이어야 합니다.');
  return Array.from({ length: days }, (_, i) => new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10));
}
export function parseWeatherPrediction(value: unknown, destination: string, dates: string[]): WeatherPredictionReport {
  const invalid = () => { throw new Error('모델 예측 응답이 올바르지 않습니다. 날씨를 표시하지 않습니다.'); };
  if (record(value) && value.status === 'request_validated') throw new Error('기상 API가 요청 검증만 제공하는 이전 버전입니다. 실제 모델 추론 서버를 최신 버전으로 배포해야 합니다.');
  if (!record(value) || value.status !== 'success' || typeof value.locality_name !== 'string' || !value.locality_name.trim() || !Array.isArray(value.forecasts) || value.forecasts.length !== dates.length) return invalid();
  const rows = new Map<string, DailyWeatherInference>();
  for (const item of value.forecasts) {
    if (!record(item) || typeof item.target_date !== 'string' || !dates.includes(item.target_date) || rows.has(item.target_date)) return invalid();
    for (const field of ['TA_AVG', 'TA_MIN', 'TA_MAX', 'RN_DAY', 'WS_AVG']) if (typeof item[field] !== 'number' || !Number.isFinite(item[field])) return invalid();
    const avg = item.TA_AVG as number, min = item.TA_MIN as number, max = item.TA_MAX as number;
    const rain = item.RN_DAY as number, wind = item.WS_AVG as number;
    if (min > max || avg < min || avg > max || rain < 0 || wind < 0) return invalid();
    rows.set(item.target_date, { date: item.target_date, avgTemp: avg, minTemp: min, maxTemp: max, rainfallMm: rain, windSpeed: wind });
  }
  return { source: 'model-api', destination, localityName: value.locality_name, startDate: dates[0], endDate: dates.at(-1)!, fetchedAt: new Date().toISOString(), dailyForecast: dates.map(date => rows.get(date)!) };
}
/** 서버의 검증 오류만 읽는다. 경로·접속 정보 등이 포함될 수 있는 임의 오류 원문은 표시하지 않는다. */
async function predictionError(response: Response): Promise<Error> {
  let body: unknown;
  try { body = await response.json(); } catch { /* JSON이 아닌 프록시 오류도 처리한다. */ }
  const detail = record(body) ? body.detail : undefined;
  if (response.status === 422) {
    if (Array.isArray(detail)) {
      const errors = detail.filter(record);
      const hasOldLocalityRequirement = errors.some(error => error.type === 'missing' && Array.isArray(error.loc) && error.loc.length === 2 && error.loc[0] === 'body' && error.loc[1] === 'locality_name');
      const rejectsDestination = errors.some(error => error.type === 'extra_forbidden' && Array.isArray(error.loc) && error.loc[0] === 'body' && ['destination_name', 'latitude', 'longitude'].includes(String(error.loc[1])));
      if (hasOldLocalityRequirement || rejectsDestination) return new Error('운영 기상 API가 목적지 자동 매핑을 지원하지 않는 이전 버전입니다. FastAPI를 최신 버전으로 배포해야 합니다.');
      const labels: Record<string, string> = { target_dates: '여행 날짜', destination_name: '목적지 이름', latitude: '위도', longitude: '경도', locality_name: '모델 지역명' };
      const fields = [...new Set(errors.flatMap(error => Array.isArray(error.loc) && error.loc[0] === 'body' && labels[String(error.loc[1])] ? [labels[String(error.loc[1])]] : []))];
      return new Error(fields.length ? '기상 예측 요청의 '+fields.join('·')+' 형식이 올바르지 않습니다.' : '기상 예측 요청 형식이 서버 API와 맞지 않습니다.');
    }
    if (typeof detail === 'string') {
      const dateError = detail.match(/^(\d{4}-\d{2}-\d{2})는 마지막 관측일 (\d{4}-\d{2}-\d{2}) 이후여야 합니다\.$/);
      if (dateError) return new Error('요청 날짜 '+dateError[1]+'는 모델의 마지막 관측일 '+dateError[2]+' 이후여야 합니다.');
      if (detail === '학습 당시와 CSV의 입력 컬럼이 다릅니다.' || detail === '학습 당시와 CSV의 타깃 컬럼이 다릅니다.' || detail === 'CSV의 마지막 관측일이 모델 메타데이터와 다릅니다.') return new Error('서버의 학습 모델과 기상 데이터셋이 일치하지 않습니다. 서버의 모델·데이터 구성을 확인해야 합니다.');
    }
    return new Error('기상 예측 요청을 처리하지 못했습니다. 서버의 요청 형식과 모델·데이터 설정을 확인해야 합니다.');
  }
  if (response.status === 404) return new Error('기상 예측 API 또는 해당 지역의 학습 모델을 찾을 수 없습니다. 서버 배포와 모델 등록 상태를 확인해야 합니다.');
  return new Error('기상 예측 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
}
export async function fetchWeatherPrediction(destination: WeatherDestination, start: string, end: string, signal?: AbortSignal): Promise<WeatherPredictionReport> {
  const dates = weatherDates(start, end);
  if (!destination.name.trim() || !Number.isFinite(destination.latitude) || Math.abs(destination.latitude) > 90 || !Number.isFinite(destination.longitude) || Math.abs(destination.longitude) > 180) throw new Error('날씨를 조회할 도착지 좌표를 선택해 주세요.');
  const response = await fetch('/fastapi/api/v1/weather/predict/request', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination_name: destination.name, latitude: destination.latitude, longitude: destination.longitude, target_dates: dates }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(180000)]) : AbortSignal.timeout(180000),
  });
  if (!response.ok) throw await predictionError(response);
  return parseWeatherPrediction(await response.json(), destination.name, dates);
}
