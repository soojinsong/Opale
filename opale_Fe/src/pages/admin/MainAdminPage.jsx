/* 
메인 관리자 페이지: 
  - 프로필 섹션 (이름, 이미지)
  - 메뉴 리스트 (공연 관리, 배너 관리 등)
  - 배너 관리 (드롭다운 메뉴)
*/

import React, { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./MainAdminPage.module.css";

const MainAdminPage = () => {
  const [isBannerMenuOpen, setIsBannerMenuOpen] = useState(false);

  const toggleBannerMenu = () => {
    setIsBannerMenuOpen(!isBannerMenuOpen);
  };

  return (
    <div className={styles.container}>
      {/* 프로필 섹션 */}
      <div className={styles.profileSection}>
        <div className={styles.profileImage}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ffb6c1" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
        </div>
        <div className={styles.profileName}>
          운영자
        </div>
      </div>

      {/* 메뉴 리스트 */}
      <div className={styles.menuList}>
        <Link to="/admin/dashboard" className={styles.menuItem}>
          <div className={styles.menuIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <span className={styles.menuText}>통계 대시보드</span>
          <div className={styles.menuArrow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </Link>

        <Link to="/admin/reports" className={styles.menuItem}>
          <div className={styles.menuIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <span className={styles.menuText}>신고 관리</span>
          <div className={styles.menuArrow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </Link>

        <Link to="/admin/tips" className={styles.menuItem}>
          <div className={styles.menuIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <span className={styles.menuText}>제보 관리</span>
          <div className={styles.menuArrow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </Link>

        <Link to="/admin/performance" className={styles.menuItem}>
          <div className={styles.menuIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <span className={styles.menuText}>공연 상세 정보 관리</span>
          <div className={styles.menuArrow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </Link>

        {/* 배너 관리 메뉴 (드롭다운) */}
        <div className={styles.menuItemWithDropdown}>
          <div 
            className={styles.menuItem} 
            onClick={toggleBannerMenu}
          >
            <div className={styles.menuIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </div>
            <span className={styles.menuText}>배너 관리</span>
            <div className={`${styles.menuArrow} ${isBannerMenuOpen ? styles.rotated : ''}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
          
          {/* 드롭다운 하위 메뉴 */}
          {isBannerMenuOpen && (
            <div className={styles.subMenuList}>
              <Link to="/admin/banner/home" className={styles.subMenuItem}>
                <span className={styles.subMenuText}>홈 배너 관리</span>
                <div className={styles.menuArrow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </Link>
              <Link to="/admin/banner/performance" className={styles.subMenuItem}>
                <span className={styles.subMenuText}>홈 공연 배너 관리</span>
                <div className={styles.menuArrow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </Link>
              <Link to="/admin/banner/content" className={styles.subMenuItem}>
                <span className={styles.subMenuText}>홈 컨텐츠 배너 관리</span>
                <div className={styles.menuArrow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainAdminPage;
