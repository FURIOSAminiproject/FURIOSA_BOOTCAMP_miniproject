import React, { useState } from 'react';
import { Compass, LogOut, LogIn, Menu, X } from 'lucide-react';
import { AuthUser } from '../services/authService';

type HeaderTab = 'EXPLORE' | 'REQUEST' | 'PLAN' | 'ARCHIVE' | 'ADMIN' | 'USER' | 'STUDIO' | 'WEATHER_STUDIO' | 'ROUTES';

interface HeaderProps {
  currentTab: HeaderTab;
  onSelectTab: (tab: HeaderTab) => void;
  currentUser?: AuthUser | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenLogin,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (tab: HeaderTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const handleBrandClick = () => {
    if (!currentUser) {
      handleNav('EXPLORE');
      return;
    }

    handleNav(currentUser.role === 'Admin' ? 'ADMIN' : 'USER');
  };

  const handleMyTrips = () => {
    handleNav('PLAN');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#faf7f2]/95 backdrop-blur-md border-b border-[#e8e4dc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand - Exactly matching screenshots */}
        <div
          onClick={handleBrandClick}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-full bg-[#064e43] text-white flex items-center justify-center shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <span className="font-bold text-stone-900 text-lg sm:text-xl tracking-tight">
            길벗 여행
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
            여행 계획하기
          </button>

          <button
            onClick={handleMyTrips}
            className={`transition-colors py-1 ${
              currentTab === 'PLAN' || currentTab === 'ARCHIVE'
                ? 'font-bold text-[#064e43]'
                : 'hover:text-stone-900'
            }`}
          >
            내 여행 결과
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

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-stone-700 hover:bg-stone-200/50"
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileMenuOpen}
            aria-controls="travel-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="travel-mobile-menu" className="md:hidden border-t border-[#e8e4dc] bg-[#faf7f2] px-4 pt-3 pb-5 space-y-2">
          <button
            onClick={() => handleNav('EXPLORE')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              currentTab === 'EXPLORE' || currentTab === 'USER' ? 'bg-[#064e43] text-white' : 'text-stone-700 hover:bg-stone-100'
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
            여행 계획하기
          </button>
          <button
            onClick={handleMyTrips}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              currentTab === 'PLAN' || currentTab === 'ARCHIVE' ? 'bg-[#064e43] text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            내 여행 결과
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
          </div>
        </div>
      )}
    </header>
  );
};
