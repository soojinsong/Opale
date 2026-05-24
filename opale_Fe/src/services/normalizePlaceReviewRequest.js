/**
 * 공연장 리뷰 작성 요청 DTO 생성
 * @param {Object} formData - 폼 데이터 { title, content, rating }
 * @param {String} placeId - 공연장 ID
 * @param {Number} ticketId - 티켓 ID (선택)
 * @returns {Object} - API 요청 DTO
 */
export const normalizePlaceReviewRequest = (formData, placeId, ticketId = null) => {
  const dto = {
    title: formData.title || '',
    contents: formData.content || '',
    rating: formData.rating ? parseFloat(formData.rating) : 5.0,
    reviewType: 'PLACE',
    placeId: placeId,
  };

  if (ticketId) {
    dto.ticketId = ticketId;
  }

  return dto;
};
