/* 
공연 상세 페이지: 
  - 공연 포스터 및 기본 정보 (제목, 공연장, 날짜 등)
  - 공연 트레일러 영상 (유튜브 링크)
  - 공연 상세 설명 (줄거리, 출연진, 제작진 등)
  - 예매 링크 (공식 예매처, 제휴 예매처 등)
  - 오픈채팅방 링크 (공연 관련 오픈채팅방으로 연결)
  - 리뷰 섹션 (사용자 리뷰 목록, 리뷰 작성 버튼)
  - 공연 정보 이미지 (공연장 위치, 좌석 배치도 등)
  - 공연장 위치 지도 (공연장 주소 기반 지도 표시)
  - 공연 관련 영상 (공연 하이라이트, 인터뷰 등 유튜브 영상 목록)
  - 공연과 관련된 다른 공연 추천 (유사한 장르, 같은 제작사의 공연 등)
  - 공연 좋아요 기능 (사용자가 공연을 좋아요할 수 있는 버튼)
  - 리뷰 좋아요 기능 (사용자가 리뷰를 좋아요할 수 있는 버튼)
  - 리뷰 작성/수정/삭제 기능 (사용자가 자신의 리뷰를 작성, 수정, 삭제할 수 있는 기능)
  - 공연 좋아요 상태 표시 (사용자가 이미 좋아요한 공연은 버튼이 활성화된 상태로 표시)
  - 리뷰 좋아요 상태 표시 (사용자가 이미 좋아요한 리뷰는 버튼이 활성화된 상태로 표시)
  - 리뷰 작성 시 티켓 정보 연동 (사용자가 리뷰 작성 시 해당 공연의 티켓 정보를 선택할 수 있도록 연동)
  - 공연 정보 이미지 섹션 (공연장 위치, 좌석 배치도 등 공연과 관련된 이미지들을 보여주는 섹션)
  - 공연 관련 영상 섹션 (공연 하이라이트, 인터뷰 등 유튜브 영상들을 보여주는 섹션)
  - 공연과 관련된 다른 공연 추천 섹션 (유사한 장르, 같은 제작사의 공연 등과 관련된 다른 공연들을 추천하는 섹션)
  - 공연 좋아요 기능 (사용자가 공연을 좋아요할 수 있는 버튼)
  - 리뷰 좋아요 기능 (사용자가 리뷰를 좋아요할 수 있는 버튼)
  - 리뷰 작성/수정/삭제 기능 (사용자가 자신의 리뷰를 작성, 수정, 삭제할 수 있는 기능)
  - 공연 좋아요 상태 표시 (사용자가 이미 좋아요한 공연은 버튼이 활성화된 상태로 표시)
  - 리뷰 좋아요 상태 표시 (사용자가 이미 좋아요한 리뷰는 버튼이 활성화된 상태로 표시)
  - 리뷰 작성 시 티켓 정보 연동 (사용자가 리뷰 작성 시 해당 공연의 티켓 정보를 선택할 수 있도록 연동)
  - 공연 정보 이미지 섹션 (공연장 위치, 좌석 배치도 등 공연과 관련된 이미지들을 보여주는 섹션)
  - 공연 관련 영상 섹션 (공연 하이라이트, 인터뷰 등 유튜브 영상들을 보여주는 섹션)
  - 공연과 관련된 다른 공연 추천 섹션 (유사한 장르, 같은 제작사의 공연 등과 관련된 다른 공연들을 추천하는 섹션)
*/


import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './DetailPerformancePage.module.css';
import PerformancePoster from '../../components/culture/PerformancePoster';
import PerformanceInfoCard from '../../components/culture/PerformanceInfoCard';
import PerformanceTrailer from '../../components/culture/PerformanceTrailer';
import PerformanceDetails from '../../components/culture/PerformanceDetails';
import BookingLinks from '../../components/culture/BookingLinks';
import OpenChatSection from '../../components/culture/OpenChatSection';
import ReviewCard from '../../components/culture/ReviewCard';
import PerformanceInfoImages from '../../components/culture/PerformanceInfoImages';
import PlaceMap from '../../components/place/PlaceMap';
import { fetchPerformanceBasic, fetchPerformanceVideos } from '../../api/performanceApi';
import { fetchPerformanceReviewsByPerformance, fetchPerformanceReview, createPerformanceReview, updatePerformanceReview, deletePerformanceReview } from '../../api/reviewApi';
import { isPerformanceLiked, togglePerformanceFavorite, isPerformanceReviewLiked, togglePerformanceReviewFavorite } from '../../api/favoriteApi';
import { normalizePerformanceDetail } from '../../services/normalizePerformanceDetail';
import { normalizePerformanceReviews } from '../../services/normalizePerformanceReview';
import { normalizePerformanceReviewRequest } from '../../services/normalizePerformanceReviewRequest';
import { normalizePerformanceVideos } from '../../services/normalizePerformanceVideos';
import { usePerformanceRelations } from '../../hooks/usePerformanceRelations';
import { usePerformanceInfoImages } from '../../hooks/usePerformanceInfoImages';
import { usePerformanceBooking } from '../../hooks/usePerformanceBooking';
import { usePlaceBasic } from '../../hooks/usePlaceBasic';
import { getTicketsByPerformanceName, getWatchedTickets, addTicket } from '../../utils/ticketUtils';
import logApi from '../../api/logApi';
import TicketSelectModal from '../../components/common/TicketSelectModal';
import PerformanceDetailSkeleton from '../../components/common/PerformanceDetailSkeleton';
import ReviewEditModal from '../../components/common/ReviewEditModal';
import PerformanceTipModal from '../../components/common/PerformanceTipModal';
import wickedPoster from '../../assets/poster/wicked.gif';

const DetailPerformancePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.user);
  const currentUserId = user?.userId || user?.id || null;
  const [activeTab, setActiveTab] = useState('detail');
  const [isFavorite, setIsFavorite] = useState(false);
  const [expandedExpectations, setExpandedExpectations] = useState({});
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [writeType, setWriteType] = useState('review'); // 'review' or 'expectation'
  const [writeForm, setWriteForm] = useState({ title: '', content: '', rating: 5 });
  const [activeReviewTab, setActiveReviewTab] = useState('review'); // 'review' or 'expectation'
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', rating: 5 });
  
  const [showTicketSelectModal, setShowTicketSelectModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [showTipModal, setShowTipModal] = useState(false);
  
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [reviews, setReviews] = useState([]);
  const [expectations, setExpectations] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [expectationLikes, setExpectationLikes] = useState({});

  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);

  const performanceId = performance?.id || performance?.performanceId || id;
  const { bookingSites } = usePerformanceRelations(performanceId);
  
  const { images: infoImages, loading: imagesLoading } = usePerformanceInfoImages(performanceId);
  
  const { bookingInfo, loading: bookingLoading } = usePerformanceBooking(performanceId);
  
  const placeId = performance?.placeId;
  const { placeInfo, loading: placeLoading } = usePlaceBasic(placeId);

  const getPosterImage = () => performance?.poster || wickedPoster;

  const pageEnterTimeRef = useRef(Date.now());
  const dwellSentRef = useRef(false);

  useEffect(() => {
    const loadPerformanceData = async () => {
      if (!id) {
        setError('공연 ID가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const apiData = await fetchPerformanceBasic(id);
        
        const normalizedData = normalizePerformanceDetail(apiData);
        
        if (normalizedData) {
          setPerformance(normalizedData);
          
          if (currentUserId) {
            try {
              await logApi.createLog({
                eventType: "VIEW",
                targetType: "PERFORMANCE",
                targetId: normalizedData.id || normalizedData.performanceId || id
              });
            } catch (logErr) {
              console.error('로그 기록 실패:', logErr);
            }
          }
        } else {
          throw new Error('공연 정보를 불러올 수 없습니다.');
        }
      } catch (err) {
        console.error('공연 정보 조회 실패:', err);
        setError(err.message || '공연 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadPerformanceData();
  }, [id]);

  useEffect(() => {
    if (!currentUserId || !performanceId) return;

    const sendDwellTime = () => {
      if (dwellSentRef.current) return;

      const rawSeconds = Math.floor((Date.now() - pageEnterTimeRef.current) / 1000);
      if (rawSeconds < 10) return;

      dwellSentRef.current = true;
      const dwellTimeSeconds = Math.min(rawSeconds, 600);

      logApi.createLog({
        eventType: 'DWELL_TIME',
        targetType: 'PERFORMANCE',
        targetId: String(performanceId),
        dwellTimeSeconds,
      }).catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendDwellTime();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', sendDwellTime);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', sendDwellTime);
      sendDwellTime();
    };
  }, [currentUserId, performanceId]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'review') {
      setActiveTab('review');
      setTimeout(() => {
        const reviewSection = document.querySelector(`[data-tab="review"]`);
        if (reviewSection) {
          reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (!performanceId) return;
      
      try {
        const liked = await isPerformanceLiked(performanceId);
        setIsFavorite(liked);
      } catch (err) {
        console.error('공연 관심 여부 조회 실패:', err);
        setIsFavorite(false);
      }
    };

    loadFavoriteStatus();
  }, [performanceId]);

  useEffect(() => {
    const loadVideos = async () => {
      if (!performanceId) {
        setVideos([]);
        return;
      }

      try {
        setVideosLoading(true);
        console.log("📹 영상 목록 조회 시작 - performanceId:", performanceId);
        const response = await fetchPerformanceVideos(performanceId);
        console.log("📹 API 응답 원본:", response);
        const normalized = normalizePerformanceVideos(response);
        console.log("📹 정제된 영상 목록:", normalized);
        console.log("📹 영상 개수:", normalized.length);
        setVideos(normalized);
      } catch (err) {
        console.error('❌ 공연 영상 목록 조회 실패:', err);
        setVideos([]);
      } finally {
        setVideosLoading(false);
      }
    };

    loadVideos();
  }, [performanceId]);

  const loadReviews = async () => {
    if (!performanceId) return;

    try {
      setReviewsLoading(true);
      setReviewsError(null);

      const reviewType = activeReviewTab === 'review' ? 'AFTER' : 'EXPECTATION';
      
      const apiData = await fetchPerformanceReviewsByPerformance(performanceId, reviewType);
      
      const reviewsData = Array.isArray(apiData) ? { reviews: [] } : apiData;

      const normalizedReviews = normalizePerformanceReviews(reviewsData);

      if (activeReviewTab === 'review') {
        setReviews(normalizedReviews);
      } else {
        setExpectations(normalizedReviews);
        const likesMap = {};
        for (const expectation of normalizedReviews) {
          try {
            const liked = await isPerformanceReviewLiked(expectation.id);
            likesMap[expectation.id] = liked;
          } catch (err) {
            console.error(`기대평 ${expectation.id} 관심 여부 조회 실패:`, err);
            likesMap[expectation.id] = false;
          }
        }
        setExpectationLikes(likesMap);
      }
    } catch (err) {
      console.error('리뷰 조회 실패:', err);
      setReviewsError(err.message || '리뷰를 불러오는 중 오류가 발생했습니다.');
      if (activeReviewTab === 'review') {
        setReviews([]);
      } else {
        setExpectations([]);
      }
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [performanceId, activeReviewTab]);

  const tabs = [
    { id: 'detail', label: '상세정보' },
    { id: 'reservation', label: '예매정보' },
    { id: 'review', label: '후기/기대평' },
    { id: 'venue', label: '공연장 정보' }
  ];

  const toggleFavorite = async () => {
    if (!performanceId) return;
    
    try {
      const result = await togglePerformanceFavorite(performanceId);
      setIsFavorite(result);
      
      try {
        await logApi.createLog({
          eventType: "FAVORITE",
          targetType: "PERFORMANCE",
          targetId: String(performanceId)
        });
      } catch (logErr) {
        console.error('로그 기록 실패:', logErr);
      }
    } catch (err) {
      console.error('공연 관심 토글 실패:', err);
    }
  };

  const toggleExpectationExpansion = (expectationId) => {
    setExpandedExpectations(prev => ({
      ...prev,
      [expectationId]: !prev[expectationId]
    }));
  };

  const handleWriteClick = (type) => {
    setWriteType(type);
    const finalPerformanceId = performanceId || id;
    
    if (type === 'review') {
      const performanceTitle = performance?.title || '';
      const returnUrl = `/culture/${finalPerformanceId}`;
      
      navigate('/my/tickets/register', {
        state: {
          forReview: true,
          nextReviewPage: '/my/performanceReviews/register',
          ticketData: {
            performanceName: performanceTitle,
            performanceDate: '',
            performanceTime: '',
            section: '',
            row: '',
            number: '',
            performanceId: finalPerformanceId
          },
          performanceId: performance?.performanceId || performance?.id || finalPerformanceId,
          placeId: performance?.placeId || null,
          nextPage: '/my/placeReviews/register',
          fromPerformanceDetail: true,
          returnUrl: returnUrl,
          isThreeStepFlow: true
        }
      });
    } else if (type === 'expectation') {
      navigate('/my/expectationReviews/register', {
        state: {
          performanceId: finalPerformanceId,
          fromPerformanceDetail: true
        }
      });
    }
  };

  const handleWriteSubmit = async (e) => {
    e.preventDefault();
    
    if (writeType === 'review') {
      if (!selectedTicket || !selectedTicket.ticketId) {
        alert('리뷰를 작성하려면 티켓을 선택해주세요.');
        setShowTicketSelectModal(true);
        return;
      }
    }
    
    if (!performanceId) {
      alert('공연 정보가 없습니다.');
      return;
    }

    try {
      const reviewType = writeType === 'review' ? 'AFTER' : 'EXPECTATION';
      
      const reviewPerformanceId = writeType === 'review' && selectedTicket?.performanceId 
        ? selectedTicket.performanceId 
        : performanceId;
      
      const reviewTicketId = writeType === 'review' && selectedTicket?.ticketId 
        ? selectedTicket.ticketId 
        : null;
      
      const requestDto = normalizePerformanceReviewRequest(
        writeForm,
        reviewPerformanceId,
        reviewType,
        reviewTicketId
      );

      await createPerformanceReview(requestDto);

      try {
        await logApi.createLog({
          eventType: "REVIEW_WRITE",
          targetType: "PERFORMANCE",
          targetId: String(performanceId)
        });
      } catch (logErr) {
        console.error('로그 기록 실패:', logErr);
      }

      setShowWriteModal(false);
      setWriteForm({ title: '', content: '', rating: 5 });

      if ((writeType === 'review' && activeReviewTab === 'review') ||
          (writeType === 'expectation' && activeReviewTab === 'expectation')) {
        await loadReviews();
      }
    } catch (err) {
      console.error('후기 작성 실패:', err);
      alert(err.response?.data?.message || err.message || '후기 작성에 실패했습니다.');
    }
  };

  const handleWriteCancel = () => {
    setShowWriteModal(false);
    setWriteForm({ title: '', content: '', rating: 5 });
    setSelectedTicket(null);
  };

  const handleOpenTicketSelectModal = () => {
    setShowTicketSelectModal(true);
  };

  const handleCloseTicketSelectModal = () => {
    setShowTicketSelectModal(false);
  };

  const handleSelectTicket = (ticket) => {
    const ticketId = ticket.ticketId || ticket.id;
    const ticketPerformanceId = ticket.performanceId;
    
    setSelectedTicket({
      ticketId: ticketId,
      performanceId: ticketPerformanceId
    });
    
    setShowTicketSelectModal(false);
  };

  const handleEditReview = async (review, reviewType) => {
    const reviewId = review.id || review.performanceReviewId || review.reviewId;
    
    if (!reviewId) {
      alert('리뷰 ID를 찾을 수 없습니다.');
      return;
    }

    try {
      const apiResponse = await fetchPerformanceReview(reviewId);
      
      const normalizedReview = {
        id: apiResponse.performanceReviewId,
        performanceReviewId: apiResponse.performanceReviewId,
        performanceId: apiResponse.performanceId,
        ticketId: apiResponse.ticketId || null,
        title: apiResponse.title || '',
        content: apiResponse.contents || '',
        contents: apiResponse.contents || '',
        rating: apiResponse.rating || 5,
        reviewType: apiResponse.reviewType || reviewType
      };

      setEditingReview(normalizedReview);
      setEditForm({
        title: normalizedReview.title || '',
        content: normalizedReview.content || normalizedReview.contents || '',
        rating: normalizedReview.rating || 5
      });
      setShowEditModal(true);
    } catch (err) {
      console.error('리뷰 조회 실패:', err);
      setEditingReview({ ...review, reviewType });
      setEditForm({
        title: review.title || '',
        content: review.content || review.contents || '',
        rating: review.rating || 5
      });
      setShowEditModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingReview(null);
    setEditForm({ title: '', content: '', rating: 5 });
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();
    
    if (!editingReview || !performanceId) return;

    try {
      const reviewId = editingReview.id || editingReview.performanceReviewId || editingReview.reviewId;
      const reviewType = editingReview.reviewType || (activeReviewTab === 'review' ? 'AFTER' : 'EXPECTATION');
      
      const reviewTicketId = editingReview.ticketId || null;

      const updateDto = normalizePerformanceReviewRequest(
        editForm,
        performanceId,
        reviewType,
        reviewTicketId
      );
      
      await updatePerformanceReview(reviewId, updateDto);
      
      alert('리뷰가 수정되었습니다.');
      handleCloseEditModal();
      
      await loadReviews();
    } catch (err) {
      console.error('리뷰 수정 실패:', err);
      alert(err.response?.data?.message || err.message || '리뷰 수정에 실패했습니다.');
    }
  };

  const handleDeleteReview = async (reviewId, reviewType) => {
    if (!window.confirm('정말 이 리뷰를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deletePerformanceReview(reviewId);
      alert('리뷰가 삭제되었습니다.');
      
      await loadReviews();
    } catch (err) {
      console.error('리뷰 삭제 실패:', err);
      alert(err.response?.data?.message || err.message || '리뷰 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return <PerformanceDetailSkeleton />;
  }

  if (error && !performance) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          공연 정보를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PerformancePoster
        imageUrl={getPosterImage()}
        isFavorite={isFavorite}
        onFavoriteToggle={toggleFavorite}
      />

      <PerformanceInfoCard
        category={performance.category}
        title={performance.title}
        englishTitle={performance.englishTitle}
        venue={performance.venue}
        address={performance.address}
        date={performance.date}
        duration={performance.duration}
        ageLimit={performance.ageLimit}
      />

      <PerformanceTrailer
        englishTitle={performance.englishTitle}
        title={performance.title}
        trailerImage={performance.trailerImage || performance.image}
        videos={videos}
      />

      <PerformanceDetails
        rating={performance.rating ? parseFloat(performance.rating).toFixed(1) : '0.0'}
        reviewCount={performance.reviewCount}
        hashtags={performance.hashtags}
        genre={performance.genre}
        description={performance.description}
      />

      <BookingLinks bookingSites={bookingSites} />

      {/* 추천 버튼 */}
      <div className={styles.recommendSection}>
        <button 
          className={styles.recommendButton}
          onClick={() => navigate('/recommend')}
        >
          내가 본 공연과 잘 맞는 공연은?
        </button>
      </div>

      <OpenChatSection 
        performanceId={performance.id || performance.performanceId}
        performanceTitle={performance.title}
        performanceGenre={performance.genre}
        performancePoster={performance.poster}
      />

      {/* Tabs */}
      <div className={styles.tabSection} data-tab={activeTab}>
        <div className={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === 'reservation' && (
            <div className={styles.reservationContent}>
              <div className={styles.tipButtonContainer}>
                <button
                  type="button"
                  className={styles.tipButton}
                  onClick={() => {
                    if (!currentUserId) {
                      alert('로그인이 필요합니다.');
                      return;
                    }
                    setShowTipModal(true);
                  }}
                >
                  정보 제보하기
                </button>
              </div>

              <h3 className={styles.contentTitle}>가격</h3>
              <div className={styles.priceList}>
                {bookingLoading ? (
                  <div className={styles.priceItem}>
                    <span className={styles.seatType}>가격 정보를 불러오는 중...</span>
                  </div>
                ) : bookingInfo?.price ? (
                  <div className={styles.priceItem}>
                    <span className={styles.seatType}>{bookingInfo.price}</span>
                  </div>
                ) : (
                  <div className={styles.priceItem}>
                    <span className={styles.seatType}>가격 정보 없음</span>
                  </div>
                )}
              </div>
              
              {/* 할인정보 섹션 */}
              {(bookingLoading || (bookingInfo?.discountImages && bookingInfo.discountImages.length > 0)) && (
                <div className={styles.discountSection}>
                  {/* <h3 className={styles.contentTitle}>할인정보</h3> */}
                  <div className={styles.infoPlaceholder}>
                    {bookingLoading ? (
                      <p className={styles.placeholderText}>정보를 불러오는 중...</p>
                    ) : (
                      <div className={styles.imageContainer}>
                        {bookingInfo.discountImages.map((image, index) => (
                          <img
                            key={image.performanceImageId || index}
                            src={image.imageUrl}
                            alt={`할인 정보 이미지 ${index + 1}`}
                            className={styles.infoImage}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 캐스팅 섹션 */}
              {(bookingLoading || (bookingInfo?.castingImages && bookingInfo.castingImages.length > 0)) && (
                <div className={styles.castingSection}>
                  {/* <h3 className={styles.contentTitle}>캐스팅</h3> */}
                  <div className={styles.infoPlaceholder}>
                    {bookingLoading ? (
                      <p className={styles.placeholderText}>정보를 불러오는 중...</p>
                    ) : (
                      <div className={styles.imageContainer}>
                        {bookingInfo.castingImages.map((image, index) => (
                          <img
                            key={image.performanceImageId || index}
                            src={image.imageUrl}
                            alt={`캐스팅 정보 이미지 ${index + 1}`}
                            className={styles.infoImage}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 좌석배치도 섹션 */}
              {(bookingLoading || (bookingInfo?.seatImages && bookingInfo.seatImages.length > 0)) && (
                <div className={styles.seatingChartSection}>
                  {/* <h3 className={styles.contentTitle}>좌석배치도</h3> */}
                  <div className={styles.infoPlaceholder}>
                    {bookingLoading ? (
                      <p className={styles.placeholderText}>정보를 불러오는 중...</p>
                    ) : (
                      <div className={styles.imageContainer}>
                        {bookingInfo.seatImages.map((image, index) => (
                          <img
                            key={image.performanceImageId || index}
                            src={image.imageUrl}
                            alt={`좌석배치도 이미지 ${index + 1}`}
                            className={styles.infoImage}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 공지/안내 섹션 */}
              {(bookingLoading || (bookingInfo?.noticeImages && bookingInfo.noticeImages.length > 0)) && (
                <div className={styles.noticeSection}>
                  <div className={styles.infoPlaceholder}>
                    {bookingLoading ? (
                      <p className={styles.placeholderText}>정보를 불러오는 중...</p>
                    ) : (
                      <div className={styles.imageContainer}>
                        {bookingInfo.noticeImages.map((image, index) => (
                          <img
                            key={image.performanceImageId || index}
                            src={image.imageUrl}
                            alt={`공지/안내 이미지 ${index + 1}`}
                            className={styles.infoImage}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 기타 정보 섹션 */}
              {(bookingLoading || (bookingInfo?.otherImages && bookingInfo.otherImages.length > 0)) && (
                <div className={styles.otherInfoSection}>
                  <div className={styles.infoPlaceholder}>
                    {bookingLoading ? (
                      <p className={styles.placeholderText}>정보를 불러오는 중...</p>
                    ) : (
                      <div className={styles.imageContainer}>
                        {bookingInfo.otherImages.map((image, index) => (
                          <img
                            key={image.performanceImageId || index}
                            src={image.imageUrl}
                            alt={`기타 정보 이미지 ${index + 1}`}
                            className={styles.infoImage}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'detail' && (
            <div className={styles.detailContent}>
              <h3 className={styles.contentTitle}>상세 정보</h3>
              <div className={styles.detailText}>
                <p><strong>장르:</strong> {performance.genre}</p>
                <p><strong>관람 연령:</strong> {performance.ageLimit}</p>
                <p><strong>공연 시간:</strong> {performance.duration}</p>
                <p><strong>공연 기간:</strong> {performance.date}</p>
                <p><strong>공연장:</strong> {performance.venue}</p>
                <p><strong>주소:</strong> {performance.address}</p>
                <br/>
                <p>{performance.description}</p>
              </div>
              
              {/* 제작사 제공 소개 이미지 섹션 */}
              <PerformanceInfoImages images={infoImages} loading={imagesLoading} />
            </div>
          )}
          
          {activeTab === 'review' && (
            <div className={styles.reviewContent}>
              <h3 className={styles.contentTitle}>후기 / 기대평</h3>
              
              {/* 후기/기대평 탭 */}
              <div className={styles.reviewTabs}>
                <button 
                  className={`${styles.reviewTab} ${activeReviewTab === 'review' ? styles.activeReviewTab : ''}`}
                  onClick={() => setActiveReviewTab('review')}
                >
                  후기
                </button>
                <button 
                  className={`${styles.reviewTab} ${activeReviewTab === 'expectation' ? styles.activeReviewTab : ''}`}
                  onClick={() => setActiveReviewTab('expectation')}
                >
                  기대평
                </button>
              </div>

              {/* 글쓰기 버튼 */}
              <div className={styles.writeButtonContainer}>
                <button 
                  className={styles.writeButton}
                  onClick={() => handleWriteClick(activeReviewTab)}
                >
                  {activeReviewTab === 'review' ? '후기 작성하기' : '기대평 작성하기'}
                </button>
              </div>

              {/* 후기 목록 */}
              {activeReviewTab === 'review' && (
                <div className={styles.reviewList}>
                  <div className={styles.reviewListHeader}>
                    <h4>후기 목록</h4>
                    <span className={styles.sortOption}>인기순</span>
                  </div>
                  
                  {reviewsLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>
                  ) : reviewsError ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                      {reviewsError}
                    </div>
                  ) : reviews.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                      등록된 후기가 없습니다.
                    </div>
                  ) : (
                    reviews.map(review => (
                      <ReviewCard
                        key={review.id}
                        id={review.id}
                        title={review.title}
                        performanceDate={review.performanceDate}
                        performanceTime={review.performanceTime}
                        seat={review.seat}
                        performanceName={review.performanceName || review.performanceTitle}
                        rating={review.rating}
                        content={review.content}
                        author={review.author}
                        date={review.date}
                        userId={review.userId}
                        currentUserId={currentUserId}
                        onEdit={() => handleEditReview(review, 'AFTER')}
                        onDelete={() => handleDeleteReview(review.id || review.performanceReviewId || review.reviewId, 'AFTER')}
                        hiddenByReport={review.hiddenByReport}
                      />
                    ))
                  )}
                </div>
              )}

              {/* 기대평 목록 */}
              {activeReviewTab === 'expectation' && (
                <div className={styles.expectationList}>
                  <div className={styles.expectationListHeader}>
                    <h4>기대평 목록</h4>
                  </div>
                  
                  {reviewsLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>
                  ) : reviewsError ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                      {reviewsError}
                    </div>
                  ) : expectations.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                      등록된 기대평이 없습니다.
                    </div>
                  ) : (
                    expectations.map(expectation => {
                      const isMyReview = currentUserId && expectation.userId && expectation.userId === currentUserId;
                      return (
                        <div key={expectation.id} className={styles.expectationItem}>
                          <div className={styles.expectationHeader}>
                            <h5 className={styles.expectationTitle}>{expectation.title}</h5>
                            {isMyReview && (
                              <div className={styles.expectationActions}>
                                <button
                                  className={styles.editButton}
                                  onClick={() => handleEditReview(expectation, 'EXPECTATION')}
                                >
                                  수정
                                </button>
                                <button
                                  className={styles.deleteButton}
                                  onClick={() => handleDeleteReview(expectation.id || expectation.performanceReviewId || expectation.reviewId, 'EXPECTATION')}
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className={styles.expectationContent}>
                            <p className={styles.expectationText}>
                              {expandedExpectations[expectation.id] 
                                ? expectation.content 
                                : expectation.content.length > 100 
                                  ? expectation.content.substring(0, 100) + '...' 
                                  : expectation.content
                            }
                          </p>
                            {expectation.content.length > 100 && (
                              <button 
                                className={styles.expandButton}
                                onClick={() => toggleExpectationExpansion(expectation.id)}
                              >
                                {expandedExpectations[expectation.id] ? '닫기' : '더보기'}
                              </button>
                            )}
                          </div>
                          
                          <div className={styles.expectationFooter}>
                            <div className={styles.expectationFooterLeft}>
                              <button 
                                className={`${styles.likeButton} ${expectationLikes[expectation.id] ? styles.liked : ''}`}
                                onClick={async () => {
                                  try {
                                    const result = await togglePerformanceReviewFavorite(expectation.id);
                                    setExpectationLikes(prev => ({
                                      ...prev,
                                      [expectation.id]: result
                                    }));
                                  } catch (err) {
                                    console.error('기대평 관심 토글 실패:', err);
                                  }
                                }}
                              >
                                {expectationLikes[expectation.id] ? '♥' : '♡'}
                              </button>
                              <span className={styles.expectationAuthor}>{expectation.author} | {expectation.date}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'venue' && (
            <div className={styles.venueContent}>
              <h3 className={styles.contentTitle}>공연장 정보</h3>
              {placeLoading ? (
                <div className={styles.venueLoading}>
                  <p>공연장 정보를 불러오는 중...</p>
                </div>
              ) : (
                <div className={styles.venueCard}>
                  {/* 지도 영역 */}
                  {(placeInfo?.latitude || placeInfo?.la) && (placeInfo?.longitude || placeInfo?.lo) && (
                    <div className={styles.venueMapArea}>
                      <PlaceMap
                        latitude={placeInfo?.latitude || placeInfo?.la}
                        longitude={placeInfo?.longitude || placeInfo?.lo}
                        placeName={placeInfo?.placeName || placeInfo?.name || performance?.venue || '공연장'}
                      />
                    </div>
                  )}
                  
                  <div className={styles.venueInfoItem}>
                    <div className={styles.venueInfoIcon}>🏛️</div>
                    <div className={styles.venueInfoContent}>
                      <div className={styles.venueInfoLabel}>공연장명</div>
                      <div className={styles.venueInfoValue}>
                        {placeInfo?.placeName || performance?.venue || '정보 없음'}
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.venueInfoItem}>
                    <div className={styles.venueInfoIcon}>📍</div>
                    <div className={styles.venueInfoContent}>
                      <div className={styles.venueInfoLabel}>주소</div>
                      <div className={styles.venueInfoValue}>
                        {placeInfo?.placeAddress || performance?.address || '정보 없음'}
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.venueInfoItem}>
                    <div className={styles.venueInfoIcon}>🚇</div>
                    <div className={styles.venueInfoContent}>
                      <div className={styles.venueInfoLabel}>교통편</div>
                      <div className={styles.venueInfoValue}>
                        {placeInfo?.transportation || '지하철 및 버스 이용 가능'}
                      </div>
                    </div>
                  </div>
                  
                  {placeId && (
                    <button
                      onClick={() => navigate(`/place/${placeId}`)}
                      className={styles.venueDetailButton}
                    >
                      공연장 상세 정보 보기
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 글쓰기 모달 */}
      {showWriteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{writeType === 'review' ? '공연 후기 작성' : '기대평 작성'}</h3>
              <button className={styles.closeButton} onClick={handleWriteCancel}>×</button>
            </div>
            
            <form onSubmit={handleWriteSubmit} className={styles.writeForm}>
              <div className={styles.formGroup}>
                <label>제목</label>
                <input 
                  type="text" 
                  value={writeForm.title}
                  onChange={(e) => setWriteForm({...writeForm, title: e.target.value})}
                  placeholder="제목을 입력하세요"
                  required
                />
              </div>
              
              {writeType === 'review' && (
                <>
                  <div className={styles.formGroup}>
                    <label>티켓 선택</label>
                    <button
                      type="button"
                      className={styles.ticketSelectButton}
                      onClick={handleOpenTicketSelectModal}
                    >
                      {selectedTicket 
                        ? `선택된 티켓: ${selectedTicket.ticketId}번 티켓` 
                        : '티켓을 선택해주세요'}
                    </button>
                    {selectedTicket && (
                      <div className={styles.selectedTicketInfo}>
                        티켓 ID: {selectedTicket.ticketId}, 공연 ID: {selectedTicket.performanceId}
                      </div>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label>평점</label>
                    <div className={styles.ratingInput}>
                      {[1,2,3,4,5].map(star => (
                        <button 
                          key={star} 
                          type="button"
                          className={`${styles.ratingStar} ${star <= writeForm.rating ? styles.filled : ''}`}
                          onClick={() => setWriteForm({...writeForm, rating: star})}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              <div className={styles.formGroup}>
                <label>내용</label>
                <textarea 
                  value={writeForm.content}
                  onChange={(e) => setWriteForm({...writeForm, content: e.target.value})}
                  placeholder="내용을 입력하세요"
                  rows={6}
                  required
                />
              </div>
              
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={handleWriteCancel}>
                  취소
                </button>
                <button type="submit" className={styles.submitButton}>
                  작성하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 티켓 선택 모달 */}
      <TicketSelectModal
        isOpen={showTicketSelectModal}
        onClose={handleCloseTicketSelectModal}
        onSelectTicket={handleSelectTicket}
        filterPerformanceId={performance?.performanceId || performance?.id || id}
      />

      <ReviewEditModal
        show={showEditModal}
        editingReview={editingReview}
        editForm={editForm}
        onFormChange={setEditForm}
        onSubmit={handleUpdateReview}
        onClose={handleCloseEditModal}
        styles={styles}
      />

      {showTipModal && (
        <PerformanceTipModal
          performanceId={performance?.performanceId || performance?.id || id}
          onClose={() => setShowTipModal(false)}
        />
      )}
    </div>
  );
};

export default DetailPerformancePage;
