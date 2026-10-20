/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Check, Compass, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { loginUser, registerUser, startSocialLogin, AuthUser } from '../../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  onGuestExplore?: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onGuestExplore,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [initialMode, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSocialClick = (provider: 'google' | 'kakao' | 'naver') => {
    startSocialLogin(provider);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await loginUser(loginEmail.trim(), loginPassword);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim()) {
      setErrorMessage('이름 또는 닉네임을 입력해주세요.');
      return;
    }
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setErrorMessage('올바른 이메일 형식을 입력해주세요.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('[필수] 서비스 이용약관에 동의해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
      });
      setSuccessMessage(res.message || '회원가입이 완료되었습니다! 로그인해주세요.');
      setMode('login');
      setLoginEmail(regEmail.trim());
      setLoginPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || '회원가입 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-fade-in">
      {/* Modal Box */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-stone-100/80 hover:bg-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center transition-colors"
          title="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT BRAND BANNER */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#064e43] via-[#0b6456] to-[#04332c] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background circle decoration */}
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-teal-300/10 blur-2xl pointer-events-none" />

          <div>
            {/* Logo badge */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Compass className="w-5 h-5 text-emerald-300" />
              </div>
              <span className="text-sm font-semibold tracking-wide text-emerald-200 uppercase">
                길벗 AI 여행사
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug mb-3">
              출발부터 귀국까지,<br />
              <span className="text-emerald-300">완벽한 맞춤 일정</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed mb-6">
              구글 등 소셜 계정으로 1초 만에 로그인하고, 12인의 AI 멀티에이전트가 설계한 전용 일정을 영구 보관하세요.
            </p>

            {/* Checklist */}
            <div className="space-y-3 text-xs sm:text-sm text-emerald-50">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>12인 자율운영 AI 멀티에이전트 맞춤 일정</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>대한민국 실제 명소·미식 좌표 100% 검증</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>캘린더(.ics) 내보내기 & 24시 응급안전망 연계</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/10 text-[11px] text-emerald-200/60 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>안전한 보안 세션 암호화 인증 적용</span>
          </div>
        </div>

        {/* RIGHT AUTH FORM SECTION */}
        <div className="md:w-7/12 p-6 sm:p-10 flex flex-col justify-center bg-stone-50/50">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl sm:text-2xl font-bold text-stone-900">
                {mode === 'login' ? '로그인' : '회원가입'}
              </h3>
              {/* Tab Toggle */}
              <div className="flex bg-stone-200/80 p-0.5 rounded-xl text-xs font-medium text-stone-600">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMessage(null); }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    mode === 'login' ? 'bg-white text-stone-900 font-bold shadow-xs' : 'hover:text-stone-900'
                  }`}
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMessage(null); }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    mode === 'register' ? 'bg-white text-stone-900 font-bold shadow-xs' : 'hover:text-stone-900'
                  }`}
                >
                  회원가입
                </button>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-stone-500">
              {mode === 'login'
                ? '소셜 계정 또는 이메일로 간편하게 시작하세요.'
                : '길벗 AI 여행사 회원이 되어 나만의 일정을 관리해보세요.'}
            </p>
          </div>

          {/* Toast / Error / Success Message */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SOCIAL LOGIN BUTTONS */}
          <div className="space-y-2.5 mb-6">
            {/* Google Login (Main Highlight) */}
            <button
              type="button"
              onClick={() => handleSocialClick('google')}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 hover:border-stone-400 text-stone-800 text-sm font-semibold flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition-all group"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.25v3.15C3.25 21.36 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.25C.45 8.22 0 10.06 0 12s.45 3.78 1.25 5.39l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.25 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span>Google 계정으로 계속하기</span>
            </button>

            {/* Kakao & Naver secondary buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSocialClick('kakao')}
                className="py-2.5 px-3 rounded-xl bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.86 5.34 4.67 6.72l-1.18 4.35c-.1.38.32.7.67.49l5.12-3.39c.24.02.47.03.72.03 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                </svg>
                <span>카카오로 시작</span>
              </button>
              <button
                type="button"
                onClick={() => handleSocialClick('naver')}
                className="py-2.5 px-3 rounded-xl bg-[#03C75A] hover:bg-[#02b350] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M16.47 12.87L7.04 0H0v24h7.53V11.13L16.96 24H24V0h-7.53v12.87z" />
                </svg>
                <span>네이버로 시작</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-stone-200 w-full" />
            <span className="bg-stone-50 px-3 text-[11px] font-medium text-stone-400 absolute">
              또는 이메일로 {mode === 'login' ? '로그인' : '회원가입'}
            </span>
          </div>

          {/* EMAIL LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">이메일</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-xl border border-stone-300 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">비밀번호</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    required
                    className="w-full pl-9 pr-9 py-2 text-sm bg-white rounded-xl border border-stone-300 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-[#064e43] hover:bg-[#085a4e] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>로그인</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* EMAIL REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">이름 / 닉네임</label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="홍길동"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-xl border border-stone-300 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">이메일</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-xl border border-stone-300 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">비밀번호 (6자 이상)</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="******"
                      required
                      className="w-full pl-9 pr-2 py-2 text-sm bg-white rounded-xl border border-stone-300 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">비밀번호 확인</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="******"
                      required
                      className="w-full pl-9 pr-2 py-2 text-sm bg-white rounded-xl border border-stone-300 focus:outline-hidden focus:border-[#064e43] focus:ring-1 focus:ring-[#064e43] transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-3.5 h-3.5 text-[#064e43] rounded-xs border-stone-300"
                  />
                  <span>[필수] 길벗 AI 여행사 이용약관 및 개인정보 처리방침 동의</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-[#064e43] hover:bg-[#085a4e] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>회원가입 완료</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Guest Explore Link */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                onGuestExplore?.();
                onClose();
              }}
              className="text-xs text-stone-500 hover:text-stone-800 underline transition-colors"
            >
              로그인 없이 게스트로 둘러보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
