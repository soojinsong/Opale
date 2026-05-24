// src/components/place/PlaceMarker.jsx

import { fetchPlacePerformances } from '../../api/placeApi';
import { normalizePlacePerformances } from '../../services/normalizePlacePerformance';

/**
 * 공연장 마커 HTML 생성 함수
 * 네이버 지도 API의 Marker icon content로 사용
 * @param {Object} place - 공연장 정보
 * @param {number} performanceIndex - 표시할 공연 인덱스 (여러 공연이 있을 때 사용)
 * @returns {Promise<{html: string, anchor: {x: number, y: number}, performances: Array, markerId: string}>} 마커 HTML 문자열, anchor 포인트, 공연 목록, 마커 ID
 */
export const createPlaceMarkerHTML = async (place, performanceIndex = 0) => {
  const defaultMarkerHTML = `
    <div style="
      width: 28px;
      height: 28px;
      background-color:rgb(78, 120, 216);
      border: 2px solid #DFE6F6;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    "></div>
  `;
  const defaultAnchor = { x: 16, y: 16 }; // 32px / 2

  if (!place || !place.id) {
    return { html: defaultMarkerHTML, anchor: defaultAnchor, performances: [], markerId: null };
  }

  try {
    const data = await fetchPlacePerformances(place.id);
    const normalized = normalizePlacePerformances(data);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentPerformances = normalized.filter((perf) => {
      if (!perf.startDate || !perf.endDate) return false;
      
      const start = new Date(perf.startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(perf.endDate);
      end.setHours(0, 0, 0, 0);
      
      return today >= start && today <= end;
    });

    if (currentPerformances.length > 0) {
      const index = performanceIndex % currentPerformances.length;
      const selectedPerformance = currentPerformances[index];
      const posterUrl = selectedPerformance.poster || '/placeholder-poster.png';
      
      const markerId = `marker-${place.id}`;
      
      const markerWithPosterHTML = `
        <div id="${markerId}" style="
          width: 48px;
          height: 48px;
          background-color: transparent;
          border: 3px solid #DFE6F6;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        ">
          <img 
            id="${markerId}-img"
            src="${posterUrl}" 
            alt="${selectedPerformance.title || '공연 포스터'}"
            style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 50%;
              transition: opacity 0.8s ease-in-out;
            "
            onerror="this.onerror=null; this.src='/placeholder-poster.png';"
          />
          <img 
            id="${markerId}-img-next"
            src="${posterUrl}"
            alt=""
            style="
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 50%;
              opacity: 0;
              transition: opacity 0.8s ease-in-out;
              pointer-events: none;
              background-color: transparent;
            "
            onerror="this.onerror=null; this.src='/placeholder-poster.png';"
          />
        </div>
      `;
      const posterAnchor = { x: 24, y: 24 }; // 48px / 2
      
      return { html: markerWithPosterHTML, anchor: posterAnchor, performances: currentPerformances, markerId };
    }
  } catch (error) {
    console.warn('⚠️ 공연장 마커 포스터 로드 실패:', error);
  }

  return { html: defaultMarkerHTML, anchor: defaultAnchor, performances: [], markerId: null };
};
