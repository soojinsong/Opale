import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchMyPerformanceReviews, 
  fetchMyPlaceReviews, 
  fetchPerformanceReview,
  fetchPlaceReview,
  deletePerformanceReview, 
  deletePlaceReview,
  updatePerformanceReview,
  updatePlaceReview
} from '../../../api/reviewApi';
import { normalizePerformanceReviews } from '../../../services/normalizePerformanceReview';
import { normalizePlaceReviews } from '../../../services/normalizePlaceReview';
import { normalizePerformanceReviewRequest } from '../../../services/normalizePerformanceReviewRequest';
import { normalizePlaceReviewRequest } from '../../../services/normalizePlaceReviewRequest';
import MyReviewCard from '../../../components/user/MyReviewCard';
import ReviewEditModal from '../../../components/common/ReviewEditModal';
import styles from './MyReviewPage.module.css';

const MyReviewPage = () => {
  const navigate = useNavigate();
  const [afterReviews, setAfterReviews] = useState([]);
  const [expectationReviews, setExpectationReviews] = useState([]);
  const [placeReviews, setPlaceReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('AFTER'); // 'AFTER', 'EXPECTATION', 'PLACE'
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', rating: 5 });

  useEffect(() => {
    const loadMyReviews = async () => {
      try {
        setLoading(true);
        const [afterData, expectationData, placeRev] = await Promise.all([
          fetchMyPerformanceReviews('AFTER'),
          fetchMyPerformanceReviews('EXPECTATION'),
          fetchMyPlaceReviews()
        ]);
        
        console.log('📝 API 응답 확인:', { afterData, expectationData, placeRev });
        
        let afterReviewsArray = [];
        if (Array.isArray(afterData)) {
          afterReviewsArray = afterData;
        } else if (afterData && afterData.reviews && Array.isArray(afterData.reviews)) {
          afterReviewsArray = normalizePerformanceReviews(afterData);
        } else if (afterData && afterData.data && afterData.data.reviews) {
          afterReviewsArray = normalizePerformanceReviews(afterData.data);
        }
        
        let expectationReviewsArray = [];
        if (Array.isArray(expectationData)) {
          expectationReviewsArray = expectationData;
        } else if (expectationData && expectationData.reviews && Array.isArray(expectationData.reviews)) {
          expectationReviewsArray = normalizePerformanceReviews(expectationData);
        } else if (expectationData && expectationData.data && expectationData.data.reviews) {
          expectationReviewsArray = normalizePerformanceReviews(expectationData.data);
        }
        
        let placeReviewsArray = [];
        if (Array.isArray(placeRev)) {
          placeReviewsArray = placeRev;
        } else if (placeRev && placeRev.reviews && Array.isArray(placeRev.reviews)) {
          placeReviewsArray = normalizePlaceReviews(placeRev);
        } else if (placeRev && placeRev.data && placeRev.data.reviews) {
          placeReviewsArray = normalizePlaceReviews(placeRev.data);
        }
        
        console.log('📝 처리된 배열:', { afterReviewsArray, expectationReviewsArray, placeReviewsArray });
        
        setAfterReviews(afterReviewsArray);
        setExpectationReviews(expectationReviewsArray);
        setPlaceReviews(placeReviewsArray);
      } catch (err) {
        console.error('내 리뷰 목록 조회 실패:', err);
        setAfterReviews([]);
        setExpectationReviews([]);
        setPlaceReviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadMyReviews();
  }, []);

  const handleDeleteReview = async (reviewId, reviewType) => {
    if (!window.confirm('정말 이 리뷰를 삭제하시겠습니까?')) {
      return;
    }

    try {
      if (reviewType === 'PLACE') {
        await deletePlaceReview(reviewId);
        setPlaceReviews(prev => prev.filter(r => (r.id || r.reviewId) !== reviewId));
      } else {
        await deletePerformanceReview(reviewId);
        if (reviewType === 'AFTER') {
          setAfterReviews(prev => prev.filter(r => (r.id || r.performanceReviewId || r.reviewId) !== reviewId));
        } else if (reviewType === 'EXPECTATION') {
          setExpectationReviews(prev => prev.filter(r => (r.id || r.performanceReviewId || r.reviewId) !== reviewId));
        }
      }
      alert('리뷰가 삭제되었습니다.');
    } catch (err) {
      console.error('리뷰 삭제 실패:', err);
      alert('리뷰 삭제에 실패했습니다.');
    }
  };

  const handleEditReview = async (review, reviewType) => {
    const reviewId = review.id || review.performanceReviewId || review.placeReviewId || review.reviewId;
    
    if (!reviewId) {
      alert('리뷰 ID를 찾을 수 없습니다.');
      return;
    }

    try {
      let normalizedReview;
      
      if (reviewType === 'PLACE') {
        const apiResponse = await fetchPlaceReview(reviewId);
        normalizedReview = {
          id: apiResponse.placeReviewId,
          placeReviewId: apiResponse.placeReviewId,
          placeId: apiResponse.placeId,
          title: apiResponse.title || '',
          content: apiResponse.contents || '',
          contents: apiResponse.contents || '',
          rating: apiResponse.rating || 5,
          reviewType: apiResponse.reviewType || 'PLACE'
        };
      } else {
        const apiResponse = await fetchPerformanceReview(reviewId);
        normalizedReview = {
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
      }

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
    
    if (!editingReview) return;

    try {
      const reviewType = editingReview.reviewType;

      if (reviewType === 'PLACE') {
        const reviewId = editingReview.id || editingReview.placeReviewId || editingReview.reviewId;
        const placeId = editingReview.placeId;
        
        if (!placeId) {
          alert('공연장 정보를 찾을 수 없습니다.');
          return;
        }
        
        const updateDto = normalizePlaceReviewRequest(editForm, placeId);
        await updatePlaceReview(reviewId, updateDto);
        
        setPlaceReviews(prev => prev.map(r => 
          (r.id || r.reviewId) === reviewId 
            ? { ...r, title: editForm.title, content: editForm.content, contents: editForm.content, rating: editForm.rating }
            : r
        ));
      } else {
        const reviewId = editingReview.id || editingReview.performanceReviewId || editingReview.reviewId;
        
        if (!reviewId) {
          alert('리뷰 ID를 찾을 수 없습니다.');
          return;
        }
        
        const performanceId = editingReview.performanceId || editingReview.performance?.id;
        if (!performanceId) {
          alert('공연 정보를 찾을 수 없습니다.');
          return;
        }

        const reviewTicketId = editingReview.ticketId || null;
        
        const updateDto = normalizePerformanceReviewRequest(
          editForm,
          performanceId,
          reviewType,
          reviewTicketId
        );
        
        await updatePerformanceReview(reviewId, updateDto);
        
        if (reviewType === 'AFTER') {
          setAfterReviews(prev => prev.map(r => 
            (r.id || r.performanceReviewId || r.reviewId) === reviewId 
              ? { ...r, title: editForm.title, content: editForm.content, contents: editForm.content, rating: editForm.rating }
              : r
          ));
        } else if (reviewType === 'EXPECTATION') {
          setExpectationReviews(prev => prev.map(r => 
            (r.id || r.performanceReviewId || r.reviewId) === reviewId 
              ? { ...r, title: editForm.title, content: editForm.content, contents: editForm.content }
              : r
          ));
        }
      }

      alert('리뷰가 수정되었습니다.');
      handleCloseEditModal();
    } catch (err) {
      console.error('리뷰 수정 실패:', err);
      alert(err.response?.data?.message || err.message || '리뷰 수정에 실패했습니다.');
    }
  };

  const getFilteredReviews = () => {
    if (activeTab === 'AFTER') {
      return afterReviews;
    } else if (activeTab === 'EXPECTATION') {
      return expectationReviews;
    } else if (activeTab === 'PLACE') {
      return placeReviews;
    }
    return [];
  };

  const filteredReviews = getFilteredReviews();
  const totalCount = afterReviews.length + expectationReviews.length + placeReviews.length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>작성한 리뷰</h1>
      </div>

      {/* 탭 */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'AFTER' ? styles.active : ''}`}
          onClick={() => setActiveTab('AFTER')}
        >
          공연 후기 ({afterReviews.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'EXPECTATION' ? styles.active : ''}`}
          onClick={() => setActiveTab('EXPECTATION')}
        >
          공연 기대평 ({expectationReviews.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'PLACE' ? styles.active : ''}`}
          onClick={() => setActiveTab('PLACE')}
        >
          공연장 리뷰 ({placeReviews.length})
        </button>
      </div>

      {/* 리뷰 목록 */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>로딩 중...</div>
        ) : filteredReviews.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              {activeTab === 'AFTER'
                ? '작성한 공연 후기가 없습니다.'
                : activeTab === 'EXPECTATION'
                ? '작성한 공연 기대평이 없습니다.'
                : '작성한 공연장 리뷰가 없습니다.'}
            </p>
            <p className={styles.emptySubText}>
              공연이나 공연장 상세페이지에서 리뷰를 작성해보세요.
            </p>
          </div>
        ) : (
          <div className={styles.reviewList}>
            {filteredReviews.map((review) => (
              <MyReviewCard
                key={`${activeTab}-${review.id || review.performanceReviewId || review.reviewId}`}
                review={review}
                reviewType={activeTab}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
              />
            ))}
          </div>
        )}
      </div>

      <ReviewEditModal
        show={showEditModal}
        editingReview={editingReview}
        editForm={editForm}
        onFormChange={setEditForm}
        onSubmit={handleUpdateReview}
        onClose={handleCloseEditModal}
        styles={styles}
      />
    </div>
  );
};

export default MyReviewPage;
