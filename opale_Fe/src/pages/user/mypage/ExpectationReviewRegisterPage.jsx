import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPerformanceReview } from '../../../api/reviewApi';
import { normalizePerformanceReviewRequest } from '../../../services/normalizePerformanceReviewRequest';
import logApi from '../../../api/logApi';
import styles from './ExpectationReviewRegisterPage.module.css';

const ExpectationReviewRegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const performanceId = location.state?.performanceId || null;
  const fromPerformanceDetail = location.state?.fromPerformanceDetail || false;
  
  const [reviewData, setReviewData] = useState({
    title: '',
    content: ''
  });

  const handleInputChange = (field, value) => {
    setReviewData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reviewData.title || !reviewData.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    if (!performanceId) {
      alert('공연 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      const requestDto = normalizePerformanceReviewRequest(
        {
          title: reviewData.title,
          content: reviewData.content
        },
        performanceId,
        'EXPECTATION',
        null
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

      if (fromPerformanceDetail && performanceId) {
        navigate(`/culture/${performanceId}?tab=review`);
      } else {
        navigate('/culture');
      }
    } catch (err) {
      console.error('기대평 등록 실패:', err);
      alert(err.response?.data?.message || err.message || '기대평 등록에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    if (fromPerformanceDetail && performanceId) {
      navigate(`/culture/${performanceId}?tab=review`);
    } else {
      navigate('/culture');
    }
  };

  return (
    <div className={styles.container}>
      {/* 상단 헤더 */}
      <div className={styles.header}>
        <div></div>
        <h2 className={styles.headerTitle}>기대평 작성</h2>
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
            <label>내용</label>
            <textarea
              value={reviewData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="공연에 대한 기대평을 작성해주세요"
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
              작성하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpectationReviewRegisterPage;
