import React, { useState, useEffect } from 'react';
import styles from './PlaceReviewCard.module.css';
import { isPlaceReviewLiked, togglePlaceReviewFavorite } from '../../api/favoriteApi';
import ReportModal from '../common/ReportModal';

const PlaceReviewCard = ({
  id,
  title,
  performanceDate,
  performanceTime,
  seat,
  placeName,
  rating,
  content,
  author,
  date,
  userId,
  currentUserId,
  onEdit,
  onDelete,
  hiddenByReport
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    if (hiddenByReport || !id) return;

    const loadFavoriteStatus = async () => {
      try {
        const liked = await isPlaceReviewLiked(id);
        setIsLiked(liked);
      } catch (err) {
        console.error('공연장 리뷰 관심 여부 조회 실패:', err);
        setIsLiked(false);
      }
    };

    loadFavoriteStatus();
  }, [id, hiddenByReport]);

  if (hiddenByReport) {
    return (
      <div className={styles.reviewItem}>
        <p className={styles.hiddenNotice}>신고 처리된 리뷰입니다.</p>
        <span className={styles.reviewAuthor}>{author} | {date}</span>
      </div>
    );
  }

  const shouldShowMoreButton = content.length > 150;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleLike = async () => {
    if (!id) return;
    
    try {
      const result = await togglePlaceReviewFavorite(id);
      setIsLiked(result);
    } catch (err) {
      console.error('공연장 리뷰 관심 토글 실패:', err);
    }
  };

  return (
    <div className={styles.reviewItem}>
      <div className={styles.reviewHeader}>
        <h5 className={styles.reviewTitle}>{title}</h5>
        <div className={styles.reviewMeta}>
          {(placeName || performanceDate || seat) && (
            <div className={styles.ticketInfo}>
              {placeName && (
                <span className={styles.ticketItem}>{placeName}</span>
              )}
              {performanceDate && (
                <span className={styles.ticketItem}>
                  {performanceDate}
                  {performanceTime && ` ${performanceTime}`}
                </span>
              )}
              {seat && (
                <span className={styles.ticketItem}>{seat}</span>
              )}
            </div>
          )}
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
        </div>
      </div>
      
      <div className={styles.reviewContentText}>
        <p className={`${styles.reviewText} ${!isExpanded && shouldShowMoreButton ? styles.reviewTextTruncated : ''}`}>
          {content}
        </p>
        {shouldShowMoreButton && (
          <button 
            className={styles.expandButton}
            onClick={toggleExpand}
          >
            {isExpanded ? '닫기' : '더보기'}
          </button>
        )}
      </div>
      
      <div className={styles.reviewFooter}>
        <div className={styles.reviewFooterLeft}>
          <button
            className={`${styles.likeButton} ${isLiked ? styles.liked : ''}`}
            onClick={toggleLike}
          >
            {isLiked ? '♥' : '♡'}
          </button>
          <span className={styles.reviewAuthor}>{author} | {date}</span>
        </div>
        {userId && currentUserId && userId === currentUserId ? (
          <div className={styles.reviewActions}>
            <button
              className={styles.editButton}
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit();
              }}
            >
              수정
            </button>
            <button
              className={styles.deleteButton}
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete();
              }}
            >
              삭제
            </button>
          </div>
        ) : (
          userId && currentUserId && (
            <div className={styles.reviewActions}>
              <button
                className={styles.reportButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsReportOpen(true);
                }}
              >
                신고
              </button>
            </div>
          )
        )}
      </div>

      {isReportOpen && (
        <ReportModal
          targetType="PLACE_REVIEW"
          targetId={id}
          targetUserId={userId}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
};

export default PlaceReviewCard;
