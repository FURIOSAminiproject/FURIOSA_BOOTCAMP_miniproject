import React from 'react';
import { AgentLog } from '../types/travel';
import { AGENT_TEAM } from '../services/aiTravelAgent';
import { Compass, Landmark, UtensilsCrossed, Hotel, Navigation, CalendarDays, ShieldCheck, Feather, CheckCircle2, Loader2, Sparkles, ShieldAlert, CloudSun, LifeBuoy } from 'lucide-react';

interface AgentOrchestrationViewProps {
  logs: AgentLog[];
  isGenerating: boolean;
}

export const AgentOrchestrationView: React.FC<AgentOrchestrationViewProps> = ({
  logs,
  isGenerating
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldAlert': return <ShieldAlert className="w-4 h-4 text-emerald-300" />;
      case 'Compass': return <Compass className="w-4 h-4" />;
      case 'CloudSun': return <CloudSun className="w-4 h-4 text-sky-300" />;
      case 'Landmark': return <Landmark className="w-4 h-4" />;
      case 'UtensilsCrossed': return <UtensilsCrossed className="w-4 h-4" />;
      case 'Hotel': return <Hotel className="w-4 h-4" />;
      case 'Navigation': return <Navigation className="w-4 h-4" />;
      case 'CalendarDays': return <CalendarDays className="w-4 h-4" />;
      case 'LifeBuoy': return <LifeBuoy className="w-4 h-4 text-emerald-300" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4" />;
      case 'Feather': return <Feather className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 sm:p-7 shadow-xl border border-stone-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono tracking-wider text-emerald-400 uppercase">
              Autonomous Multi-Agent Orchestration
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mt-1 flex items-center gap-2">
            <span>AI 멀티에이전트 자율 협업 오케스트레이션</span>
            {isGenerating && (
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span>총괄 협연자(Supervisor) 감독 하 기상·안전·지식전달 포함 12인의 전문 AI 에이전트 자율 협업</span>
        </div>
      </div>

      {/* Agents Mini Avatar Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
        {AGENT_TEAM.map(agent => {
          const hasLog = logs.some(l => l.agentId === agent.id);
          const isDone = logs.some(l => l.agentId === agent.id && l.status === 'DONE');
          const isCurrent = logs.length > 0 && logs[logs.length - 1].agentId === agent.id;

          return (
            <div
              key={agent.id}
              className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                isCurrent && isGenerating
                  ? 'border-amber-400 bg-amber-950/40 shadow-sm ring-1 ring-amber-400/50 scale-105'
                  : hasLog
                  ? 'border-stone-700 bg-stone-800/80 text-stone-200'
                  : 'border-stone-800 bg-stone-950/40 text-stone-500 opacity-60'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${agent.avatarColor}`}>
                {getIcon(agent.avatarIcon)}
              </div>
              <span className="text-[11px] font-bold truncate max-w-full">
                {agent.name}
              </span>
              <span className="text-[9px] text-stone-400 truncate max-w-full">
                {agent.title.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Real-time Message Log Stream */}
      <div className="bg-stone-950 rounded-xl p-4 sm:p-5 border border-stone-800/90 font-mono text-xs max-h-72 overflow-y-auto space-y-3.5 scrollbar-thin">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-stone-900/70 border border-stone-800/60 animate-in fade-in duration-300"
          >
            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${log.avatarColor} text-[10px]`}>
              {getIcon(log.avatarIcon)}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-300">{log.agentName}</span>
                  <span className="text-[10px] text-stone-400 px-1.5 py-0.5 rounded bg-stone-800">
                    {log.agentRole}
                  </span>
                </div>
                <span className="text-[10px] text-stone-500">{log.timestamp}</span>
              </div>

              <p className="text-stone-200 text-xs leading-relaxed font-sans">
                {log.message}
              </p>

              {log.detail && (
                <p className="text-[11px] text-stone-400 font-sans border-l-2 border-stone-700 pl-2 mt-1">
                  {log.detail}
                </p>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-center gap-2 text-amber-400 text-xs py-2 px-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="animate-pulse">다음 전문 에이전트가 데이터 교차 검증을 수행하고 있습니다...</span>
          </div>
        )}
      </div>
    </div>
  );
};
