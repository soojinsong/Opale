/**
 * 티켓 데이터 변환 유틸리티
 * 프론트엔드 입력 형식 ↔ 백엔드 API DTO 형식 변환
 */

/**
 * 프론트엔드 입력 데이터를 백엔드 API 요청 DTO로 변환
 * @param {Object} frontendData - 프론트엔드 입력 데이터
 * @param {string} frontendData.performanceName - 공연명
 * @param {string} frontendData.performanceDate - 날짜 (yyyy-MM-dd)
 * @param {string} frontendData.performanceTime - 시간 (HH:mm)
 * @param {string} frontendData.seatFront - 좌석 앞부분 (예: "다 11열", "1층 A구역 3열")
 * @param {string} frontendData.seatNumber - 좌석 번호 (예: "4")
 * @param {string} frontendData.placeName - 공연장명 (선택)
 * @param {number} frontendData.performanceId - 공연 ID (선택)
 * @param {number} frontendData.placeId - 공연장 ID (선택)
 * @returns {Object} - 백엔드 API 요청 DTO
 */
export const transformTicketDataForApi = (frontendData) => {
  const dto = {
    performanceName: frontendData.performanceName || '',
  };

  if (frontendData.performanceId !== null && frontendData.performanceId !== undefined) {
    dto.performanceId = String(frontendData.performanceId);
    console.log('✅ [transformTicketDataForApi] performanceId 포함:', dto.performanceId);
  } else {
    console.warn('⚠️ [transformTicketDataForApi] performanceId 없음:', frontendData.performanceId);
  }

  if (frontendData.placeId !== null && frontendData.placeId !== undefined) {
    dto.placeId = String(frontendData.placeId);
    console.log('✅ [transformTicketDataForApi] placeId 포함:', dto.placeId);
  }

  // performanceDate: yyyy-MM-dd, performanceTime: HH:mm
  // → performanceDate: yyyy-MM-ddTHH:mm:00
  if (frontendData.performanceDate) {
    if (frontendData.performanceTime) {
      dto.performanceDate = `${frontendData.performanceDate}T${frontendData.performanceTime}:00`;
    } else {
      dto.performanceDate = `${frontendData.performanceDate}T00:00:00`;
    }
  } else {
    dto.performanceDate = null;
  }

  let seatFront = (frontendData.seatFront || '').trim();
  let seatNumber = (frontendData.seatNumber || '').trim();
  
  if (seatFront && seatFront.endsWith('-')) {
    seatFront = seatFront.slice(0, -1).trim();
  }
  
  if (seatNumber && seatNumber.startsWith('-')) {
    seatNumber = seatNumber.slice(1).trim();
  }
  
  if (seatNumber && !seatNumber.endsWith('번')) {
    seatNumber = `${seatNumber}번`;
  }
  
  if (seatFront && seatNumber) {
    dto.seatInfo = `${seatFront} ${seatNumber}`;
  } else if (seatFront) {
    dto.seatInfo = seatFront;
  } else if (seatNumber) {
    dto.seatInfo = seatNumber;
  } else {
    dto.seatInfo = null;
  }

  if (frontendData.placeName) {
    dto.placeName = frontendData.placeName;
  }

  return dto;
};

/**
 * 백엔드 API 응답 DTO를 프론트엔드 입력 형식으로 변환
 * @param {Object} apiResponse - 백엔드 API 응답 (TicketDetailResponseDto)
 * @param {string} apiResponse.performanceDate - LocalDateTime 형식 (yyyy-MM-ddTHH:mm:ss)
 * @param {string} apiResponse.seatFront - 좌석 앞부분 (예: "다 11열")
 * @param {string} apiResponse.seatNumber - 좌석 번호 (예: "4")
 * @param {string} apiResponse.seatInfo - 좌석 정보 문자열 (하위 호환성용, seatFront/seatNumber가 없을 때만 사용)
 * @returns {Object} - 프론트엔드 입력 형식 데이터
 */
export const transformTicketDataFromApi = (apiResponse) => {
  if (!apiResponse) return null;

  const frontendData = {
    performanceName: apiResponse.performanceName || '',
    placeName: apiResponse.placeName || '',
    ticketImageUrl: apiResponse.ticketImageUrl || null,
    performanceId: apiResponse.performanceId || null,
    placeId: apiResponse.placeId || null,
  };

  // performanceDate: "2025-10-23T19:00:00" → performanceDate: "2025-10-23", performanceTime: "19:00"
  if (apiResponse.performanceDate) {
    const dateTimeStr = apiResponse.performanceDate;
    
    if (dateTimeStr.includes('T')) {
      const [datePart, timePart] = dateTimeStr.split('T');
      frontendData.performanceDate = datePart; // yyyy-MM-dd
      
      if (timePart) {
        const timeOnly = timePart.split(':').slice(0, 2).join(':');
        frontendData.performanceTime = timeOnly; // HH:mm
      } else {
        frontendData.performanceTime = '';
      }
    } else {
      frontendData.performanceDate = dateTimeStr;
      frontendData.performanceTime = '';
    }
  } else {
    frontendData.performanceDate = '';
    frontendData.performanceTime = '';
  }

  if (apiResponse.seatFront !== undefined) {
    frontendData.seatFront = apiResponse.seatFront || '';
  } else {
    frontendData.seatFront = '';
  }
  
  if (apiResponse.seatNumber !== undefined) {
    frontendData.seatNumber = apiResponse.seatNumber || '';
  } else {
    frontendData.seatNumber = '';
  }

  if (!apiResponse.seatFront && !apiResponse.seatNumber && apiResponse.seatInfo) {
    const seatInfo = apiResponse.seatInfo.trim();
    
    if (seatInfo.includes('-')) {
      const parts = seatInfo.split('-').map(p => p.trim());
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        const numberMatch = lastPart.match(/(\d+)/);
        
        if (numberMatch) {
          frontendData.seatNumber = numberMatch[1];
          frontendData.seatFront = parts.slice(0, parts.length - 1).join(' ').trim();
        } else {
          frontendData.seatFront = parts.slice(0, parts.length - 1).join(' ').trim();
          frontendData.seatNumber = '';
        }
      } else {
        frontendData.seatFront = seatInfo;
        frontendData.seatNumber = '';
      }
    } else {
      frontendData.seatFront = seatInfo;
      frontendData.seatNumber = '';
    }
  }

  return frontendData;
};
