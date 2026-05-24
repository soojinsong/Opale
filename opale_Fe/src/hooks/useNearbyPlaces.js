import { useEffect, useState, useRef } from "react";
import { fetchNearbyPlaces } from "../api/placeApi";
import { normalizePlace } from "../services/normalizePlace";
import { getCurrentLocation, getDefaultLocation } from "../utils/geolocation";

export const useNearbyPlaces = (params = {}) => {
  const {
    latitude: providedLatitude,
    longitude: providedLongitude,
    radius = 5000,
    sortType = "거리순",
    enabled = true,
  } = params;

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const activeRequestId = useRef(0);
  const prevCoordinatesRef = useRef({ latitude: null, longitude: null });

  useEffect(() => {
    if (!enabled) {
      setPlaces([]);
      setLoading(false);
      prevCoordinatesRef.current = { latitude: null, longitude: null };
      return;
    }

    const loadNearbyPlaces = async () => {
      const coordinatesChanged =
        prevCoordinatesRef.current.latitude !== providedLatitude ||
        prevCoordinatesRef.current.longitude !== providedLongitude;

      if (coordinatesChanged || prevCoordinatesRef.current.latitude === null) {
        setLoading(true);
        setError(null);
        console.log('🔄 [로딩 시작] 좌표 변경 감지:', {
          prev: prevCoordinatesRef.current,
          current: { latitude: providedLatitude, longitude: providedLongitude }
        });
        prevCoordinatesRef.current = {
          latitude: providedLatitude,
          longitude: providedLongitude
        };
      }

      const reqId = ++activeRequestId.current;

      try {
        let latitude = providedLatitude;
        let longitude = providedLongitude;
        let gpsLocation = null;

        try {
          const location = await getCurrentLocation();
          gpsLocation = { latitude: location.latitude, longitude: location.longitude };
          setUserLocation(gpsLocation);
          console.log('📍 GPS 위치 획득:', gpsLocation);
        } catch (gpsError) {
          const defaultLoc = getDefaultLocation();
          gpsLocation = { latitude: defaultLoc.latitude, longitude: defaultLoc.longitude };
          setUserLocation(gpsLocation);
          console.warn('⚠️ GPS 실패, 기본 위치 사용:', gpsLocation);
        }

        if (!latitude || !longitude) {
          latitude = gpsLocation.latitude;
          longitude = gpsLocation.longitude;
          console.log('📍 GPS 위치로 근처 공연장 조회:', { latitude, longitude });
        } else {
          console.log('📍 제공된 좌표로 근처 공연장 조회:', { latitude, longitude });
        }

        if (reqId !== activeRequestId.current) return;

        const dto = {
          latitude,
          longitude,
          radius,
          sortType,
          page: 1,
          size: 100,
        };

        console.log('📡 근처 공연장 API 호출:', dto);
        const res = await fetchNearbyPlaces(dto);
        console.log('✅ 근처 공연장 API 응답:', res);

        if (reqId !== activeRequestId.current) return;

        const list = res.places?.map(normalizePlace) ?? [];
        console.log('📍 정규화된 공연장 목록:', list);
        console.log('📍 공연장 개수:', list.length);
        console.log('📊 API 응답 상세:', {
          totalCount: res.totalCount,
          placesCount: res.places?.length ?? 0,
          normalizedCount: list.length,
          requestParams: dto
        });

        setPlaces(list);
        setTotalCount(res.totalCount ?? 0);

        if (list.length === 0) {
          console.log('⚠️ [디버깅] 해당 범위에 공연장이 없습니다.');
          console.log('⚠️ [디버깅] 검색 파라미터:', {
            center: { latitude, longitude },
            radius: radius,
            radiusKm: (radius / 1000).toFixed(2) + 'km'
          });
          console.log('⚠️ [디버깅] API 응답 totalCount:', res.totalCount);
          setError(null);
        } else {
          console.log('✅ [디버깅] 공연장을 찾았습니다:', list.length, '개');
          setError(null);
        }
      } catch (err) {
        if (reqId === activeRequestId.current) {
          console.error("❌ 근처 공연장 목록 호출 실패:", err);
          setError(err.message || "근처 공연장을 불러오는 중 오류가 발생했습니다.");
          setPlaces([]);
        }
      } finally {
        if (reqId === activeRequestId.current) {
          setLoading(false);
        }
      }
    };

    loadNearbyPlaces();

    return () => {
      activeRequestId.current++;
    };
  }, [enabled, providedLatitude, providedLongitude, radius, sortType]);

  return {
    places,
    loading,
    error,
    userLocation,
    totalCount,
  };
};
