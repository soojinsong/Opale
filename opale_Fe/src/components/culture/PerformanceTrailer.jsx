import React, { useRef } from 'react';
import styles from './PerformanceTrailer.module.css';

const PerformanceTrailer = ({ englishTitle, title, trailerImage, videos = [] }) => {
  const scrollContainerRef = useRef(null);

  if (videos && videos.length > 0) {
    const scrollLeft = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const scrollAmount = container.offsetWidth;
        const currentScroll = container.scrollLeft;
        
        if (currentScroll <= 0) {
          container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
      }
    };

    const scrollRight = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const scrollAmount = container.offsetWidth;
        const currentScroll = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.offsetWidth;
        
        if (currentScroll >= maxScroll - 1) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }
    };

    return (
      <div className={styles.videosSection}>
        <div className={styles.videosContainer} ref={scrollContainerRef}>
          {videos.map((video) => (
            <div key={video.performanceVideoId} className={styles.videoContainer}>
              <iframe
                src={video.embedUrl}
                title={video.title}
                className={styles.videoIframe}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ))}
        </div>
        {/* 영상이 2개 이상일 때만 버튼 표시 */}
        {videos.length > 1 && (
          <>
            <button 
              className={styles.scrollButtonLeft}
              onClick={scrollLeft}
              aria-label="이전 영상"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <button 
              className={styles.scrollButtonRight}
              onClick={scrollRight}
              aria-label="다음 영상"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          </>
        )}
      </div>
    );
  }

  return null;
};

export default PerformanceTrailer;
