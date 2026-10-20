/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CloudSun,
  Layers,
  Cpu,
  Database,
  Code,
  MessageSquare,
  BookOpen,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { LstmGateVisualizer } from './weatherStudio/LstmGateVisualizer';
import { EnsembleModelLab } from './weatherStudio/EnsembleModelLab';
import { WeatherDatasetExplorer } from './weatherStudio/WeatherDatasetExplorer';
import { WeatherCodeLab } from './weatherStudio/WeatherCodeLab';
import { WeatherTutorChat } from './weatherStudio/WeatherTutorChat';

interface WeatherTechStudioProps {
  onNavigateToRequest?: () => void;
  onNavigateToTransformerStudio?: () => void;
}

export const WeatherTechStudio: React.FC<WeatherTechStudioProps> = ({
  onNavigateToRequest,
  onNavigateToTransformerStudio
}) => {
  const [activeTab, setActiveTab] = useState<'THEORY' | 'LSTM' | 'ENSEMBLE' | 'DATASET' | 'CODE' | 'TUTOR'>('THEORY');

  return (
    <div className="space-y-10 pb-16">
      {/* 1. MASTER HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-stone-950 via-sky-950 to-teal-950 text-white p-6 sm:p-10 shadow-2xl border border-sky-900/60">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3.5 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-bold font-mono tracking-wide flex items-center gap-1.5">
              <CloudSun className="w-3.5 h-3.5" />
              <span>WEATHER DEEP LEARNING &amp; ENSEMBLE STUDIO v3.4</span>
            </span>
            <span className="px-3.5 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-semibold">
              기상청 10개년 ASOS 빅데이터 기반
            </span>
            {onNavigateToTransformerStudio && (
              <button
                onClick={onNavigateToTransformerStudio}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-stone-300 text-xs transition-colors flex items-center gap-1"
              >
                <span>트랜스포머 스튜디오로 전환</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-serif text-white leading-tight">
              기상예보 기술 분석 스튜디오 (Weather AI Lab)
            </h1>
            <p className="text-sm sm:text-base text-stone-200 leading-relaxed font-sans max-w-3xl">
              학생들이 인공지능의 시계열 처리 메커니즘을 한눈에 체득할 수 있도록, <strong>LSTM 장단기 메모리의 3대 게이트</strong>와 <strong>4-종 모델 앙상블(Ensemble) 융합 공학</strong>, 그리고 실제 여행 앱에 적용된 복장·준비물 자동화 파이프라인을 수학 수식과 코드 시뮬레이터로 상세히 해설합니다.
            </p>
          </div>

          {/* Quick Stat Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="text-xs text-stone-400">시계열 신경망</div>
              <div className="text-base sm:text-lg font-bold text-sky-400 font-mono mt-0.5">
                Bi-LSTM + Gates
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="text-xs text-stone-400">앙상블 블렌더</div>
              <div className="text-base sm:text-lg font-bold text-teal-400 font-mono mt-0.5">
                4-Model Bagging
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="text-xs text-stone-400">오차 분산 감소율</div>
              <div className="text-base sm:text-lg font-bold text-amber-400 font-mono mt-0.5">
                최대 -65% 절감
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="text-xs text-stone-400">실시간 센서 융합</div>
              <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">
                AWS Kalman Filter
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('THEORY')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === 'THEORY'
              ? 'bg-sky-800 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. 기상 AI 이론 &amp; 아키텍처</span>
        </button>

        <button
          onClick={() => setActiveTab('LSTM')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === 'LSTM'
              ? 'bg-sky-800 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>2. LSTM 게이트 시뮬레이터</span>
        </button>

        <button
          onClick={() => setActiveTab('ENSEMBLE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === 'ENSEMBLE'
              ? 'bg-sky-800 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3. 4-종 앙상블 융합 랩</span>
        </button>

        <button
          onClick={() => setActiveTab('DATASET')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === 'DATASET'
              ? 'bg-sky-800 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>4. 10개년 기상청 데이터셋 탐색</span>
        </button>

        <button
          onClick={() => setActiveTab('CODE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === 'CODE'
              ? 'bg-sky-800 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>5. PyTorch &amp; TS 소스코드 랩</span>
        </button>

        <button
          onClick={() => setActiveTab('TUTOR')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === 'TUTOR'
              ? 'bg-sky-800 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>6. 기상 AI 학생 튜터 Q&amp;A</span>
        </button>
      </div>

      {/* 3. TAB 1: THEORY & EDUCATIONAL ARCHITECTURE */}
      {activeTab === 'THEORY' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Section: Overview of Weather Forecasting AI */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
              <div>
                <span className="text-xs font-bold text-sky-800 uppercase tracking-widest font-mono">
                  METEOROLOGICAL MACHINE LEARNING
                </span>
                <h2 className="text-2xl font-extrabold text-stone-900 mt-1">
                  왜 기상예보에는 LSTM과 앙상블 딥러닝이 필수적인가?
                </h2>
              </div>
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-xs text-sky-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                <span>나비효과와 비선형 대기 방정식을 푸는 인공지능</span>
              </div>
            </div>

            <p className="text-stone-700 text-sm sm:text-base leading-relaxed">
              대기는 카오스(Chaos)적 특성을 지닌 복잡계로, 수학적 물리 방정식(나비에-스토크스 유체역학)만으로는 2~4주 뒤의 국지적 날씨를 완벽하게 예측하기 어렵습니다. 
              이를 극복하기 위해 <strong>길벗 AI 여행사</strong>는 지난 10년간(2015~2025) 대한민국 기상청(KMA)이 관측한 수천만 건의 시계열 빅데이터를 인공지능 신경망에 학습시켰습니다.
            </p>

            {/* Architecture Pipeline Cards */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider font-mono">
                기상예보 딥러닝 파이프라인 (Data to Packing List)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-700 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div className="text-xs font-bold text-stone-900">시계열 피처 전처리</div>
                  <p className="text-[11px] text-stone-600 leading-normal">
                    기온, 최고, 최저, 강수, 풍속, 습도, 기압 7개 다변량 시계열을 정규화 텐서로 변환
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div className="text-xs font-bold text-stone-900">양방향 LSTM 추론</div>
                  <p className="text-[11px] text-stone-600 leading-normal">
                    망각·입력·출력 게이트를 통해 과거 10년의 계절 주기성을 보존하며 비선형 추세 예측
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-700 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div className="text-xs font-bold text-stone-900">4-종 앙상블 블렌딩</div>
                  <p className="text-[11px] text-stone-600 leading-normal">
                    평년 통계, Bi-LSTM, XGBoost, 실시간 AWS 센서값을 최적 가중 결합하여 오차 분산 60% 상쇄
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div className="text-xs font-bold text-stone-900">스마트 짐싸기 연동</div>
                  <p className="text-[11px] text-stone-600 leading-normal">
                    일교차 9℃ 이상 시 겉옷 필수 경보, 우천 시 우산 등 지능형 복장·준비물 자동 큐레이션
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Major Pillars of the Weather AI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1: LSTM Gates */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center font-bold">
                  LSTM
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    1. LSTM 장단기 메모리 게이트
                  </h3>
                  <span className="text-xs text-stone-500 font-mono">Cell State &amp; 3 Gates</span>
                </div>
              </div>

              <div className="p-3 bg-stone-900 rounded-xl text-sky-400 font-mono text-xs text-center">
                C_t = f_t ⊙ C_{'{t-1}'} + i_t ⊙ ~C_t
              </div>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                일반 RNN과 달리 <strong>망각 게이트(지우개)</strong>와 <strong>입력 게이트(형광펜)</strong>를 갖추어, 일시적 노이즈를 걸러내고 장기 계절성만 덧셈 컨베이어 벨트(Cell State)에 실어 보냅니다.
              </p>
            </div>

            {/* Pillar 2: Ensemble Blending */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                  ENS
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    2. 4-종 모델 앙상블 블렌더
                  </h3>
                  <span className="text-xs text-stone-500 font-mono">Variance Reduction &amp; Bagging</span>
                </div>
              </div>

              <div className="p-3 bg-stone-900 rounded-xl text-teal-400 font-mono text-xs text-center">
                Y_ens = 0.35 M_1 + 0.35 M_2 + 0.15 M_3 + 0.15 M_4
              </div>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                통계 평년 모델, 딥러닝 Bi-LSTM, 머신러닝 XGBoost, 실시간 센서 칼만 필터를 최적 결합하여 <strong>단일 모델 사용 시 발생할 수 있는 이상치 오차를 수학적으로 상쇄</strong>합니다.
              </p>
            </div>

            {/* Pillar 3: Realtime Sensor Kalman Fusion */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  AWS
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    3. 실시간 관측망 칼만 보정
                  </h3>
                  <span className="text-xs text-stone-500 font-mono">Sensor Fusion &amp; Kalman Gain</span>
                </div>
              </div>

              <div className="p-3 bg-stone-900 rounded-xl text-amber-400 font-mono text-xs text-center">
                x_k = x_k^- + K_k (z_k - H x_k^-)
              </div>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                여행 당일 여행지의 실제 방재기상관측장비(AWS) 센서 값과 모델의 사전 예측값 간 오차를 측정하여, <strong>현재 체감 온도와 기온을 ±0.5℃ 이내로 정밀 보정</strong>합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: LSTM GATE VISUALIZER */}
      {activeTab === 'LSTM' && (
        <div className="animate-fadeIn">
          <LstmGateVisualizer />
        </div>
      )}

      {/* 5. TAB 3: ENSEMBLE MODEL LAB */}
      {activeTab === 'ENSEMBLE' && (
        <div className="animate-fadeIn">
          <EnsembleModelLab />
        </div>
      )}

      {/* 6. TAB 4: DATASET EXPLORER */}
      {activeTab === 'DATASET' && (
        <div className="animate-fadeIn">
          <WeatherDatasetExplorer />
        </div>
      )}

      {/* 7. TAB 5: SOURCE CODE LAB */}
      {activeTab === 'CODE' && (
        <div className="animate-fadeIn">
          <WeatherCodeLab />
        </div>
      )}

      {/* 8. TAB 6: TUTOR CHAT & FAQ */}
      {activeTab === 'TUTOR' && (
        <div className="animate-fadeIn">
          <WeatherTutorChat />
        </div>
      )}

      {/* Bottom CTA Card */}
      <div className="bg-gradient-to-r from-sky-950 via-teal-900 to-stone-900 text-white p-6 sm:p-8 rounded-3xl border border-sky-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-sky-400 font-mono tracking-wider">
            METEOROLOGICAL AI IN ACTION
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold">
            스튜디오에서 학습한 기상 예측 AI로 내 여행 일정을 준비해보세요!
          </h3>
          <p className="text-xs sm:text-sm text-stone-300">
            LSTM과 앙상블 모델이 여행지의 일교차와 강수확률을 실시간 분석하여 최적의 복장과 스마트 패킹 리스트를 챙겨드립니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onNavigateToRequest && (
            <button
              onClick={onNavigateToRequest}
              className="px-5 py-3 rounded-xl bg-white text-stone-900 font-extrabold text-xs sm:text-sm hover:bg-stone-100 shadow-md transition-all flex items-center gap-2"
            >
              <CloudSun className="w-4 h-4 text-sky-700" />
              <span>여행 일정 의뢰하기</span>
            </button>
          )}

          {onNavigateToTransformerStudio && (
            <button
              onClick={onNavigateToTransformerStudio}
              className="px-5 py-3 rounded-xl bg-sky-800 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm border border-sky-600 transition-all"
            >
              <span>트랜스포머 스튜디오 둘러보기</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
