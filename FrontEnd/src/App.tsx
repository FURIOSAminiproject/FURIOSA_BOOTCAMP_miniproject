/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FullTravelPlan, TravelRequest, AgentLog, AgencyStats } from './types/travel';
import { PRESET_JEJU_PLAN, PRESET_GYEONGJU_PLAN, INITIAL_AGENCY_STATS } from './data/presetData';
import { orchestrateTravelPlan } from './services/aiTravelAgent';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { TravelRequestForm } from './components/TravelRequestForm';
import { AgentOrchestrationView } from './components/AgentOrchestrationView';
import { TravelPlanDetail } from './components/TravelPlanDetail';
import { AgentTeamIntro } from './components/AgentTeamIntro';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminApprovalModal } from './components/AdminApprovalModal';
import { ShareModal } from './components/ShareModal';
import { PrintVoucher } from './components/PrintVoucher';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'EXPLORE' | 'REQUEST' | 'PLAN' | 'ADMIN'>('EXPLORE');
  const [isAdmin, setIsAdmin] = useState<boolean>(true); // First visitor gets admin permissions to test approvals easily
  
  // Plans list
  const [plans, setPlans] = useState<FullTravelPlan[]>([PRESET_JEJU_PLAN, PRESET_GYEONGJU_PLAN]);
  const [selectedPlan, setSelectedPlan] = useState<FullTravelPlan>(PRESET_JEJU_PLAN);

  // Agency Stats
  const [agencyStats, setAgencyStats] = useState<AgencyStats>(INITIAL_AGENCY_STATS);

  // Agent Orchestration live logs
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Modals
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [planForApproval, setPlanForApproval] = useState<FullTravelPlan | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [printVoucherOpen, setPrintVoucherOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Count pending approval plans
  const pendingCount = plans.filter(p => p.request.status === 'PENDING_APPROVAL').length;

  // Handler: User submits new travel request
  const handleRequestSubmit = async (req: TravelRequest) => {
    setIsGenerating(true);
    setAgentLogs([]);
    setCurrentTab('REQUEST'); // Keep on request page showing the live agent orchestration console

    try {
      const newPlan = await orchestrateTravelPlan(req, (log) => {
        setAgentLogs(prev => [...prev, log]);
      });

      // Update plans list (new plan starts with PENDING_APPROVAL)
      setPlans(prev => [newPlan, ...prev]);
      setSelectedPlan(newPlan);

      // Update agency statistics
      setAgencyStats(prev => {
        const total = prev.totalRequests + 1;
        const auto = prev.autoDesignedCount + 1;
        const revenue = prev.totalEstimatedRevenue + newPlan.costs.totalCost;
        return {
          ...prev,
          totalRequests: total,
          autoDesignedCount: auto,
          totalEstimatedRevenue: revenue,
          approvalRate: Math.round((prev.approvedCount / total) * 1000) / 10
        };
      });

      showToast(`'${req.destination}' AI 일정 설계 완료! 관리자 인가 대기 상태로 등록되었습니다.`);
      setCurrentTab('PLAN');
    } catch (err) {
      console.error('Error generating travel plan:', err);
      showToast('일정 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Admin Approves Plan
  const handleApprovePlan = (adminName: string, note?: string) => {
    if (!planForApproval) return;

    const updatedPlan: FullTravelPlan = {
      ...planForApproval,
      request: {
        ...planForApproval.request,
        status: 'APPROVED',
        adminNote: note,
        approvedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
        approverName: adminName
      }
    };

    setPlans(prev => prev.map(p => p.requestId === updatedPlan.requestId ? updatedPlan : p));
    if (selectedPlan.requestId === updatedPlan.requestId) {
      setSelectedPlan(updatedPlan);
    }

    // Update stats
    setAgencyStats(prev => {
      const approved = prev.approvedCount + 1;
      return {
        ...prev,
        approvedCount: approved,
        approvalRate: Math.round((approved / prev.totalRequests) * 1000) / 10
      };
    });

    showToast(`[인가 완료] ${updatedPlan.request.clientName} 고객님의 일정이 최종 확정되었습니다.`);
  };

  // Handler: Admin requests revision
  const handleRevisionRequest = async (feedback: string) => {
    if (!planForApproval) return;
    const target = planForApproval;
    
    // Set to revising
    const revisingPlan: FullTravelPlan = {
      ...target,
      request: {
        ...target.request,
        status: 'REVISING',
        adminNote: `[수정 요청] ${feedback}`
      }
    };

    setPlans(prev => prev.map(p => p.requestId === target.requestId ? revisingPlan : p));
    setSelectedPlan(revisingPlan);
    setCurrentTab('PLAN');
    showToast('AI 에이전트 팀이 관리자 피드백을 반영하여 일정을 재조율하고 있습니다...');

    // Re-orchestrate with feedback
    setIsGenerating(true);
    setAgentLogs([]);
    try {
      const modifiedReq: TravelRequest = {
        ...target.request,
        specialRequests: `${target.request.specialRequests} [관리자 보완지시: ${feedback}]`
      };

      const recomputedPlan = await orchestrateTravelPlan(modifiedReq, (log) => {
        setAgentLogs(prev => [...prev, log]);
      });

      recomputedPlan.request.status = 'PENDING_APPROVAL';
      recomputedPlan.request.adminNote = `관리자 지시사항('${feedback}') 반영 완료. 재심사 요청.`;

      setPlans(prev => prev.map(p => p.requestId === target.requestId ? recomputedPlan : p));
      setSelectedPlan(recomputedPlan);
      showToast('AI 재조율 완료. 다시 관리자 인가를 대기합니다.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Admin rejects
  const handleRejectPlan = (reason: string) => {
    if (!planForApproval) return;
    const rejectedPlan: FullTravelPlan = {
      ...planForApproval,
      request: {
        ...planForApproval.request,
        status: 'REJECTED',
        adminNote: `[반려 사유] ${reason}`
      }
    };
    setPlans(prev => prev.map(p => p.requestId === rejectedPlan.requestId ? rejectedPlan : p));
    if (selectedPlan.requestId === rejectedPlan.requestId) {
      setSelectedPlan(rejectedPlan);
    }
    showToast('해당 여행 의뢰 건이 반려 처리되었습니다.');
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm border border-stone-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navigation Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isAdmin={isAdmin}
        onToggleAdmin={() => {
          setIsAdmin(!isAdmin);
          showToast(!isAdmin ? '여행사 총괄 관리자 모드로 전환되었습니다.' : '고객 모드로 전환되었습니다.');
        }}
        pendingCount={pendingCount}
      />

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* TAB 1: EXPLORE / LANDING */}
        {currentTab === 'EXPLORE' && (
          <div className="space-y-10">
            <HeroBanner
              onStartRequest={() => setCurrentTab('REQUEST')}
              onExplorePreset={(presetId) => {
                if (presetId === 'jeju') {
                  setSelectedPlan(PRESET_JEJU_PLAN);
                  setCurrentTab('PLAN');
                }
              }}
            />

            <AgentTeamIntro
              onSelectPlan={(plan) => {
                setSelectedPlan(plan);
                setCurrentTab('PLAN');
              }}
              onStartRequest={() => setCurrentTab('REQUEST')}
            />
          </div>
        )}

        {/* TAB 2: REQUEST FORM & LIVE ORCHESTRATION */}
        {currentTab === 'REQUEST' && (
          <div className="space-y-6">
            {/* If Generating or Logs available, show live agent orchestration */}
            {(isGenerating || agentLogs.length > 0) && (
              <AgentOrchestrationView
                logs={agentLogs}
                isGenerating={isGenerating}
              />
            )}

            <TravelRequestForm
              onSubmit={handleRequestSubmit}
              isLoading={isGenerating}
            />
          </div>
        )}

        {/* TAB 3: PLAN DETAIL & MAP */}
        {currentTab === 'PLAN' && (
          <div className="space-y-6">
            {/* Quick Plan Switcher if multiple plans exist */}
            {plans.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-semibold text-stone-500 shrink-0">보관된 일정:</span>
                {plans.map(p => (
                  <button
                    key={p.requestId}
                    onClick={() => setSelectedPlan(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                      selectedPlan.requestId === p.requestId
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-white text-stone-600 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    {p.request.clientName} ({p.request.destination})
                  </button>
                ))}
              </div>
            )}

            <TravelPlanDetail
              plan={selectedPlan}
              isAdmin={isAdmin}
              onOpenApprovalModal={() => {
                setPlanForApproval(selectedPlan);
                setApprovalModalOpen(true);
              }}
              onOpenShareModal={() => setShareModalOpen(true)}
              onPrint={() => setPrintVoucherOpen(true)}
            />
          </div>
        )}

        {/* TAB 4: ADMIN DASHBOARD & APPROVAL CENTER */}
        {currentTab === 'ADMIN' && (
          <AdminDashboard
            stats={agencyStats}
            allPlans={plans}
            onSelectPlan={(plan) => {
              setSelectedPlan(plan);
              setCurrentTab('PLAN');
            }}
            onOpenApproval={(plan) => {
              setPlanForApproval(plan);
              setApprovalModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Admin Approval Modal */}
      {approvalModalOpen && planForApproval && (
        <AdminApprovalModal
          plan={planForApproval}
          isOpen={approvalModalOpen}
          onClose={() => setApprovalModalOpen(false)}
          onApprove={handleApprovePlan}
          onRevisionRequest={handleRevisionRequest}
          onReject={handleRejectPlan}
        />
      )}

      {/* Schedule Share Modal */}
      {shareModalOpen && (
        <ShareModal
          plan={selectedPlan}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Printable Travel Voucher */}
      {printVoucherOpen && (
        <PrintVoucher
          plan={selectedPlan}
          onClose={() => setPrintVoucherOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 py-10 mt-16 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <div className="flex items-center gap-2 text-stone-200 font-bold text-sm">
              <span>길벗 AI 여행사 (Gilbeot AI Travel)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-stone-950 font-semibold">
                자율운영 여행사
              </span>
            </div>
            <p className="mt-1 text-stone-500">
              여행 계획은 AI 팀이, 확정은 사람이. · 대한민국 국내 여행 종합 플랫폼
            </p>
          </div>

          <div className="flex items-center gap-4 text-stone-400">
            <span>OpenStreetMap & Leaflet 연동</span>
            <span>·</span>
            <span>네이버 지도 검색 연동</span>
            <span>·</span>
            <span>Gemini AI 엔진 탑재</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
