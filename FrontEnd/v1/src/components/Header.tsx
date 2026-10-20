import React, { useState } from 'react';
import { Compass, LogOut, LogIn, Menu, X, ShieldCheck, User } from 'lucide-react';
import { AuthUser } from '../services/authService';

interface HeaderProps {
  currentTab: 'EXPLORE' | 'REQUEST' | 'PLAN' | 'ADMIN' | 'STUDIO' | 'WEATHER_STUDIO';
  onSelectTab: (tab: 'EXPLORE' | 'REQUEST' | 'PLAN' | 'ADMIN' | 'STUDIO' | 'WEATHER_STUDIO') => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  pendingCount: number;
  currentUser?: AuthUser | null;
  onOpenLogin?: () => void;
  onDirectGoogleLogin?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  isAdmin,
  onToggleAdmin,
  pendingCount,
  currentUser,
  onOpenLogin,
  onDirectGoogleLogin,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (tab: 'EXPLORE' | 'REQUEST' | 'PLAN' | 'ADMIN' | 'STUDIO' | 'WEATHER_STUDIO') => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#faf7f2]/95 backdrop-blur-md border-b border-[#e8e4dc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand - Exactly matching screenshots */}
        <div
          onClick={() => handleNav('EXPLORE')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-full bg-[#064e43] text-white flex items-center justify-center shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <span className="font-bold text-stone-900 text-lg sm:text-xl tracking-tight">
            길벗 AI Agents 여행사
          </span>
        </div>

        {/* Center / Right Navigation */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-sm font-medium text-stone-700">
          <button
            onClick={() => handleNav('REQUEST')}
            className={`transition-colors py-1 ${
              currentTab === 'REQUEST'
                ? 'font-bold text-[#064e43]'
                : 'hover:text-stone-900'
            }`}
          >
            여행 의뢰
          </button>

          <button
            onClick={() => handleNav('PLAN')}
            className={`transition-colors py-1 ${
              currentTab === 'PLAN'
                ? 'font-bold text-[#064e43]'
                : 'hover:text-stone-900'
            }`}
          >
            내 여행
          </button>

          {/* AI & Transformer Studio Tab */}
          <button
            onClick={() => handleNav('STUDIO')}
            className={`transition-all px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
              currentTab === 'STUDIO'
                ? 'bg-violet-800 text-white font-bold shadow-xs'
                : 'hover:text-stone-900 text-stone-700'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600"></span>
            </span>
            <span>AI 스튜디오</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
              currentTab === 'STUDIO' ? 'bg-amber-300 text-stone-950' : 'bg-violet-100 text-violet-800'
            }`}>
              Transformer
            </span>
          </button>

          {/* NEW: Weather AI & LSTM Tech Studio Tab */}
          <button
            onClick={() => handleNav('WEATHER_STUDIO')}
            className={`transition-all px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
              currentTab === 'WEATHER_STUDIO'
                ? 'bg-sky-800 text-white font-bold shadow-xs'
                : 'hover:text-stone-900 text-stone-700'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-600"></span>
            </span>
            <span>기상예보 기술 분석</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
              currentTab === 'WEATHER_STUDIO' ? 'bg-amber-300 text-stone-950' : 'bg-sky-100 text-sky-800'
            }`}>
              LSTM·앙상블
            </span>
          </button>

          <button
            onClick={() => handleNav('ADMIN')}
            className={`transition-all px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
              currentTab === 'ADMIN'
                ? 'bg-[#064e43] text-white font-semibold'
                : 'hover:text-stone-900'
            }`}
          >
            <span>관리자</span>
            {pendingCount > 0 && (
              <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                currentTab === 'ADMIN' ? 'bg-amber-400 text-stone-950' : 'bg-rose-600 text-white'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
        </nav>

        {/* Far Right Action: Auth & Admin Controls */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="max-w-[110px] truncate">{currentUser.name || currentUser.email || '사용자'}님</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition-colors px-2 py-1 cursor-pointer"
                title="로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Direct Google Login Button */}
              <button
                onClick={onDirectGoogleLogin || onOpenLogin}
                className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-stone-300 text-xs font-semibold text-stone-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                title="Google 계정으로 빠른 로그인"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.25v3.15C3.25 21.36 7.31 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.25C.45 8.22 0 10.06 0 12s.45 3.78 1.25 5.39l4.02-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.25 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
                </svg>
                <span>Google 로그인</span>
              </button>

              {/* Full Auth Modal trigger */}
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#064e43] hover:bg-[#085a4e] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                title="로그인 또는 회원가입 모달 열기"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>로그인</span>
              </button>
            </div>
          )}

          {/* Admin toggle */}
          <button
            onClick={onToggleAdmin}
            className="hidden xl:flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-600 transition-colors ml-1 cursor-pointer"
            title="관리자 권한 토글"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAdmin ? '관리자 ON' : '관리자 OFF'}</span>
          </button>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-stone-700 hover:bg-stone-200/50"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e8e4dc] bg-[#faf7f2] px-4 pt-3 pb-5 space-y-2">
          <button
            onClick={() => handleNav('EXPLORE')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              currentTab === 'EXPLORE' ? 'bg-[#064e43] text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            홈 (소개 & 장기 기상예보)
          </button>
          <button
            onClick={() => handleNav('REQUEST')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              currentTab === 'REQUEST' ? 'bg-[#064e43] text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            여행 의뢰
          </button>
          <button
            onClick={() => handleNav('PLAN')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              currentTab === 'PLAN' ? 'bg-[#064e43] text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            내 여행
          </button>
          <button
            onClick={() => handleNav('STUDIO')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between ${
              currentTab === 'STUDIO' ? 'bg-violet-800 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span>AI 트랜스포머 스튜디오</span>
            </div>
            <span className="text-[10px] bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full font-bold">
              코드 전격 공개
            </span>
          </button>
          <button
            onClick={() => handleNav('WEATHER_STUDIO')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between ${
              currentTab === 'WEATHER_STUDIO' ? 'bg-sky-800 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>기상예보 기술 분석 스튜디오</span>
            </div>
            <span className="text-[10px] bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full font-bold">
              LSTM·앙상블
            </span>
          </button>
          <button
            onClick={() => handleNav('ADMIN')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between ${
              currentTab === 'ADMIN' ? 'bg-[#064e43] text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <span>관리자 승인 센터</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold">
                {pendingCount}건 대기
              </span>
            )}
          </button>
          <div className="pt-3 border-t border-stone-200 space-y-2">
            {currentUser ? (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold">
                <span>{currentUser.name || currentUser.email}님 환영합니다</span>
                <button
                  onClick={() => {
                    onLogout?.();
                    setMobileMenuOpen(false);
                  }}
                  className="text-stone-500 hover:text-stone-800 underline ml-2"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    onDirectGoogleLogin?.();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-white border border-stone-300 text-xs font-semibold text-stone-800 flex items-center justify-center gap-2 shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.25v3.15C3.25 21.36 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.25C.45 8.22 0 10.06 0 12s.45 3.78 1.25 5.39l4.02-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.25 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
                  </svg>
                  <span>Google 계정으로 로그인</span>
                </button>
                <button
                  onClick={() => {
                    onOpenLogin?.();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#064e43] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>로그인 / 회원가입</span>
                </button>
              </div>
            )}
            <button
              onClick={() => {
                onToggleAdmin();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3.5 py-2 text-xs text-stone-500 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAdmin ? '관리자 권한 해제' : '관리자 권한으로 로그인'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
