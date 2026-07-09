// src/services/normalizePlaceReview.js

/**
 * 공연장 리뷰 API 응답을 UI에 맞게 정규화
 * @param {Object} apiData - API 응답 데이터 (reviews 배열 포함)
 * @returns {Array} - UI에 맞게 변환된 리뷰 배열
 */
export const normalizePlaceReviews = (apiData) => {
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
        if (section && row) {
          return `${section} ${row}열`;
        } else if (section) {
          return section;
        } else if (row) {
          return `${row}열`;
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

    return {
      id: review.placeReviewId,
      placeReviewId: review.placeReviewId,
      placeId: review.placeId,
      userId: review.userId,
      title: review.title || '',
      content: review.contents || '',
      rating: review.rating || 0,
      reviewType: review.reviewType || 'PLACE',
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
      placeName: review.placeName || '',
      placeAddress: review.placeAddress || '',
      place: review.place || { name: review.placeName, address: review.placeAddress },
      hiddenByReport: Boolean(review.hiddenByReport),
    };
  });
};
