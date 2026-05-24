import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import './MainLayout.css';

const MainLayout = () => {
  const location = useLocation();
  const mainContentRef = useRef(null);

    const getHeaderProps = () => {
      const pathname = location.pathname;
      
      const cultureDetailMatch = pathname.match(/^\/culture\/([^/]+)$/);
      if (cultureDetailMatch && !pathname.includes('/culture/search') && pathname !== '/culture/review') {
        return { showBackButton: true, title: null };
      }
      
      const placeDetailMatch = pathname.match(/^\/place\/([^/]+)$/);
      if (placeDetailMatch && !pathname.includes('/place/search')) {
        return { showBackButton: true, title: null };
      }
      
      const chatDetailMatch = pathname.match(/^\/chat\/([^/]+)$/);
      if (chatDetailMatch && !pathname.includes('/chat/search')) {
        return { showBackButton: true, title: null };
      }
    
    if (pathname.startsWith('/my/') || 
        pathname === '/culture/review' ||
        pathname.startsWith('/culture/search') ||
        pathname.startsWith('/place/search') ||
        pathname.startsWith('/chat/search')) {
      return { showBackButton: true, title: null };
    }
    
    if (pathname === '/culture') {
      return { showBackButton: false, title: '공연' };
    }
    if (pathname === '/place') {
      return { showBackButton: false, title: '공연장' };
    }
    if (pathname === '/chat') {
      return { showBackButton: false, title: '채팅' };
    }
    if (pathname === '/recommend') {
      return { showBackButton: false, title: '추천' };
    }
    
    return { showBackButton: false, title: null };
  };

  const headerProps = getHeaderProps();

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="main-layout">
      <Header {...headerProps} />
      <main ref={mainContentRef} className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
