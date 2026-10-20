/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { computeScaledDotProductAttention } from '../../services/transformerStudioService';
import { Calculator, Play, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

export const LiveMatrixMathSandbox: React.FC = () => {
  // 3 tokens, d_k = 3
  const [queryMatrix, setQueryMatrix] = useState<number[][]>([
    [1.2, 0.4, 0.8],
    [0.2, 1.5, 0.3],
    [0.9, 0.7, 1.4]
  ]);

  const [keyMatrix, setKeyMatrix] = useState<number[][]>([
    [1.0, 0.5, 0.7],
    [0.3, 1.4, 0.2],
    [0.8, 0.6, 1.3]
  ]);

  const valueMatrix: number[][] = [
    [10, 20],
    [30, 40],
    [50, 60]
  ];

  const tokenNames = ['성산일출봉 (자연)', '갈치명가 (미식)', '빛의벙커 (문화)'];

  const handleUpdateQuery = (row: number, col: number, val: number) => {
    const updated = queryMatrix.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? val : c))
    );
    setQueryMatrix(updated);
  };

  const handleUpdateKey = (row: number, col: number, val: number) => {
    const updated = keyMatrix.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? val : c))
    );
    setKeyMatrix(updated);
  };

  const handleRandomize = () => {
    const rand = () => parseFloat((Math.random() * 2 - 0.5).toFixed(2));
    setQueryMatrix([
      [rand(), rand(), rand()],
      [rand(), rand(), rand()],
      [rand(), rand(), rand()]
    ]);
    setKeyMatrix([
      [rand(), rand(), rand()],
      [rand(), rand(), rand()],
      [rand(), rand(), rand()]
    ]);
  };

  const { scoresRaw, scoresScaled, attentionWeights, output } = computeScaledDotProductAttention(
    queryMatrix,
    keyMatrix,
    valueMatrix
  );

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>실시간 대화형 서비스 3</span>
          </div>
          <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <span>브라우저 실시간 수치 연산 샌드박스 (Live Matrix Sandbox)</span>
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            직접 Q와 K 행렬의 숫자를 수정해보며 <code className="px-1.5 py-0.5 bg-stone-100 rounded text-amber-800 font-mono font-semibold">softmax(Q·K^T / √3)</code>가 실시간 재계산되는 원리를 체감합니다.
          </p>
        </div>

        <button
          onClick={handleRandomize}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-all border border-stone-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>임의의 난수 벡터 생성</span>
        </button>
      </div>

      {/* Interactive Input Matrices (Query & Key) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Query Matrix (Q) */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-800">
            <span className="flex items-center gap-1.5 text-emerald-800">
              <Calculator className="w-4 h-4" />
              <span>Query 행렬 Q [3 × 3] (질문/탐색 벡터)</span>
            </span>
            <span className="text-[11px] text-stone-500 font-normal">직접 입력 가능</span>
          </div>

          <div className="space-y-2">
            {queryMatrix.map((row, rIdx) => (
              <div key={rIdx} className="flex items-center gap-2">
                <span className="w-32 text-xs font-semibold text-stone-600 truncate text-right">
                  {tokenNames[rIdx].split(' ')[0]}:
                </span>
                <div className="grid grid-cols-3 gap-1.5 flex-1">
                  {row.map((val, cIdx) => (
                    <input
                      key={cIdx}
                      type="number"
                      step="0.1"
                      value={val}
                      onChange={(e) => handleUpdateQuery(rIdx, cIdx, parseFloat(e.target.value) || 0)}
                      className="w-full text-center font-mono text-xs font-semibold bg-white border border-stone-300 rounded-lg py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Matrix (K) */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-800">
            <span className="flex items-center gap-1.5 text-sky-800">
              <Calculator className="w-4 h-4" />
              <span>Key 행렬 K [3 × 3] (후보 특성 벡터)</span>
            </span>
            <span className="text-[11px] text-stone-500 font-normal">직접 입력 가능</span>
          </div>

          <div className="space-y-2">
            {keyMatrix.map((row, rIdx) => (
              <div key={rIdx} className="flex items-center gap-2">
                <span className="w-32 text-xs font-semibold text-stone-600 truncate text-right">
                  {tokenNames[rIdx].split(' ')[0]}:
                </span>
                <div className="grid grid-cols-3 gap-1.5 flex-1">
                  {row.map((val, cIdx) => (
                    <input
                      key={cIdx}
                      type="number"
                      step="0.1"
                      value={val}
                      onChange={(e) => handleUpdateKey(rIdx, cIdx, parseFloat(e.target.value) || 0)}
                      className="w-full text-center font-mono text-xs font-semibold bg-white border border-stone-300 rounded-lg py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Computation Steps Display */}
      <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800 text-white space-y-5">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3 text-xs">
          <span className="font-bold text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>실시간 연산 파이프라인 (Live Computed Steps)</span>
          </span>
          <span className="font-mono text-[11px] text-stone-400">
            √d_k = √3 ≈ {Math.sqrt(3).toFixed(3)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Q * K^T */}
          <div className="bg-stone-950/70 p-3.5 rounded-xl border border-stone-800 space-y-2">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              1단계: 내적 유사도 행렬 Q · K^T
            </div>
            <div className="space-y-1 font-mono text-xs">
              {scoresRaw.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-between bg-stone-900/60 px-2 py-1 rounded">
                  {row.map((v, cIdx) => (
                    <span key={cIdx} className="w-12 text-center text-stone-300">
                      {v.toFixed(2)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Scaled / √d_k */}
          <div className="bg-stone-950/70 p-3.5 rounded-xl border border-stone-800 space-y-2">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              2단계: 스케일링 나누기 / √3
            </div>
            <div className="space-y-1 font-mono text-xs">
              {scoresScaled.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-between bg-stone-900/60 px-2 py-1 rounded">
                  {row.map((v, cIdx) => (
                    <span key={cIdx} className="w-12 text-center text-sky-300">
                      {v.toFixed(2)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Softmax Probabilities */}
          <div className="bg-stone-950/70 p-3.5 rounded-xl border border-stone-800 space-y-2 ring-1 ring-emerald-500/40">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>3단계: Softmax (최종 어텐션 가중치)</span>
              <span className="text-[10px] text-emerald-500 font-mono">∑=1.00</span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              {attentionWeights.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-between bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/40">
                  {row.map((v, cIdx) => (
                    <span key={cIdx} className="w-12 text-center font-bold text-emerald-300">
                      {v.toFixed(3)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Output Weighted Context Vector */}
        <div className="pt-2 border-t border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-stone-300">
              최종 산출된 문맥 벡터 Output = AttentionWeights × Value Matrix [3 × 2]
            </span>
          </div>
          <div className="font-mono text-xs text-amber-300 flex items-center gap-3">
            {output.map((row, idx) => (
              <span key={idx} className="bg-stone-800 px-2.5 py-1 rounded">
                [{row.join(', ')}]
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
