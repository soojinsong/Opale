// src/components/cards/PlaceWithPerformancesCard.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import { usePlacePerformances } from "../../hooks/usePlacePerformances";
import styles from "./PlaceWithPerformancesCard.module.css";

const PlaceWithPerformancesCard = ({
  id,
  name,
  address,
  telno,
  rating,
  reviewCount,
  stageCount,
  distance,
  onClick
}) => {
  const navigate = useNavigate();
  const { performances, loading: performancesLoading } = usePlacePerformances(id);

  const handleCardClick = () => {
    if (onClick) {
      onClick(id);
    } else {
      navigate(`/place/${id}`);
    }
  };

  const handlePerformanceClick = (e, performanceId) => {
    e.stopPropagation();
    navigate(`/culture/${performanceId}`);
  };

  const currentPerformances = performances.filter((perf) => {
    if (!perf.startDate || !perf.endDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(perf.startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(perf.endDate);
    end.setHours(0, 0, 0, 0);
    
    return today >= start && today <= end;
  });

  const formatDistance = (distanceInMeters) => {
    if (!distanceInMeters || distanceInMeters === null) return null;
    
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`;
    }
    
    return `${(distanceInMeters / 1000).toFixed(1)}km`;
  };

  return (
    <li className={styles.placeItem} onClick={handleCardClick}>
      <div className={styles.placeMeta}>
        <div className={styles.placeNameRow}>
          <div className={styles.placeNameWithRating}>
            <span className={styles.placeName}>{name}</span>
            <div className={styles.ratingRow}>
              <span className={styles.star}>★</span>
              <span className={styles.rating}>
                {typeof rating === 'number' ? rating.toFixed(1) : parseFloat(rating || 0).toFixed(1)}
              </span>
              <span className={styles.count}>({reviewCount || 0})</span>
            </div>
          </div>
          {distance !== null && distance !== undefined && (
            <div className={styles.distance}>
              {formatDistance(distance)}
            </div>
          )}
        </div>
        <div className={styles.placeDetails}>
          {address && <span className={styles.placeAddress}>{address}</span>}
          {telno && <span className={styles.placeTel}>{telno}</span>}
        </div>
        
        {/* 현재 상연중인 공연 포스터 섹션 */}
        {currentPerformances.length > 0 && (
          <div className={styles.performancesSection}>
            <div className={styles.performancesLabel}>현재 상연중</div>
            <div className={styles.performancesScroll}>
              {performancesLoading ? (
                <div className={styles.loadingText}>공연 정보를 불러오는 중...</div>
              ) : (
                <div className={styles.performancesList}>
                  {currentPerformances.map((performance) => (
                    <div
                      key={performance.id}
                      className={styles.posterItem}
                      onClick={(e) => handlePerformanceClick(e, performance.id)}
                    >
                      <img
                        className={styles.posterImg}
                        src={performance.poster || '/placeholder-poster.png'}
                        alt={performance.title || '공연 포스터'}
                        onError={(e) => {
                          e.target.src = '/placeholder-poster.png';
                        }}
                      />
                      {performance.title && (
                        <div className={styles.posterTitle}>{performance.title}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
  );
};

export default PlaceWithPerformancesCard;
