/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ENSEMBLE_MODELS,
  computeEnsemblePrediction,
  EnsemblePredictionResult
} from '../../services/weatherStudioService';
import { Layers, Sliders, TrendingUp, ShieldCheck, Sparkles, Check, RefreshCw, Info, HelpCircle } from 'lucide-react';

export const EnsembleModelLab: React.FC = () => {
  const [selectedDestination, setSelectedDestination] = useState('제주');
  const [weights, setWeights] = useState<{ [id: string]: number }>({
    kma_10yr: 0.35,
    bi_lstm: 0.35,
    xgboost: 0.15,
    aws_kalman: 0.15
  });

  const ensembleResult: EnsemblePredictionResult = computeEnsemblePrediction(
    weights,
    selectedDestination,
    5
  );

  const handleWeightChange = (modelId: string, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [modelId]: val
    }));
  };

  const handleResetEqualWeights = () => {
    setWeights({
      kma_10yr: 0.25,
      bi_lstm: 0.25,
      xgboost: 0.25,
      aws_kalman: 0.25
    });
  };

  const handleResetProductionWeights = () => {
    setWeights({
      kma_10yr: 0.35,
      bi_lstm: 0.35,
      xgboost: 0.15,
      aws_kalman: 0.15
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>학생을 위한 딥러닝 시각화 2</span>
          </div>
          <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <span>4-종 앙상블(Ensemble) 융합 &amp; 오차 분산 감소 실험실</span>
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            통계 모델, Bi-LSTM 신경망, XGBoost 머신러닝, 실시간 센서 칼만 필터를 최적 가중치로 결합하여 예측 오차를 상쇄시키는 원리를 탐구합니다.
          </p>
        </div>

        {/* Destination Selector & Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            className="text-xs sm:text-sm font-semibold bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800"
          >
            <option value="제주">제주도 (해양성 온화 기후)</option>
            <option value="강릉">강릉·속초 (영동 푄 현상 기후)</option>
            <option value="경주">경주 (내륙 분지 큰 일교차)</option>
            <option value="부산">부산 (해안 온난 기후)</option>
            <option value="전주">전주 (전통 분지형 온대)</option>
          </select>

          <button
            onClick={handleResetProductionWeights}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-all"
            title="길벗 AI 실제 서비스 기본 가중치 적용"
          >
            앱 기본 가중치
          </button>
        </div>
      </div>

      {/* Ensemble Blended Key Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-stone-900 via-stone-850 to-emerald-950 p-5 rounded-2xl text-white">
        <div className="space-y-0.5">
          <span className="text-[11px] text-stone-400">앙상블 융합 예측 기온</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {ensembleResult.ensembleBlendedTemp}℃
          </div>
          <span className="text-[10px] text-stone-400">평년 기준 {ensembleResult.regionalBaseline}℃ 대비</span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[11px] text-stone-400">예측 체감 온도</span>
          <div className="text-2xl font-bold font-mono text-sky-400">
            {ensembleResult.feelsLikeTemp}℃
          </div>
          <span className="text-[10px] text-stone-400">풍속 3.8m/s 감쇄 보정</span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[11px] text-stone-400">앙상블 오차 분산 감소율</span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            +{ensembleResult.varianceReductionPct}%
          </div>
          <span className="text-[10px] text-stone-400">단일 모델 대비 분산 절감</span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[11px] text-stone-400">일교차 상태 경보</span>
          <div className="text-base font-bold text-rose-300 truncate">
            {ensembleResult.diurnalRangePredicted}℃
          </div>
          <span className="text-[10px] text-emerald-300 font-medium truncate block">
            {ensembleResult.advisoryTag.split('(')[0]}
          </span>
        </div>
      </div>

      {/* 4 Models Sliders and Visual Composition */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-stone-700">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-700" />
            <span>4대 독립 모델 가중치 배분 (Weight Blending Sliders):</span>
          </span>
          <span className="text-[11px] text-stone-500 font-mono">
            정규화 공식: w_i = W_i / ∑ W_k (총합 100%)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ENSEMBLE_MODELS.map((model) => {
            const pred = ensembleResult.individualPredictions.find((p) => p.modelId === model.id);
            const wVal = weights[model.id] ?? 0.25;
            const normW = pred ? pred.weight : 0.25;

            return (
              <div
                key={model.id}
                className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-3 hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        model.type === 'DEEP_LEARNING'
                          ? 'bg-sky-100 text-sky-800'
                          : model.type === 'STATISTICAL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : model.type === 'TREE_BASED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-violet-100 text-violet-800'
                      }`}
                    >
                      {model.type}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 mt-1">
                      {model.name}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-2 py-1 rounded border border-stone-200 shadow-2xs">
                      {pred?.predictedTemp}℃
                    </span>
                    <span className="block text-[10px] text-stone-400 mt-0.5">
                      가중치 {Math.round(normW * 100)}%
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-600 line-clamp-2">
                  {model.principle}
                </p>

                {/* Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-stone-700">
                    <span>모델 기여도 비중 (Weight Parameter):</span>
                    <span className="font-mono text-emerald-800 font-bold">
                      {(normW * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={wVal}
                    onChange={(e) => handleWeightChange(model.id, parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                {/* Mathematical Formulation Tag */}
                <div className="bg-white p-2 rounded-lg border border-stone-200/70 text-[10px] font-mono text-stone-600 overflow-x-auto">
                  {model.formula}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Educational Theory Card: Why Ensemble Works */}
      <div className="bg-emerald-50/60 rounded-2xl p-5 border border-emerald-200/80 space-y-3 text-xs leading-relaxed text-stone-700">
        <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          <span>학생을 위한 앙상블 오차 상쇄 수학 원리 (Mathematical Proof of Variance Reduction)</span>
        </div>
        <p>
          서로 다른 4개 모델의 오차가 통계적으로 완벽히 동일하지 않고 독립적(공분산 Cov ≈ 0)이라고 가정하면, 앙상블의 전체 예측 분산은 각 모델 분산의 가중 제곱합으로 줄어듭니다:
        </p>
        <div className="p-3 bg-white rounded-xl border border-emerald-200 font-mono text-emerald-950 text-center text-xs">
          Var(Y_ensemble) = ∑ (w_i)^2 · Var(M_i) &lt; min( Var(M_1), Var(M_2), Var(M_3), Var(M_4) )
        </div>
        <p>
          즉, 가중치를 4개 모델에 골고루 분산시킬수록 <strong>개별 모델 하나만 사용할 때보다 오차 분산이 최대 60% 이상 격감</strong>하게 됩니다. 이것이 길벗 AI 여행사가 단일 딥러닝 모델만 믿지 않고 앙상블 시스템을 구축한 핵심 이유입니다.
        </p>
      </div>
    </div>
  );
};
