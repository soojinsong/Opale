import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import useBottomSheet from '../../hooks/useBottomSheet';
import styles from './PlaceMapView.module.css';
import { loadNaverMapScript } from '../../utils/loadNaverMap';
import PlaceWithPerformancesCard from '../cards/PlaceWithPerformancesCard';
import { createPlaceMarkerHTML } from './PlaceMarker';
import { watchCurrentLocation, clearLocationWatch } from '../../utils/geolocation';

/**
 * 여러 공연장 위치를 표시하는 네이버 지도 컴포넌트
 * @param {Array} places - 공연장 배열 [{ id, name, latitude, longitude, address }, ...]
 * @param {Object} userLocation - GPS 사용자 위치 { latitude, longitude }
 * @param {Object} searchCenter - 검색 기준 좌표 { latitude, longitude }
 * @param {number} searchRadius - 검색 반경 (미터)
 * @param {Function} onSearchAtCenter - 현재 지도 중심 좌표로 검색하는 콜백 함수
 * @param {string} clientId - 네이버 지도 API Client ID (선택사항, 환경변수에서 가져옴)
 */
const PlaceMapView = forwardRef(({ places = [], userLocation = null, searchCenter = null, searchRadius = 0, onSearchAtCenter, clientId }, ref) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowsRef = useRef([]);
  const markerIntervalsRef = useRef(new Map());
  const markerPerformanceIndicesRef = useRef(new Map());
  const markerPerformancesRef = useRef(new Map());
  const markerShowingFirstRef = useRef(new Map());
  const userMarkerRef = useRef(null);
  const searchCenterMarkerRef = useRef(null);
  const searchRadiusCircleRef = useRef(null);
  const scaleControlRef = useRef(null);
  const locationWatchIdRef = useRef(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [isCreatingMarkers, setIsCreatingMarkers] = useState(false);
  
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedPlaceCardHeight, setSelectedPlaceCardHeight] = useState(0);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const selectedPlaceInfoWindowRef = useRef(null);
  const selectedPlaceMarkerRef = useRef(null);
  
  const {
    sheetHeight, setSheetHeight,
    isDragging, setIsDragging,
    isTransitioning, setIsTransitioning,
    sheetRef, sheetContentRef,
    dragStateRef, scrollStateRef, animationFrameRef, globalTouchHandlersRef,
    MIN_SHEET_HEIGHT,
    getMaxSheetHeight, getSnapHeight, isAtTopAndMaxHeight, isScrollAtTop,
    handleSheetMouseDown, handleSheetTouchStart, handleSheetTouchMove,
    handleSheetTouchEnd, handleMaxHeightDragDown,
  } = useBottomSheet();

  useEffect(() => {
    const naverClientId = clientId || import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
    
    if (!naverClientId || naverClientId === 'YOUR_CLIENT_ID' || naverClientId.trim() === '') {
      console.error('❌ 네이버 지도 API Client ID가 설정되지 않았습니다.');
      setMapError('네이버 지도 API Client ID가 설정되지 않았습니다. .env 파일에 VITE_NAVER_MAP_CLIENT_ID를 설정해주세요.');
      setMapLoading(false);
      return;
    }

    window.navermap_authFailure = function () {
      console.error('❌ 네이버 지도 API 인증 실패');
      setMapError('네이버 지도 API 인증이 실패했습니다.');
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

        const defaultCenter = new window.naver.maps.LatLng(37.5665, 126.9780);
        const mapOptions = {
          center: defaultCenter,
          zoom: 11,
          zoomControl: true,
          zoomControlOptions: {
            position: window.naver.maps.Position.TOP_RIGHT,
          },
          draggable: true,
          scrollWheelZoom: true,
          pinchZoom: true,
          keyboardShortcuts: true,
          disableDoubleClickZoom: false,
          disableDoubleClick: false,
        };

        const map = new window.naver.maps.Map(mapRef.current, mapOptions);
        mapInstanceRef.current = map;

        try {
          if (!map.controls || !map.controls[window.naver.maps.Position.TOP_RIGHT] || 
              map.controls[window.naver.maps.Position.TOP_RIGHT].length === 0) {
            const zoomControl = new window.naver.maps.ZoomControl({
              position: window.naver.maps.Position.TOP_RIGHT,
            });
            if (!map.controls) {
              map.controls = {};
            }
            if (!map.controls[window.naver.maps.Position.TOP_RIGHT]) {
              map.controls[window.naver.maps.Position.TOP_RIGHT] = [];
            }
            map.controls[window.naver.maps.Position.TOP_RIGHT].push(zoomControl);
          }
        } catch (zoomError) {
          console.warn('⚠️ 줌 컨트롤 추가 실패:', zoomError);
        }

        try {
          const scaleControl = new window.naver.maps.ScaleControl({
            position: window.naver.maps.Position.BOTTOM_RIGHT,
          });
          if (map.controls && map.controls[window.naver.maps.Position.BOTTOM_RIGHT]) {
            map.controls[window.naver.maps.Position.BOTTOM_RIGHT].push(scaleControl);
          } else {
            if (!map.controls) {
              map.controls = {};
            }
            map.controls[window.naver.maps.Position.BOTTOM_RIGHT] = [scaleControl];
          }
          scaleControlRef.current = scaleControl;
        } catch (scaleError) {
          console.warn('⚠️ 축적 컨트롤 추가 실패:', scaleError);
        }

        console.log('🗺️ 지도 초기화 완료');

        setMapLoading(false);
      } catch (err) {
        console.error('네이버 지도 초기화 실패:', err);
        setMapError(err.message || '지도를 불러오는 중 오류가 발생했습니다.');
        setMapLoading(false);
      }
    };

    initMap();

    return () => {
      if (scaleControlRef.current) {
        scaleControlRef.current = null;
      }
      if (window.navermap_authFailure) {
        delete window.navermap_authFailure;
      }
    };
  }, [clientId]);

  const clearMarkers = useCallback(async () => {
    if (!mapInstanceRef.current || !window.naver || !window.naver.maps) {
      return;
    }

    console.log('🧹 [마커 제거] 기존 공연장 마커 모두 제거 시작');
    
    markerIntervalsRef.current.forEach((intervalId, marker) => {
      clearInterval(intervalId);
    });
    markerIntervalsRef.current.clear();
    markerPerformanceIndicesRef.current.clear();
    markerPerformancesRef.current.clear();
    markerShowingFirstRef.current.clear();
    
    const markersToRemove = [...markersRef.current];
    markersToRemove.forEach(marker => {
      if (marker) {
        marker.setMap(null);
        if (window.naver && window.naver.maps && window.naver.maps.Event) {
          window.naver.maps.Event.clearInstanceListeners(marker);
        }
      }
    });
    
    const infoWindowsToRemove = [...infoWindowsRef.current];
    infoWindowsToRemove.forEach(infoWindow => {
      if (infoWindow) {
        infoWindow.close();
        if (window.naver && window.naver.maps && window.naver.maps.Event) {
          window.naver.maps.Event.clearInstanceListeners(infoWindow);
        }
      }
    });
    
    if (searchCenterMarkerRef.current) {
      searchCenterMarkerRef.current.setMap(null);
      searchCenterMarkerRef.current = null;
      console.log('🧹 [마커 제거] 검색 기준 좌표 마커 제거');
    }
    if (searchRadiusCircleRef.current) {
      searchRadiusCircleRef.current.setMap(null);
      searchRadiusCircleRef.current = null;
      console.log('🧹 [마커 제거] 검색 반경 원 제거');
    }
    
    if (selectedPlaceInfoWindowRef.current) {
      selectedPlaceInfoWindowRef.current.close();
      selectedPlaceInfoWindowRef.current = null;
    }
    setIsCardVisible(false);
    setSelectedPlaceCardHeight(0);
    setSelectedPlace(null);
    selectedPlaceMarkerRef.current = null;
    console.log('🧹 [마커 제거] 선택된 공연장 카드 닫기');
    
    markersRef.current = [];
    infoWindowsRef.current = [];
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('✅ [마커 제거] 기존 공연장 마커 제거 완료');
  }, []);

  useImperativeHandle(ref, () => ({
    clearMarkers,
    isCreatingMarkers
  }), [clearMarkers, isCreatingMarkers]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.naver || !window.naver.maps || mapLoading) {
      return;
    }

    const map = mapInstanceRef.current;
    console.log('🗺️ [4단계] 마커 생성 시작:', {
      placesCount: places.length,
      userLocation,
      searchCenter,
      searchRadius,
      mapReady: !!map
    });

    if (!places || places.length === 0) {
      console.log('📭 [마커 생성] places가 비어있음 - 기존 공연장 마커 제거');
      const markersToRemove = [...markersRef.current];
      markersToRemove.forEach(marker => {
        if (marker) {
          marker.setMap(null);
          if (window.naver && window.naver.maps && window.naver.maps.Event) {
            window.naver.maps.Event.clearInstanceListeners(marker);
          }
        }
      });
      markersRef.current = [];
      
      const infoWindowsToRemove = [...infoWindowsRef.current];
      infoWindowsToRemove.forEach(infoWindow => {
        if (infoWindow) {
          infoWindow.close();
          if (window.naver && window.naver.maps && window.naver.maps.Event) {
            window.naver.maps.Event.clearInstanceListeners(infoWindow);
          }
        }
      });
      infoWindowsRef.current = [];
      
    }

    const validPlaces = places.filter(
      place => place.latitude && place.longitude && 
      !isNaN(parseFloat(place.latitude)) && 
      !isNaN(parseFloat(place.longitude))
    );

    console.log('✅ [디버깅] 유효한 공연장 개수:', validPlaces.length);
    if (validPlaces.length === 0 && places.length > 0) {
      console.warn('⚠️ [디버깅] places는 있지만 유효한 공연장이 없습니다. 원본 places:', places);
    }

    if (searchCenterMarkerRef.current) {
      searchCenterMarkerRef.current.setMap(null);
      searchCenterMarkerRef.current = null;
      console.log('🧹 [마커 생성] 이전 검색 기준 좌표 마커 제거');
    }
    if (searchRadiusCircleRef.current) {
      searchRadiusCircleRef.current.setMap(null);
      searchRadiusCircleRef.current = null;
      console.log('🧹 [마커 생성] 이전 검색 반경 원 제거');
    }

    let gpsPosition = null;
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      gpsPosition = new window.naver.maps.LatLng(
        userLocation.latitude,
        userLocation.longitude
      );

      if (userMarkerRef.current) {
        userMarkerRef.current.setPosition(gpsPosition);
        console.log('📍 GPS 위치 마커 업데이트:', { latitude: userLocation.latitude, longitude: userLocation.longitude });
      } else {
        const gpsMarker = new window.naver.maps.Marker({
          position: gpsPosition,
          map: map,
          icon: {
            content: `
              <div style="
                width: 18px;
                height: 18px;
                background-color: #4285F4;
                border: 2px solid #FFFFFF;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              "></div>
            `,
            anchor: window.naver && window.naver.maps && window.naver.maps.Point 
              ? new window.naver.maps.Point(9, 9)
              : undefined,
          },
          zIndex: 1000,
          title: '내 위치 (GPS)',
        });

        userMarkerRef.current = gpsMarker;
        console.log('📍 GPS 위치 마커 생성:', { latitude: userLocation.latitude, longitude: userLocation.longitude });
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    let searchCenterPosition = null;
    if (searchCenter && searchCenter.latitude && searchCenter.longitude) {
      searchCenterPosition = new window.naver.maps.LatLng(
        searchCenter.latitude,
        searchCenter.longitude
      );

      const searchMarker = new window.naver.maps.Marker({
        position: searchCenterPosition,
        map: map,
        icon: {
          content: `
            <div style="
              width: 18px;
              height: 18px;
              background-color: #FF9800;
              border: 2px solid #FFFFFF;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            "></div>
          `,
          anchor: window.naver && window.naver.maps && window.naver.maps.Point 
            ? new window.naver.maps.Point(9, 9)
            : undefined,
        },
        zIndex: 1001,
        title: '검색 기준 위치',
      });

      searchCenterMarkerRef.current = searchMarker;
      console.log('📍 검색 기준 좌표 마커 생성:', { latitude: searchCenter.latitude, longitude: searchCenter.longitude });

      const MIN_CIRCLE_RADIUS = 50;
      const MAX_CIRCLE_RADIUS = 50000;
      
      if (searchRadius && searchRadius >= MIN_CIRCLE_RADIUS && searchRadius <= MAX_CIRCLE_RADIUS) {
        try {
          const circle = new window.naver.maps.Circle({
            map: map,
            center: searchCenterPosition,
            radius: searchRadius,
            fillColor: '#FF9800',
            fillOpacity: 0.15,
            strokeColor: '#FF9800',
            strokeOpacity: 0.4,
            strokeWeight: 2,
            zIndex: 1,
          });
          searchRadiusCircleRef.current = circle;
          console.log('⭕ 검색 반경 원 생성:', { radius: searchRadius, center: searchCenterPosition });
        } catch (circleError) {
          console.warn('⚠️ 반경 원 생성 실패:', circleError);
          searchRadiusCircleRef.current = null;
        }
      } else if (searchRadius && searchRadius > 0 && searchRadius < MIN_CIRCLE_RADIUS) {
        console.log('ℹ️ [디버깅] 반경이 너무 작아서 원을 표시하지 않습니다:', searchRadius);
      } else if (searchRadius && searchRadius > MAX_CIRCLE_RADIUS) {
        console.warn('⚠️ [디버깅] 반경이 너무 커서 원을 표시하지 않습니다:', {
          radius: searchRadius,
          radiusKm: (searchRadius / 1000).toFixed(2) + 'km',
          maxRadius: MAX_CIRCLE_RADIUS,
          maxRadiusKm: (MAX_CIRCLE_RADIUS / 1000).toFixed(2) + 'km'
        });
      }
    }

    const centerPosition = searchCenterPosition || gpsPosition;

    const calculateCircleBounds = (centerLat, centerLng, radius) => {
      const latPerMeter = 1 / 111000;
      const lngPerMeter = 1 / (111000 * Math.cos(centerLat * Math.PI / 180));
      
      const padding = 0.3;
      const radiusInDegrees = {
        lat: (radius * latPerMeter) * padding,
        lng: (radius * lngPerMeter) * padding
      };
      
      return new window.naver.maps.LatLngBounds(
        new window.naver.maps.LatLng(centerLat - radiusInDegrees.lat, centerLng - radiusInDegrees.lng),
        new window.naver.maps.LatLng(centerLat + radiusInDegrees.lat, centerLng + radiusInDegrees.lng)
      );
    };

    if (gpsPosition && validPlaces.length === 0 && !searchCenterPosition) {
      map.setCenter(gpsPosition);
      map.setZoom(15);
      console.log('📍 [초기 로드] GPS 위치로 지도 뷰포트 설정 (줌 레벨 15):', {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      });
    } else if (centerPosition && validPlaces.length > 0) {
      const allBounds = new window.naver.maps.LatLngBounds();
      allBounds.extend(centerPosition);
      validPlaces.forEach(place => {
        allBounds.extend(new window.naver.maps.LatLng(place.latitude, place.longitude));
      });
      
      if (searchCenter && searchRadius && searchRadiusCircleRef.current) {
        const circleBounds = calculateCircleBounds(
          searchCenter.latitude,
          searchCenter.longitude,
          searchRadius
        );
        allBounds.extend(circleBounds.getSW());
        allBounds.extend(circleBounds.getNE());
      }

      map.fitBounds(allBounds, {
        top: 40,
        right: 10,
        bottom: 40,
        left: 10,
      });

      setTimeout(() => {
        const currentBounds = map.getBounds();
        const currentCenter = map.getCenter();
        
        if (currentBounds && currentBounds.hasLatLng(centerPosition)) {
          map.setCenter(centerPosition);
          
          let allVisible = true;
          validPlaces.forEach(place => {
            const placePos = new window.naver.maps.LatLng(place.latitude, place.longitude);
            if (!currentBounds.hasLatLng(placePos)) {
              allVisible = false;
            }
          });

          if (!allVisible) {
            const currentZoom = map.getZoom();
            map.setZoom(Math.max(currentZoom - 1, 10));
          }
          
          map.setCenter(centerPosition);
        }
      }, 100);
    } else if (centerPosition) {
      if (gpsPosition && centerPosition.equals(gpsPosition)) {
        map.setCenter(centerPosition);
        map.setZoom(15);
        console.log('📍 [디버깅] 초기 GPS 위치로 지도 설정 (줌 레벨 15):', {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        });
      } else {
        if (searchCenter && searchRadius && searchRadiusCircleRef.current) {
          const circleBounds = calculateCircleBounds(
            searchCenter.latitude,
            searchCenter.longitude,
            searchRadius
          );
          
          map.fitBounds(circleBounds, {
            top: 40,
            right: 10,
            bottom: 40,
            left: 10,
          });
          
          console.log('🔍 [디버깅] 반경 원이 화면에 다 들어오도록 뷰포트 조정:', {
            center: { lat: searchCenter.latitude, lng: searchCenter.longitude },
            radius: searchRadius,
            radiusKm: (searchRadius / 1000).toFixed(2) + 'km'
          });
        } else {
          map.setCenter(centerPosition);
          const currentZoom = map.getZoom();
          map.setZoom(Math.max(currentZoom - 2, 12));
        }
      }
    } else if (validPlaces.length > 0) {
      if (validPlaces.length > 1) {
        const bounds = new window.naver.maps.LatLngBounds();
        validPlaces.forEach(place => {
          bounds.extend(new window.naver.maps.LatLng(place.latitude, place.longitude));
        });
        map.fitBounds(bounds, {
          top: 100,
          right: 50,
          bottom: 100,
          left: 50,
        });
      } else if (validPlaces.length === 1) {
        const placePos = new window.naver.maps.LatLng(validPlaces[0].latitude, validPlaces[0].longitude);
        map.setCenter(placePos);
        map.setZoom(15);
      }
    }

    const createMarkers = async () => {
      console.log('📍 [4단계] 새로운 공연장 마커 생성 시작:', validPlaces.length, '개');
      
      setIsCreatingMarkers(true);
      
      if (markersRef.current.length > 0) {
        console.warn('⚠️ [4단계] 기존 마커가 남아있습니다. 제거합니다.');
        const remainingMarkers = [...markersRef.current];
        remainingMarkers.forEach(marker => {
          if (marker) {
            marker.setMap(null);
            if (window.naver && window.naver.maps && window.naver.maps.Event) {
              window.naver.maps.Event.clearInstanceListeners(marker);
            }
          }
        });
        markersRef.current = [];
      }

      const newMarkers = [];
      const newInfoWindows = [];

      for (const place of validPlaces) {
      const position = new window.naver.maps.LatLng(place.latitude, place.longitude);
      
        const { html: markerHTML, anchor, performances, markerId } = await createPlaceMarkerHTML(place, 0);
        
      const marker = new window.naver.maps.Marker({
        position: position,
        map: null,
        title: place.name,
          icon: {
            content: markerHTML,
            anchor: new window.naver.maps.Point(anchor.x, anchor.y),
          },
          zIndex: 100,
      });
        newMarkers.push(marker);
        
        if (performances && performances.length > 1 && markerId) {
          markerPerformancesRef.current.set(marker, performances);
          markerPerformanceIndicesRef.current.set(marker, 0);
          markerShowingFirstRef.current.set(marker, true);
          
          const intervalId = setInterval(() => {
            const currentIndex = markerPerformanceIndicesRef.current.get(marker) || 0;
            const nextIndex = (currentIndex + 1) % performances.length;
            markerPerformanceIndicesRef.current.set(marker, nextIndex);
            
            const markerElement = marker.getElement();
            if (markerElement) {
              const imgElement = markerElement.querySelector(`#${markerId}-img`);
              const imgNextElement = markerElement.querySelector(`#${markerId}-img-next`);
              
              if (imgElement && imgNextElement) {
                const nextPerformance = performances[nextIndex];
                const nextPosterUrl = nextPerformance.poster || '/placeholder-poster.png';
                
                const isShowingFirst = markerShowingFirstRef.current.get(marker) ?? true;
                const currentImg = isShowingFirst ? imgElement : imgNextElement;
                const nextImg = isShowingFirst ? imgNextElement : imgElement;
                
                const newImg = new Image();
                newImg.onload = () => {
                  nextImg.src = newImg.src;
                  nextImg.alt = nextPerformance.title || '공연 포스터';
                  
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      currentImg.style.opacity = '0';
                      nextImg.style.opacity = '1';
                      
                      setTimeout(() => {
                        const nextNextIndex = (nextIndex + 1) % performances.length;
                        const nextNextPerformance = performances[nextNextIndex];
                        const nextNextPosterUrl = nextNextPerformance.poster || '/placeholder-poster.png';
                        
                        const nextNextImg = new Image();
                        nextNextImg.onload = () => {
                          currentImg.src = nextNextImg.src;
                          currentImg.alt = nextNextPerformance.title || '공연 포스터';
                          currentImg.style.opacity = '0';
                        };
                        nextNextImg.onerror = () => {
                          currentImg.src = '/placeholder-poster.png';
                          currentImg.alt = '공연 포스터';
                          currentImg.style.opacity = '0';
                        };
                        nextNextImg.src = nextNextPosterUrl;
                        
                        markerShowingFirstRef.current.set(marker, !isShowingFirst);
                      }, 800);
                    });
                  });
                };
                newImg.onerror = () => {
                  const placeholderImg = new Image();
                  placeholderImg.onload = () => {
                    nextImg.src = placeholderImg.src;
                    nextImg.alt = '공연 포스터';
                    
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        currentImg.style.opacity = '0';
                        nextImg.style.opacity = '1';
                        
                        setTimeout(() => {
                          const nextNextIndex = (nextIndex + 1) % performances.length;
                          const nextNextPerformance = performances[nextNextIndex];
                          const nextNextPosterUrl = nextNextPerformance.poster || '/placeholder-poster.png';
                          
                          const nextNextImg = new Image();
                          nextNextImg.onload = () => {
                            currentImg.src = nextNextImg.src;
                            currentImg.alt = nextNextPerformance.title || '공연 포스터';
                            currentImg.style.opacity = '0';
                          };
                          nextNextImg.onerror = () => {
                            currentImg.src = '/placeholder-poster.png';
                            currentImg.alt = '공연 포스터';
                            currentImg.style.opacity = '0';
                          };
                          nextNextImg.src = nextNextPosterUrl;
                          
                          markerShowingFirstRef.current.set(marker, !isShowingFirst);
                        }, 800);
                      });
                    });
                  };
                  placeholderImg.onerror = () => {
                    console.warn('⚠️ Placeholder 이미지 로드 실패:', markerId);
                  };
                  placeholderImg.src = '/placeholder-poster.png';
                };
                newImg.src = nextPosterUrl;
              }
            }
          }, 5000);
          
          markerIntervalsRef.current.set(marker, intervalId);
        }

      const infoWindow = new window.naver.maps.InfoWindow({
        content: `<div style="padding: 10px; font-weight: 600;">${place.name}</div>`,
      });
        newInfoWindows.push(infoWindow);

      window.naver.maps.Event.addListener(marker, 'click', () => {
          newInfoWindows.forEach(iw => {
          if (iw && iw !== infoWindow && iw.getMap()) {
            iw.close();
          }
        });
          
          setSelectedPlace(place);
          selectedPlaceInfoWindowRef.current = infoWindow;
          selectedPlaceMarkerRef.current = marker;
          
          infoWindow.open(map, marker);
          
          map.setCenter(position);
          map.setZoom(Math.max(map.getZoom(), 15));
          
          setSelectedPlaceCardHeight('max-content');
          
          setTimeout(() => {
            setIsCardVisible(true);
          }, 10);
        });
      }
      
      newMarkers.forEach(marker => {
        marker.setMap(map);
      });
      
      markersRef.current = newMarkers;
      infoWindowsRef.current = newInfoWindows;
      
      setIsCreatingMarkers(false);
      
      console.log('✅ [4단계] 새로운 공연장 마커 생성 완료:', markersRef.current.length, '개');
    };

    createMarkers().catch(error => {
      console.error('❌ [4단계] 마커 생성 중 오류 발생:', error);
    });

    console.log('✅ [디버깅] 마커 생성 완료:', {
      totalMarkers: markersRef.current.length,
      placeMarkers: markersRef.current.length - (userMarkerRef.current ? 1 : 0) - (searchCenterMarkerRef.current ? 1 : 0),
      hasUserMarker: !!userMarkerRef.current,
      hasSearchCenterMarker: !!searchCenterMarkerRef.current,
      hasSearchRadiusCircle: !!searchRadiusCircleRef.current,
      validPlacesCount: validPlaces.length
    });

  }, [places, userLocation, searchCenter, searchRadius, mapLoading]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.naver || !window.naver.maps || mapLoading) {
      return;
    }

    if (userLocation && userLocation.latitude && userLocation.longitude && 
        !searchCenter && (!places || places.length === 0)) {
      const map = mapInstanceRef.current;
      const gpsPosition = new window.naver.maps.LatLng(
        userLocation.latitude,
        userLocation.longitude
      );
      
      if (!userMarkerRef.current) {
        const gpsMarker = new window.naver.maps.Marker({
          position: gpsPosition,
          map: map,
          icon: {
            content: `
              <div style="
                width: 18px;
                height: 18px;
                background-color: #4285F4;
                border: 2px solid #FFFFFF;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              "></div>
            `,
            anchor: window.naver && window.naver.maps && window.naver.maps.Point 
              ? new window.naver.maps.Point(9, 9)
              : undefined,
          },
          zIndex: 1000,
          title: '내 위치 (GPS)',
        });
        userMarkerRef.current = gpsMarker;
        console.log('📍 [초기 로드] GPS 위치 마커 생성:', {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        });
      } else {
        userMarkerRef.current.setPosition(gpsPosition);
        userMarkerRef.current.setMap(map);
      }
      
      const currentCenter = map.getCenter();
      const defaultCenter = new window.naver.maps.LatLng(37.5665, 126.9780);
      
      if (!currentCenter || 
          (Math.abs(currentCenter.lat() - defaultCenter.lat()) < 0.001 && 
           Math.abs(currentCenter.lng() - defaultCenter.lng()) < 0.001) ||
          (Math.abs(currentCenter.lat() - gpsPosition.lat()) > 0.001 || 
           Math.abs(currentCenter.lng() - gpsPosition.lng()) > 0.001)) {
        map.setCenter(gpsPosition);
        map.setZoom(15);
        console.log('📍 [자동 설정] GPS 위치로 지도 뷰포트 설정:', {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        });
      }
    }
  }, [userLocation, searchCenter, places, mapLoading]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.naver || !window.naver.maps || mapLoading) {
      return;
    }

    const map = mapInstanceRef.current;

    if (locationWatchIdRef.current !== null) {
      clearLocationWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }

    const watchId = watchCurrentLocation(
      (newLocation) => {
        if (!mapInstanceRef.current || !window.naver || !window.naver.maps) {
          return;
        }

        const gpsPosition = new window.naver.maps.LatLng(
          newLocation.latitude,
          newLocation.longitude
        );

        if (userMarkerRef.current) {
          userMarkerRef.current.setPosition(gpsPosition);
          console.log('📍 [실시간] GPS 마커 위치 업데이트:', {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude
          });
        } else {
          const gpsMarker = new window.naver.maps.Marker({
            position: gpsPosition,
            map: map,
            icon: {
              content: `
                <div style="
                  width: 18px;
                  height: 18px;
                  background-color: #4285F4;
                  border: 2px solid #FFFFFF;
                  border-radius: 50%;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                "></div>
              `,
              anchor: window.naver && window.naver.maps && window.naver.maps.Point 
                ? new window.naver.maps.Point(9, 9)
                : undefined,
            },
            zIndex: 1000,
            title: '내 위치 (GPS)',
          });
          userMarkerRef.current = gpsMarker;
          console.log('📍 [실시간] GPS 마커 생성:', {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude
          });
        }
      },
      (error) => {
        console.error('❌ [실시간] GPS 위치 추적 실패:', error);
      }
    );

    locationWatchIdRef.current = watchId;
    console.log('🔄 [실시간] GPS 위치 추적 시작');

    return () => {
      if (locationWatchIdRef.current !== null) {
        clearLocationWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
        console.log('🛑 [실시간] GPS 위치 추적 중지');
      }
    };
  }, [mapLoading]);

  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current !== null) {
        clearLocationWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
      
      markerIntervalsRef.current.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      markerIntervalsRef.current.clear();
      markerPerformanceIndicesRef.current.clear();
      markerPerformancesRef.current.clear();
      markerShowingFirstRef.current.clear();
      
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      if (searchCenterMarkerRef.current) {
        searchCenterMarkerRef.current.setMap(null);
        searchCenterMarkerRef.current = null;
      }
      if (searchRadiusCircleRef.current) {
        searchRadiusCircleRef.current.setMap(null);
        searchRadiusCircleRef.current = null;
      }
      markersRef.current.forEach(marker => {
        if (marker) marker.setMap(null);
      });
      infoWindowsRef.current.forEach(infoWindow => {
        if (infoWindow) infoWindow.close();
      });
      markersRef.current = [];
      infoWindowsRef.current = [];
    };
  }, []);

  const handleSearchAtCenter = () => {
    if (!mapInstanceRef.current || !onSearchAtCenter) {
      return;
    }

    const map = mapInstanceRef.current;
    const center = map.getCenter();
    
    if (center) {
      const latitude = center.lat();
      const longitude = center.lng();
      
      const bounds = map.getBounds();
      if (bounds) {
        const sw = bounds.getSW();
        const ne = bounds.getNE();
        
        const R = 6371000;
        const lat1 = sw.lat() * Math.PI / 180;
        const lat2 = ne.lat() * Math.PI / 180;
        const deltaLat = (ne.lat() - sw.lat()) * Math.PI / 180;
        const deltaLng = (ne.lng() - sw.lng()) * Math.PI / 180;
        
        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const viewportRadius = (R * c) / 2;
        
        let calculatedRadius = Math.ceil(viewportRadius * 1.1);
        
        const MIN_RADIUS = 100;
        const MAX_RADIUS = 10000;
        
        if (calculatedRadius < MIN_RADIUS) {
          calculatedRadius = MIN_RADIUS;
        } else if (calculatedRadius > MAX_RADIUS) {
          calculatedRadius = MAX_RADIUS;
        }
        
        console.log('🔍 현재 지도 중심 좌표로 검색:', { 
          latitude, 
          longitude,
          viewportRadius: Math.round(viewportRadius),
          calculatedRadius,
          limited: calculatedRadius !== Math.ceil(viewportRadius * 1.1)
        });
        
        onSearchAtCenter({ 
          latitude, 
          longitude,
          radius: calculatedRadius 
        });
      } else {
        console.log('🔍 현재 지도 중심 좌표로 검색 (기본 반경):', { latitude, longitude });
        onSearchAtCenter({ 
          latitude, 
          longitude,
          radius: 5000
        });
      }
    }
  };

  const handleMoveToCurrentLocation = () => {
    if (!mapInstanceRef.current || !userLocation || !window.naver || !window.naver.maps) {
      console.warn('⚠️ GPS 위치가 없어서 이동할 수 없습니다.');
      return;
    }

    const map = mapInstanceRef.current;
    const gpsPosition = new window.naver.maps.LatLng(
      userLocation.latitude,
      userLocation.longitude
    );
    
    if (!userMarkerRef.current) {
      const gpsMarker = new window.naver.maps.Marker({
        position: gpsPosition,
        map: map,
        icon: {
          content: `
            <div style="
              width: 18px;
              height: 18px;
              background-color: #4285F4;
              border: 2px solid #FFFFFF;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            "></div>
          `,
          anchor: window.naver && window.naver.maps && window.naver.maps.Point 
            ? new window.naver.maps.Point(9, 9)
            : undefined,
        },
        zIndex: 1000,
        title: '내 위치 (GPS)',
      });
      userMarkerRef.current = gpsMarker;
      console.log('📍 GPS 위치 마커 생성 (버튼 클릭):', { 
        latitude: userLocation.latitude, 
        longitude: userLocation.longitude 
      });
    } else {
      userMarkerRef.current.setPosition(gpsPosition);
      userMarkerRef.current.setMap(map);
    }
    
    map.setCenter(gpsPosition);
    map.setZoom(15);
    console.log('📍 GPS 위치로 뷰포트 이동:', { 
      latitude: userLocation.latitude, 
      longitude: userLocation.longitude,
      gpsLocation: userLocation 
    });
  };

  const handleCloseSelectedPlaceCard = () => {
    setIsCardVisible(false);
    setSelectedPlaceCardHeight(0);
    
    setTimeout(() => {
      if (selectedPlaceInfoWindowRef.current) {
        selectedPlaceInfoWindowRef.current.close();
        selectedPlaceInfoWindowRef.current = null;
      }
      
      setSelectedPlace(null);
      selectedPlaceMarkerRef.current = null;
    }, 300);
  };

  const formatRadius = (radius) => {
    if (radius >= 1000) {
      return `${(radius / 1000).toFixed(1)}km`;
    }
    return `${radius}m`;
  };


  return (
    <div className={styles.mapContainer}>
      <div ref={mapRef} className={styles.map} />
      {searchCenter && searchRadius > 0 && (
        <div className={styles.radiusInfo}>
          반경 {formatRadius(searchRadius)}
        </div>
      )}
      {mapInstanceRef.current && (
        <div className={styles.buttonGroup}>
          {userLocation && (
            <button 
              className={styles.locationButton}
              onClick={handleMoveToCurrentLocation}
              type="button"
              title="현재 위치로 이동"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className={styles.locationIcon}
              >
                <circle cx="12" cy="12" r="2" fill="#797979"/>
                <circle cx="12" cy="12" r="8" stroke="#797979" strokeWidth="1.5" fill="none"/>
                <line x1="12" y1="4" x2="12" y2="6" stroke="#797979" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12" y1="18" x2="12" y2="20" stroke="#797979" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="4" y1="12" x2="6" y2="12" stroke="#797979" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="18" y1="12" x2="20" y2="12" stroke="#797979" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          {onSearchAtCenter && (
            <button 
              className={styles.searchButton}
              onClick={handleSearchAtCenter}
              type="button"
            >
              현재 위치에서 공연장 찾기
            </button>
          )}
        </div>
      )}
      {mapLoading && (
        <div className={styles.loadingOverlay}>
          지도를 불러오는 중...
        </div>
      )}
      {mapError && !mapLoading && (
        <div className={styles.errorOverlay}>
          {mapError}
        </div>
      )}
      {selectedPlace && (
        <div 
          className={`${styles.selectedPlaceCard} ${isCardVisible ? styles.cardVisible : ''}`}
          style={{ 
            height: selectedPlaceCardHeight === 'max-content' ? 'max-content' : `${selectedPlaceCardHeight}px`,
            maxHeight: selectedPlaceCardHeight === 'max-content' ? 'calc(100vh - 61px - 76px)' : 'none'
          }}
        >
          <button 
            className={styles.closeButton}
            onClick={handleCloseSelectedPlaceCard}
            type="button"
            aria-label="닫기"
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M18 6L6 18M6 6L18 18" 
                stroke="#6b7280" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className={styles.selectedPlaceCardContent}>
            <PlaceWithPerformancesCard
              {...selectedPlace}
            />
          </div>
        </div>
      )}
      {places.length > 0 && (
        <div 
          ref={sheetRef}
          className={`${styles.bottomSheet} ${isTransitioning ? styles.transitioning : ''} ${isDragging ? styles.dragging : ''} ${selectedPlace ? styles.sheetHidden : ''}`}
          style={{ height: selectedPlace ? '0px' : `${sheetHeight}px` }}
        >
          <div 
            className={styles.sheetHandle}
            onMouseDown={handleSheetMouseDown}
            onTouchStart={(e) => {
              const maxHeight = getMaxSheetHeight();
              const isMaxHeight = Math.abs(sheetHeight - maxHeight) < 5;
              
              if (isMaxHeight) {
                dragStateRef.current.startY = e.touches[0].clientY;
                scrollStateRef.current.isDraggingSheet = false;
                scrollStateRef.current.wasDraggingDown = false;
              } else {
                handleSheetTouchStart(e);
              }
            }}
            onTouchMove={(e) => {
              const maxHeight = getMaxSheetHeight();
              const isMaxHeight = Math.abs(sheetHeight - maxHeight) < 5;
              
              if (isMaxHeight && !scrollStateRef.current.isDraggingSheet) {
                handleMaxHeightDragDown(e);
              } else if (!isMaxHeight) {
                handleSheetTouchMove(e);
              }
            }}
            onTouchEnd={(e) => {
              const maxHeight = getMaxSheetHeight();
              const isMaxHeight = Math.abs(sheetHeight - maxHeight) < 5;
              
              if (!isMaxHeight) {
                handleSheetTouchEnd();
              }
            }}
          >
            <div className={styles.sheetHandleBar} />
          </div>
          <div 
            className={styles.sheetHeader}
            onTouchStart={(e) => {
              const maxHeight = getMaxSheetHeight();
              const isMaxHeight = Math.abs(sheetHeight - maxHeight) < 5;
              
              if (isMaxHeight) {
                dragStateRef.current.startY = e.touches[0].clientY;
                scrollStateRef.current.isDraggingSheet = false;
                scrollStateRef.current.wasDraggingDown = false;
              }
            }}
            onTouchMove={(e) => {
              const maxHeight = getMaxSheetHeight();
              const isMaxHeight = Math.abs(sheetHeight - maxHeight) < 5;
              
              if (isMaxHeight && !scrollStateRef.current.isDraggingSheet) {
                handleMaxHeightDragDown(e);
              }
            }}
          >
            <h3 className={styles.sheetTitle}>근처 공연장 {places.length}곳</h3>
          </div>
          <div 
            ref={sheetContentRef}
            className={styles.sheetContent}
            onTouchStart={(e) => {
              const maxHeight = getMaxSheetHeight();
              const isMaxHeight = Math.abs(sheetHeight - maxHeight) < 5;
              const contentEl = sheetContentRef.current;
              
              if (isMaxHeight && contentEl && contentEl.scrollTop <= 5) {
                scrollStateRef.current.startY = e.touches[0].clientY;
                scrollStateRef.current.initialScrollTop = contentEl.scrollTop;
                scrollStateRef.current.isDraggingSheet = false;
                scrollStateRef.current.wasDraggingDown = false;
                scrollStateRef.current.isContentScrolling = false;
              }
            }}
            onTouchMove={(e) => {
              if (scrollStateRef.current.isDraggingSheet) {
                return;
              }
              
              const maxHeight = getMaxSheetHeight();
              const isMaxHeight = Math.abs(sheetHeight - maxHeight) < 5;
              const contentEl = sheetContentRef.current;
              
              if (!isMaxHeight || !contentEl) {
                return;
              }
              
              const currentScrollTop = contentEl.scrollTop;
              const deltaY = e.touches[0].clientY - scrollStateRef.current.startY;
              
              if (currentScrollTop <= 5 && deltaY > 3) {
                e.preventDefault();
                e.stopPropagation();
                
                scrollStateRef.current.isDraggingSheet = true;
                scrollStateRef.current.wasDraggingDown = true;
                scrollStateRef.current.isContentScrolling = false;
                
                setIsDragging(true);
                setIsTransitioning(false);
                dragStateRef.current.startY = e.touches[0].clientY;
                dragStateRef.current.startHeight = sheetHeight;
                
                if (globalTouchHandlersRef.current.move) {
                  document.removeEventListener('touchmove', globalTouchHandlersRef.current.move);
                }
                if (globalTouchHandlersRef.current.end) {
                  document.removeEventListener('touchend', globalTouchHandlersRef.current.end);
                }
                
                const handleGlobalTouchMove = (globalE) => {
                  if (!scrollStateRef.current.isDraggingSheet) return;
                  
                  if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                  }
                  
                  animationFrameRef.current = requestAnimationFrame(() => {
                    const currentY = globalE.touches[0].clientY;
                    const startY = dragStateRef.current.startY;
                    const globalDeltaY = startY - currentY;
                    let newHeight = dragStateRef.current.startHeight + globalDeltaY;
                    
                    const maxHeight = getMaxSheetHeight();
                    newHeight = Math.max(MIN_SHEET_HEIGHT, Math.min(maxHeight, newHeight));
                    
                    if (currentY > startY) {
                      scrollStateRef.current.wasDraggingDown = true;
                    }
                    
                    setSheetHeight(newHeight);
                  });
                  
                  globalE.preventDefault();
                };
                
                const handleGlobalTouchEnd = () => {
                  const wasDraggingDown = scrollStateRef.current.wasDraggingDown;
                  const finalHeight = sheetHeight;
                  const startHeight = dragStateRef.current.startHeight;
                  
                  const actuallyDraggedDown = wasDraggingDown || (finalHeight < startHeight - 5);
                  
                  scrollStateRef.current.isDraggingSheet = false;
                  scrollStateRef.current.wasDraggingDown = false;
                  scrollStateRef.current.isContentScrolling = false;
                  setIsDragging(false);
                  
                  if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                  }
                  
                  if (actuallyDraggedDown && finalHeight < getMaxSheetHeight() - 10) {
                    const targetHeight = Math.max(finalHeight, MIN_SHEET_HEIGHT);
                  setIsTransitioning(true);
                    setSheetHeight(targetHeight);
                  } else {
                    setIsTransitioning(true);
                    const snapHeight = getSnapHeight(finalHeight, actuallyDraggedDown);
                  setSheetHeight(snapHeight);
                  }
                  
                  setTimeout(() => {
                    setIsTransitioning(false);
                    document.removeEventListener('touchmove', handleGlobalTouchMove);
                    document.removeEventListener('touchend', handleGlobalTouchEnd);
                    globalTouchHandlersRef.current.move = null;
                    globalTouchHandlersRef.current.end = null;
                  }, 300);
                };
                
                globalTouchHandlersRef.current.move = handleGlobalTouchMove;
                globalTouchHandlersRef.current.end = handleGlobalTouchEnd;
                
                document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
                document.addEventListener('touchend', handleGlobalTouchEnd);
              } else if (deltaY < -3 && currentScrollTop > 5) {
                scrollStateRef.current.isContentScrolling = true;
              }
            }}
            onTouchEnd={() => {
              if (!scrollStateRef.current.isDraggingSheet) {
                scrollStateRef.current.isContentScrolling = false;
              }
            }}
            onWheel={(e) => {
              if (isAtTopAndMaxHeight() && e.deltaY < 0) {
                e.preventDefault();
                const midHeight = (MIN_SHEET_HEIGHT + getMaxSheetHeight()) / 2;
                setIsTransitioning(true);
                setSheetHeight(midHeight);
                setTimeout(() => setIsTransitioning(false), 300);
              }
            }}
          >
            <ul className={styles.placeList}>
              {places.map((place, index) => (
                <PlaceWithPerformancesCard
                  key={place.id + "_" + index}
                  {...place}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
});

PlaceMapView.displayName = 'PlaceMapView';

export default PlaceMapView;
