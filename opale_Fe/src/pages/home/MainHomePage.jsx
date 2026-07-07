/* 
 메인 홈페이지 :
  - 메인 배너 캐러셀 (공연장, 공연 신호등, 추천 공연 등 주요 섹션 홍보)
  - CTA 섹션 (공연장 바로가기, 공연 신호등 바로가기)
  - 함께 보는 공연 숏콘텐츠 (배너 형태로, 클릭 시 상세 내용 노출)
  - 추천 공연 (공연 카드 형태로, 캐러셀로 보여주기)
  - 할인 프로모션 섹션 (할인 정보 배너 형태로, 클릭 시 상세 내용 노출)
*/


import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PerformanceCard from '../../components/culture/PerformanceCard';
import DiscountPromotionSection from '../../components/common/DiscountPromotionSection';
import BannerSkeleton from '../../components/common/BannerSkeleton';
import { fetchMainBanners, fetchMainPerformanceBanners, fetchMainContentBanners } from '../../api/bannerApi';
import { normalizeMainBannerList, normalizeMainPerformanceBannerList, normalizeMainContentBannerList } from '../../services/normalizeBanner';
import styles from './MainHomePage.module.css';
import wickedPoster from '../../assets/poster/wicked.gif';

const MainHomePage = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDraggingIndicator, setIsDraggingIndicator] = useState(false);
  const [indicatorStartX, setIndicatorStartX] = useState(0);
  const [indicatorContainerRef, setIndicatorContainerRef] = useState(null);
  const [banners, setBanners] = useState([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [featuredPerformances, setFeaturedPerformances] = useState([]);
  const [loadingFeaturedPerformances, setLoadingFeaturedPerformances] = useState(true);
  const [contentBanners, setContentBanners] = useState([]);
  const [loadingContentBanners, setLoadingContentBanners] = useState(true);
  const [selectedContentIndex, setSelectedContentIndex] = useState(0);
  const [hoveredContentIndex, setHoveredContentIndex] = useState(null);
  const [contentBannerHeight, setContentBannerHeight] = useState('auto');
  const [displayedContentIndex, setDisplayedContentIndex] = useState(0);
  const [borderDisplayedIndex, setBorderDisplayedIndex] = useState(0);
  const contentBannerSectionRef = useRef(null);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        setLoadingBanners(true);
        const data = await fetchMainBanners();
        const normalized = normalizeMainBannerList(data);
        setBanners(normalized);
      } catch (err) {
        console.error("메인 배너 조회 실패:", err);
        setBanners([]);
      } finally {
        setLoadingBanners(false);
      }
    };

    loadBanners();
  }, []);

  useEffect(() => {
    const loadFeaturedPerformances = async () => {
      try {
        setLoadingFeaturedPerformances(true);
        const data = await fetchMainPerformanceBanners();
        const normalized = normalizeMainPerformanceBannerList(data);
        const transformed = normalized.map((banner) => ({
          id: banner.performanceId,
          title: banner.title,
          image: banner.posterUrl,
          rating: banner.rating,
          reviewCount: 0,
          description: `${banner.startDate} ~ ${banner.endDate} | ${banner.placeName}`,
          genre: banner.genrenm,
        }));
        setFeaturedPerformances(transformed);
      } catch (err) {
        console.error("공연 배너 조회 실패:", err);
        setFeaturedPerformances([]);
      } finally {
        setLoadingFeaturedPerformances(false);
      }
    };

    loadFeaturedPerformances();
  }, []);

  useEffect(() => {
    const loadContentBanners = async () => {
      try {
        setLoadingContentBanners(true);
        const data = await fetchMainContentBanners();
        const normalized = normalizeMainContentBannerList(data);
        const transformed = normalized.map((banner) => ({
          id: banner.contentBannerId,
          title: banner.title,
          content: banner.content,
          thumbnail: banner.imageUrl,
          image: banner.imageUrl,
          linkUrl: banner.linkUrl,
          performanceId: banner.performanceId,
        }));
        setContentBanners(transformed);
      } catch (err) {
        console.error("컨텐츠 배너 조회 실패:", err);
        setContentBanners([]);
      } finally {
        setLoadingContentBanners(false);
      }
    };

    loadContentBanners();
  }, []);

  const handleBannerClick = (banner) => {
    if (banner.linkUrl) {
      window.open(banner.linkUrl, '_blank');
    } else if (banner.performanceId) {
      navigate(`/culture/${banner.performanceId}`);
    }
  };

  const slideData = banners;

  useEffect(() => {
    if (slideData.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => 
        prevSlide === slideData.length - 1 ? 0 : prevSlide + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [slideData.length]);

  const goToSlide = (slideIndex) => {
    setCurrentSlide(slideIndex);
  };

  const handleIndicatorMouseDown = (e, index) => {
    e.preventDefault();
    setIsDraggingIndicator(true);
    setIndicatorStartX(e.clientX);
    setCurrentSlide(index);
  };

  const handleIndicatorMouseUp = () => {
    setIsDraggingIndicator(false);
  };

  const getSlideIndexFromMouseX = (clientX, containerRect) => {
    const x = clientX - containerRect.left;
    const containerWidth = containerRect.width;
    const slideRatio = x / containerWidth;
    const slideIndex = Math.round(slideRatio * slideData.length);
    return Math.max(0, Math.min(slideData.length - 1, slideIndex));
  };

  useEffect(() => {
    if (!isDraggingIndicator) return;

    const handleIndicatorMouseMove = (e) => {
      if (!indicatorContainerRef) return;
      
      const rect = indicatorContainerRef.getBoundingClientRect();
      const newIndex = getSlideIndexFromMouseX(e.clientX, rect);
      setCurrentSlide(newIndex);
    };

    const handleMouseUp = () => {
      setIsDraggingIndicator(false);
    };

    document.addEventListener('mousemove', handleIndicatorMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleIndicatorMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isDraggingIndicator, indicatorContainerRef, slideData.length]);

  const displayFeaturedPerformances = useMemo(() => {
    return featuredPerformances;
  }, [featuredPerformances]);

  const [featuredCurrentIndex, setFeaturedCurrentIndex] = useState(0);
  const [prevSlotIndices, setPrevSlotIndices] = useState([0, 1, 2, 3, 4]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const featuredCarouselRef = useRef(null);

  const getCircularIndex = (index) => {
    const length = displayFeaturedPerformances.length;
    if (length === 0) return 0;
    return ((index % length) + length) % length;
  };

  const getSlotIndices = () => {
    return [
      getCircularIndex(featuredCurrentIndex - 2),
      getCircularIndex(featuredCurrentIndex - 1),
      featuredCurrentIndex,
      getCircularIndex(featuredCurrentIndex + 1),
      getCircularIndex(featuredCurrentIndex + 2)
    ];
  };

  const goToFeaturedSlide = (index) => {
    if (displayFeaturedPerformances.length === 0) return;
    
    const currentSlots = getSlotIndices();
    setPrevSlotIndices(currentSlots);
    
    const length = displayFeaturedPerformances.length;
    const targetIndex = ((index % length) + length) % length;
    
    setFeaturedCurrentIndex(targetIndex);
  };

  const getPrevSlotIndex = (performanceIndex) => {
    return prevSlotIndices.findIndex(idx => idx === performanceIndex);
  };

  const displayContentBannerItems = useMemo(() => {
    return contentBanners;
  }, [contentBanners]);

  useEffect(() => {
    if (!contentBannerSectionRef.current) return;
    
    const bannerCount = displayContentBannerItems.length;
    const bannerItemHeight = 60;
    const bannerGap = 10;
    const dropdownHeight = 120;
    const headerHeight = 50;
    const sectionPadding = 40;
    const extraSpace = 20;
    
    const totalHeight = sectionPadding + headerHeight + (bannerCount * bannerItemHeight) + (bannerGap * (bannerCount - 1)) + dropdownHeight + extraSpace;
    
    setContentBannerHeight(`${totalHeight}px`);
  }, [displayContentBannerItems.length]);

  useEffect(() => {
    if (selectedContentIndex === displayedContentIndex) return;
    
    const timer = setTimeout(() => {
      setDisplayedContentIndex(selectedContentIndex);
      setTimeout(() => {
        setBorderDisplayedIndex(selectedContentIndex);
      }, 50);
    }, 350);
    
    return () => clearTimeout(timer);
  }, [selectedContentIndex, displayedContentIndex]);

  useEffect(() => {
    if (hoveredContentIndex !== null) return;
    
    const interval = setInterval(() => {
      setSelectedContentIndex((prev) => 
        prev === displayContentBannerItems.length - 1 ? 0 : prev + 1
      );
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredContentIndex, displayContentBannerItems.length]);

  return (
    <div className={styles.container}>
      {loadingBanners ? (
        <BannerSkeleton />
      ) : slideData.length > 0 ? (
        <section className={styles.carouselSection}>
          <div className={styles.carouselContainer}>
            <div 
              className={styles.carouselTrack} 
              style={{ 
                transform: `translateX(-${currentSlide * (100 / slideData.length)}%)`,
                width: `${slideData.length * 100}%`
              }}
            >
              {slideData.map((banner, index) => {
                const hasClickAction = banner.linkUrl || banner.performanceId;
                return (
                  <div
                    key={banner.bannerId || index}
                    className={styles.carouselSlide}
                    style={{
                      width: `${100 / slideData.length}%`,
                      cursor: hasClickAction ? 'pointer' : 'default'
                    }}
                    onClick={() => hasClickAction && handleBannerClick(banner)}
                  >
                    <div className={styles.slideLink}>
                      <div className={styles.poster}>
                        <img
                          className={styles.posterImg}
                          src={banner.imageUrl || wickedPoster}
                          alt={banner.titleText || '배너'}
                        />
                        <div className={styles.posterOverlay}></div>
                        <div className={styles.posterContent}>
                          {banner.titleText && (
                            <div className={styles.posterTagline}>{banner.titleText}</div>
                          )}
                          {banner.subtitleText && (
                            <div className={styles.posterTitle}>{banner.subtitleText}</div>
                          )}
                          {banner.descriptionText && (
                            <div className={styles.posterDescription}>{banner.descriptionText}</div>
                          )}
                          {banner.dateText && (
                            <div className={styles.posterDate}>{banner.dateText}</div>
                          )}
                          {banner.placeText && (
                            <div className={styles.posterVenue}>{banner.placeText}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div 
            ref={setIndicatorContainerRef}
            className={styles.carouselIndicators}
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickedIndex = getSlideIndexFromMouseX(e.clientX, rect);
              handleIndicatorMouseDown(e, clickedIndex);
            }}
            onMouseUp={handleIndicatorMouseUp}
            onMouseLeave={handleIndicatorMouseUp}
          >
            {slideData.map((_, index) => (
              <div 
                key={index}
                className={`${styles.indicator} ${currentSlide === index ? styles.active : ''}`}
                onClick={() => goToSlide(index)}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleIndicatorMouseDown(e, index);
                }}
              ></div>
            ))}
          </div>
        </section>
      ) : null}
      <section className={styles.ctaSection}>
        <div 
          className={`${styles.ctaButton} ${styles.placeButton}`}
          onClick={() => navigate('/place')}
        >
          <div className={styles.ctaText}>나랑 가까운 공연 바로가기</div>
        </div>
        
        <div
          className={`${styles.ctaButton} ${styles.signalButton}`}
          onClick={() => navigate('/recommend/signal')}
        >
          <div className={styles.ctaTitle}>나와 맞는 공연은?</div>
          <div className={styles.ctaSubtitle}>나랑 찰떡콩떡 공연 찾으러 가기</div>
        </div>

        <div
          className={`${styles.ctaButton} ${styles.chatbotButton}`}
          onClick={() => navigate('/chatbot')}
        >
          <div className={styles.ctaTitle}>공연이 궁금할 땐? 챗봇한테 물어봐</div>
          <div className={styles.ctaSubtitle}>뮤지컬, 연극, 데이트 공연 뭐든 물어봐!</div>
        </div>
      </section>
      {!loadingContentBanners && displayContentBannerItems.length > 0 && (
        <section 
          ref={contentBannerSectionRef}
          className={styles.contentBannerSection}
          style={{ height: contentBannerHeight }}
        >
          <div className={styles.contentBannerHeader}>
            <h2 className={styles.contentBannerTitle}>함께 보는 공연 숏텐츠</h2>
          </div>
          
          <div className={styles.contentBannerList}>
            {displayContentBannerItems.map((item, index) => {
            const isSelected = hoveredContentIndex === index || (hoveredContentIndex === null && selectedContentIndex === index);
            const isDisplayed = displayedContentIndex === index;
            const showBorder = hoveredContentIndex === index || (hoveredContentIndex === null && borderDisplayedIndex === index);
            
            const hasClickAction = item.linkUrl || item.performanceId;
            
            return (
              <div key={item.id}>
                <div
                  className={`${styles.contentBannerItem} ${showBorder ? styles.selected : ''}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => {
                    setHoveredContentIndex(index);
                    setSelectedContentIndex(index);
                    setDisplayedContentIndex(index);
                    setBorderDisplayedIndex(index);
                  }}
                  onMouseLeave={() => setHoveredContentIndex(null)}
                >
                  <div className={styles.contentBannerItemLeft}>
                    <div className={styles.contentBannerItemContent}>
                      <div className={styles.contentBannerItemTitle}>
                        {item.title}
                      </div>
                    </div>
                  </div>
                  {!isDisplayed && (
                    <div className={styles.contentBannerItemRight}>
                      <img 
                        src={item.thumbnail} 
                        alt={item.title}
                        className={styles.contentBannerThumbnail}
                      />
                    </div>
                  )}
                </div>
                <div 
                  className={`${styles.contentBannerDetail} ${isDisplayed ? styles.show : ''}`}
                  style={{ cursor: hasClickAction ? 'pointer' : 'default' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.linkUrl) {
                      window.open(item.linkUrl, '_blank');
                    } else if (item.performanceId) {
                      navigate(`/culture/${item.performanceId}`);
                    }
                  }}
                >
                  <div className={styles.contentBannerDetailContent}>
                    <div className={styles.contentBannerDetailText}>
                      {item.content}
                    </div>
                    <div className={styles.contentBannerDetailImage}>
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className={styles.contentBannerDetailImg}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </section>
      )}
      {!loadingFeaturedPerformances && displayFeaturedPerformances.length > 0 && (
        <section className={styles.featuredSection}>
          <h2 className={styles.featuredTitle}>추천 공연</h2>
        <div 
          className={styles.featuredCarouselContainer}
          ref={featuredCarouselRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={(e) => {
            const relatedTarget = e.relatedTarget;
            if (relatedTarget && (
              relatedTarget.closest(`.${styles.featuredPrevButton}`) ||
              relatedTarget.closest(`.${styles.featuredNextButton}`)
            )) {
              return;
            }
            setIsHovered(false);
            if (isDragging) {
              setIsDragging(false);
              setDragOffset(0);
            }
          }}
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStartX(e.clientX);
            setDragOffset(0);
          }}
          onMouseMove={(e) => {
            if (isDragging) {
              const diff = e.clientX - dragStartX;
              setDragOffset(diff);
            }
          }}
          onMouseUp={() => {
            if (isDragging) {
              const threshold = 50;
              if (Math.abs(dragOffset) > threshold) {
                if (dragOffset > 0) {
                  goToFeaturedSlide(featuredCurrentIndex - 1);
                } else {
                  goToFeaturedSlide(featuredCurrentIndex + 1);
                }
              }
              setIsDragging(false);
              setDragOffset(0);
            }
          }}
          onTouchStart={(e) => {
            setIsDragging(true);
            setDragStartX(e.touches[0].clientX);
            setDragOffset(0);
          }}
          onTouchMove={(e) => {
            if (isDragging) {
              const diff = e.touches[0].clientX - dragStartX;
              setDragOffset(diff);
            }
          }}
          onTouchEnd={() => {
            if (isDragging) {
              const threshold = 50;
              if (Math.abs(dragOffset) > threshold) {
                if (dragOffset > 0) {
                  goToFeaturedSlide(featuredCurrentIndex - 1);
                } else {
                  goToFeaturedSlide(featuredCurrentIndex + 1);
                }
              }
              setIsDragging(false);
              setDragOffset(0);
            }
          }}
        >
          <div 
            className={styles.featuredCarouselTrack}
            style={{
              transform: `translateX(calc(50% - ${2 * (100 / 2.5)}% - ${100 / 2.5 / 2}% - ${2 * 16}px + ${isDragging && featuredCarouselRef.current ? dragOffset : 0}px))`,
              transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {getSlotIndices().map((performanceIndex, slotIndex) => {
              const performance = displayFeaturedPerformances[performanceIndex];
              if (!performance) return null;
              
              const isCenter = slotIndex === 2;
              const distance = Math.abs(slotIndex - 2);
              
              return (
                <div
                  key={`${performance.id}-${slotIndex}`}
                  className={`${styles.featuredCarouselItem} ${isCenter ? styles.center : ''}`}
                  style={{
                    transform: isCenter ? 'scale(1.1)' : 'scale(0.85)',
                    opacity: distance > 1 ? 0.5 : (isCenter ? 1 : 0.8),
                    zIndex: isCenter ? 10 : 5 - distance,
                    transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <PerformanceCard
                    id={performance.id}
                    title={performance.title}
                    image={performance.image}
                    rating={performance.rating}
                    reviewCount={performance.reviewCount}
                    description={performance.description}
                    genre={performance.genre}
                    variant="featured"
                  />
                </div>
              );
            })}
          </div>
        </div>
        {isHovered && (
          <>
            <button
              className={styles.featuredPrevButton}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={(e) => {
                const relatedTarget = e.relatedTarget;
                if (relatedTarget && relatedTarget.closest(`.${styles.featuredCarouselContainer}`)) {
                  return;
                }
                setIsHovered(false);
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goToFeaturedSlide(featuredCurrentIndex - 1);
              }}
              aria-label="이전 슬라이드"
            >
              ‹
            </button>
            <button
              className={styles.featuredNextButton}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={(e) => {
                const relatedTarget = e.relatedTarget;
                if (relatedTarget && relatedTarget.closest(`.${styles.featuredCarouselContainer}`)) {
                  return;
                }
                setIsHovered(false);
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goToFeaturedSlide(featuredCurrentIndex + 1);
              }}
              aria-label="다음 슬라이드"
            >
              ›
            </button>
          </>
        )}
        <div className={styles.featuredIndicators}>
          {displayFeaturedPerformances.map((_, index) => (
            <button
              key={index}
              className={`${styles.featuredIndicator} ${index === featuredCurrentIndex ? styles.active : ''}`}
              onClick={() => goToFeaturedSlide(index)}
              aria-label={`슬라이드 ${index + 1}`}
            />
          ))}
        </div>
        </section>
      )}
      <DiscountPromotionSection />

    </div>
  );
};

export default MainHomePage;
