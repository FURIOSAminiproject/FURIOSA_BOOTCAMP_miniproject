import React, { useEffect, useState } from 'react';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import { getCurrentUser, logoutUser } from './services/authService';
import './App.css';

type PageType = 'login' | 'register';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('login');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    if (oauthStatus === 'error') {
      window.alert(params.get('message') || '소셜 로그인에 실패했습니다. 다시 시도해주세요.');
    }
    if (oauthStatus) window.history.replaceState({}, document.title, window.location.pathname);

    getCurrentUser()
      .then((user) => {
        if (user) {
          setCurrentUser(user.name || user.email || '사용자');
          setIsGuest(false);
        }
      })
      .catch(() => {
        // 서버 연결 오류는 로그인 화면에서 사용자가 다시 시도할 수 있도록 처리합니다.
      });
  }, []);

  const handleLoginSuccess = (user: string) => {
    setCurrentUser(user);
    setIsGuest(false);
  };

  const handleRegisterSuccess = (_email: string, _nickname: string) => {
    // 회원가입만으로 로그인된 것으로 처리하지 않습니다. 등록 후 로그인 화면으로 이동합니다.
    setCurrentUser(null);
    setIsGuest(false);
    setCurrentPage('login');
  };

  const handleGuestExplore = () => {
    setIsGuest(true);
    setCurrentUser('게스트 사용자');
  };

  const handleLogout = async () => {
    try { await logoutUser(); } catch { /* 서버 연결이 끊겨도 로컬 화면에서는 로그아웃합니다. */ }
    setCurrentUser(null);
    setIsGuest(false);
    setCurrentPage('login');
  };

  if (currentUser) {
    return (
      <div className="main-welcome-screen">
        <div className="welcome-card">
          <div className="welcome-icon">✈️</div>
          <h2>글로벌 트립 플래너에 오신 것을 환영합니다!</h2>
          <p className="welcome-user">
            {isGuest ? <span><strong>게스트 모드</strong>로 둘러보는 중입니다.</span> : <span><strong>{currentUser}</strong> 님, 환영합니다!</span>}
          </p>
          <p className="welcome-desc">출발지, 경유지, 목적지를 자유롭게 구성하고 AI 맞춤 여행 일정을 계획해보세요.</p>
          <button className="logout-btn" onClick={handleLogout}>로그아웃 / 로그인 화면으로 돌아가기</button>
        </div>
      </div>
    );
  }

  if (currentPage === 'register') {
    return <RegisterPage onNavigateToLogin={() => setCurrentPage('login')} onRegisterSuccess={handleRegisterSuccess} onGuestExplore={handleGuestExplore} />;
  }

  return <LoginPage onLoginSuccess={handleLoginSuccess} onNavigateToRegister={() => setCurrentPage('register')} onGuestExplore={handleGuestExplore} />;
}

export default App;
