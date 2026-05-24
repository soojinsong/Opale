import React from 'react';
import PerformanceCard from '../culture/PerformanceCard';
import RecommendationSkeleton from './RecommendationSkeleton';
import useCarousel from '../../hooks/useCarousel';
import { getImageUrl } from '../../utils/imageUtils';

const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return '';
  if (!endDate) return startDate;
  return `${startDate} ~ ${endDate}`;
};

const PerformanceCarousel = ({ performances = [], loading = false, emptyMessage = '공연이 없습니다.', styles }) => {
  const {
    currentIndex, displayIndex, isTransitioning,
    sliderRef, infiniteItems,
    goToSlide, handleStart, handleMove, handleEnd, handleTransitionEnd,
  } = useCarousel(performances);

  if (loading) return <RecommendationSkeleton />;

  if (performances.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div
        className={styles.sliderContainer}
        ref={sliderRef}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        <div
          className={styles.sliderTrack}
          style={{
            transform: `translateX(-${displayIndex * (100 / 2.5)}%)`,
            transition: isTransitioning ? 'transform 0.3s ease' : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {infiniteItems.map((performance, index) => {
            const imageUrl = getImageUrl(performance.poster || performance.image);
            const dateStr = formatDateRange(performance.startDate, performance.endDate);
            return (
              <div
                key={`${performance.id || performance.performanceId}-${index}`}
                className={styles.slideCard}
              >
                <PerformanceCard
                  id={performance.id || performance.performanceId}
                  title={performance.title}
                  image={imageUrl || performance.poster || performance.image || 'wicked'}
                  rating={parseFloat(performance.rating || 0).toFixed(1)}
                  reviewCount={performance.reviewCount || 0}
                  date={dateStr}
                  keywords={performance.keywords || []}
                  variant="default"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.sliderIndicators}>
        {performances.map((_, index) => (
          <button
            key={index}
            className={`${styles.indicator} ${currentIndex === index ? styles.active : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`슬라이드 ${index + 1}`}
          />
        ))}
      </div>

      <button
        className={styles.prevButton}
        onClick={() => goToSlide(currentIndex - 1)}
        aria-label="이전 슬라이드"
      >
        ‹
      </button>
      <button
        className={styles.nextButton}
        onClick={() => goToSlide(currentIndex + 1)}
        aria-label="다음 슬라이드"
      >
        ›
      </button>
    </>
  );
};

export default PerformanceCarousel;
