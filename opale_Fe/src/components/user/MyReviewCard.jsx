import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MyReviewCard.module.css';

const MyReviewCard = ({
  review,
  reviewType,
  onEdit,
  onDelete
}) => {
  const navigate = useNavigate();

  const getTargetName = () => {
    if (reviewType === 'PLACE') {
      return review.placeName || review.place?.name || '공연장';
    } else {
      return review.performanceTitle || 
             review.performanceName || 
             review.performance?.title || 
             review.title || 
             '공연';
    }
  };

  const handleCardClick = () => {
    if (reviewType === 'PLACE') {
      const placeId = review.placeId || review.place?.id;
      if (placeId) {
        navigate(`/place/${placeId}`);
      }
    } else {
      const performanceId = review.performanceId || review.performance?.id;
      if (performanceId) {
        navigate(`/culture/${performanceId}`);
      }
    }
  };

  const targetName = getTargetName();
  const rating = review.rating || review.score || 0;
  const content = review.content || review.contents || review.reviewContent || '';
  const author = review.author || review.user?.nickname || review.nickname || '익명';
  const date = review.date || (review.createdAt ? new Date(review.createdAt).toLocaleDateString('ko-KR') : '');

  return (
    <div className={styles.reviewWrapper}>
      <div className={styles.reviewActions}>
        <button
          className={styles.editButton}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(review, reviewType);
          }}
        >
          수정
        </button>
        <button
          className={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(review.id || review.performanceReviewId || review.reviewId, reviewType);
          }}
        >
          삭제
        </button>
      </div>

      <div className={styles.reviewCard} onClick={handleCardClick}>
        <div className={styles.targetName}>
          {targetName}
        </div>

        {review.title && (
          <h5 className={styles.reviewTitle}>{review.title}</h5>
        )}

        {(review.performanceDate || review.performanceTime || review.seat) && (
          <div className={styles.reviewMeta}>
            <span className={styles.reviewMetaText}>
              |{' '}
              {review.performanceDate && <>{review.performanceDate}</>}
              {review.performanceTime && (
                <>{review.performanceDate ? ' ' : ''}{review.performanceTime}</>
              )}
              {review.seat && (
                <>{review.performanceDate || review.performanceTime ? ' ' : ''}{review.seat}</>
              )}
            </span>
          </div>
        )}

        {reviewType !== 'EXPECTATION' && (
          <div className={styles.reviewRating}>
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={`${styles.star} ${
                  i < Math.floor(rating) ? styles.filled : ''
                } ${
                  i === Math.floor(rating) && rating % 1 !== 0 ? styles.half : ''
                }`}
              >
                ★
              </span>
            ))}
          </div>
        )}

        <div className={styles.reviewContent}>
          <p className={styles.reviewText}>{content}</p>
        </div>

        <div className={styles.reviewFooter}>
          <span className={styles.reviewAuthor}>
            {author} | {date}
            {review.seat && (
              <> | {review.seat}</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MyReviewCard;
