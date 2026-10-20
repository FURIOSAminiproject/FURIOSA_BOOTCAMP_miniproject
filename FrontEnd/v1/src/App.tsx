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
import { WeatherPredictionWidget } from './components/WeatherPredictionWidget';
import { ShareModal } from './components/ShareModal';
import { PrintVoucher } from './components/PrintVoucher';
import { GisVerificationModal } from './components/GisVerificationModal';
import { TravelerSocialFeed } from './components/TravelerSocialFeed';
import { AiTransformerStudio } from './components/AiTransformerStudio';
import { WeatherTechStudio } from './components/WeatherTechStudio';
import { AuthModal } from './components/auth/AuthModal';
import { getCurrentUser, logoutUser, startSocialLogin, AuthUser } from './services/authService';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'EXPLORE' | 'REQUEST' | 'PLAN' | 'ADMIN' | 'STUDIO' | 'WEATHER_STUDIO'>('EXPLORE');
  const [isAdmin, setIsAdmin] = useState<boolean>(true); // Logged in as administrator
  
  // User Authentication state (v2 Auth integration)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  
  // Plans list
  const [plans, setPlans] = useState<FullTravelPlan[]>([PRESET_JEJU_PLAN, PRESET_GYEONGJU_PLAN]);
  const [selectedPlan, setSelectedPlan] = useState<FullTravelPlan>(PRESET_JEJU_PLAN);

  // Pre-filled destination for request form if clicked from explore or weather prediction
  const [targetDestination, setTargetDestination] = useState<string>('제주');

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
  const [gisModalOpen, setGisModalOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Count pending approval plans
  const pendingCount = plans.filter(p => p.request.status === 'PENDING_APPROVAL').length;

  // Authentication & OAuth session restore
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    if (oauthStatus === 'success') {
      showToast('소셜 로그인이 성공적으로 완료되었습니다!');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthStatus === 'error') {
      showToast(params.get('message') || '소셜 로그인에 실패했습니다. 다시 시도해주세요.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    getCurrentUser()
      .then(user => {
        if (user) {
          setCurrentUser(user);
        }
      })
      .catch(() => {});
  }, []);

  const handleDirectGoogleLogin = () => {
    startSocialLogin('google');
  };

  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    setCurrentUser(null);
    showToast('로그아웃되었습니다.');
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    showToast(`${user.name || user.email}님 환영합니다!`);
  };

  // Handler: User submits new travel request
  const handleRequestSubmit = async (req: TravelRequest) => {
    setIsGenerating(true);
    setAgentLogs([]);
    setCurrentTab('REQUEST'); // Keep on request page to show real-time orchestration

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
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 flex flex-col font-sans selection:bg-[#064e43] selection:text-white">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#064e43] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm border border-emerald-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
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
          showToast(!isAdmin ? '관리자 권한으로 로그인되었습니다.' : '일반 모드로 전환되었습니다.');
        }}
        pendingCount={pendingCount}
        currentUser={currentUser}
        onOpenLogin={handleOpenLogin}
        onDirectGoogleLogin={handleDirectGoogleLogin}
        onLogout={handleLogout}
      />

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* TAB 1: EXPLORE / MAIN PAGE */}
        {currentTab === 'EXPLORE' && (
          <div className="space-y-12">
            {/* 1. Hero Banner with Jeju Coast image & "이렇게 진행돼요" */}
            <HeroBanner
              onStartRequest={() => setCurrentTab('REQUEST')}
              onQuickExplore={(dest) => {
                setTargetDestination(dest);
                if (dest.includes('제주')) {
                  setSelectedPlan(PRESET_JEJU_PLAN);
                  setCurrentTab('PLAN');
                } else if (dest.includes('경주')) {
                  setSelectedPlan(PRESET_GYEONGJU_PLAN);
                  setCurrentTab('PLAN');
                } else {
                  setCurrentTab('REQUEST');
                }
              }}
              onOpenStudio={() => setCurrentTab('STUDIO')}
              onOpenWeatherStudio={() => setCurrentTab('WEATHER_STUDIO')}
            />

            {/* 2. "우리 여행사의 AI 에이전트 팀" & "인기 여행지" */}
            <AgentTeamIntro
              onSelectPlan={(plan) => {
                setSelectedPlan(plan);
                setCurrentTab('PLAN');
              }}
              onSelectDestination={(dest) => {
                setTargetDestination(dest);
              }}
              onOpenStudio={() => setCurrentTab('STUDIO')}
              onOpenWeatherStudio={() => setCurrentTab('WEATHER_STUDIO')}
            />

            {/* 3. NEW: 10-Year Climate ML/DL Long-term Forecast & Smart Packing Widget */}
            <WeatherPredictionWidget
              initialDestination={targetDestination}
              onApplyToTripRequest={(dest, start, end) => {
                setTargetDestination(dest);
                setCurrentTab('REQUEST');
              }}
              onOpenWeatherStudio={() => setCurrentTab('WEATHER_STUDIO')}
            />

            {/* 4. NEW: Traveler Social Feed & Shared Itineraries */}
            <TravelerSocialFeed
              onLoadPresetPlan={(plan) => {
                setSelectedPlan(plan);
                setCurrentTab('PLAN');
              }}
              onExploreDestination={(dest) => {
                setTargetDestination(dest);
              }}
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
              initialDestination={targetDestination}
            />
          </div>
        )}

        {/* TAB 3: PLAN DETAIL & MAP */}
        {currentTab === 'PLAN' && (
          <div className="space-y-6">
            {/* Plan Switcher */}
            {plans.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-semibold text-stone-500 shrink-0">일정 보관함:</span>
                {plans.map(p => (
                  <button
                    key={p.requestId}
                    onClick={() => setSelectedPlan(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                      selectedPlan.requestId === p.requestId
                        ? 'bg-[#064e43] text-white shadow-2xs'
                        : 'bg-white text-stone-600 hover:bg-stone-100 border border-[#e5e0d8]'
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
              onOpenGisModal={() => setGisModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 4: ADMIN APPROVAL CENTER */}
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

        {/* TAB 5: AI & TRANSFORMER ARCHITECTURE STUDIO */}
        {currentTab === 'STUDIO' && (
          <AiTransformerStudio
            onNavigateToRequest={() => setCurrentTab('REQUEST')}
            onNavigateToPlan={() => setCurrentTab('PLAN')}
            onNavigateToWeatherStudio={() => setCurrentTab('WEATHER_STUDIO')}
          />
        )}

        {/* TAB 6: WEATHER FORECAST TECH ANALYSIS STUDIO (LSTM & ENSEMBLE) */}
        {currentTab === 'WEATHER_STUDIO' && (
          <WeatherTechStudio
            onNavigateToRequest={() => setCurrentTab('REQUEST')}
            onNavigateToTransformerStudio={() => setCurrentTab('STUDIO')}
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

      {/* GIS Coordinate & Map PUSH Verification Modal */}
      {gisModalOpen && (
        <GisVerificationModal
          plan={selectedPlan}
          isOpen={gisModalOpen}
          onClose={() => setGisModalOpen(false)}
        />
      )}

      {/* v2 Auth Modal (Google, Social, Email Login / Register) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authModalMode}
        onGuestExplore={() => {
          showToast('게스트 모드로 둘러봅니다.');
          setAuthModalOpen(false);
        }}
      />

      {/* Footer - Exactly matching screenshot footer */}
      <footer className="mt-20 border-t border-[#e8e4dc] py-10 text-xs text-stone-500 bg-[#faf7f2] print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <div className="font-bold text-stone-900 text-sm">길벗 AI Agents 여행사</div>
          <div>12인의 AI 에이전트 팀이 설계하고, 담당자가 최종 확정하는 국내여행 서비스</div>
          <div className="text-stone-400">© 2026 Gilbeot AI Travel. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
