import { useEffect, useState } from 'react';
import { fetchWeatherPrediction, type WeatherDestination, type WeatherPredictionReport } from './weatherPredictionService';
interface State { key: string; report: WeatherPredictionReport | null; error: string; loading: boolean }
// Only validated model responses live in memory for five minutes. Old localStorage simulations are never read.
const cache = new Map<string, { report: WeatherPredictionReport; expires: number }>();
export function useWeatherPrediction(destination: WeatherDestination | null, start = '', end = '') {
  const key = destination ? JSON.stringify([destination.name, destination.latitude, destination.longitude, start, end]) : '';
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ key: '', report: null, error: '', loading: false });
  useEffect(() => {
    if (!destination) return;
    const controller = new AbortController();
    const stored = cache.get(key);
    if (stored && stored.expires > Date.now()) { setState({ key, report: stored.report, error: '', loading: false }); return; }
    setState({ key, report: null, error: '', loading: true });
    fetchWeatherPrediction(destination, start, end, controller.signal).then(report => {
      if (controller.signal.aborted) return;
      if (cache.size >= 20) cache.delete(cache.keys().next().value!);
      cache.set(key, { report, expires: Date.now() + 300000 });
      setState({ key, report, error: '', loading: false });
    }).catch(error => {
      if (controller.signal.aborted) return;
      setState({ key, report: null, error: error instanceof Error && error.name === 'TimeoutError' ? '모델 예측 요청 시간이 초과되었습니다. 다시 시도해 주세요.' : error instanceof Error ? error.message : '기상 예측을 조회하지 못했습니다.', loading: false });
    });
    return () => controller.abort();
  }, [key, attempt]);
  const current = key && state.key === key ? state : { report: null, error: '', loading: !!key };
  return { report: current.report, error: current.error, loading: current.loading, retry: () => { cache.delete(key); setAttempt(value => value + 1); } };
}
