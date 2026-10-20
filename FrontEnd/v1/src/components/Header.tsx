import React, { useState } from 'react';
import { Compass, LogOut, LogIn, Menu, X, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentTab: 'EXPLORE' | 'REQUEST' | 'PLAN' | 'ADMIN' | 'STUDIO' | 'WEATHER_STUDIO';
  onSelectTab: (tab: 'EXPLORE' | 'REQUEST' | 'PLAN' | 'ADMIN' | 'STUDIO' | 'WEATHER_STUDIO') => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  isAdmin,
  onToggleAdmin,
  pendingCount
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

        {/* Far Right Action: Log out / Log in toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleAdmin}
            className="hidden sm:flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 transition-colors"
            title="관리자 권한 토글"
          >
            <LogOut className="w-4 h-4" />
            <span>{isAdmin ? '로그아웃' : '로그인'}</span>
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
          <div className="pt-2 border-t border-stone-200">
            <button
              onClick={() => {
                onToggleAdmin();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3.5 py-2 text-xs text-stone-500 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isAdmin ? '관리자 권한 해제' : '관리자 권한으로 로그인'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
