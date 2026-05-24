// src/services/normalizePerformanceReview.js

/**
 * 공연 리뷰 API 응답을 UI에 맞게 정규화
 * @param {Object} apiData - API 응답 데이터 (reviews 배열 포함)
 * @returns {Array} - UI에 맞게 변환된 리뷰 배열
 */
export const normalizePerformanceReviews = (apiData) => {
  if (!apiData || !Array.isArray(apiData.reviews)) {
    return [];
  }

  return apiData.reviews.map((review) => {
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}.${month}.${day}`;
    };

    const formatPerformanceDate = (dateString) => {
      if (!dateString) return '';
      if (dateString.includes('.')) return dateString;
      if (dateString.includes('-')) {
        return dateString.replace(/-/g, '.');
      }
      try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
      } catch {
        return dateString;
      }
    };

    const formatSeatInfo = (review) => {
      if (review.section || review.row) {
        const section = review.section || '';
        const row = review.row || '';
        const number = review.number || '';
        
        if (section && row && number) {
          return `${section} ${row}열 ${number}번`;
        } else if (section && row) {
          return `${section} ${row}열`;
        } else if (section) {
          return section;
        } else if (row) {
          return `${row}열`;
        } else if (number) {
          return `${number}번`;
        }
      }
      
      if (review.seatInfo) {
        const seatStr = String(review.seatInfo).trim();
        if (seatStr) {
          if (seatStr.includes('-')) {
            const parts = seatStr.split('-');
            return parts[0].trim();
          }
          
          const numberMatch = seatStr.match(/(\d+)\s*번/);
          if (numberMatch) {
            const numberIndex = seatStr.indexOf(numberMatch[0]);
            return seatStr.substring(0, numberIndex).trim();
          }
          
          return seatStr;
        }
      }
      
      if (review.seat) {
        const seatStr = String(review.seat);
        const match = seatStr.match(/(.+?)\s*(\d+)열/);
        if (match) {
          const section = match[1].trim();
          const row = match[2];
          return `${section} ${row}열`;
        }
        if (seatStr.includes('열') && !seatStr.includes('번')) {
          return seatStr;
        }
      }
      
      return '';
    };

    let reviewType = 'AFTER';
    
    console.log(`🔍 [정규화] 리뷰 ${review.performanceReviewId} 원본 reviewType:`, {
      reviewType: review.reviewType,
      type: typeof review.reviewType,
      isNull: review.reviewType === null,
      isUndefined: review.reviewType === undefined,
      stringValue: String(review.reviewType)
    });
    
    if (review.reviewType !== null && review.reviewType !== undefined) {
      let typeValue = review.reviewType;
      
      if (typeof typeValue === 'object' && typeValue !== null) {
        typeValue = typeValue.name || typeValue.toString();
        console.log(`🔍 [정규화] 리뷰 ${review.performanceReviewId} enum 객체 처리 후:`, typeValue);
      }
      
      const typeStr = String(typeValue).toUpperCase();
      console.log(`🔍 [정규화] 리뷰 ${review.performanceReviewId} 최종 typeStr:`, typeStr);
      
      if (typeStr === 'AFTER' || typeStr === 'EXPECTATION') {
        reviewType = typeStr;
        console.log(`✅ [정규화] 리뷰 ${review.performanceReviewId} reviewType 설정:`, reviewType);
      } else {
        console.warn(`⚠️ [정규화] 리뷰 ${review.performanceReviewId} 예상치 못한 reviewType 값:`, review.reviewType, '->', typeStr);
      }
    } else {
      console.warn(`⚠️ [정규화] 리뷰 ${review.performanceReviewId} reviewType이 null/undefined, 기본값 'AFTER' 사용`);
    }

    return {
      id: review.performanceReviewId,
      performanceReviewId: review.performanceReviewId,
      performanceId: review.performanceId,
      userId: review.userId,
      title: review.title || '',
      content: review.contents || '',
      rating: review.rating || 0,
      reviewType: reviewType,
      author: review.nickname || '익명',
      date: formatDate(review.createdAt || review.updatedAt),
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      performanceDate: formatPerformanceDate(review.performanceDate || review.performanceDateStr || ''),
      performanceTime: review.performanceTime || review.performanceTimeStr || '',
      seat: formatSeatInfo(review),
      section: review.section || '',
      row: review.row || '',
      number: review.number || '',
      performanceTitle: review.performanceTitle || '',
      poster: review.poster || '',
      performanceName: review.performanceTitle || review.performanceName || review.performance?.title || null,
      performance: review.performance || null,
    };
  });
};
