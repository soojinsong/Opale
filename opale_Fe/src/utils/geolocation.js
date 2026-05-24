/**
 * 사용자의 현재 GPS 위치를 가져오는 함수
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS를 지원하지 않는 브라우저입니다.'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('✅ GPS 위치 획득:', { latitude, longitude });
        resolve({ latitude, longitude });
      },
      (error) => {
        let errorMessage = '위치 정보를 가져올 수 없습니다.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 정보 사용 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다.';
            break;
          case error.TIMEOUT:
            errorMessage = '위치 정보 요청 시간이 초과되었습니다.';
            break;
        }
        
        console.error('❌ GPS 위치 획득 실패:', errorMessage);
        reject(new Error(errorMessage));
      },
      options
    );
  });
};

/**
 * 기본 위치 (서울 시청) 반환
 * GPS를 사용할 수 없을 때 사용
 */
export const getDefaultLocation = () => {
  return {
    latitude: 37.5665,
    longitude: 126.9780,
  };
};

/**
 * 사용자의 현재 GPS 위치를 실시간으로 추적하는 함수
 * @param {Function} onLocationUpdate - 위치가 업데이트될 때 호출되는 콜백 함수 (latitude, longitude) => void
 * @param {Function} onError - 에러 발생 시 호출되는 콜백 함수 (error) => void
 * @returns {number} watchPosition ID (정지할 때 사용)
 */
export const watchCurrentLocation = (onLocationUpdate, onError) => {
  if (!navigator.geolocation) {
    if (onError) {
      onError(new Error('GPS를 지원하지 않는 브라우저입니다.'));
    }
    return null;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
  };

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      console.log('📍 GPS 위치 업데이트:', { latitude, longitude });
      if (onLocationUpdate) {
        onLocationUpdate({ latitude, longitude });
      }
    },
    (error) => {
      let errorMessage = '위치 정보를 가져올 수 없습니다.';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = '위치 정보 사용 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = '위치 정보를 사용할 수 없습니다.';
          break;
        case error.TIMEOUT:
          errorMessage = '위치 정보 요청 시간이 초과되었습니다.';
          break;
      }
      
      console.error('❌ GPS 위치 추적 실패:', errorMessage);
      if (onError) {
        onError(new Error(errorMessage));
      }
    },
    options
  );

  return watchId;
};

/**
 * 위치 추적을 중지하는 함수
 * @param {number} watchId - watchCurrentLocation에서 반환된 ID
 */
export const clearLocationWatch = (watchId) => {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    console.log('🛑 GPS 위치 추적 중지');
  }
};
