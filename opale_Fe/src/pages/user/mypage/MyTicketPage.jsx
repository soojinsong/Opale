import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './MyTicketPage.module.css';
import defaultTicketImage from '../../../assets/디폴트 티켓 이미지.jpg';
import { getTicketDetailList, deleteTicket as deleteTicketApi, getTicketReviews } from '../../../api/reservationApi';
import { normalizeTicketDetailList, categorizeTickets } from '../../../services/normalizeTicketDetailList';
import { normalizeTicketReviews } from '../../../services/normalizeTicketReviews';
import { deletePerformanceReview, deletePlaceReview } from '../../../api/reviewApi';
import { fetchPerformanceList } from '../../../api/performanceApi';
import { normalizePerformance } from '../../../services/normalizePerformance';

import { getImageUrl } from '../../../utils/imageUtils';

const MyTicketPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useSelector((state) => state.user);
  const [allTickets, setAllTickets] = useState([]);
  const [flippedTickets, setFlippedTickets] = useState({});
  const [activeTab, setActiveTab] = useState('booked');
  const [posterCache, setPosterCache] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [ticketReviews, setTicketReviews] = useState({});

  const fetchPosterByPerformanceName = async (performanceName) => {
    if (!performanceName) return null;
    
    if (posterCache[performanceName]) {
      return posterCache[performanceName];
    }

    try {
      const res = await fetchPerformanceList({
        keyword: performanceName,
        page: 1,
        size: 1
      });
      
      if (res.performances && res.performances.length > 0) {
        const normalized = normalizePerformance(res.performances[0]);
        const posterUrl = normalized.poster || normalized.posterImage || normalized.image;
        
        if (posterUrl) {
          const fullPosterUrl = getImageUrl(posterUrl);
          
          if (fullPosterUrl) {
            setPosterCache(prev => ({
              ...prev,
              [performanceName]: fullPosterUrl
            }));
            
            return fullPosterUrl;
          }
        }
      }
    } catch (err) {
      console.error('포스터 검색 실패:', err);
    }
    
    return null;
  };

  const getFallbackPoster = () => defaultTicketImage;

  const getPosterImage = async (performanceName) => {
    if (!performanceName) return getFallbackPoster(performanceName);
    
    const apiPoster = await fetchPosterByPerformanceName(performanceName);
    if (apiPoster) {
      return apiPoster;
    }
    
    return getFallbackPoster(performanceName);
  };

  const loadTicketReviews = async (tickets) => {
    const reviewsMap = {};
    
    for (const ticket of tickets) {
      const ticketId = ticket.ticketId || ticket.id;
      if (!ticketId) continue;
      
      try {
        const reviewsResponse = await getTicketReviews(ticketId);
        const normalizedReviews = normalizeTicketReviews(reviewsResponse);
        
        reviewsMap[ticketId] = {
          hasPerformanceReview: normalizedReviews.hasPerformanceReview,
          hasPlaceReview: normalizedReviews.hasPlaceReview,
          performanceId: normalizedReviews.performanceReview?.performanceId || ticket.performanceId || null,
          placeId: normalizedReviews.placeReview?.placeId || ticket.placeId || null
        };
      } catch (err) {
        reviewsMap[ticketId] = {
          hasPerformanceReview: false,
          hasPlaceReview: false,
          performanceId: ticket.performanceId || null,
          placeId: ticket.placeId || null
        };
      }
    }
    
    setTicketReviews(prev => ({ ...prev, ...reviewsMap }));
  };

  const loadTickets = async (pageNum = 1, append = false) => {
    try {
      setIsLoading(true);
      const response = await getTicketDetailList(pageNum, 50);
      
      const normalized = normalizeTicketDetailList(response);
      
      const ticketsToSet = append ? [...allTickets, ...normalized.tickets] : normalized.tickets;
      
      if (append) {
        setAllTickets(prev => [...prev, ...normalized.tickets]);
      } else {
        setAllTickets(normalized.tickets);
      }
      
      setHasMore(normalized.hasNext);
      setPage(normalized.currentPage);
      
      setTicketPosters({});
      setPosterCache({});
      
      if (activeTab === 'watched') {
        await loadTicketReviews(normalized.tickets);
      }
    } catch (err) {
      console.error('티켓 목록 조회 실패:', err);
      alert('티켓 목록을 불러오는데 실패했습니다.');
      setAllTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { state: { returnUrl: window.location.pathname } });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (isLoggedIn) {
      loadTickets(1, false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const handleTicketUpdate = () => {
      loadTickets(1, false);
    };

    window.addEventListener('ticketUpdated', handleTicketUpdate);

    return () => {
      window.removeEventListener('ticketUpdated', handleTicketUpdate);
    };
  }, []);

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('티켓을 삭제하시겠습니까?\n관련된 리뷰도 함께 삭제됩니다.')) {
      return;
    }

    try {
      const reviewsResponse = await getTicketReviews(ticketId);
      const normalizedReviews = normalizeTicketReviews(reviewsResponse);

      if (normalizedReviews.hasPerformanceReview && normalizedReviews.performanceReview) {
        const performanceReviewId = normalizedReviews.performanceReview.performanceReviewId || 
                                   normalizedReviews.performanceReview.id ||
                                   normalizedReviews.performanceReview.reviewId;
        
        if (performanceReviewId) {
          try {
            await deletePerformanceReview(performanceReviewId);
            console.log('공연 리뷰 삭제 완료');
          } catch (err) {
            console.error('공연 리뷰 삭제 실패:', err);
          }
        }
      }

      if (normalizedReviews.hasPlaceReview && normalizedReviews.placeReview) {
        const placeReviewId = normalizedReviews.placeReview.placeReviewId || 
                             normalizedReviews.placeReview.id ||
                             normalizedReviews.placeReview.reviewId;
        
        if (placeReviewId) {
          try {
            await deletePlaceReview(placeReviewId);
            console.log('공연장 리뷰 삭제 완료');
          } catch (err) {
            console.error('공연장 리뷰 삭제 실패:', err);
          }
        }
      }

      await deleteTicketApi(ticketId);
      
      loadTickets(1, false);
      
      setFlippedTickets(prev => {
        const newState = { ...prev };
        delete newState[ticketId];
        return newState;
      });

      alert('티켓이 삭제되었습니다.');
    } catch (err) {
      console.error('티켓 삭제 실패:', err);
      const errorMessage = err.response?.data?.message || err.message || '티켓 삭제에 실패했습니다.';
      alert(errorMessage);
    }
  };

  const handleFlipTicket = (ticketId) => {
    setFlippedTickets(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }));
  };

  const { booked, watched } = categorizeTickets(allTickets);
  const filteredTickets = activeTab === 'booked' ? booked : watched;
  
  useEffect(() => {
    if (activeTab === 'watched' && filteredTickets.length > 0) {
      loadTicketReviews(filteredTickets);
    }
  }, [activeTab, filteredTickets.length]);

  const [ticketPosters, setTicketPosters] = useState({});

  useEffect(() => {
    const loadPosters = async () => {
      const posters = {};
      for (const ticket of filteredTickets) {
        if (ticket.performanceName && !ticketPosters[ticket.id]) {
          posters[ticket.id] = getFallbackPoster(ticket.performanceName);
          
          const apiPoster = await fetchPosterByPerformanceName(ticket.performanceName);
          if (apiPoster) {
            posters[ticket.id] = apiPoster;
          }
        }
      }
      if (Object.keys(posters).length > 0) {
        setTicketPosters(prev => ({ ...prev, ...posters }));
      }
    };
    
    loadPosters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTickets.length, activeTab]);

  return (
    <div className={styles.container}>
      {/* 상단 헤더 */}
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>MY 티켓</h2>
        <button 
          className={styles.registerButton}
          onClick={() => navigate('/my/tickets/register')}
        >
          티켓 등록하기
        </button>
      </div>

      {/* 탭 메뉴 */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'booked' ? styles.active : ''}`}
          onClick={() => setActiveTab('booked')}
        >
          예매한 공연
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'watched' ? styles.active : ''}`}
          onClick={() => setActiveTab('watched')}
        >
          관람한 공연
        </button>
      </div>

      {/* 티켓 목록 */}
      <div className={styles.ticketList}>
        {isLoading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎫</div>
            <p className={styles.emptyText}>티켓 목록을 불러오는 중...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎫</div>
            <p className={styles.emptyText}>
              {activeTab === 'booked' 
                ? '예매한 공연이 없습니다'
                : '관람한 공연이 없습니다'}
            </p>
            <p className={styles.emptySubText}>티켓 등록하기 버튼을 눌러 티켓을 등록해보세요</p>
          </div>
        ) : (
          <div className={styles.ticketGrid}>
            {filteredTickets.map((ticket) => {
              const isFlipped = flippedTickets[ticket.id] || false;
              const posterImage = ticketPosters[ticket.id] || getFallbackPoster(ticket.performanceName);
              
              return (
                <div key={ticket.id} className={styles.ticketCardWrapper}>
                  <div 
                    className={`${styles.ticketCard} ${isFlipped ? styles.flipped : ''}`}
                    onClick={() => handleFlipTicket(ticket.id)}
                  >
                    {/* 앞면: 포스터 + 제목 */}
                    <div className={styles.ticketFront}>
                      <button 
                        className={styles.deleteButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTicket(ticket.id);
                        }}
                      >
                        ×
                      </button>
                      {posterImage && (
                        <div className={styles.ticketPoster}>
                          <img 
                            src={posterImage} 
                            alt={ticket.performanceName}
                            className={styles.posterImage}
                          />
                          <div className={styles.posterOverlay}></div>
                        </div>
                      )}
                      <div className={styles.ticketTitleSection}>
                        <h3 className={styles.ticketPerformanceName}>{ticket.performanceName}</h3>
                        <div className={styles.ticketDateInfo}>
                          {ticket.performanceDate} {ticket.performanceTime && ticket.performanceTime}
                        </div>
                      </div>
                    </div>
                    
                    {/* 뒷면: 좌석 정보 */}
                    <div className={styles.ticketBack}>
                      <div className={styles.ticketBackHeader}>
                        <h3 className={styles.ticketBackTitle}>{ticket.performanceName}</h3>
                        <button 
                          className={styles.deleteButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTicket(ticket.id);
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <div className={styles.ticketBackBody}>
                        <div className={styles.ticketInfoRow}>
                          <span className={styles.ticketLabel}>공연일자</span>
                          <span className={styles.ticketValue}>
                            {ticket.performanceDate} {ticket.performanceTime && ticket.performanceTime}
                          </span>
                        </div>
                        {(ticket.seatFront || ticket.seatNumber) && (
                          <div className={styles.ticketInfoRow}>
                            <span className={styles.ticketLabel}>좌석정보</span>
                            <span className={styles.ticketValue}>
                              {ticket.seatFront && ticket.seatNumber 
                                ? `${ticket.seatFront}-${ticket.seatNumber}번`
                                : ticket.seatFront || ticket.seatNumber ? `${ticket.seatFront || ''}${ticket.seatNumber ? `${ticket.seatNumber}번` : ''}`.trim()
                                : ''}
                            </span>
                          </div>
                        )}
                        <div className={styles.ticketInfoRow}>
                          <span className={styles.ticketLabel}>등록일</span>
                          <span className={styles.ticketValue}>{ticket.registeredDate}</span>
                        </div>
                        <button
                          className={styles.editButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            const ticketId = ticket.ticketId || ticket.id;
                            navigate('/my/tickets/edit', { state: { ticketId } });
                          }}
                        >
                          수정하기
                        </button>
                      </div>
                    </div>
                  </div>
                  {activeTab === 'watched' && (() => {
                    const ticketId = ticket.ticketId || ticket.id;
                    const reviewInfo = ticketReviews[ticketId] || {
                      hasPerformanceReview: false,
                      hasPlaceReview: false,
                      performanceId: ticket.performanceId || null,
                      placeId: ticket.placeId || null
                    };
                    
                    const hasPerformanceId = ticket.performanceId || reviewInfo.performanceId;
                    const hasPlaceId = ticket.placeId || reviewInfo.placeId;
                    
                    if (!hasPerformanceId && !hasPlaceId) {
                      return null;
                    }
                    
                    return (
                      <div className={styles.reviewButtons}>
                        {hasPerformanceId && (
                          <button 
                            className={styles.reviewButton}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const performanceId = ticket.performanceId || reviewInfo.performanceId;
                              
                              if (reviewInfo.hasPerformanceReview && performanceId) {
                                navigate(`/culture/${performanceId}?tab=review`);
                              } else {
                                try {
                                  navigate('/my/performanceReviews/register', {
                                    state: {
                                      ticketData: {
                                        ...ticket,
                                        ticketId: ticketId,
                                        id: ticketId,
                                        performanceId: ticket.performanceId || null,
                                        placeId: ticket.placeId || null
                                      },
                                      performanceId: ticket.performanceId || null,
                                      placeId: ticket.placeId || null,
                                      nextPage: null,
                                      returnUrl: '/my/tickets'
                                    }
                                  });
                                } catch (err) {
                                  console.error('티켓 정보 조회 실패:', err);
                                  alert('티켓 정보를 불러오는데 실패했습니다.');
                                }
                              }
                            }}
                          >
                            {reviewInfo.hasPerformanceReview ? '공연 후기로 이동' : '공연 후기 작성'}
                          </button>
                        )}
                        {hasPlaceId && (
                          <button 
                            className={styles.reviewButton}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const placeId = ticket.placeId || reviewInfo.placeId;
                              
                              if (reviewInfo.hasPlaceReview && placeId) {
                                navigate(`/place/${placeId}`);
                              } else {
                                if (!placeId) {
                                  alert('공연장 정보가 없습니다. 티켓에 공연장 정보가 포함되어 있는지 확인해주세요.');
                                  return;
                                }
                                
                                navigate('/my/placeReviews/register', {
                                  state: {
                                    ticketData: {
                                      ...ticket,
                                      ticketId: ticketId,
                                      id: ticketId,
                                      performanceId: ticket.performanceId || null,
                                      placeId: ticket.placeId || null
                                    },
                                    placeId: ticket.placeId || null,
                                    returnUrl: '/my/tickets'
                                  }
                                });
                              }
                            }}
                          >
                            {reviewInfo.hasPlaceReview ? '공연장 리뷰로 이동' : '공연장 리뷰 작성'}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default MyTicketPage;
