// src/services/normalizePerformanceReviewRequest.js

/**
 * 공연 리뷰 작성 요청 DTO 생성
 * @param {Object} formData - 폼 데이터 { title, content, rating, performanceDate, performanceTime, section, row, number, ticketId }
 * @param {String} performanceId - 공연 ID
 * @param {String} reviewType - 리뷰 타입 ('AFTER' | 'EXPECTATION')
 * @param {Number|String} ticketId - 티켓 ID (선택)
 * @returns {Object} - API 요청 DTO
 */
export const normalizePerformanceReviewRequest = (formData, performanceId, reviewType = 'AFTER', ticketId = null) => {
  const dto = {
    title: formData.title || '',
    contents: formData.content || '',
    reviewType: reviewType,
    performanceId: performanceId,
  };
  
  if (reviewType !== 'EXPECTATION') {
    dto.rating = formData.rating ? parseFloat(formData.rating) : 5.0;
  } else if (formData.rating !== undefined && formData.rating !== null) {
    dto.rating = parseFloat(formData.rating);
  }

  if (ticketId) {
    dto.ticketId = typeof ticketId === 'string' ? parseInt(ticketId, 10) : ticketId;
  } else if (formData.ticketId) {
    dto.ticketId = typeof formData.ticketId === 'string' ? parseInt(formData.ticketId, 10) : formData.ticketId;
  }

  if (formData.performanceDate) {
    dto.performanceDate = formData.performanceDate;
  }
  if (formData.performanceTime) {
    dto.performanceTime = formData.performanceTime;
  }
  
  if (formData.seatFront) {
    dto.seatFront = formData.seatFront;
  }
  if (formData.seatNumber) {
    dto.seatNumber = formData.seatNumber;
  }
  
  if (formData.section) {
    dto.section = formData.section;
  }
  if (formData.row) {
    dto.row = formData.row;
  }
  if (formData.number) {
    dto.number = formData.number;
  }

  return dto;
};
