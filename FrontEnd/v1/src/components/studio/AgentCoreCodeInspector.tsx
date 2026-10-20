/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AGENT_CORE_CODES, AgentCodeSpec } from '../../services/transformerStudioService';
import {
  downloadAgentColabNotebook,
  downloadMasterColabNotebook,
  downloadAgentPythonScript,
  getAgentPythonCode
} from '../../services/colabExportService';
import {
  Code,
  Copy,
  Check,
  Play,
  Sparkles,
  Terminal,
  BookOpen,
  Layers,
  ShieldCheck,
  Download,
  ExternalLink,
  Cpu,
  FileCode,
  CheckCircle2,
  Columns
} from 'lucide-react';

export const AgentCoreCodeInspector: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState(AGENT_CORE_CODES[0].id);
  const [copied, setCopied] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<Record<string, any> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'TYPESCRIPT' | 'PYTHON' | 'SPLIT'>('TYPESCRIPT');

  const currentAgent: AgentCodeSpec =
    AGENT_CORE_CODES.find((a) => a.id === selectedAgentId) || AGENT_CORE_CODES[0];

  const currentPythonCode = getAgentPythonCode(currentAgent.id);

  const handleCopyCode = () => {
    const textToCopy =
      activeCodeTab === 'PYTHON'
        ? currentPythonCode
        : activeCodeTab === 'SPLIT'
        ? `// === [TypeScript Production Code] ===\n\n${currentAgent.code}\n\n# === [Python PyTorch Code] ===\n\n${currentPythonCode}`
        : currentAgent.code;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunSimulation = () => {
    setIsRunning(true);
    setTimeout(() => {
      const out = currentAgent.runDemo(currentAgent.demoInput);
      setExecutionOutput(out);
      setIsRunning(false);
    }, 250);
  };

  const handleDownloadColab = () => {
    downloadAgentColabNotebook(currentAgent);
    setDownloadSuccessMessage(`[${currentAgent.name}] Google Colab 노트북 (.ipynb) 다운로드가 완료되었습니다!`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  const handleDownloadPython = () => {
    downloadAgentPythonScript(currentAgent);
    setDownloadSuccessMessage(`[${currentAgent.name}] Python 스크립트 (.py) 다운로드가 완료되었습니다!`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  const handleDownloadMasterColab = () => {
    downloadMasterColabNotebook();
    setDownloadSuccessMessage(`[통합 마스터] 12인 에이전트 & 트랜스포머 Colab 통합 패키지 (.ipynb) 다운로드가 완료되었습니다!`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Toast Notification */}
      {downloadSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-amber-400/60 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-amber-300 block">Google Colab 다운로드 성공</span>
            <span className="text-stone-300">{downloadSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
            <Code className="w-3.5 h-3.5 text-emerald-600" />
            <span>12인 전 에이전트 소스코드 100% 전격 공개 &amp; Google Colab 다운로드</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900 flex items-center gap-2 font-serif">
            <span>AI 멀티에이전트별 핵심 신경망 &amp; 오케스트레이션 코드 스튜디오</span>
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
            길벗 AI Agents 여행사 시스템에 실제로 탑재되어 구동 중인 각 에이전트의 핵심 수학 공식, 텐서 차원, 프로덕션 코드를 검증하고, <strong>TypeScript와 Python (PyTorch) 코드를 비교 확인 및 Google Colab (.ipynb) 노트북으로 즉시 다운로드</strong>할 수 있습니다.
          </p>
        </div>

        {/* Master Suite Colab Download Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            onClick={handleDownloadMasterColab}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            title="12인 에이전트와 트랜스포머 전체가 수록된 통합 마스터 노트북을 다운로드합니다."
          >
            <Download className="w-4 h-4 text-stone-950" />
            <span>12인 통합 마스터 Colab (.ipynb) 다운로드</span>
          </button>
          <a
            href="https://colab.research.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
          >
            <span>Google Colab 열기</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 12-Agent Horizontal Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>분석 및 다운로드할 AI 에이전트 선택 (12 Specialized Agents):</span>
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {AGENT_CORE_CODES.map((agent, idx) => {
            const isSelected = selectedAgentId === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  setExecutionOutput(null);
                }}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm ring-2 ring-emerald-500/30'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'bg-emerald-400 text-stone-950' : 'bg-stone-200 text-stone-800'
                  }`}
                >
                  {idx + 1}
                </span>
                <span>{agent.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Agent Detail Overview Card */}
      <div className="bg-gradient-to-r from-stone-50 via-emerald-50/20 to-stone-50 p-5 sm:p-6 rounded-2xl border border-stone-200/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-700 font-mono">Agent ID: #{currentAgent.id}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                TypeScript &amp; Python Colab 동시 지원
              </span>
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-stone-900 mt-0.5">{currentAgent.name}</h4>
            <div className="text-xs text-stone-600 font-medium">{currentAgent.title}</div>
          </div>

          {/* Action Buttons: Colab Download, Python Download, Copy, Run */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Colab .ipynb Download */}
            <button
              onClick={handleDownloadColab}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
              title="이 에이전트의 실행 가능한 Google Colab (.ipynb) 노트북을 다운로드합니다."
            >
              <Download className="w-3.5 h-3.5 text-stone-950" />
              <span>Colab 다운로드 (.ipynb)</span>
            </button>

            {/* Python .py Download */}
            <button
              onClick={handleDownloadPython}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
              title="이 에이전트의 Python 소스코드를 다운로드합니다."
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Python (.py)</span>
            </button>

            {/* Copy Code */}
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-2xs transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span>
                    {activeCodeTab === 'PYTHON' ? 'Python 복사' : activeCodeTab === 'SPLIT' ? '전체 코드 복사' : 'TypeScript 복사'}
                  </span>
                </>
              )}
            </button>

            {/* Run Simulation */}
            <button
              onClick={handleRunSimulation}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? '실행 중...' : '라이브 시뮬레이션'}</span>
            </button>
          </div>
        </div>

        {/* Math Formula & Tensor Dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 space-y-1">
            <span className="font-bold text-stone-500 uppercase text-[10px] tracking-wider block">
              핵심 수학 수식 (Mathematical Formulation)
            </span>
            <div className="font-mono text-emerald-900 bg-stone-50 p-2.5 rounded-lg text-[11px] overflow-x-auto border border-stone-200/60">
              {currentAgent.mathFormula}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 space-y-1">
            <span className="font-bold text-stone-500 uppercase text-[10px] tracking-wider block">
              입출력 텐서 형상 (Tensor Dimensionality)
            </span>
            <div className="font-mono text-stone-800 bg-stone-50 p-2.5 rounded-lg text-[11px] overflow-x-auto border border-stone-200/60">
              {currentAgent.tensorShapes}
            </div>
          </div>
        </div>

        {/* How It Applies in the App */}
        <div className="text-xs text-stone-700 space-y-1 bg-white/80 p-3.5 rounded-xl border border-stone-200/60">
          <span className="font-bold text-stone-900">실제 길벗 AI Agents 여행사 앱 적용 원리:</span>
          <p className="leading-relaxed">{currentAgent.howItApplies}</p>
        </div>

        {/* Colab Quick Guide Banner */}
        <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/30 text-amber-900 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Colab 실행 팁</strong>: <b>[Colab 다운로드 (.ipynb)]</b> 버튼을 클릭하여 받은 파일을 <a href="https://colab.research.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google Colab</a>의 '파일 &gt; 노트북 업로드'에 넣으면 GPU 가속 환경에서 즉시 실행됩니다.
            </span>
          </div>
        </div>
      </div>

      {/* Code Viewer (Dark Terminal Style) with Language Tabs: TypeScript vs Python vs Split */}
      <div className="rounded-2xl overflow-hidden border border-stone-800 shadow-md bg-stone-950 text-stone-200 font-mono text-xs">
        {/* Terminal Header with Code Language Switcher */}
        <div className="bg-stone-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>

            {/* Language Selection Tabs: TypeScript vs Python vs Side-by-Side Split */}
            <div className="flex items-center gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800 text-[11px]">
              <button
                onClick={() => setActiveCodeTab('TYPESCRIPT')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCodeTab === 'TYPESCRIPT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>TypeScript 코드 보기</span>
              </button>

              <button
                onClick={() => setActiveCodeTab('PYTHON')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCodeTab === 'PYTHON'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Python (PyTorch) 코드 보기</span>
              </button>

              <button
                onClick={() => setActiveCodeTab('SPLIT')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCodeTab === 'SPLIT'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="TypeScript와 Python 코드를 나란히 좌우로 비교합니다"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>좌우 분할 비교 (Split)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-stone-400 font-mono hidden sm:inline">
              {activeCodeTab === 'TYPESCRIPT'
                ? `src/services/${currentAgent.id}Agent.ts`
                : activeCodeTab === 'PYTHON'
                ? `agents/${currentAgent.id}_agent.py`
                : 'TypeScript vs Python Side-by-Side'}
            </span>

            <button
              onClick={handleDownloadColab}
              className="text-[11px] px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Colab .ipynb 받기</span>
            </button>
          </div>
        </div>

        {/* Code View Body */}
        {activeCodeTab === 'TYPESCRIPT' && (
          <div className="p-4 sm:p-5 overflow-x-auto max-h-[460px] leading-relaxed text-[12px] animate-fadeIn">
            <div className="text-[11px] text-blue-400 mb-2 font-mono flex items-center gap-2 border-b border-stone-800 pb-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>[TypeScript 프로덕션 소스코드] - 길벗 웹 애플리케이션 프론트엔드 및 런타임 구동 엔진</span>
            </div>
            <pre className="text-emerald-300 font-mono whitespace-pre">{currentAgent.code}</pre>
          </div>
        )}

        {activeCodeTab === 'PYTHON' && (
          <div className="p-4 sm:p-5 overflow-x-auto max-h-[460px] leading-relaxed text-[12px] animate-fadeIn">
            <div className="text-[11px] text-amber-400 mb-2 font-mono flex items-center gap-2 border-b border-stone-800 pb-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>[Python / PyTorch 딥러닝 소스코드] - Google Colab 및 Jupyter Notebook 즉시 실행 가능</span>
            </div>
            <pre className="text-amber-200 font-mono whitespace-pre">{currentPythonCode}</pre>
          </div>
        )}

        {activeCodeTab === 'SPLIT' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-800 max-h-[500px] overflow-y-auto animate-fadeIn">
            {/* Left: TypeScript */}
            <div className="p-4 sm:p-5 overflow-x-auto text-[11px] leading-relaxed">
              <div className="text-[11px] text-blue-400 mb-2 font-mono flex items-center justify-between border-b border-stone-800 pb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" /> TypeScript (Web App)
                </span>
                <span className="text-[10px] text-stone-500 font-mono">{currentAgent.id}Agent.ts</span>
              </div>
              <pre className="text-emerald-300 font-mono whitespace-pre">{currentAgent.code}</pre>
            </div>

            {/* Right: Python PyTorch */}
            <div className="p-4 sm:p-5 overflow-x-auto text-[11px] leading-relaxed bg-stone-950/60">
              <div className="text-[11px] text-amber-400 mb-2 font-mono flex items-center justify-between border-b border-stone-800 pb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" /> Python (Colab / PyTorch)
                </span>
                <span className="text-[10px] text-stone-500 font-mono">{currentAgent.id}_agent.py</span>
              </div>
              <pre className="text-amber-200 font-mono whitespace-pre">{currentPythonCode}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Live Simulation Output Box */}
      {executionOutput && (
        <div className="bg-stone-900 rounded-2xl p-5 border border-emerald-500/60 text-white space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between text-xs border-b border-stone-800 pb-2.5">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              <span>브라우저 런타임 실행 결과 (Execution Output)</span>
            </span>
            <span className="text-[11px] text-stone-400 font-mono">Status: 200 OK (0.02s)</span>
          </div>

          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800/80 font-mono text-xs text-stone-300 max-h-56 overflow-y-auto">
            <pre className="text-emerald-400">{JSON.stringify(executionOutput, null, 2)}</pre>
          </div>

          <div className="text-[11px] text-stone-400 flex items-center justify-between">
            <span>* 본 시뮬레이션 결과는 사용자가 여행 의뢰 시 백엔드 파이프라인에서 실제 생성되는 데이터 포맷과 100% 동일합니다.</span>
            <button
              onClick={handleDownloadColab}
              className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
            >
              Colab에서 직접 데이터 수정 및 훈련하기 &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
