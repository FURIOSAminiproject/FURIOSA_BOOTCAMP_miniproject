/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { generatePositionalEncoding } from '../../services/transformerStudioService';
import { Sliders, Activity, Clock, Sparkles, HelpCircle } from 'lucide-react';

export const PositionalEncodingSimulator: React.FC = () => {
  const [seqLength, setSeqLength] = useState(8);
  const [dModel, setDModel] = useState(16);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);

  const encodings = generatePositionalEncoding(seqLength, dModel);
  const currentSlot = encodings[selectedSlotIndex] || encodings[0];

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>실시간 대화형 서비스 2</span>
          </div>
          <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <span>여행 일정 위치 인코딩(Positional Encoding) 주파수 시뮬레이터</span>
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            트랜스포머가 RNN 순환문 없이도 시간 순서(오전 → 점심 → 오후 → 저녁)를 명확히 인지하게 만드는 정현파(Sin/Cos) 임베딩 메커니즘입니다.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-500">일정 슬롯(N):</span>
            <select
              value={seqLength}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSeqLength(val);
                if (selectedSlotIndex >= val) setSelectedSlotIndex(0);
              }}
              className="text-xs sm:text-sm font-semibold bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800"
            >
              <option value={4}>4개 (1일 코스)</option>
              <option value={6}>6개 (1박 2일)</option>
              <option value={8}>8개 (2박 3일)</option>
              <option value={10}>10개 (3박 4일)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-500">임베딩 차원(d):</span>
            <select
              value={dModel}
              onChange={(e) => setDModel(Number(e.target.value))}
              className="text-xs sm:text-sm font-semibold bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800"
            >
              <option value={8}>d=8 (미니)</option>
              <option value={16}>d=16 (표준)</option>
              <option value={32}>d=32 (고차원)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schedule Slot Navigator */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-sky-600" />
          <span>여행 타임라인 슬롯 선택 (Time Slot Selection):</span>
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {encodings.map((enc, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedSlotIndex(idx)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedSlotIndex === idx
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <span className="opacity-80 block text-[10px]">pos={idx}</span>
              <span>{enc.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Waveform Visualization & Vector Values */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SVG Sinusoid Frequency Curves */}
        <div className="lg:col-span-7 bg-stone-900 rounded-2xl p-5 border border-stone-800 text-white space-y-4">
          <div className="flex items-center justify-between text-xs border-b border-stone-800 pb-3">
            <span className="font-bold text-sky-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              <span>주파수 파형 곡선 (Multi-Frequency Sinusoids)</span>
            </span>
            <span className="text-[11px] font-mono text-stone-400">
              PE(pos, 2i) = sin(pos/10000^(2i/d))
            </span>
          </div>

          <div className="relative h-48 w-full bg-stone-950/60 rounded-xl p-3 border border-stone-800/80 flex items-center justify-center">
            {/* SVG Plot of Sine / Cosine across positions */}
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
              {/* Zero axis */}
              <line x1="0" y1="60" x2="400" y2="60" stroke="#44403c" strokeDasharray="3,3" strokeWidth="1" />

              {/* Curve 1: High frequency (low dimension i=0) */}
              <path
                d={Array.from({ length: 40 }).map((_, step) => {
                  const x = (step / 39) * 400;
                  const posVal = (step / 39) * (seqLength - 1);
                  const y = 60 - Math.sin(posVal / Math.pow(10000, 0)) * 48;
                  return `${step === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                }).join(' ')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
              />

              {/* Curve 2: Medium frequency (i=2) */}
              <path
                d={Array.from({ length: 40 }).map((_, step) => {
                  const x = (step / 39) * 400;
                  const posVal = (step / 39) * (seqLength - 1);
                  const y = 60 - Math.cos(posVal / Math.pow(10000, 2 / dModel)) * 42;
                  return `${step === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                }).join(' ')}
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeDasharray="4,2"
              />

              {/* Curve 3: Low frequency (high dimension i=d/2 - 1) */}
              <path
                d={Array.from({ length: 40 }).map((_, step) => {
                  const x = (step / 39) * 400;
                  const posVal = (step / 39) * (seqLength - 1);
                  const y = 60 - Math.sin(posVal / Math.pow(10000, (dModel - 2) / dModel)) * 36;
                  return `${step === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                }).join(' ')}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
              />

              {/* Current Position Marker */}
              {seqLength > 1 && (
                <g>
                  <line
                    x1={(selectedSlotIndex / (seqLength - 1)) * 400}
                    y1="0"
                    x2={(selectedSlotIndex / (seqLength - 1)) * 400}
                    y2="120"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="2,2"
                  />
                  <circle
                    cx={(selectedSlotIndex / (seqLength - 1)) * 400}
                    cy="60"
                    r="4"
                    fill="#ef4444"
                  />
                </g>
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-sky-400 rounded" />
              <span>고주파 (단기 순서 구별, i=0)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-400 rounded" />
              <span>중주파 (일차별 전이, i=2)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-amber-400 rounded" />
              <span>저주파 (전체 여정 포지셔닝, i=d-1)</span>
            </span>
          </div>
        </div>

        {/* Vector Value Bars for the selected slot */}
        <div className="lg:col-span-5 bg-stone-50 rounded-2xl p-5 border border-stone-200/80 space-y-4">
          <div className="flex items-center justify-between text-xs border-b border-stone-200 pb-3">
            <span className="font-bold text-stone-900">
              슬롯 위치 벡터 PE(pos={selectedSlotIndex})
            </span>
            <span className="text-sky-700 font-semibold bg-sky-100 px-2 py-0.5 rounded text-[11px]">
              {currentSlot.label}
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {currentSlot.values.map((v, dimIdx) => {
              const isEven = dimIdx % 2 === 0;
              const pct = Math.abs(v) * 100;
              return (
                <div key={dimIdx} className="flex items-center gap-2 text-xs font-mono">
                  <span className="w-14 text-stone-500 text-[11px] shrink-0">
                    {isEven ? `sin[${dimIdx}]` : `cos[${dimIdx}]`}
                  </span>
                  <div className="flex-1 bg-stone-200 h-3 rounded-full overflow-hidden flex items-center">
                    <div
                      className={`h-full ${
                        v >= 0 ? 'bg-sky-500 ml-auto' : 'bg-rose-400 mr-auto'
                      }`}
                      style={{ width: `${pct / 2}%` }}
                    />
                  </div>
                  <span className="w-14 text-right font-semibold text-stone-700 text-[11px] shrink-0">
                    {v.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Educational Note */}
          <div className="p-3 bg-white rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
            <div className="font-bold text-stone-900 flex items-center gap-1 text-[11px]">
              <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
              <span>왜 위치 인코딩이 여행 일정에 필수인가요?</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              "1일차 아침 흑돼지 구이"와 "2일차 저녁 흑돼지 구이"는 같은 장소라도 시간대와 순서가 다릅니다. 이 벡터가 여행지 임베딩과 더해져(Add), 모델이 순서와 타이밍을 완벽히 식별합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
