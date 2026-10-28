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
export async function fetchWeatherPrediction(destination: WeatherDestination, start: string, end: string, signal?: AbortSignal): Promise<WeatherPredictionReport> {
  const dates = weatherDates(start, end);
  if (!destination.name.trim() || !Number.isFinite(destination.latitude) || Math.abs(destination.latitude) > 90 || !Number.isFinite(destination.longitude) || Math.abs(destination.longitude) > 180) throw new Error('날씨를 조회할 도착지 좌표를 선택해 주세요.');
  const response = await fetch('/fastapi/api/v1/weather/predict/request', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination_name: destination.name, latitude: destination.latitude, longitude: destination.longitude, target_dates: dates }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(180000)]) : AbortSignal.timeout(180000),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error('이 지역의 학습 모델이 준비되지 않아 예측을 제공할 수 없습니다.');
    if (response.status === 422) throw new Error('선택한 지역·날짜는 모델에서 예측할 수 없습니다. 날짜와 모델 지원 범위를 확인해 주세요.');
    throw new Error('기상 예측 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  return parseWeatherPrediction(await response.json(), destination.name, dates);
}
