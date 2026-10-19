import React, { useState } from 'react';
import './LoginPage.css';

export interface LoginPageProps {
  onLoginSuccess?: (userEmail: string) => void;
  onNavigateToRegister?: () => void;
  onGuestExplore?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
  onGuestExplore,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleSocialLogin = (provider: '카카오' | '네이버' | 'Google') => {
    showNotification(`${provider} 간편 로그인을 진행합니다.`);
    if (onLoginSuccess) {
      setTimeout(() => onLoginSuccess(`${provider.toLowerCase()}_user@trip.ai`), 800);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showNotification('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    showNotification(`${email} 계정으로 로그인되었습니다.`);
    if (onLoginSuccess) {
      setTimeout(() => onLoginSuccess(email), 800);
    }
  };

  const handleGuest = () => {
    if (onGuestExplore) {
      onGuestExplore();
    } else {
      showNotification('게스트 모드로 메인 페이지를 둘러봅니다.');
    }
  };

  const isFormFilled = email.trim().length > 0 && password.trim().length > 0;

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* ================= LEFT BANNER ================= */}
        <div className="login-banner">
          <div className="banner-top-content">
            {/* Top Squircle Compass Badge */}
            <div className="brand-logo-badge" title="Global Trip Planner">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" stroke="#ffffff" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#ffffff" fillOpacity="0.3" stroke="#ffffff" strokeWidth="1.6" />
              </svg>
            </div>

            {/* Pill Tag */}
            <div className="planner-tag">국내 여행 플래너</div>

            {/* Title */}
            <h1 className="banner-title">
              <span className="title-line1">출발부터 귀국까지,</span>
              <span className="title-line2">완벽한 맞춤 일정</span>
            </h1>

            {/* Subtitle */}
            <p className="banner-subtitle">
              소셜 아이디로 간편하게 로그인하고 나만의 여행 일정을 안전하게 보관하세요.
            </p>

            {/* Features Checklist */}
            <div className="banner-features">
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.75" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M6.2 10.2L8.8 12.8L14 7.6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="feature-text">AI agent가 계획하는 여행일정</span>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.75" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M6.2 10.2L8.8 12.8L14 7.6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="feature-text">Google Flights &amp; Trainline 실시간 요금 연동</span>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.75" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M6.2 10.2L8.8 12.8L14 7.6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="feature-text">2D 인터랙티브 세계지도 &amp; 공항 터미널 줌인</span>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.75" stroke="#10b981" strokeWidth="1.8" />
                    <path d="M6.2 10.2L8.8 12.8L14 7.6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="feature-text">여행지 즐길거리 원클릭 일정 담기</span>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="banner-copyright">
            © 2026 Global Trip Planner. All rights reserved.
          </div>
        </div>

        {/* ================= RIGHT FORM ================= */}
        <div className="login-form-section">
          <div>
            {/* Header */}
            <div className="form-header">
              <h2 className="form-title">로그인 / 회원가입</h2>
              <p className="form-desc">소셜 네트워크 계정으로 1초 만에 간편하게 시작하세요.</p>
            </div>

            {toastMessage && <div className="login-toast">{toastMessage}</div>}

            {/* Social Buttons */}
            <div className="social-buttons-container">
              {/* Kakao */}
              <button
                type="button"
                className="social-btn kakao-btn"
                onClick={() => handleSocialLogin('카카오')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
                  <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.86 5.34 4.67 6.72l-1.18 4.35c-.1.38.32.7.67.49l5.12-3.39c.24.02.47.03.72.03 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                </svg>
                <span>카카오로 시작하기</span>
              </button>

              {/* Naver */}
              <button
                type="button"
                className="social-btn naver-btn"
                onClick={() => handleSocialLogin('네이버')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M16.47 12.87L7.04 0H0v24h7.53V11.13L16.96 24H24V0h-7.53v12.87z" />
                </svg>
                <span>네이버로 시작하기</span>
              </button>

              {/* Google */}
              <button
                type="button"
                className="social-btn google-btn"
                onClick={() => handleSocialLogin('Google')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
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
            </div>

            {/* Divider */}
            <div className="divider">
              <span className="divider-text">또는 이메일로 로그인</span>
            </div>

            {/* Email / Password Form */}
            <form className="email-login-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  type="email"
                  className="form-input"
                  placeholder="이메일 주소 입력"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="input-group">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type="password"
                  className="form-input"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className={`submit-btn ${isFormFilled ? 'active' : ''}`}
              >
                이메일로 로그인
              </button>
            </form>
          </div>

          {/* Footer links */}
          <div className="form-footer-links">
            <span className="register-text">
              계정이 아직 없으신가요?
              <a
                href="#register"
                className="link-primary"
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigateToRegister) {
                    onNavigateToRegister();
                  } else {
                    showNotification('이메일 회원가입 화면으로 이동합니다.');
                  }
                }}
              >
                이메일로 회원가입
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </span>

            <a
              href="#guest"
              className="guest-link"
              onClick={(e) => {
                e.preventDefault();
                handleGuest();
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

export default LoginPage;

