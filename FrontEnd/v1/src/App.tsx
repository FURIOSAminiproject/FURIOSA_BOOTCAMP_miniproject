/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FullTravelPlan, TravelRequest, AgentLog, AgencyStats } from './types/travel';
import { orchestrateTravelPlan } from './services/aiTravelAgent';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { AgentTeamIntro } from './components/AgentTeamIntro';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminApprovalModal } from './components/AdminApprovalModal';
import { ShareModal } from './components/ShareModal';
import { PrintVoucher } from './components/PrintVoucher';
import { GisVerificationModal } from './components/GisVerificationModal';
import { TravelerSocialFeed } from './components/TravelerSocialFeed';
import { AiTransformerStudio } from './components/AiTransformerStudio';
import { WeatherTechStudio } from './components/WeatherTechStudio';
import { UserHomePage } from './components/UserHomePage';
import { RouteExplorerPage, TripRequestPage } from './components/RouteExplorerPage';
import { TripResultsPage } from './components/TripResultsPage';
import { TripWorkspaceProvider, useTripWorkspace } from './components/TripWorkspaceContext';
import { AuthModal } from './components/auth/AuthModal';
import { getCurrentUser, logoutUser, AuthUser } from './services/authService';
import { AiTravelChatWidget } from './components/AiTravelChatWidget';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  return <TripWorkspaceProvider><AppContent /></TripWorkspaceProvider>;
}

function AppContent() {
  const { dispatch: tripDispatch } = useTripWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  React.useEffect(() => {
    // 입력 화면 하단에서 결과로 넘어와도 요약과 비교 카드부터 읽을 수 있도록 한다.
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.title = location.pathname === '/trips/new' ? '여행 계획하기 | 길벗 여행'
      : location.pathname === '/trips' || location.pathname === '/trips/archive' ? '내 여행 결과 | 길벗 여행'
      : '길벗 여행 - 경로를 비교하고 여행 장소를 찾다';
  }, [location.pathname]);
  // const [currentTab, setCurrentTab] = useState<'EXPLORE' | 'REQUEST' | 'PLAN' | 'ADMIN' | 'STUDIO' | 'WEATHER_STUDIO'>('EXPLORE');
  const [currentTab, setCurrentTab] = useState<'EXPLORE' | 'REQUEST' | 'PLAN' | 'ARCHIVE' | 'ADMIN' | 'USER' | 'STUDIO' | 'WEATHER_STUDIO' | 'ROUTES'>(() => {
    // 공개 여행 화면은 인증 응답을 기다리는 동안에도 올바른 경로에서 시작한다.
    switch (location.pathname) {
      case '/trips/new': return 'REQUEST';
      case '/trips': return 'PLAN';
      case '/trips/archive': return 'ARCHIVE';
      case '/routes': return 'ROUTES';
      case '/Admin': return 'ADMIN';
      case '/user': return 'USER';
      case '/studio': return 'STUDIO';
      case '/weather-studio': return 'WEATHER_STUDIO';
      default: return 'EXPLORE';
    }
  });
  const pathByTab = {
    EXPLORE: '/',
    REQUEST: '/trips/new',
    PLAN: '/trips',
    ARCHIVE: '/trips/archive',
    ADMIN: '/Admin',
    USER: '/user',
    STUDIO: '/studio',
    WEATHER_STUDIO: '/weather-studio',
    ROUTES: '/routes',
  } as const;

  const tabByPath: Record<string, typeof currentTab> = {
    '/': 'EXPLORE',
    '/trips/new': 'REQUEST',
    '/trips': 'PLAN',
    '/trips/archive': 'ARCHIVE',
    '/Admin': 'ADMIN',
    '/user': 'USER',
    '/studio': 'STUDIO',
    '/weather-studio': 'WEATHER_STUDIO',
    '/routes': 'ROUTES',
  };

  const handleSelectTab = (tab: typeof currentTab) => {
    setCurrentTab(tab);
    if (location.pathname !== pathByTab[tab]) {
      navigate(pathByTab[tab]);
    }
  };

  // React.useEffect(() => {
  //   if (!authReady) return;

  //   const path = location.pathname;

  //   if (path === '/Admin' && currentUser?.role !== 'Admin') {
  //     navigate(currentUser ? '/user' : '/', { replace: true });

  //     if (!currentUser) {
  //       setAuthModalMode('login');
  //       setAuthModalOpen(true);
  //     }
  //     return;
  //   }

  //   if (path === '/user' && !currentUser) {
  //     navigate('/', { replace: true });
  //     setAuthModalMode('login');
  //     setAuthModalOpen(true);
  //     return;
  //   }

  //   const tab = tabByPath[path] ?? 'EXPLORE';
  //   setCurrentTab(tab);

  //   if (!(path in tabByPath)) {
  //     navigate('/', { replace: true });
  //   }
  // }, [location.pathname, navigate, currentUser, authReady]);
  
  // User Authentication state (v2 Auth integration)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  
  // Plans list
  const [plans, setPlans] = useState<FullTravelPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<FullTravelPlan | null>(null);

  // Agency Stats
  const [agencyStats, setAgencyStats] = useState<AgencyStats>({
    totalRequests: 0, autoDesignedCount: 0, approvedCount: 0, revisingCount: 0,
    approvalRate: 0, totalEstimatedRevenue: 0, topDestinations: [], averageDesignTimeSeconds: 0,
  });

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

  // Authentication & OAuth session restore
  React.useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const oauthStatus = params.get('oauth');

      if (oauthStatus === 'error') {
        showToast(
          params.get('message') || '소셜 로그인에 실패했습니다.'
        );

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }

      try {
        const user = await getCurrentUser();

        if (!active) return;

        setCurrentUser(user);

        if (oauthStatus === 'success' && user) {
          showToast('소셜 로그인이 성공적으로 완료되었습니다!');

          navigate(
            user.role === 'Admin' ? '/Admin' : '/user',
            { replace: true }
          );
        } else if (oauthStatus === 'success' && !user) {
          showToast('로그인 세션을 확인할 수 없습니다. 다시 로그인해주세요.');
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      } catch {
        if (!active) return;
        setCurrentUser(null);
      } finally {
        if (active) setAuthReady(true);
      }
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);
  React.useEffect(() => {
  // 로그인 상태 확인이 끝나기 전에는 권한 판단을 보류한다.
    if (!authReady) return;

    const path = location.pathname;

    if (path === '/Admin' && currentUser?.role !== 'Admin') {
      navigate(currentUser ? '/user' : '/', { replace: true });

      if (!currentUser) {
        setAuthModalMode('login');
        setAuthModalOpen(true);
      }
      return;
    }

    if (path === '/user' && !currentUser) {
      navigate('/', { replace: true });
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }

    const tab = tabByPath[path] ?? 'EXPLORE';
    setCurrentTab(tab);

    if (!(path in tabByPath)) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate, currentUser, authReady]);

  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    setCurrentUser(null);
    tripDispatch({ type: 'new' });
    showToast('로그아웃되었습니다.');
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setAuthModalOpen(false);

    navigate(
      user.role === 'Admin' ? '/Admin' : '/user',
      { replace: true }
    );

    showToast(`${user.name || user.email}님 환영합니다!`);
  };

  // 홈의 예시 카드는 지역 검색어만 전달한다. 가상 일정이나 좌표는 결과로 등록하지 않는다.
  function startTrip(destinationQuery = '') {
    tripDispatch({ type: 'new', destinationQuery });
    handleSelectTab('REQUEST');
  }

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
    if (selectedPlan?.requestId === updatedPlan.requestId) {
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
    handleSelectTab('PLAN');
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
    if (selectedPlan?.requestId === rejectedPlan.requestId) {
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
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
      />

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {currentTab === 'ROUTES' && <RouteExplorerPage />}
        {/* TAB 1: EXPLORE / MAIN PAGE */}
        {currentTab === 'EXPLORE' && (
          <div className="w-full">
            {/* Main Hero Banner with 2 Action Buttons */}
            <HeroBanner
              onStartRequest={() => startTrip()}
              onStartChat={() => {
                tripDispatch({ type: 'new' });
                handleSelectTab('REQUEST');
                navigate('/trips/new?mode=chat');
              }}
            />
          </div>
        )}

        {currentTab === 'USER' && (
          <UserHomePage
            currentUser={currentUser}
            onStartRequest={() => {
              tripDispatch({ type: 'new' });
              handleSelectTab('REQUEST');
              navigate('/trips/new?mode=planner');
            }}
            onStartChat={() => {
              tripDispatch({ type: 'new' });
              handleSelectTab('REQUEST');
              navigate('/trips/new?mode=chat');
            }}
            onOpenTripArchive={() => handleSelectTab('PLAN')}
            onQuickExplore={startTrip}
            onSelectPlan={plan => startTrip(plan.request.destination)}
            onSelectDestination={startTrip}
            onOpenStudio={() => handleSelectTab('STUDIO')}
            onOpenWeatherStudio={() => handleSelectTab('WEATHER_STUDIO')}
          />
        )}

        {/* 기존 보관함 URL도 같은 실제 조회 결과를 표시한다. 예시 일정은 사용하지 않는다. */}
        {(currentTab === 'PLAN' || currentTab === 'ARCHIVE') && <TripResultsPage />}
        {currentTab === 'REQUEST' && <TripRequestPage onComplete={() => handleSelectTab('PLAN')} />}

        {/* TAB 4: ADMIN APPROVAL CENTER */}
        {currentTab === 'ADMIN' &&
          authReady &&
          currentUser?.role === 'Admin' && (
            <AdminDashboard
              stats={agencyStats}
              allPlans={plans}
              onSelectPlan={(plan) => {
                setSelectedPlan(plan);
                handleSelectTab('PLAN');
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
            onNavigateToRequest={() => handleSelectTab('REQUEST')}
            onNavigateToPlan={() => handleSelectTab('PLAN')}
            onNavigateToWeatherStudio={() => handleSelectTab('WEATHER_STUDIO')}
          />
        )}

        {/* TAB 6: WEATHER FORECAST TECH ANALYSIS STUDIO (LSTM & ENSEMBLE) */}
        {currentTab === 'WEATHER_STUDIO' && (
          <WeatherTechStudio
            onNavigateToRequest={() => handleSelectTab('REQUEST')}
            onNavigateToTransformerStudio={() => handleSelectTab('STUDIO')}
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
      {shareModalOpen && selectedPlan && (
        <ShareModal
          plan={selectedPlan}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Printable Travel Voucher */}
      {printVoucherOpen && selectedPlan && (
        <PrintVoucher
          plan={selectedPlan}
          onClose={() => setPrintVoucherOpen(false)}
        />
      )}

      {/* GIS Coordinate & Map PUSH Verification Modal */}
      {gisModalOpen && selectedPlan && (
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

      {/* Gemini Flash-Lite 기반 실시간 AI 여행 상담 플로팅 챗봇 */}
      <AiTravelChatWidget />

      {/* Footer - I am your J branding */}
      <footer className="mt-20 border-t border-[#e8e4dc] py-10 text-xs text-stone-500 bg-[#faf7f2] print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <div className="font-bold text-stone-900 text-sm">I am your J</div>
          <div>경로를 비교하고, 길 위의 여행 장소를 찾는 국내여행 서비스</div>
          <div className="text-stone-400">© 2026 I am your J. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
