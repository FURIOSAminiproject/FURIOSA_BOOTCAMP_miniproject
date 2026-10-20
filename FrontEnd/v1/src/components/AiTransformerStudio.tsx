/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Code,
  MessageSquare,
  Activity,
  Cpu,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  ExternalLink,
  BrainCircuit,
  CheckCircle2,
  Compass,
  Download
} from 'lucide-react';
import { SelfAttentionVisualizer } from './studio/SelfAttentionVisualizer';
import { PositionalEncodingSimulator } from './studio/PositionalEncodingSimulator';
import { LiveMatrixMathSandbox } from './studio/LiveMatrixMathSandbox';
import { MultiAgentNeuralDispatcher } from './studio/MultiAgentNeuralDispatcher';
import { AgentCoreCodeInspector } from './studio/AgentCoreCodeInspector';
import { KnowledgeAgentChat } from './studio/KnowledgeAgentChat';
import { downloadMasterColabNotebook } from '../services/colabExportService';

interface AiTransformerStudioProps {
  onNavigateToRequest?: () => void;
  onNavigateToPlan?: () => void;
  onNavigateToWeatherStudio?: () => void;
}

export const AiTransformerStudio: React.FC<AiTransformerStudioProps> = ({
  onNavigateToRequest,
  onNavigateToPlan,
  onNavigateToWeatherStudio
}) => {
  const [activeTab, setActiveTab] = useState<'THEORY' | 'PLAYGROUND' | 'CODE' | 'TUTOR'>('THEORY');
  const [activePlaygroundSubService, setActivePlaygroundSubService] = useState<'ATTENTION' | 'POSITION' | 'MATH' | 'DISPATCH'>('ATTENTION');

  return (
    <div className="space-y-10 pb-16">
      {/* 1. STUDIO MASTER HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-emerald-950 text-white p-6 sm:p-10 shadow-2xl border border-stone-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3.5 py-1 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 text-xs font-bold font-mono tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI STUDIO · TRANSFORMATION & AGENTS v3.4</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold">
              지식전달 에이전트 '알고리' 상주 관리
            </span>
            {onNavigateToWeatherStudio && (
              <button
                onClick={onNavigateToWeatherStudio}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-500/25 hover:bg-sky-500/40 border border-sky-400/50 text-sky-200 text-xs transition-colors cursor-pointer"
              >
                <span>기상예보 기술 분석 (LSTM·앙상블)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => downloadMasterColabNotebook()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
              title="12인 전 에이전트와 트랜스포머가 통합 수록된 마스터 Colab 노트북을 다운로드합니다."
            >
              <Download className="w-3.5 h-3.5 text-stone-950" />
              <span>Colab 통합 마스터 (.ipynb) 다운로드</span>
            </button>
            <a
              href="https://www.facebook.com/share/r/1MGUgvjU6Y/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-stone-300 text-xs transition-colors"
            >
              <span>참조 트랜스포머 영상 분석</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-serif text-white leading-tight">
              길벗 AI 트랜스포머 &amp; 멀티에이전트 스튜디오
            </h1>
            <p className="text-sm sm:text-base text-stone-300 leading-relaxed font-sans max-w-3xl">
              어텐션 메커니즘(Self-Attention)과 10개년 기상 시계열 딥러닝, 그리고 12인의 인공지능 멀티에이전트가 어떻게 결합되어 대한민국 여행을 자율 설계하는지 알기 쉽게 분석하고, <strong>전 에이전트의 핵심 코드와 Google Colab (.ipynb) 다운로드 옵션을 전격 제공</strong>합니다.
            </p>
          </div>

          {/* Quick Stat Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="text-xs text-stone-400">신경망 아키텍처</div>
              <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">
                Transformer 4-Head
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="text-xs text-stone-400">자율 에이전트</div>
              <div className="text-base sm:text-lg font-bold text-sky-400 font-mono mt-0.5">
                12 Specialized
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="text-xs text-stone-400">공개 핵심 소스코드</div>
              <div className="text-base sm:text-lg font-bold text-amber-400 font-mono mt-0.5">
                100% Full Open
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="text-xs text-stone-400">Google Colab 연동</div>
              <div className="text-base sm:text-lg font-bold text-orange-400 font-mono mt-0.5">
                12+1 .ipynb 제공
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STUDIO NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('THEORY')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'THEORY'
              ? 'bg-[#064e43] text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. 트랜스포머 &amp; 딥러닝 원리 심층 해설</span>
        </button>

        <button
          onClick={() => setActiveTab('PLAYGROUND')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'PLAYGROUND'
              ? 'bg-[#064e43] text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>2. 실시간 대화형 서비스 시현 (Playground)</span>
        </button>

        <button
          onClick={() => setActiveTab('CODE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'CODE'
              ? 'bg-[#064e43] text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>3. 12개 에이전트 소스코드 &amp; Colab 다운로드</span>
          <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'CODE' ? 'bg-amber-300 text-stone-950' : 'bg-amber-100 text-amber-800'
          }`}>
            Colab .ipynb
          </span>
        </button>

        <button
          onClick={() => setActiveTab('TUTOR')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === 'TUTOR'
              ? 'bg-[#064e43] text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>4. 지식전달관 '알고리'와 1:1 대화 &amp; FAQ</span>
        </button>
      </div>

      {/* 3. TAB 1: THEORY & ARCHITECTURE */}
      {activeTab === 'THEORY' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Section: Facebook Video & Attention Is All You Need */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest font-mono">
                  THE FOUNDATION OF MODERN AI
                </span>
                <h2 className="text-2xl font-extrabold text-stone-900 mt-1">
                  트랜스포머(Transformer) 모델의 탄생과 길벗 AI 여행사 적용
                </h2>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>2017 Vaswani et al. "Attention Is All You Need" 기반</span>
              </div>
            </div>

            <p className="text-stone-700 text-sm sm:text-base leading-relaxed">
              제공해주신 Facebook 영상에서 다룬 트랜스포머 모델은 2017년 구글 브레인 연구진이 제안한 이후 오늘날 모든 거대 언어 모델(LLM)과 최첨단 딥러닝 시스템의 심장이 되었습니다. 기존 순환신경망(RNN)이나 LSTM은 단어를 한 글자씩 차례대로 읽어야 했기에 문장이 길어지면 앞의 내용을 잊어버리는 치명적인 한계가 있었습니다. 트랜스포머는 이를 <strong>"Self-Attention(자가 주의집중 메커니즘)"</strong> 하나로 완전히 혁신했습니다.
            </p>

            {/* Core Pipeline Visual Flowchart */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider font-mono">
                여행 일정 생성을 위한 트랜스포머 신경망 파이프라인 (End-to-End Pipeline)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div className="text-xs font-bold text-stone-900">의뢰 토큰화 (Tokenization)</div>
                  <p className="text-[11px] text-stone-600 leading-normal">
                    "제주도 3박 4일 미식/힐링" 등 고객 자연어 요구사항을 고차원 토큰 벡터로 분해
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-700 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div className="text-xs font-bold text-stone-900">위치 인코딩 (PE)</div>
                  <p className="text-[11px] text-stone-600 leading-normal">
                    시간대별(오전·점심·오후·저녁) 순서 정보를 사인·코사인 정현파 주파수 벡터로 합성
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-700 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div className="text-xs font-bold text-stone-900">Multi-Head Self-Attention</div>
                  <p className="text-[11px] text-stone-600 leading-normal">
                    Q, K, V 행렬 곱으로 동선 거리, 테마 일치도, 기상 안전, 예산 균형 4대 헤드를 동시 계산
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-700 text-white flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div className="text-xs font-bold text-stone-900">12인 에이전트 협연</div>
                  <p className="text-[11px] text-stone-600 leading-normal">
                    총괄 협연자(Supervisor) 감독 하 날씨·안전·미식·교통 전문 에이전트들이 상호 교차 검증
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-700 text-white flex items-center justify-center text-xs font-bold">
                    5
                  </div>
                  <div className="text-xs font-bold text-stone-900">GIS 무결성 &amp; 인가</div>
                  <p className="text-[11px] text-stone-600 leading-normal">
                    네이버/구글 MAP 100% PUSH 검증 및 관리자 최종 1클릭 인가로 완성된 확정서 발급
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed 4 Architectural Pillars Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1: Scaled Dot-Product Attention */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  QKV
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    1. 스케일드 닷-프로덕트 셀프 어텐션
                  </h3>
                  <span className="text-xs text-stone-500 font-mono">Scaled Dot-Product Self-Attention</span>
                </div>
              </div>

              <div className="p-3 bg-stone-900 rounded-xl text-emerald-400 font-mono text-xs sm:text-sm text-center">
                Attention(Q, K, V) = softmax( (Q · K^T) / √d_k ) · V
              </div>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                모든 여행 후보지는 <strong>Query(필요한 조건)</strong>, <strong>Key(지닌 특성)</strong>, <strong>Value(실제 정보)</strong>의 세 가지 벡터로 투영됩니다. 성산일출봉에서 다음 점심 장소를 찾을 때, 성산일출봉의 Query 벡터와 인근 식당들의 Key 벡터를 내적하여 유사도를 구하고, √d_k로 스케일링한 후 Softmax 확률로 변환하여 최적의 식당 Value를 결합합니다.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => downloadMasterColabNotebook()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all cursor-pointer"
                  title="PyTorch Self-Attention 구현체가 포함된 Colab 노트북 다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Self-Attention PyTorch Colab 노트북 (.ipynb)</span>
                </button>
              </div>
            </div>

            {/* Pillar 2: Multi-Head Attention */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center font-bold">
                  MHA
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    2. 4-Head 멀티헤드 어텐션
                  </h3>
                  <span className="text-xs text-stone-500 font-mono">Multi-Head Parallel Perspectives</span>
                </div>
              </div>

              <div className="p-3 bg-stone-900 rounded-xl text-sky-400 font-mono text-xs sm:text-sm text-center">
                MultiHead(Q,K,V) = Concat(head_1, head_2, head_3, head_4) · W^O
              </div>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                단일 시각으로만 일정을 짜면 "거리만 가깝고 테마는 엉망인 코스"가 탄생합니다. 길벗 AI는 4개의 서로 다른 헤드가 <strong>① 동선 최단거리</strong>, <strong>② 힐링/감성 테마 일치도</strong>, <strong>③ 1인당 예산 균형</strong>, <strong>④ 날씨 악천후 대비</strong>를 독립적으로 계산한 후 하나로 융합합니다.
              </p>
            </div>

            {/* Pillar 3: Positional Encoding */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  PE
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    3. 정현파 위치 인코딩 (Positional Encoding)
                  </h3>
                  <span className="text-xs text-stone-500 font-mono">Temporal Ordering without Recurrence</span>
                </div>
              </div>

              <div className="p-3 bg-stone-900 rounded-xl text-amber-400 font-mono text-xs sm:text-sm text-center">
                PE(pos, 2i) = sin(pos / 10000^(2i/d)), PE(pos, 2i+1) = cos(...)
              </div>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                트랜스포머는 병렬 연산을 수행하므로 본래 순서 개념이 없습니다. 이를 해결하기 위해 서로 다른 주파수의 사인(Sin)과 코사인(Cos) 파동 함수를 위치 벡터로 생성하여 여행지 임베딩에 더해줌으로써, 모델이 "1일차 아침"과 "3일차 저녁"의 시간적 맥락을 완벽히 구분하도록 합니다.
              </p>
            </div>

            {/* Pillar 4: Multi-Agent Orchestration */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-800 flex items-center justify-center font-bold">
                  12-A
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    4. 12인 자율 멀티에이전트 시스템
                  </h3>
                  <span className="text-xs text-stone-500 font-mono">Supervisor Graph &amp; Self-Healing</span>
                </div>
              </div>

              <div className="p-3 bg-stone-900 rounded-xl text-violet-400 font-mono text-xs sm:text-sm text-center">
                Agent_Consensus = ∏ (1 - Dup) × σ( ∑ w_j · Audit_j )
              </div>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                단일 LLM의 환각(Hallucination)과 오류를 막기 위해, 기상·안전·미식·숙소·교통 등 전문 분야별 12개 에이전트가 분업 체계를 이루고, 최고 사령관인 '총괄 협연자(Supervisor Maestro)'가 중복 0건과 GIS 무결성을 실시간 검증합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: INTERACTIVE PLAYGROUND (5 LIVE SERVICES) */}
      {activeTab === 'PLAYGROUND' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Sub-Service Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-stone-500 shrink-0">시현 서비스 선택:</span>

            <button
              onClick={() => setActivePlaygroundSubService('ATTENTION')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                activePlaygroundSubService === 'ATTENTION'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              1. Self-Attention 가중치 히트맵
            </button>

            <button
              onClick={() => setActivePlaygroundSubService('POSITION')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                activePlaygroundSubService === 'POSITION'
                  ? 'bg-sky-700 text-white border-sky-700 shadow-2xs'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              2. 위치 인코딩(PE) 주파수 시뮬레이터
            </button>

            <button
              onClick={() => setActivePlaygroundSubService('MATH')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                activePlaygroundSubService === 'MATH'
                  ? 'bg-amber-700 text-white border-amber-700 shadow-2xs'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              3. 브라우저 실시간 수치 연산 샌드박스
            </button>

            <button
              onClick={() => setActivePlaygroundSubService('DISPATCH')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                activePlaygroundSubService === 'DISPATCH'
                  ? 'bg-violet-700 text-white border-violet-700 shadow-2xs'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              4. 멀티에이전트 신경망 프롬프트 디스패처
            </button>
          </div>

          {/* Sub-Service Components Render */}
          {activePlaygroundSubService === 'ATTENTION' && <SelfAttentionVisualizer />}
          {activePlaygroundSubService === 'POSITION' && <PositionalEncodingSimulator />}
          {activePlaygroundSubService === 'MATH' && <LiveMatrixMathSandbox />}
          {activePlaygroundSubService === 'DISPATCH' && <MultiAgentNeuralDispatcher />}
        </div>
      )}

      {/* 5. TAB 3: ALL 12 AGENTS SOURCE CODE INSPECTOR */}
      {activeTab === 'CODE' && (
        <div className="animate-fadeIn">
          <AgentCoreCodeInspector />
        </div>
      )}

      {/* 6. TAB 4: KNOWLEDGE AGENT CHAT & FAQ */}
      {activeTab === 'TUTOR' && (
        <div className="animate-fadeIn">
          <KnowledgeAgentChat />
        </div>
      )}

      {/* Bottom CTA Card */}
      <div className="bg-gradient-to-r from-emerald-900 to-stone-900 text-white p-6 sm:p-8 rounded-3xl border border-emerald-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-emerald-400 font-mono tracking-wider">
            TRANSFORMER DRIVEN TRAVEL SERVICE
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold">
            스튜디오에서 확인한 인공지능 팀에게 맞춤 일정을 직접 의뢰해보세요!
          </h3>
          <p className="text-xs sm:text-sm text-stone-300">
            12인의 AI 에이전트 팀이 단 10초 만에 중복 없는 최적의 타임라인과 네이버/구글 지도 PUSH 링크를 완성합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onNavigateToRequest && (
            <button
              onClick={onNavigateToRequest}
              className="px-5 py-3 rounded-xl bg-white text-stone-900 font-extrabold text-xs sm:text-sm hover:bg-stone-100 shadow-md transition-all flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-emerald-800" />
              <span>새 여행 의뢰하기</span>
            </button>
          )}

          {onNavigateToPlan && (
            <button
              onClick={onNavigateToPlan}
              className="px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm border border-emerald-600 transition-all"
            >
              <span>보관된 일정 확인</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
