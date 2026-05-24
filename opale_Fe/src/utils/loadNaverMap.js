/**
 * 네이버 지도 API 스크립트를 동적으로 로드하는 함수
 * @param {string} clientId - 네이버 클라우드 플랫폼 Client ID
 * @returns {Promise} - 스크립트 로드 완료 시 resolve
 */
export const loadNaverMapScript = (clientId) => {
  return new Promise((resolve, reject) => {
    if (window.naver && window.naver.maps) {
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src*="oapi.map.naver.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('네이버 지도 API 로드 실패')));
      return;
    }

    if (!clientId || clientId === 'YOUR_CLIENT_ID' || clientId.trim() === '') {
      reject(new Error('네이버 지도 API Client ID가 유효하지 않습니다.'));
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    const scriptUrl = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.src = scriptUrl;
    script.async = true;
    
    console.log('📡 네이버 지도 API 스크립트 로드 시도:', scriptUrl.substring(0, 80) + '...');
    
    script.onload = () => {
      console.log('✅ 네이버 지도 API 스크립트 로드 완료');
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('❌ 네이버 지도 API 스크립트 로드 실패:', error);
      reject(new Error('네이버 지도 API 스크립트 로드 실패. Client ID를 확인해주세요.'));
    };

    document.head.appendChild(script);
  });
};
