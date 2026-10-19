import React, { useState } from 'react';
import { Compass, ShieldCheck, MapPin, Sparkles, User, UserCheck, Menu, X, Clock } from 'lucide-react';

interface HeaderProps {
  currentTab: 'REQUEST' | 'PLAN' | 'EXPLORE' | 'ADMIN';
  onSelectTab: (tab: 'REQUEST' | 'PLAN' | 'EXPLORE' | 'ADMIN') => void;
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

  const handleNav = (tab: 'REQUEST' | 'PLAN' | 'EXPLORE' | 'ADMIN') => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => handleNav('EXPLORE')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-stone-900 text-base sm:text-lg tracking-tight font-serif">
                길벗 AI 여행사
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 hidden sm:inline">
                국내 자율운영
              </span>
            </div>
            <p className="text-[11px] text-stone-500 hidden sm:block">
              여행 계획은 AI 팀이, 확정은 사람이.
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => handleNav('REQUEST')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              currentTab === 'REQUEST'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            여행 의뢰하기
          </button>

          <button
            onClick={() => handleNav('PLAN')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
              currentTab === 'PLAN'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            내 여행 일정
          </button>

          <button
            onClick={() => handleNav('EXPLORE')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
              currentTab === 'EXPLORE'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            추천 코스 & AI 에이전트
          </button>

          <button
            onClick={() => handleNav('ADMIN')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 relative ${
              currentTab === 'ADMIN'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-500" />
            <span>관리자 인가 센터</span>
            {pendingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Action: Admin / Client Role Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAdmin}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs ${
              isAdmin
                ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
            title="고객 모드와 여행사 총괄 관리자 모드를 전환합니다"
          >
            {isAdmin ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-rose-600" />
                <span>관리자 모드 (인가 권한)</span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-stone-500" />
                <span>고객 모드</span>
              </>
            )}
          </button>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-5 space-y-2">
          <button
            onClick={() => handleNav('REQUEST')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              currentTab === 'REQUEST' ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            ✨ 여행 의뢰하기
          </button>
          <button
            onClick={() => handleNav('PLAN')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              currentTab === 'PLAN' ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            📅 내 여행 일정
          </button>
          <button
            onClick={() => handleNav('EXPLORE')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              currentTab === 'EXPLORE' ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            🗺️ 추천 코스 & AI 에이전트 소개
          </button>
          <button
            onClick={() => handleNav('ADMIN')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between ${
              currentTab === 'ADMIN' ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              🛡️ 관리자 인가 센터
            </span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold">
                {pendingCount}건 대기
              </span>
            )}
          </button>
        </div>
      )}
    </header>
  );
};
