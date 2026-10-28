import React from 'react';
import type { WeatherPredictionReport } from '../services/weatherPredictionService';
export function ModelWeatherPanel({ report, loading, error, retry }: { report: WeatherPredictionReport | null; loading: boolean; error: string; retry: () => void }) {
  const number = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  return <section aria-label="학습 모델 기상 예측" className="rounded-2xl border border-emerald-200 bg-white p-5 sm:p-6 space-y-4">
    <h3 className="text-lg font-bold text-emerald-950">여행 기간의 모델 기상 예측</h3>
    {loading ? <p role="status">학습 모델의 실제 예측 결과를 불러오는 중입니다…</p> : error ? <div role="alert" className="space-y-3 text-sm text-red-800"><p>{error}</p><p>확인되지 않은 날씨값으로 대체하지 않습니다.</p><button type="button" onClick={retry} className="rounded-lg border px-3 py-2">다시 시도</button></div> : report ? <>
      <p className="text-sm text-stone-600">{report.destination} · 사용 모델 지역: {report.localityName}</p>
      <p className="text-xs text-stone-500">학습 모델의 추정치이며 실시간 관측·공식 예보가 아닙니다. 실제 방문 전 공식 예보를 확인해 주세요.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap"><thead><tr className="border-b"><th className="p-2">날짜</th><th className="p-2">평균 기온</th><th className="p-2">최저 / 최고</th><th className="p-2">일 강수량</th><th className="p-2">평균 풍속</th></tr></thead><tbody>{report.dailyForecast.map(day => <tr key={day.date} className="border-b border-stone-100"><td className="p-2">{day.date}</td><td className="p-2">{number(day.avgTemp)}℃</td><td className="p-2">{number(day.minTemp)} / {number(day.maxTemp)}℃</td><td className="p-2">{number(day.rainfallMm)} mm</td><td className="p-2">{number(day.windSpeed)} m/s</td></tr>)}</tbody></table></div>
      <p className="text-xs text-stone-500">모델이 제공하지 않는 강수확률·습도·자외선·신뢰도·10년 편차는 표시하지 않습니다. 조회 시각: {new Date(report.fetchedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
    </> : <p className="text-sm text-stone-600">도착지와 여행 날짜를 선택하면 실제 예측을 조회합니다.</p>}
  </section>;
}
