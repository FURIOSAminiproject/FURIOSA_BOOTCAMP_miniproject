/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { simulateLstmCell, LstmGateCalculationResult } from '../../services/weatherStudioService';
import { Sliders, Cpu, Activity, Sparkles, HelpCircle, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';

export const LstmGateVisualizer: React.FC = () => {
  const [xtInput, setXtInput] = useState<number>(0.8); // 오늘 관측된 기온 변칙치
  const [htPrevInput, setHtPrevInput] = useState<number>(0.3); // 전날 기억
  const [ctPrevInput, setCtPrevInput] = useState<number>(0.5); // 10년치 장기 셀 상태
  const [selectedGate, setSelectedGate] = useState<'FORGET' | 'INPUT' | 'CELL' | 'OUTPUT'>('FORGET');

  const simResult: LstmGateCalculationResult = simulateLstmCell(xtInput, htPrevInput, ctPrevInput, 18.5);

  const handleResetDefaults = () => {
    setXtInput(0.8);
    setHtPrevInput(0.3);
    setCtPrevInput(0.5);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold mb-2">
            <Cpu className="w-3.5 h-3.5 text-sky-600" />
            <span>학생을 위한 딥러닝 시각화 1</span>
          </div>
          <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <span>LSTM 내부 게이트(Gates) &amp; 셀 상태(Cell State) 인터랙티브 시뮬레이터</span>
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            망각 게이트(지우개), 입력 게이트(형광펜), 셀 상태(컨베이어 벨트), 출력 게이트의 수식과 텐서 흐름을 직접 조작하며 체득합니다.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all border border-stone-200 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>기본 파라미터 복원</span>
        </button>
      </div>

      {/* Student Interactive Sliders for Input State */}
      <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/80 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-stone-800 border-b border-stone-200/60 pb-2">
          <span className="flex items-center gap-1.5 text-[#064e43]">
            <Sliders className="w-4 h-4" />
            <span>학생 실험실: 기상 관측 입력값 실시간 조절</span>
          </span>
          <span className="text-[11px] text-stone-500 font-normal">슬라이더를 움직여 게이트 반응을 관찰하세요</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slider 1: Today Input xt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-stone-700">오늘 관측 변칙치 (x_t):</span>
              <span className="font-mono text-sky-700 font-bold bg-sky-100 px-2 py-0.5 rounded">
                {xtInput > 0 ? `+${xtInput.toFixed(2)}` : xtInput.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-2.0"
              max="2.0"
              step="0.05"
              value={xtInput}
              onChange={(e) => setXtInput(parseFloat(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>-2.0 (기습 한파/저온)</span>
              <span>0.0 (평년)</span>
              <span>+2.0 (이상 고온)</span>
            </div>
          </div>

          {/* Slider 2: Yesterday Hidden ht-1 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-stone-700">전날 단기 기억 (h_t-1):</span>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                {htPrevInput.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={htPrevInput}
              onChange={(e) => setHtPrevInput(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>-1.0 (어제 하강세)</span>
              <span>0.0 (중립)</span>
              <span>+1.0 (어제 상승세)</span>
            </div>
          </div>

          {/* Slider 3: Long-term Cell ct-1 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-stone-700">10년치 장기 셀 상태 (C_t-1):</span>
              <span className="font-mono text-violet-700 font-bold bg-violet-100 px-2 py-0.5 rounded">
                {ctPrevInput.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={ctPrevInput}
              onChange={(e) => setCtPrevInput(parseFloat(e.target.value))}
              className="w-full accent-violet-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>-1.0 (장기 한랭 주기)</span>
              <span>0.0 (보통)</span>
              <span>+1.0 (온난화 주기)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Gates Visual Flow Pipeline */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-sky-600" />
          <span>LSTM 4대 연산 블록 상세 탐색 (클릭 시 세부 수식 및 학생 해설 표시):</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Gate 1: Forget */}
          <button
            onClick={() => setSelectedGate('FORGET')}
            className={`p-4 rounded-2xl text-left border transition-all ${
              selectedGate === 'FORGET'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase font-mono">1. 망각 게이트</span>
              <span className="text-xs font-mono font-extrabold text-rose-900 bg-rose-200/80 px-2 py-0.5 rounded">
                f_t = {simResult.forgetGateSigma.toFixed(3)}
              </span>
            </div>
            <div className="text-xs font-bold text-stone-900 mt-2">지우개 역할 (Forget)</div>
            <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
              과거 기후 중 불필요한 일시적 노이즈를 잊어버리는 비율 ({Math.round(simResult.forgetGateSigma * 100)}% 보존)
            </p>
          </button>

          {/* Gate 2: Input */}
          <button
            onClick={() => setSelectedGate('INPUT')}
            className={`p-4 rounded-2xl text-left border transition-all ${
              selectedGate === 'INPUT'
                ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-500/20 shadow-xs'
                : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-800 uppercase font-mono">2. 입력 게이트</span>
              <span className="text-xs font-mono font-extrabold text-sky-900 bg-sky-200/80 px-2 py-0.5 rounded">
                i_t = {simResult.inputGateSigma.toFixed(3)}
              </span>
            </div>
            <div className="text-xs font-bold text-stone-900 mt-2">형광펜 역할 (Input)</div>
            <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
              오늘의 새 관측값 중 장기 기억으로 저장할 핵심 비중 ({Math.round(simResult.inputGateSigma * 100)}% 반영)
            </p>
          </button>

          {/* Gate 3: Cell Update */}
          <button
            onClick={() => setSelectedGate('CELL')}
            className={`p-4 rounded-2xl text-left border transition-all ${
              selectedGate === 'CELL'
                ? 'bg-violet-50 border-violet-400 ring-2 ring-violet-500/20 shadow-xs'
                : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-violet-800 uppercase font-mono">3. 셀 상태 갱신</span>
              <span className="text-xs font-mono font-extrabold text-violet-900 bg-violet-200/80 px-2 py-0.5 rounded">
                C_t = {simResult.ctNew.toFixed(3)}
              </span>
            </div>
            <div className="text-xs font-bold text-stone-900 mt-2">컨베이어 벨트 (Cell State)</div>
            <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
              망각된 과거 + 가중된 새 정보가 더해진 10년 기후 기억 본체
            </p>
          </button>

          {/* Gate 4: Output */}
          <button
            onClick={() => setSelectedGate('OUTPUT')}
            className={`p-4 rounded-2xl text-left border transition-all ${
              selectedGate === 'OUTPUT'
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase font-mono">4. 출력 &amp; 은닉</span>
              <span className="text-xs font-mono font-extrabold text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded">
                h_t = {simResult.htNew.toFixed(3)}
              </span>
            </div>
            <div className="text-xs font-bold text-stone-900 mt-2">최종 답안 (Prediction)</div>
            <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
              여행자에게 알려줄 최종 예측 기온 {simResult.predictedTemp}℃ 도출
            </p>
          </button>
        </div>
      </div>

      {/* Selected Gate Deep Dive & Mathematical Circuit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Math Equation & Step Breakdown */}
        <div className="lg:col-span-7 bg-stone-900 text-stone-100 rounded-2xl p-5 border border-stone-800 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3 text-xs">
            <span className="font-bold text-sky-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              <span>
                {selectedGate === 'FORGET' && '망각 게이트 f_t 수학 연산 회로'}
                {selectedGate === 'INPUT' && '입력 게이트 i_t 및 후보 메모리 ~C_t 연산'}
                {selectedGate === 'CELL' && '셀 상태 갱신 C_t 컨베이어 벨트 연산'}
                {selectedGate === 'OUTPUT' && '출력 게이트 o_t 및 은닉 상태 h_t 연산'}
              </span>
            </span>
            <span className="font-mono text-stone-400 text-[11px]">Real-time Tensor Math</span>
          </div>

          {selectedGate === 'FORGET' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-rose-300">
                f_t = σ( W_f · x_t + U_f · h_(t-1) + b_f )
              </div>
              <div className="bg-stone-950/80 p-3.5 rounded-xl space-y-1.5 text-stone-300 text-[11px] border border-stone-800">
                <div className="text-stone-400">// 1. 선형 결합 (Linear Combination)</div>
                <div>linear = (0.85 × {xtInput.toFixed(2)}) + (0.45 × {htPrevInput.toFixed(2)}) + 0.2 = <span className="text-white font-bold">{simResult.forgetGateRaw}</span></div>
                <div className="text-stone-400 pt-1">// 2. 시그모이드 활성화 함수 (0과 1 사이로 압축)</div>
                <div>σ({simResult.forgetGateRaw}) = 1 / (1 + exp(-{simResult.forgetGateRaw})) = <span className="text-rose-400 font-bold">{simResult.forgetGateSigma}</span></div>
              </div>
            </div>
          )}

          {selectedGate === 'INPUT' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-sky-300">
                i_t = σ( W_i · x_t + U_i · h_(t-1) + b_i ), &nbsp; ~C_t = tanh( W_c · x_t + U_c · h_(t-1) + b_c )
              </div>
              <div className="bg-stone-950/80 p-3.5 rounded-xl space-y-1.5 text-stone-300 text-[11px] border border-stone-800">
                <div className="text-stone-400">// 1. 새 정보 통과 확률 (Input Gate)</div>
                <div>i_t = σ({simResult.inputGateRaw}) = <span className="text-sky-400 font-bold">{simResult.inputGateSigma}</span></div>
                <div className="text-stone-400 pt-1">// 2. 새 기억 후보군 (Candidate Memory Cell, tanh ∈ (-1, 1))</div>
                <div>~C_t = tanh({simResult.candidateCellRaw}) = <span className="text-amber-400 font-bold">{simResult.candidateCellTanh}</span></div>
              </div>
            </div>
          )}

          {selectedGate === 'CELL' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-violet-300">
                C_t = f_t ⊙ C_(t-1) + i_t ⊙ ~C_t
              </div>
              <div className="bg-stone-950/80 p-3.5 rounded-xl space-y-1.5 text-stone-300 text-[11px] border border-stone-800">
                <div className="text-stone-400">// 1. 보존된 과거 기억 (f_t × C_prev)</div>
                <div>forget_term = {simResult.forgetGateSigma} × {ctPrevInput.toFixed(2)} = <span className="text-rose-300 font-bold">{simResult.forgetContribution}</span></div>
                <div className="text-stone-400 pt-1">// 2. 추가된 새 기억 (i_t × ~C_t)</div>
                <div>input_term = {simResult.inputGateSigma} × {simResult.candidateCellTanh} = <span className="text-sky-300 font-bold">{simResult.inputContribution}</span></div>
                <div className="text-stone-400 pt-1">// 3. 셀 상태 최종 합성 (컨베이어 벨트 덧셈)</div>
                <div className="text-violet-400 font-bold">C_t = {simResult.forgetContribution} + ({simResult.inputContribution}) = {simResult.ctNew}</div>
              </div>
            </div>
          )}

          {selectedGate === 'OUTPUT' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-emerald-300">
                o_t = σ( W_o · x_t + U_o · h_(t-1) + b_o ), &nbsp; h_t = o_t ⊙ tanh( C_t )
              </div>
              <div className="bg-stone-950/80 p-3.5 rounded-xl space-y-1.5 text-stone-300 text-[11px] border border-stone-800">
                <div className="text-stone-400">// 1. 출력 필터 게이트 (Output Gate)</div>
                <div>o_t = σ({simResult.outputGateRaw}) = <span className="text-emerald-400 font-bold">{simResult.outputGateSigma}</span></div>
                <div className="text-stone-400 pt-1">// 2. 최종 은닉 상태 벡터 (Hidden State)</div>
                <div>h_t = {simResult.outputGateSigma} × tanh({simResult.ctNew}) = <span className="text-amber-300 font-bold">{simResult.htNew}</span></div>
              </div>
            </div>
          )}

          <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-[11px] text-stone-300 flex items-center justify-between">
            <span>🔥 최종 물리 기온 환산 식: T_pred = T_base(18.5℃) + (h_t × 6.5)</span>
            <span className="text-emerald-400 font-bold font-mono text-sm">{simResult.predictedTemp}℃</span>
          </div>
        </div>

        {/* Student Educational Commentary Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950/40 via-stone-900 to-stone-950 text-white rounded-2xl p-5 border border-emerald-800/60 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              <span>학생을 위한 직관적 원리 해설</span>
            </span>
            <span className="text-[10px] text-stone-400 font-mono">기상지기 교육 랩</span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-stone-300">
            {selectedGate === 'FORGET' && (
              <>
                <div className="font-bold text-white text-sm">💡 왜 망각 게이트가 필수적인가요?</div>
                <p>
                  기존의 기본 RNN은 과거의 모든 날씨 정보를 무조건 곱셈으로 누적시켰습니다. 그 결과 수개월 전의 봄비나 일시적인 미세먼지 수치까지 계속 쌓여 정작 중요한 계절적 주기성을 왜곡했습니다.
                </p>
                <p className="text-emerald-300">
                  망각 게이트는 시그모이드 함수를 통해 0(완전 삭제)부터 1(완전 기억) 사이의 가중치를 부여함으로써, 일시적 노이즈를 스스로 걸러내는 지능형 지우개 역할을 수행합니다.
                </p>
              </>
            )}

            {selectedGate === 'INPUT' && (
              <>
                <div className="font-bold text-white text-sm">💡 입력 게이트와 tanh의 2중 구조란?</div>
                <p>
                  입력 게이트는 <strong>'무엇을 기억할 것인가(i_t)'</strong>와 <strong>'얼마나 강하게 기억할 것인가(~C_t)'</strong>를 분리합니다.
                </p>
                <p className="text-sky-300">
                  시그모이드(i_t)가 형광펜의 투명도를 조절하고, 하이퍼볼릭 탄젠트(~C_t)가 새롭게 감지된 기후 신호의 방향(상승/하강)을 결정하여 안정적으로 메모리에 추가합니다.
                </p>
              </>
            )}

            {selectedGate === 'CELL' && (
              <>
                <div className="font-bold text-white text-sm">💡 왜 셀 상태를 '컨베이어 벨트'라고 부르나요?</div>
                <p>
                  수식을 보면 C_t = f_t · C_(t-1) + i_t · ~C_t 처럼 <strong>오직 덧셈(+)</strong>으로만 구성되어 있습니다.
                </p>
                <p className="text-violet-300">
                  행렬 곱셈이 연쇄적으로 일어나지 않기 때문에, 역전파(Backpropagation) 시 기울기가 0으로 사라지는 <strong>기울기 소실(Vanishing Gradient) 문제가 원천적으로 발생하지 않습니다.</strong> 덕분에 10년 전 기후 데이터의 주기성이 오늘날까지 손실 없이 전달됩니다.
                </p>
              </>
            )}

            {selectedGate === 'OUTPUT' && (
              <>
                <div className="font-bold text-white text-sm">💡 은닉 상태(h_t)는 어떻게 여행 앱에 쓰이나요?</div>
                <p>
                  셀 상태($C_t$)에는 방대한 10년치 기후 지식이 담겨 있지만, 여행자에게 필요한 것은 "내일 오전 기온과 비올 확률"입니다.
                </p>
                <p className="text-amber-300">
                  출력 게이트($o_t$)가 현재 시점의 여행 일정에 딱 필요한 정보만 필터링하여 은닉 상태($h_t$)로 내보내며, 이것이 앱의 <strong>'오늘의 복장/준비물 가이드'</strong> 생성기로 전달됩니다.
                </p>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
            <span>추론 신뢰도: <strong className="text-emerald-400">{simResult.confidence}%</strong></span>
            <span>일교차 상태: <strong className="text-amber-300">9.2℃ (레이어드룩 권장)</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
