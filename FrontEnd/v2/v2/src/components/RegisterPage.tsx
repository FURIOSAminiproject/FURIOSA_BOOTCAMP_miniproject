import React, { useState } from 'react';
import './RegisterPage.css';
import { registerUser } from '../services/authService';

export interface RegisterPageProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess?: (userEmail: string, nickname: string) => void;
  onGuestExplore?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateToLogin,
  onRegisterSuccess,
  onGuestExplore,
}) => {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isFormValid =
    nickname.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword &&
    agreeTerms &&
    !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      showNotification('이름 또는 닉네임을 입력해주세요.');
      return;
    }
    if (!email.trim()) {
      showNotification('이메일 주소를 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      showNotification('비밀번호는 6자리 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      showNotification('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!agreeTerms) {
      showNotification('[필수] 서비스 이용약관에 동의해야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await registerUser({
        name: nickname.trim(),
        email: email.trim(),
        password,
      });

      showNotification(
        response.message || `${nickname}님, 회원가입이 성공적으로 완료되었습니다!`,
      );

      if (onRegisterSuccess) {
        setTimeout(() => onRegisterSuccess(email, nickname), 1000);
      } else {
        setTimeout(() => onNavigateToLogin(), 1500);
      }
    } catch (err: any) {
      showNotification(err.message || '회원가입 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-wrapper">
      <div className="register-card">
        {/* ================= LEFT BANNER ================= */}
        <div className="register-banner">
          <div className="register-banner-top">
            {/* Top Squircle Logo Badge */}
            <div className="register-logo-badge" title="Global Trip Planner">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" stroke="#ffffff" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#ffffff" fillOpacity="0.3" stroke="#ffffff" strokeWidth="1.6" />
              </svg>
            </div>

            {/* Tag */}
            <div className="register-tag">이메일 간편 회원가입</div>

            {/* Title */}
            <h1 className="register-banner-title">
              <span className="title-line1">나만의 국내 여행,</span>
              <span className="title-line2">지금 바로 시작하세요</span>
            </h1>

            {/* Subtitle */}
            <p className="register-banner-subtitle">
              이메일 주소로 간편하게 가입하고, 저장된 맞춤 일정과 실시간 KTX·항공권 정보를 언제 어디서나 관리하세요.
            </p>

            {/* Feature Bullets */}
            <div className="register-features">
              <div className="register-feature-item">
                <div className="register-feature-icon">
                  <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.75" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M6.2 10.2L8.8 12.8L14 7.6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="register-feature-text">회원 전용 여행 일정 클라우드 보관함</span>
              </div>

              <div className="register-feature-item">
                <div className="register-feature-icon">
                  <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.75" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M6.2 10.2L8.8 12.8L14 7.6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="register-feature-text">KTX 및 국내선 항공권 실시간 요금 비교</span>
              </div>

              <div className="register-feature-item">
                <div className="register-feature-icon">
                  <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.75" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M6.2 10.2L8.8 12.8L14 7.6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="register-feature-text">국내 인터랙티브 지도와 스톱오버 루트 생성</span>
              </div>

              <div className="register-feature-item">
                <div className="register-feature-icon">
                  <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.75" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M6.2 10.2L8.8 12.8L14 7.6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="register-feature-text">일정표 PDF 영수증 &amp; 브리핑 다운로드</span>
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="register-banner-footer">
            <span>© 2026 Global Trip Planner.</span>
            <span className="privacy-badge">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              개인정보 안심 보호
            </span>
          </div>
        </div>

        {/* ================= RIGHT FORM ================= */}
        <div className="register-form-section">
          <div>
            {/* Header */}
            <div className="register-header-row">
              <h2 className="register-title">
                이메일 회원가입
                <span className="sparkle-icon" aria-label="sparkles">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    <path d="M5 3v4" />
                    <path d="M19 17v4" />
                    <path d="M3 5h4" />
                    <path d="M17 19h4" />
                  </svg>
                </span>
              </h2>
              <button
                type="button"
                className="back-to-login-btn"
                onClick={onNavigateToLogin}
              >
                ← 로그인으로
              </button>
            </div>
            <p className="register-desc">사용하실 이메일 주소와 정보를 입력해 계정을 만들어보세요.</p>

            {toastMessage && <div className="register-toast">{toastMessage}</div>}

            {/* Form */}
            <form className="register-form" onSubmit={handleSubmit}>
              {/* Field 1: Name / Nickname */}
              <div className="form-field">
                <label className="field-label">
                  이름 또는 닉네임 <span className="required-mark">*</span>
                </label>
                <div className="register-input-group">
                  <span className="register-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="5" />
                      <path d="M20 21a8 8 0 1 0-16 0" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="register-input"
                    placeholder="예: 홍길동 또는 여행자민준"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </div>
              </div>

              {/* Field 2: Email */}
              <div className="form-field">
                <label className="field-label">
                  이메일 주소 <span className="required-mark">*</span>
                </label>
                <div className="register-input-group">
                  <span className="register-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    className="register-input"
                    placeholder="traveler@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <p className="input-helper-text">
                  아이디로 사용할 수 있는 유효한 이메일 주소를 입력해주세요.
                </p>
              </div>

              {/* Field 3: Password */}
              <div className="form-field">
                <label className="field-label">
                  비밀번호 <span className="required-mark">*</span>
                </label>
                <div className="register-input-group">
                  <span className="register-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="register-input with-toggle"
                    placeholder="영문, 숫자 포함 6자리 이상"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Field 4: Confirm Password */}
              <div className="form-field">
                <label className="field-label">
                  비밀번호 확인 <span className="required-mark">*</span>
                </label>
                <div className="register-input-group">
                  <span className="register-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="register-input"
                    placeholder="비밀번호 다시 입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="agreements-container">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <span>
                    <span className="term-tag">[필수]</span> 서비스 이용약관 및 개인정보 수집·이용에 동의합니다.
                  </span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreeMarketing}
                    onChange={(e) => setAgreeMarketing(e.target.checked)}
                  />
                  <span>
                    <span className="term-tag">[선택]</span> 맞춤형 여행 코스 및 특가 할인 알림 수신에 동의합니다.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`register-submit-btn ${isFormValid ? 'active' : ''}`}
                disabled={!isFormValid || isLoading}
              >
                <span>{isLoading ? '회원가입 처리 중...' : '이메일로 회원가입 완료'}</span>
                {!isLoading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>
          </div>

          {/* Footer links */}
          <div className="register-footer-links">
            <span className="login-redirect-text">
              이미 계정이 있으신가요?
              <a
                href="#login"
                className="login-link-bold"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateToLogin();
                }}
              >
                로그인하기
              </a>
            </span>

            <a
              href="#guest"
              className="guest-link-gray"
              onClick={(e) => {
                e.preventDefault();
                if (onGuestExplore) onGuestExplore();
              }}
            >
              로그인 없이 둘러보기
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

