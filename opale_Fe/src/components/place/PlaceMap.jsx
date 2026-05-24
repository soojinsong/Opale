import React, { useEffect, useRef, useState } from 'react';
import styles from './PlaceMap.module.css';
import { loadNaverMapScript } from '../../utils/loadNaverMap';

/**
 * 공연장 위치를 표시하는 네이버 지도 컴포넌트
 * @param {number} latitude - 위도
 * @param {number} longitude - 경도
 * @param {string} placeName - 공연장 이름 (선택사항)
 * @param {string} clientId - 네이버 지도 API Client ID (선택사항, 환경변수에서 가져옴)
 */
const PlaceMap = ({ latitude, longitude, placeName = '공연장', clientId }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    if (!latitude || !longitude) {
      setMapLoading(false);
      return;
    }

    const naverClientId = clientId || import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
    
    if (!naverClientId || naverClientId === 'YOUR_CLIENT_ID' || naverClientId.trim() === '') {
      console.error('❌ 네이버 지도 API Client ID가 설정되지 않았습니다.');
      console.log('현재 환경변수:', import.meta.env.VITE_NAVER_MAP_CLIENT_ID);
      setMapError('네이버 지도 API Client ID가 설정되지 않았습니다. .env 파일에 VITE_NAVER_MAP_CLIENT_ID를 설정해주세요.');
      setMapLoading(false);
      return;
    }

    console.log('✅ 네이버 지도 API Client ID:', naverClientId.substring(0, 10) + '...');

    // https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html
    window.navermap_authFailure = function () {
      console.error('❌ 네이버 지도 API 인증 실패');
      setMapError('네이버 지도 API 인증이 실패했습니다. 네이버 클라우드 플랫폼에서 다음을 확인해주세요:\n1. Maps API 서비스 활성화\n2. 도메인 등록 (localhost:5173)\n3. Client ID 확인');
      setMapLoading(false);
    };

    const initMap = async () => {
      try {
        setMapLoading(true);
        setMapError(null);

        await new Promise(resolve => setTimeout(resolve, 0));

        if (!mapRef.current) {
          throw new Error('지도 컨테이너를 찾을 수 없습니다.');
        }

        await loadNaverMapScript(naverClientId);

        if (!window.naver || !window.naver.maps) {
          throw new Error('네이버 지도 API가 로드되지 않았습니다.');
        }

        if (!mapRef.current) {
          throw new Error('지도 컨테이너를 찾을 수 없습니다.');
        }

        const mapOptions = {
          center: new window.naver.maps.LatLng(latitude, longitude),
          zoom: 15,
          zoomControl: false,
          draggable: false,
          scrollWheelZoom: false,
          pinchZoom: false,
          keyboardShortcuts: false,
          disableDoubleClickZoom: true,
          disableDoubleClick: true,
        };

        const map = new window.naver.maps.Map(mapRef.current, mapOptions);
        mapInstanceRef.current = map;

        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(latitude, longitude),
          map: map,
          title: placeName,
        });
        markerRef.current = marker;

        const infoWindow = new window.naver.maps.InfoWindow({
          content: `<div style="padding: 10px; font-weight: 600;">${placeName}</div>`,
        });

        window.naver.maps.Event.addListener(marker, 'click', () => {
          if (infoWindow.getMap()) {
            infoWindow.close();
          } else {
            infoWindow.open(map, marker);
          }
        });

        setMapLoading(false);
      } catch (err) {
        console.error('네이버 지도 초기화 실패:', err);
        setMapError(err.message || '지도를 불러오는 중 오류가 발생했습니다.');
        setMapLoading(false);
      }
    };

    initMap();

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      if (window.navermap_authFailure) {
        delete window.navermap_authFailure;
      }
    };
  }, [latitude, longitude, placeName, clientId]);

  if (!latitude || !longitude) {
    return (
      <div className={styles.mapContainer}>
        <div className={styles.noLocation}>
          위치 정보가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mapContainer}>
      {/* mapRef는 항상 렌더링되어야 함 */}
      <div ref={mapRef} className={styles.map} />
      {/* 로딩 오버레이 */}
      {mapLoading && (
        <div className={styles.loadingOverlay}>
          지도를 불러오는 중...
        </div>
      )}
      {/* 에러 오버레이 */}
      {mapError && !mapLoading && (
        <div className={styles.errorOverlay}>
          {mapError}
        </div>
      )}
    </div>
  );
};

export default PlaceMap;
