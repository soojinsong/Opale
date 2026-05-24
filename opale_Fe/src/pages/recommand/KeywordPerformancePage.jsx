/*
공연 키워드 성과 페이지:
 - URL 쿼리 파라미터로 키워드 수신
 - API에서 해당 키워드와 관련된 공연 목록 조회  
  - 공연 카드 형태로 결과 표시 (포스터, 제목, 장소, 날짜, 평점 등)
  - 관심 공연 토글 기능 (API 연동)
  - 검색어와 관련된 공연이 없을 때 빈 상태 메시지 표시
  - 로딩 상태 처리 (로딩 스피너 표시)
*/

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePerformanceList } from '../../hooks/usePerformanceList';
import PerformanceApiCard from '../../components/cards/PerformanceApiCard';
import { fetchFavoritePerformanceIds, togglePerformanceFavorite } from '../../api/favoriteApi';
import styles from './KeywordPerformancePage.module.css';

import { getImageUrl } from '../../utils/imageUtils';

const KeywordPerformancePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') || '';
  
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  useEffect(() => {
    const loadFavoriteIds = async () => {
      try {
        const ids = await fetchFavoritePerformanceIds();
        setFavoriteIds(new Set(ids));
      } catch (err) {
        console.error('관심 공연 ID 목록 조회 실패:', err);
        setFavoriteIds(new Set());
      }
    };
    loadFavoriteIds();
  }, []);

  const handleFavoriteToggle = async (performanceId) => {
    try {
      const result = await togglePerformanceFavorite(performanceId);
      setFavoriteIds((prev) => {
        const newSet = new Set(prev);
        if (result) {
          newSet.add(performanceId);
        } else {
          newSet.delete(performanceId);
        }
        return newSet;
      });
    } catch (err) {
      console.error('관심 토글 실패:', err);
    }
  };

  const { performances, sentinelRef, loading } = usePerformanceList({
    genre: null,
    keyword: keyword,
    sortType: '인기',
  });

  const filteredPerformances = performances.filter((performance) => {
    const keywords = performance.keywords || [];
    return keywords.some((k) => k === keyword || k.toLowerCase().includes(keyword.toLowerCase()));
  });

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>←</button>
        <h2 className={styles.headerTitle}>#{keyword}</h2>
        <div></div>
      </div>

      {/* 공연 목록 */}
      <div className={styles.content}>
        {loading && filteredPerformances.length === 0 ? (
          <div className={styles.loading}>로딩 중...</div>
        ) : filteredPerformances.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>'{keyword}' 키워드와 관련된 공연이 없습니다.</p>
            <p className={styles.emptySubText}>다른 키워드를 검색해보세요.</p>
          </div>
        ) : (
          <div className={styles.performanceGrid}>
            {filteredPerformances.map((performance) => {
              const imageUrl = getImageUrl(
                performance.posterImage || 
                performance.poster || 
                performance.image
              );
              
              return (
                <PerformanceApiCard
                  key={performance.id || performance.performanceId}
                  id={performance.id || performance.performanceId}
                  image={imageUrl}
                  title={performance.title || performance.performanceName}
                  venue={performance.venue || performance.venueName}
                  startDate={performance.startDate || performance.startDateStr}
                  endDate={performance.endDate || performance.endDateStr}
                  rating={performance.rating || performance.averageRating}
                  reviewCount={performance.reviewCount || performance.reviewCount}
                  keywords={performance.keywords || []}
                  genre={performance.genre || performance.category}
                  isFavorite={favoriteIds.has(performance.id || performance.performanceId)}
                  onFavoriteToggle={handleFavoriteToggle}
                  onClick={(id) => navigate(`/culture/${id}`)}
                />
              );
            })}
          </div>
        )}
        <div ref={sentinelRef} style={{ height: '20px' }} />
      </div>
    </div>
  );
};

export default KeywordPerformancePage;
