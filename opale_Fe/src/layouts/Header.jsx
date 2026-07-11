import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import opaleLogo from '../assets/opale_logo_crop.png';
import settingsIcon from '../assets/settings.png';
import './Header.css';

const Header = ({ showBackButton = false, title = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = useSelector((state) => state.user.isLoggedIn);
  const user = useSelector((state) => state.user.user);
  const isAdmin = user?.role === 'ADMIN';

  const handleBackClick = () => {
    // 딥링크 등으로 앱 내 히스토리 없이 바로 이 페이지에 진입한 경우(location.key === 'default')엔
    // navigate(-1)이 앱 밖(이전 사이트/빈 탭)으로 나가버릴 수 있어 안전한 목적지로 보낸다.
    // 히스토리가 있으면 실제로 왔던 곳으로 돌아가야 하므로 항상 navigate(-1) 사용
    // (예: 공연 상세 → 오픈채팅 진입 후 뒤로가기 시, 채팅 목록이 아니라 공연 상세로 돌아가야 함).
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    if (location.pathname.match(/^\/chat\/([^/]+)$/)) {
      navigate('/chat');
    } else if (location.pathname.match(/^\/place\/([^/]+)$/)) {
      navigate('/place', { state: { fromDetailPlace: true } });
    } else {
      navigate('/');
    }
  };

  const showLogo = !showBackButton;

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          {showBackButton ? (
            <button onClick={handleBackClick} className="back-button">←</button>
          ) : (
            <Link to="/" className="logo-link">
              <img src={opaleLogo} alt="Opale" className="logo-image" />
            </Link>
          )}
        </div>
        <div className="header-right">
          {isLoggedIn ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="admin-icon-btn" title="운영자 페이지">
                  <img src={settingsIcon} alt="설정" className="admin-icon-image" />
                </Link>
              )}
              <Link to="/my" className="login-btn">MY</Link>
            </>
          ) : (
            <Link to="/login" className="login-btn">로그인</Link>
          )}
        </div>
      </div>
      <div className="header-divider"></div>
    </header>
  );
};

export default Header;
