import React from 'react';
/** Legacy demo entry: synthetic forecasts were removed. Use the coordinate-based real model panel. */
export function WeatherPredictionWidget(_props: { initialDestination?: string; initialStartDate?: string; initialEndDate?: string; onApplyToTripRequest?: (dest: string, start: string, end: string) => void }) {
  return <section className="rounded-2xl border bg-white p-5" role="status">여행 계획 화면에서 도착지와 날짜를 선택하면 실제 학습 모델의 예측을 조회할 수 있습니다.</section>;
}
