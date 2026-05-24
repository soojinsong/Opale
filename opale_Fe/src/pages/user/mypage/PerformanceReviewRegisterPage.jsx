import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { createPerformanceReview } from '../../../api/reviewApi';
import { normalizePerformanceReviewRequest } from '../../../services/normalizePerformanceReviewRequest';
import { fetchPerformanceList } from '../../../api/performanceApi';
import { normalizePerformance } from '../../../services/normalizePerformance';
import { getTicketReviews } from '../../../api/reservationApi';
import { normalizeTicketReviews } from '../../../services/normalizeTicketReviews';
import logApi from '../../../api/logApi';
import styles from './PerformanceReviewRegisterPage.module.css';

const PerformanceReviewRegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useSelector((state) => state.user);
  
  const ticketData = location.state?.ticketData || {};
  const performanceId = location.state?.performanceId || ticketData?.performanceId || null;
  const initialNextPage = location.state?.nextPage || null;
  const fromPerformanceDetail = location.state?.fromPerformanceDetail || false;
  const returnUrl = location.state?.returnUrl || null;
  const isThreeStepFlow = location.state?.isThreeStepFlow || false;
  
  const [reviewData, setReviewData] = useState({
    title: '',
    rating: 5,
    content: ''
  });
  
  const initialHasPlaceReview = location.state?.hasPlaceReview ?? null;
  
  const [hasPlaceReview, setHasPlaceReview] = useState(initialHasPlaceReview === true);
  const [nextPage, setNextPage] = useState(initialHasPlaceReview === true ? null : initialNextPage);
  
  useEffect(() => {
    if (!isLoggedIn) {
      const returnUrl = location.state?.returnUrl || window.location.pathname;
      navigate('/login', { state: { returnUrl } });
    }
  }, [isLoggedIn, navigate, location.state]);

  useEffect(() => {
    if (!isLoggedIn) return;
    
    const checkPlaceReview = async () => {
      const ticketId = ticketData?.ticketId || ticketData?.id;
      if (!ticketId || !initialNextPage) {
        return;
      }
      
      if (initialHasPlaceReview !== null) {
        setHasPlaceReview(initialHasPlaceReview);
        setNextPage(initialHasPlaceReview ? null : initialNextPage);
        return;
      }
      
      try {
        const reviewsResponse = await getTicketReviews(ticketId);
        const normalizedReviews = normalizeTicketReviews(reviewsResponse);
        
        if (normalizedReviews.hasPlaceReview) {
          setHasPlaceReview(true);
          setNextPage(null);
        } else {
          setHasPlaceReview(false);
          setNextPage(initialNextPage);
        }
      } catch (err) {
        console.error('티켓 리뷰 확인 실패:', err);
        setHasPlaceReview(false);
        setNextPage(initialNextPage);
      }
    };
    
    checkPlaceReview();
  }, [ticketData?.ticketId, ticketData?.id, initialNextPage, initialHasPlaceReview]);

  const findPerformanceIdByName = async (performanceName) => {
    if (!performanceName) return null;
    
    try {
      const res = await fetchPerformanceList({
        keyword: performanceName,
        page: 1,
        size: 1
      });
      
      if (res.performances && res.performances.length > 0) {
        const normalized = normalizePerformance(res.performances[0]);
        return normalized.id || normalized.performanceId;
      }
      return null;
    } catch (err) {
      console.error('공연 검색 실패:', err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reviewData.title || !reviewData.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      let finalPerformanceId = performanceId;
      
      if (!finalPerformanceId && ticketData?.performanceName) {
        finalPerformanceId = await findPerformanceIdByName(ticketData.performanceName);
      }
      
      if (!finalPerformanceId) {
        alert('공연 정보를 찾을 수 없습니다. 공연명을 확인해주세요.');
        return;
      }

      const ticketId = ticketData?.ticketId || ticketData?.id || null;
      
      const requestDto = normalizePerformanceReviewRequest(
        {
          title: reviewData.title,
          content: reviewData.content,
          rating: reviewData.rating,
          performanceDate: ticketData.performanceDate || '',
          performanceTime: ticketData.performanceTime || '',
          seatFront: ticketData.seatFront || '',
          seatNumber: ticketData.seatNumber || ''
        },
        finalPerformanceId,
        'AFTER',
        ticketId
      );
      
      await createPerformanceReview(requestDto);
      
      try {
        await logApi.createLog({
          eventType: "REVIEW_WRITE",
          targetType: "PERFORMANCE",
          targetId: String(finalPerformanceId)
        });
      } catch (logErr) {
        console.error('로그 기록 실패:', logErr);
      }

      if (nextPage) {
        navigate(nextPage, { 
          state: { 
            ticketData: {
              ...ticketData,
              ticketId: ticketData.ticketId || ticketData.id,
              performanceId: finalPerformanceId
            },
            performanceId: finalPerformanceId,
            placeId: ticketData.placeId || location.state?.placeId || null,
            fromPerformanceDetail: fromPerformanceDetail,
            returnUrl: returnUrl,
            isThreeStepFlow: isThreeStepFlow
          } 
        });
      } else {
        if (returnUrl) {
          navigate(returnUrl);
        } else if (fromPerformanceDetail && finalPerformanceId) {
          navigate(`/culture/${finalPerformanceId}?tab=review`);
        } else if (finalPerformanceId) {
          navigate(`/culture/${finalPerformanceId}?tab=review`);
        } else {
          navigate('/my/tickets');
          window.dispatchEvent(new Event('ticketUpdated'));
        }
      }
    } catch (err) {
      console.error('공연 후기 등록 실패:', err);
      alert(err.response?.data?.message || err.message || '공연 후기 등록에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    if (performanceId) {
      navigate(`/culture/${performanceId}`);
    } else {
      navigate('/my/tickets');
    }
  };

  const handleInputChange = (field, value) => {
    setReviewData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className={styles.container}>
      {/* 상단 헤더 */}
      <div className={styles.header}>
        <div></div>
        <h2 className={styles.headerTitle}>공연 후기 작성</h2>
        <button className={styles.closeButton} onClick={handleCancel}>×</button>
      </div>

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>제목</label>
            <input
              type="text"
              value={reviewData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="제목을 입력하세요"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>평점</label>
            <div className={styles.ratingInput}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={`${styles.ratingStar} ${star <= reviewData.rating ? styles.filled : ''}`}
                  onClick={() => handleInputChange('rating', star)}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>내용</label>
            <textarea
              value={reviewData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="내용을 입력하세요"
              rows={6}
              className={styles.textarea}
              required
            />
          </div>

          <div className={styles.formActions}>
            <button 
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
            >
              취소
            </button>
            <button 
              type="submit"
              className={styles.submitButton}
            >
              {nextPage && !hasPlaceReview ? '다음' : '작성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PerformanceReviewRegisterPage;
