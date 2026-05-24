import { useState, useRef } from 'react';

const useCamera = (videoConstraints = { facingMode: 'environment' }) => {
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play?.().catch(err => {
            console.error('비디오 재생 실패:', err);
          });
        }
      }, 100);
      return true;
    } catch (err) {
      console.error('카메라 접근 실패:', err);
      alert('카메라 접근에 실패했습니다. 파일에서 선택해주세요.');
      return false;
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  return { cameraStream, videoRef, startCamera, stopCamera };
};

export default useCamera;
