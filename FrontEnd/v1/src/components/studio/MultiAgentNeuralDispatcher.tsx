/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Send, Sparkles, Network, ArrowRight, Check, Bot } from 'lucide-react';
import { AGENT_CORE_CODES } from '../../services/transformerStudioService';

export const MultiAgentNeuralDispatcher: React.FC = () => {
  const samplePrompts = [
    '부모님 칠순 기념으로 비 예보가 있는 경주에서 편안한 한옥 숙소와 부드러운 향토 한식 추천해줘',
    '아이 2명과 함께 제주도 3박 4일, 안전사고 걱정 없는 해변 물놀이와 체험 위주 일정',
    '강릉 바다 보며 카페 투어와 KTX 이동 시간 최적화, 1인 25만원 예산 맞춤 힐링 여행'
  ];

  const [inputQuery, setInputQuery] = useState(samplePrompts[0]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [activeRouting, setActiveRouting] = useState<{
    agentId: string;
    score: number;
    subtask: string;
    tokens: string[];
  }[] | null>(null);

  const handleSimulateDispatch = (queryText: string) => {
    setIsDispatching(true);
    setTimeout(() => {
      // Rule-augmented neural keyword affinity simulator
      const results = AGENT_CORE_CODES.map((agent) => {
        let baseScore = 0.2;
        const tokens: string[] = [];

        if (queryText.includes('비') || queryText.includes('날씨')) {
          if (agent.id === 'weather') {
            baseScore += 0.75;
            tokens.push('비 예보', '기상 센서', '실내 대체');
          }
        }
        if (queryText.includes('안전') || queryText.includes('아이') || queryText.includes('부모님')) {
          if (agent.id === 'safety') {
            baseScore += 0.72;
            tokens.push('응급의료 핫라인', '동선 위험도', '안전 수칙');
          }
        }
        if (queryText.includes('한옥') || queryText.includes('숙소') || queryText.includes('호텔')) {
          if (agent.id === 'stay') {
            baseScore += 0.7;
            tokens.push('한옥스테이', '숙소 배정', '동선 연계');
          }
        }
        if (queryText.includes('한식') || queryText.includes('맛집') || queryText.includes('카페') || queryText.includes('미식')) {
          if (agent.id === 'gourmet') {
            baseScore += 0.72;
            tokens.push('향토 한식', '미식 시퀀싱', '시간표 매칭');
          }
          if (agent.id === 'poet') {
            baseScore += 0.58;
            tokens.push('감성 헌시', '미식 수필');
          }
        }
        if (queryText.includes('KTX') || queryText.includes('이동') || queryText.includes('최적화')) {
          if (agent.id === 'transport') {
            baseScore += 0.73;
            tokens.push('KTX 연계', '최단 동선', '지도 PUSH');
          }
        }
        if (queryText.includes('예산') || queryText.includes('만원')) {
          if (agent.id === 'planner') {
            baseScore += 0.7;
            tokens.push('배낭 예산 배분', '잔여 한도');
          }
        }
        if (agent.id === 'supervisor') {
          baseScore = 0.95;
          tokens.push('전체 그래프 총괄', '중복 필터링');
        }
        if (agent.id === 'director') {
          baseScore = 0.92;
          tokens.push('프롬프트 토큰화', '청사진 직조');
        }
        if (agent.id === 'auditor') {
          baseScore = 0.88;
          tokens.push('GIS 전수 검사', '관리자 인가');
        }
        if (agent.id === 'attraction') {
          baseScore = Math.max(baseScore, 0.65);
          tokens.push('명소 군집화', '랜드마크');
        }
        if (agent.id === 'knowledge') {
          baseScore = 0.7;
          tokens.push('스튜디오 해설', '원리 교육');
        }

        const normalizedScore = Math.min(0.99, parseFloat((baseScore + Math.random() * 0.05).toFixed(3)));
        return {
          agentId: agent.id,
          score: normalizedScore,
          subtask: `${agent.name} 맞춤 세부 태스크 자동 배정`,
          tokens: tokens.length > 0 ? tokens : ['문맥 보조 참조']
        };
      }).sort((a, b) => b.score - a.score);

      setActiveRouting(results);
      setIsDispatching(false);
    }, 400);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-800 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span>실시간 대화형 서비스 4</span>
          </div>
          <h3 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <span>멀티에이전트 신경망 프롬프트 디스패처 (Multi-Agent Neural Router)</span>
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            고객의 자연어 프롬프트를 분석하여 12개 전문 에이전트 중 누구에게 우선적으로 태스크를 분배(Attention Routing)할지 실시간 추론합니다.
          </p>
        </div>
      </div>

      {/* Preset Query Chips */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-700">예시 프롬프트로 빠른 테스트:</label>
        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputQuery(p);
                handleSimulateDispatch(p);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 text-left transition-all"
            >
              "{p.substring(0, 32)}..."
            </button>
          ))}
        </div>
      </div>

      {/* Input Box & Button */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="여행 의뢰 프롬프트를 입력하세요..."
          className="w-full text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-600"
        />
        <button
          onClick={() => handleSimulateDispatch(inputQuery)}
          disabled={isDispatching}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 shadow-sm transition-all"
        >
          {isDispatching ? (
            <span>신경망 라우팅 추론 중...</span>
          ) : (
            <>
              <Network className="w-4 h-4" />
              <span>에이전트 디스패치 실행</span>
            </>
          )}
        </button>
      </div>

      {/* Dispatch Results Grid */}
      {activeRouting && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-700 border-b border-stone-200/70 pb-2">
            <span>12개 에이전트 활성화 순위 (Attention Activation Rankings)</span>
            <span className="text-violet-700">상위 5개 에이전트가 주관 태스크를 실행합니다</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeRouting.map((route, idx) => {
              const agentInfo = AGENT_CORE_CODES.find((a) => a.id === route.agentId);
              const isTop = idx < 5;
              const pct = Math.round(route.score * 100);

              return (
                <div
                  key={route.agentId}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isTop
                      ? 'bg-violet-50/70 border-violet-300 shadow-2xs'
                      : 'bg-stone-50/60 border-stone-200 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          agentInfo?.avatarColor || 'bg-stone-800 text-white'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">{agentInfo?.name}</div>
                        <div className="text-[10px] text-stone-500 truncate max-w-[140px]">
                          {agentInfo?.title}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        isTop ? 'bg-violet-200/80 text-violet-900' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isTop ? 'bg-violet-600' : 'bg-stone-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Activated tokens */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {route.tokens.map((t, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[10px] px-1.5 py-0.5 bg-white/90 text-stone-700 rounded border border-stone-200/80 font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
