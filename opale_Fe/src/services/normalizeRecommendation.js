/**
 * 추천 API 응답 데이터를 프론트엔드 형식으로 정제
 * RecommendationPerformanceListResponseDto → 프론트엔드 형식
 */

/**
 * 추천된 공연 목록 응답을 정제
 * @param {Object} apiResponse - RecommendationPerformanceListResponseDto
 * @returns {Object} - 정제된 추천 공연 목록
 */
export const normalizeRecommendation = (apiResponse) => {
  if (!apiResponse) {
    return {
      totalCount: 0,
      requestedSize: 0,
      sort: null,
      recommendations: [],
    };
  }

  const normalizedRecommendations = (apiResponse.recommendations || []).map((item) => {
    return {
      id: item.performanceId || item.id,
      performanceId: item.performanceId || item.id,
      title: item.title || '',
      genre: item.genrenm || item.genre || '기타',
      poster: item.poster || '',
      placeName: item.placeName || '',
      venue: item.placeName || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      rating: item.rating ?? 0,
      reviewCount: item.reviewCount || 0,
      keywords: item.keywords || [],
      aiSummary: item.aiSummary || '',
      score: item.score ?? 0,
      viewCount: item.viewCount || 0,
    };
  });

  return {
    totalCount: apiResponse.totalCount || 0,
    requestedSize: apiResponse.requestedSize || 0,
    sort: apiResponse.sort || null,
    recommendations: normalizedRecommendations,
  };
};

/**
 * 추천된 공연 단건을 정제
 * @param {Object} item - RecommendedPerformanceDto
 * @returns {Object} - 정제된 공연 데이터
 */
export const normalizeRecommendedPerformance = (item) => {
  if (!item) return null;

  return {
    id: item.performanceId || item.id,
    performanceId: item.performanceId || item.id,
    title: item.title || '',
    genre: item.genrenm || item.genre || '기타',
    poster: item.poster || '',
    placeName: item.placeName || '',
    venue: item.placeName || '',
    startDate: item.startDate || '',
    endDate: item.endDate || '',
    rating: item.rating ?? 0,
    reviewCount: item.reviewCount || 0,
    keywords: item.keywords || [],
    aiSummary: item.aiSummary || '',
    score: item.score ?? 0,
    viewCount: item.viewCount || 0,
  };
};
