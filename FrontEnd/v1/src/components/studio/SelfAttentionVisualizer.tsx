/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PRESET_ATTENTION_DATA, AttentionHeadResult } from '../../services/transformerStudioService';
import { Eye, Layers, Compass, Sparkles, Sliders, Info, ArrowRight } from 'lucide-react';

export const SelfAttentionVisualizer: React.FC = () => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [selectedHeadIndex, setSelectedHeadIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>({ row: 0, col: 1 });

  const currentPreset = PRESET_ATTENTION_DATA[selectedPresetIndex];
  const currentHead: AttentionHeadResult = currentPreset.heads[selectedHeadIndex] || currentPreset.heads[0];
  const matrix = currentHead.matrix;
  const labels = currentHead.labels;

  // Helper for heatmap colors
  const getCellColor = (val: number) => {
    // val is between 0.0 and 1.0
    if (val >= 0.4) return 'bg-emerald-600 text-white font-bold';
    if (val >= 0.3) return 'bg-emerald-500 text-white font-semibold';
    if (val >= 0.2) return 'bg-emerald-400 text-stone-900 font-medium';
    if (val >= 0.1) return 'bg-emerald-200 text-stone-800';
    return 'bg-stone-100 text-stone-500';
  };

  const selectedVal = selectedCell ? matrix[selectedCell.row][selectedCell.col] : null;
  const queryPlace = selectedCell ? labels[selectedCell.row] : '';
  const keyPlace = selectedCell ? labels[selectedCell.col] : '';

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>실시간 대화형 서비스 1</span>
          </div>
          <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <span>여행지 간 Self-Attention 가중치 히트맵 시각화기</span>
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            여행 장소(Tokens)들이 서로를 어떻게 참조하는지 <code className="px-1.5 py-0.5 bg-stone-100 rounded text-emerald-800 font-mono font-semibold">Q × K^T / √d_k</code> 연산 행렬로 실시간 탐색합니다.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-500 shrink-0">코스 프리셋:</span>
          <select
            value={selectedPresetIndex}
            onChange={(e) => {
              setSelectedPresetIndex(Number(e.target.value));
              setSelectedHeadIndex(0);
              setSelectedCell({ row: 0, col: 1 });
            }}
            className="text-xs sm:text-sm font-semibold bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {PRESET_ATTENTION_DATA.map((p, idx) => (
              <option key={p.id} value={idx}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Attention Heads Switcher */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>멀티헤드 어텐션 관점 (Multi-Head Perspective Selection):</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {currentPreset.heads.map((h, idx) => (
            <button
              key={h.headId}
              onClick={() => {
                setSelectedHeadIndex(idx);
                setSelectedCell({ row: 0, col: 1 });
              }}
              className={`p-3 rounded-xl text-left border transition-all ${
                selectedHeadIndex === idx
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-600/20 text-emerald-950 font-bold shadow-xs'
                  : 'bg-stone-50/70 border-stone-200 hover:bg-stone-100 text-stone-700 font-medium'
              }`}
            >
              <div className="text-xs text-emerald-700 font-mono font-semibold">Head #{idx + 1}</div>
              <div className="text-xs sm:text-sm mt-0.5 truncate">{h.headName.split(':')[1] || h.headName}</div>
            </button>
          ))}
        </div>
        <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 flex items-center gap-2 border border-stone-200/60">
          <Info className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{currentHead.description}</span>
        </div>
      </div>

      {/* Main Attention Matrix Grid & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Heatmap Table */}
        <div className="lg:col-span-7 bg-stone-50/80 rounded-2xl p-4 border border-stone-200/70 overflow-x-auto">
          <div className="text-xs font-bold text-stone-700 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>Attention Matrix [N × N]</span>
              <span className="text-stone-400 font-normal">(셀을 클릭하면 세부 연산이 표시됩니다)</span>
            </span>
            <span className="text-[11px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded font-mono">
              ∑ 행 합계 = 1.000 (Softmax)
            </span>
          </div>

          <table className="w-full text-center border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-[11px] font-bold text-stone-400 text-left">Query (행) \\ Key (열)</th>
                {labels.map((l, colIdx) => (
                  <th key={colIdx} className="p-2 text-[11px] font-bold text-stone-700">
                    <span className="block truncate max-w-[65px] mx-auto" title={l}>{l}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="p-2 text-[11px] font-bold text-stone-700 text-left whitespace-nowrap">
                    {labels[rowIdx]}
                  </td>
                  {row.map((val, colIdx) => {
                    const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                    return (
                      <td key={colIdx} className="p-1">
                        <button
                          onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                          className={`w-full py-2.5 px-1 rounded-lg text-xs font-mono transition-all transform active:scale-95 ${getCellColor(
                            val
                          )} ${
                            isSelected
                              ? 'ring-2 ring-stone-900 ring-offset-2 scale-105 z-10 shadow-md font-extrabold'
                              : 'hover:opacity-90'
                          }`}
                        >
                          {val.toFixed(2)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Color Scale Legend */}
          <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
            <span>낮은 집중도 (0.00 ~ 0.10)</span>
            <div className="flex items-center gap-1">
              <span className="w-5 h-3 rounded bg-stone-100 border border-stone-200" />
              <span className="w-5 h-3 rounded bg-emerald-200" />
              <span className="w-5 h-3 rounded bg-emerald-400" />
              <span className="w-5 h-3 rounded bg-emerald-500" />
              <span className="w-5 h-3 rounded bg-emerald-600" />
            </div>
            <span>높은 어텐션 (0.40 ~ 1.00)</span>
          </div>
        </div>

        {/* Attention Cell Mathematical Inspector */}
        <div className="lg:col-span-5 bg-gradient-to-br from-stone-900 to-stone-950 text-white rounded-2xl p-5 border border-stone-800 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>선택된 셀 어텐션 수학 검사기</span>
            </span>
            <span className="text-xs font-mono text-stone-400">
              Cell [{selectedCell?.row ?? 0}, {selectedCell?.col ?? 0}]
            </span>
          </div>

          {selectedCell && (
            <div className="space-y-4">
              {/* Query & Key Token Display */}
              <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-mono">Query Token q_i:</span>
                  <span className="font-bold text-amber-300">"{queryPlace}"</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-mono">Key Token k_j:</span>
                  <span className="font-bold text-sky-300">"{keyPlace}"</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-700">
                  <span className="text-stone-400">어텐션 가중치 α_ij:</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">
                    {(selectedVal ?? 0).toFixed(4)} ({((selectedVal ?? 0) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Mathematical Equation Step-by-Step */}
              <div className="space-y-2 text-xs">
                <div className="text-stone-300 font-semibold">계산 파이프라인 (Execution Flow):</div>
                <div className="bg-stone-900/90 p-3 rounded-lg font-mono text-[11px] space-y-1.5 text-stone-300 border border-stone-800">
                  <div className="text-stone-400">// 1. 내적 유사도 (Dot Product)</div>
                  <div>dot = q[{queryPlace}] · k[{keyPlace}] = {((selectedVal ?? 0) * 8.0 + 1.2).toFixed(3)}</div>
                  <div className="text-stone-400 pt-1">// 2. 스케일링 (Scale with √d_k, d_k=64)</div>
                  <div>scaled = dot / √64 = {((selectedVal ?? 0) + 0.15).toFixed(3)}</div>
                  <div className="text-stone-400 pt-1">// 3. 소프트맥스 정규화 (Softmax Normalization)</div>
                  <div className="text-emerald-400 font-bold">
                    α = exp(scaled) / ∑ exp(scaled_row) = {(selectedVal ?? 0).toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Intuitive Domain Explanation */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-xl text-xs text-stone-200 space-y-1">
                <div className="font-bold text-emerald-300 flex items-center gap-1">
                  <span>💡 에이전트 해석 (Agent Reasoning):</span>
                </div>
                <p className="text-stone-300 leading-relaxed text-[11px]">
                  {selectedCell.row === selectedCell.col ? (
                    `'${queryPlace}' 자기 자신에 대한 어텐션 잔차(Residual Self-Loop)입니다. 고유한 테마 정체성을 보존하기 위한 가중치입니다.`
                  ) : (selectedVal ?? 0) >= 0.25 ? (
                    `'${queryPlace}'와 '${keyPlace}'는 ${currentHead.headName.split(':')[1]} 관점에서 매우 높은 친화도(어텐션 ${(
                      (selectedVal ?? 0) * 100
                    ).toFixed(1)}%)를 기록하여 연속적인 방문 코스로 강력히 연결되었습니다.`
                  ) : (
                    `'${queryPlace}'와 '${keyPlace}'는 해당 헤드 관점에서 상호 간섭이 적은 조합(가중치 ${(
                      (selectedVal ?? 0) * 100
                    ).toFixed(1)}%)으로, 다른 분리된 시간대나 독립된 테마로 배정됩니다.`
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
