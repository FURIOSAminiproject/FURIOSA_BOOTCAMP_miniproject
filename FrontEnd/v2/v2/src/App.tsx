import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import './App.css';

type PageType = 'login' | 'register';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('login');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const handleLoginSuccess = (user: string) => {
    setCurrentUser(user);
    setIsGuest(false);
  };

  const handleRegisterSuccess = (email: string, nickname: string) => {
    setCurrentUser(nickname || email);
    setIsGuest(false);
  };

  const handleGuestExplore = () => {
    setIsGuest(true);
    setCurrentUser('게스트 사용자');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsGuest(false);
    setCurrentPage('login');
  };

  // If logged in or guest browsing, show greeting/dashboard mockup
  if (currentUser) {
    return (
      <div className="main-welcome-screen">
        <div className="welcome-card">
          <div className="welcome-icon">✈️</div>
          <h2>글로벌 트립 플래너에 오신 것을 환영합니다!</h2>
          <p className="welcome-user">
            {isGuest ? (
              <span><strong>게스트 모드</strong>로 둘러보는 중입니다.</span>
            ) : (
              <span><strong>{currentUser}</strong> 님, 환영합니다!</span>
            )}
          </p>
          <p className="welcome-desc">
            출발지, 경유지, 목적지를 자유롭게 구성하고 AI 맞춤 여행 일정을 계획해보세요.
          </p>
          <button className="logout-btn" onClick={handleLogout}>
            로그아웃 / 로그인 화면으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (currentPage === 'register') {
    return (
      <RegisterPage
        onNavigateToLogin={() => setCurrentPage('login')}
        onRegisterSuccess={handleRegisterSuccess}
        onGuestExplore={handleGuestExplore}
      />
    );
  }

  return (
    <LoginPage
      onLoginSuccess={handleLoginSuccess}
      onNavigateToRegister={() => setCurrentPage('register')}
      onGuestExplore={handleGuestExplore}
    />
  );
}

export default App;
