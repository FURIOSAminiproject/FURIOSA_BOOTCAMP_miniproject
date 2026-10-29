import React from 'react';
import { X } from 'lucide-react';
import type { SearchPlace } from '../services/route-explorer';
import { useWeatherPrediction } from '../services/useWeatherPrediction';
import { ModelWeatherPanel } from './ModelWeatherPanel';
export function DestinationWeatherPreviewModal({ isOpen, onClose, destination, startDate, endDate }: { isOpen: boolean; onClose: () => void; destination: SearchPlace | null; startDate?: string; endDate?: string }) {
  const weather = useWeatherPrediction(isOpen ? destination : null, startDate, endDate);
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="실제 모델 기상 예측" className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4" onClick={event => event.stopPropagation()}>
      <button type="button" onClick={onClose} aria-label="닫기" className="ml-auto mb-3 block rounded-lg p-2"><X /></button><ModelWeatherPanel {...weather} />
    </div>
  </div>;
}
