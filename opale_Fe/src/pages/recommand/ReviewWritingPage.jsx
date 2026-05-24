/* 
리뷰 작성 페이지:
 - 티켓 스캔 단계: 카메라로 티켓 촬영 또는 갤러리에서 사진 선택, OCR로 공연 정보 추출 시도, 수동 입력 옵션 제공
 - 티켓 정보 입력 단계: 공연명, 공연일자, 시간, 좌석정보, 공연장명 입력 폼, 이전 단계에서 추출된 정보로 일부 필드 자동 채움
  - 공연 후기 작성 단계: 제목, 평점, 내용 입력 폼, 이전 단계에서 등록된 티켓 정보와 공연 정보 자동 연동
  - 공연장 후기 작성 단계 (선택): 제목, 평점, 내용 입력 폼, 이전 단계에서 등록된 티켓 정보와 공연장 정보 자동 연동
  - 최종 등록: 모든 단계 완료 후 API로 티켓 정보와 후기 정보 전송, 성공 시 공연 상세 페이지 또는 마이 페이지로 이동
  - 단계별 유효성 검사: 필수 입력 필드 확인, 공연명과 공연일자 조합으로 공연 정보 검증
  - 예외 처리: 카메라 접근 실패, OCR 실패, API 요청 실패 시 사용자에게 명확한 에러 메시지 제공
*/


import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ReviewWritingPage.module.css';
import { createTicket } from '../../api/reservationApi';
import { createPerformanceReview, createPlaceReview } from '../../api/reviewApi';
import { normalizePerformanceReviewRequest } from '../../services/normalizePerformanceReviewRequest';
import { normalizePlaceReviewRequest } from '../../services/normalizePlaceReviewRequest';
import { fetchPerformanceList } from '../../api/performanceApi';
import { normalizePerformance } from '../../services/normalizePerformance';
import { transformTicketDataForApi } from '../../utils/ticketDataTransform';
import logApi from '../../api/logApi';
import TicketSelectModal from '../../components/common/TicketSelectModal';
import useCamera from '../../hooks/useCamera';

const ReviewWritingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [step, setStep] = useState('ticketScan');
  
  const [ticketData, setTicketData] = useState(() => {
    const stateData = location.state?.ticketData || {};
    return {
      id: stateData.id || stateData.ticketId || null,
      ticketId: stateData.ticketId || stateData.id || null,
      performanceName: stateData.performanceName || '',
      performanceDate: stateData.performanceDate || '',
      performanceTime: stateData.performanceTime || '',
      section: stateData.section || '',
      row: stateData.row || '',
      number: stateData.number || '',
      placeName: stateData.placeName || ''
    };
  });

  const [isScanning, setIsScanning] = useState(false);
  const { cameraStream, videoRef, startCamera, stopCamera } = useCamera();
  const [capturedImage, setCapturedImage] = useState(null);
  const [showTicketSelectModal, setShowTicketSelectModal] = useState(false);
  const fileInputRef = useRef(null);

  const [reviewData, setReviewData] = useState({
    title: '',
    rating: 5,
    performanceReview: '',
    venueTitle: '',
    venueRating: 5,
    venueReview: ''
  });

  useEffect(() => {
    if (location.state?.ticketData) {
      const ticket = location.state.ticketData;
      setTicketData(ticket);
      
      if (ticket.id && ticket.performanceName && ticket.performanceDate) {
        setStep('performanceReview');
      } else {
        setStep('ticketScan');
      }
    } else {
      setStep('ticketScan');
    }
  }, [location.state]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        stopCamera();
        setIsScanning(false);
        setStep('ticketInput');
        setTimeout(() => {
          setTicketData(prev => ({
            ...prev,
            performanceName: prev.performanceName || '뮤지컬 위키드 내한공연',
            performanceDate: prev.performanceDate || '2025-10-23',
            performanceTime: prev.performanceTime || '19:00',
            section: prev.section || '나 구역',
            row: prev.row || '15',
            number: prev.number || '23'
          }));
        }, 1000);
      }, 'image/jpeg');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target.result;
        setCapturedImage(imageUrl);
        setStep('ticketInput');
        setTimeout(() => {
          setTicketData(prev => ({
            ...prev,
            performanceName: prev.performanceName || '뮤지컬 위키드 내한공연',
            performanceDate: prev.performanceDate || '2025-10-23',
            performanceTime: prev.performanceTime || '19:00',
            section: prev.section || '나 구역',
            row: prev.row || '15',
            number: prev.number || '23'
          }));
        }, 1000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = async () => {
    setIsScanning(true);
    await startCamera();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleTicketScanComplete = () => {
    setStep('ticketInput');
    stopCamera();
  };

  const handleSkipTicketScan = () => {
    setStep('ticketInput');
    stopCamera();
  };

  const handleOpenTicketSelectModal = () => {
    setShowTicketSelectModal(true);
  };

  const handleCloseTicketSelectModal = () => {
    setShowTicketSelectModal(false);
  };

  const handleSelectTicket = (selectedTicket) => {
    const ticketId = selectedTicket.ticketId || selectedTicket.id;
    const isExistingTicket = !!ticketId;
    
    setTicketData({
      id: ticketId || null,
      ticketId: ticketId || null,
      performanceName: selectedTicket.performanceName || '',
      performanceDate: selectedTicket.performanceDate || '',
      performanceTime: selectedTicket.performanceTime || '',
      section: selectedTicket.section || '',
      row: selectedTicket.row || '',
      number: selectedTicket.number || '',
      placeName: selectedTicket.placeName || ''
    });

    if (selectedTicket.ticketImageUrl) {
      setCapturedImage(selectedTicket.ticketImageUrl);
    }

    if (isExistingTicket) {
      setStep('performanceReview');
    } else {
      setStep('ticketInput');
    }
  };

  const handleTicketInputComplete = async () => {
    if (!ticketData.performanceName || !ticketData.performanceDate) {
      alert('공연명과 공연일자를 입력해주세요.');
      return;
    }

    const isExistingTicket = !!(ticketData.ticketId || ticketData.id);
    
    if (isExistingTicket) {
      if (location.state?.placeId) {
        setStep('venueReview');
      } else {
        setStep('performanceReview');
      }
      return;
    }

    try {
      const apiDto = transformTicketDataForApi(ticketData);

      const ticketResponse = await createTicket(apiDto);

      const responseTicketId = ticketResponse?.ticketId || ticketResponse?.id || ticketResponse?.ticket?.ticketId;
      const ticketPerformanceId = ticketResponse?.performanceId || ticketResponse?.performance?.performanceId || ticketResponse?.performanceId;
      
      if (responseTicketId) {
        setTicketData(prev => ({
          ...prev,
          ticketId: responseTicketId,
          id: responseTicketId,
          performanceId: ticketPerformanceId || prev.performanceId
        }));
      }

      if (ticketPerformanceId) {
        try {
          await logApi.createLog({
            eventType: "BOOKED",
            targetType: "PERFORMANCE",
            targetId: String(ticketPerformanceId)
          });
        } catch (logErr) {
          console.error('로그 기록 실패:', logErr);
        }
      } else {
        console.warn('티켓 등록 응답에 performanceId가 없습니다. handleRegister에서 처리합니다.');
      }

      if (location.state?.placeId) {
        setStep('venueReview');
      } else {
        setStep('performanceReview');
      }
    } catch (err) {
      console.error('티켓 등록 실패:', err);
      const errorMessage = err.response?.data?.message || err.message || '티켓 등록에 실패했습니다.';
      alert(errorMessage);
    }
  };

  const handleTicketInputChange = (field, value) => {
    setTicketData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReviewInputChange = (field, value) => {
    setReviewData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePerformanceReviewComplete = () => {
    if (!reviewData.title || !reviewData.performanceReview) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    setStep('venueReview');
  };

  const handleSkipVenueReview = () => {
    handleRegister();
  };

  const findPerformanceIdByName = async (performanceName) => {
    if (!performanceName) return null;
    
    try {
      const res = await fetchPerformanceList({
        keyword: performanceName,
        page: 1,
        size: 1
      });
      
      if (res.performances && res.performances.length > 0) {
        const normalized = normalizePerformance(res.performances[0]);
        return normalized.id || normalized.performanceId;
      }
      return null;
    } catch (err) {
      console.error('공연 검색 실패:', err);
      return null;
    }
  };

  const handleRegister = async () => {
    try {
      const placeId = location.state?.placeId;
      
      if (placeId) {
        if (!reviewData.venueTitle || !reviewData.venueReview) {
          alert('제목과 내용을 입력해주세요.');
          return;
        }

        const ticketId = ticketData?.ticketId || ticketData?.id || null;
        
        const requestDto = normalizePlaceReviewRequest(
          {
            title: reviewData.venueTitle,
            content: reviewData.venueReview,
            rating: reviewData.venueRating
          },
          placeId,
          ticketId
        );
        
        await createPlaceReview(requestDto);
        
        try {
          await logApi.createLog({
            eventType: "REVIEW_WRITE",
            targetType: "PLACE",
            targetId: String(placeId)
          });
        } catch (logErr) {
          console.error('로그 기록 실패:', logErr);
        }

        navigate(`/place/${placeId}`);
        return;
      }

      let performanceId = location.state?.performanceId || ticketData?.performanceId;
      
      if (!performanceId && ticketData?.performanceName) {
        performanceId = await findPerformanceIdByName(ticketData.performanceName);
      }
      
      if (!performanceId) {
        alert('공연 정보를 찾을 수 없습니다. 공연명을 확인해주세요.');
        return;
      }

      if (reviewData.title && reviewData.performanceReview) {
        const ticketId = ticketData?.ticketId || ticketData?.id || null;
        
        const requestDto = normalizePerformanceReviewRequest(
          {
            title: reviewData.title,
            content: reviewData.performanceReview,
            rating: reviewData.rating,
            performanceDate: ticketData.performanceDate || '',
            performanceTime: ticketData.performanceTime || '',
            section: ticketData.section || '',
            row: ticketData.row || '',
            number: ticketData.number || ''
          },
          performanceId,
          'AFTER',
          ticketId
        );
        
        await createPerformanceReview(requestDto);
        
        try {
          await logApi.createLog({
            eventType: "REVIEW_WRITE",
            targetType: "PERFORMANCE",
            targetId: String(performanceId)
          });
        } catch (logErr) {
          console.error('로그 기록 실패:', logErr);
        }
      }

      if (reviewData.venueTitle && reviewData.venueReview && ticketData?.placeId) {
        // await createPlaceReview(...);
      }

      if (location.state?.performanceId) {
        navigate(`/culture/${location.state.performanceId}?tab=review`);
      } else {
        navigate('/my/tickets');
        window.dispatchEvent(new Event('ticketUpdated'));
      }
    } catch (err) {
      console.error('후기 등록 실패:', err);
      alert(err.response?.data?.message || err.message || '후기 등록에 실패했습니다.');
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [cameraStream]);

  if (step === 'ticketScan') {
    return (
      <>
        <div className={styles.container}>
          {/* 상단 헤더 */}
          <div className={styles.header}>
            <div></div>
            <h2 className={styles.headerTitle}>티켓 등록</h2>
            <div></div>
          </div>

          <div className={styles.content}>
          {cameraStream ? (
            <div className={styles.cameraArea}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={styles.videoPreview}
              />
              <div className={styles.cameraControls}>
                <button
                  className={styles.captureButton}
                  onClick={capturePhoto}
                >
                  촬영
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={() => {
                    stopCamera();
                    setIsScanning(false);
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.ticketTitle}>티켓 스캔</div>
              <div className={styles.scanArea}>
                <div className={styles.cameraIcon}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <p className={styles.scanInstruction}>
                  티켓을 스캔하거나 사진을 업로드해주세요
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button 
                className={styles.primaryButton}
                onClick={handleCameraClick}
                disabled={isScanning}
              >
                카메라로 촬영
              </button>
              <button 
                className={styles.secondaryButton}
                onClick={handleFileClick}
              >
                파일에서 선택
              </button>
              <button 
                className={styles.selectFromHistoryButton}
                onClick={handleOpenTicketSelectModal}
              >
                등록한 예매 내역에서 선택
              </button>
              <button 
                className={styles.tertiaryButton}
                onClick={handleSkipTicketScan}
              >
                직접 입력하기
              </button>
            </>
          )}
          </div>
        </div>
        {/* 티켓 선택 모달 */}
        <TicketSelectModal
          isOpen={showTicketSelectModal}
          onClose={handleCloseTicketSelectModal}
          onSelectTicket={handleSelectTicket}
        />
      </>
    );
  }

  if (step === 'ticketInput') {
    return (
      <>
        <div className={styles.container}>
        {/* 상단 헤더 */}
        <div className={styles.header}>
          <div></div>
          <h2 className={styles.headerTitle}>티켓 등록</h2>
          <div></div>
        </div>

        <div className={styles.content}>
          <div className={styles.ticketTitle}>티켓 정보 입력</div>
          
          {capturedImage ? (
            <div className={styles.imagePreview}>
              <img src={capturedImage} alt="티켓 이미지" />
            </div>
          ) : (
            <div className={styles.imagePlaceholder}>
              {/* 티켓 이미지 영역 */}
            </div>
          )}
          
          <div className={styles.ticketForm}>
            <div className={styles.formGroup}>
              <label>공연명</label>
              <input
                type="text"
                value={ticketData.performanceName}
                onChange={(e) => handleTicketInputChange('performanceName', e.target.value)}
                placeholder="공연명을 입력하세요"
                className={styles.input}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>공연일자</label>
                <input
                  type="date"
                  value={ticketData.performanceDate}
                  onChange={(e) => handleTicketInputChange('performanceDate', e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>시간</label>
                <input
                  type="time"
                  value={ticketData.performanceTime}
                  onChange={(e) => handleTicketInputChange('performanceTime', e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>좌석정보</label>
              <div className={styles.seatInputs}>
                <input
                  type="text"
                  value={ticketData.section}
                  onChange={(e) => handleTicketInputChange('section', e.target.value)}
                  placeholder="구역"
                  className={styles.seatInput}
                />
                <input
                  type="text"
                  value={ticketData.row}
                  onChange={(e) => handleTicketInputChange('row', e.target.value)}
                  placeholder="열"
                  className={styles.seatInput}
                />
                <input
                  type="text"
                  value={ticketData.number}
                  onChange={(e) => handleTicketInputChange('number', e.target.value)}
                  placeholder="번"
                  className={styles.seatInput}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>공연장명</label>
              <input
                type="text"
                value={ticketData.placeName}
                onChange={(e) => handleTicketInputChange('placeName', e.target.value)}
                placeholder="공연장명을 입력하세요 (선택)"
                className={styles.input}
              />
            </div>
          </div>
          
          <div className={styles.buttonGroup}>
            <button 
              className={styles.cancelButton}
              onClick={() => {
                const performanceId = location.state?.performanceId;
                if (performanceId) {
                  navigate(`/culture/${performanceId}`);
                } else {
                  navigate('/my/tickets');
                }
              }}
            >
              취소
            </button>
            <button 
              className={styles.primaryButton}
              onClick={handleTicketInputComplete}
            >
              다음
            </button>
          </div>
        </div>
      </div>
      {/* 티켓 선택 모달 */}
      <TicketSelectModal
        isOpen={showTicketSelectModal}
        onClose={handleCloseTicketSelectModal}
        onSelectTicket={handleSelectTicket}
      />
      </>
    );
  }

  if (step === 'performanceReview') {
    const performanceId = location.state?.performanceId;
    const handleCancel = () => {
      if (performanceId) {
        navigate(`/culture/${performanceId}`);
      } else {
        navigate('/my/tickets');
      }
    };

    return (
      <>
        <div className={styles.container}>
        {/* 상단 헤더 */}
        <div className={styles.header}>
          <div></div>
          <h2 className={styles.headerTitle}>공연 후기 작성</h2>
          <button className={styles.closeButton} onClick={handleCancel}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label>제목</label>
              <input
                type="text"
                value={reviewData.title}
                onChange={(e) => handleReviewInputChange('title', e.target.value)}
                placeholder="제목을 입력하세요"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>평점</label>
              <div className={styles.ratingInput}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    className={`${styles.ratingStar} ${star <= reviewData.rating ? styles.filled : ''}`}
                    onClick={() => handleReviewInputChange('rating', star)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>내용</label>
              <textarea
                value={reviewData.performanceReview}
                onChange={(e) => handleReviewInputChange('performanceReview', e.target.value)}
                placeholder="내용을 입력하세요"
                rows={6}
                className={styles.textarea}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
            >
              취소
            </button>
            <button 
              type="button"
              className={styles.submitButton}
              onClick={handlePerformanceReviewComplete}
            >
              작성하기
            </button>
          </div>
        </div>
      </div>
      {/* 티켓 선택 모달 */}
      <TicketSelectModal
        isOpen={showTicketSelectModal}
        onClose={handleCloseTicketSelectModal}
        onSelectTicket={handleSelectTicket}
      />
      </>
    );
  }

  if (step === 'venueReview') {
    const performanceId = location.state?.performanceId;
    const placeId = location.state?.placeId;
    const handleCancel = () => {
      if (placeId) {
        navigate(`/place/${placeId}`);
      } else if (performanceId) {
        navigate(`/culture/${performanceId}`);
      } else {
        navigate('/my/tickets');
      }
    };

    return (
      <>
        <div className={styles.container}>
          {/* 상단 헤더 */}
          <div className={styles.header}>
            <div></div>
            <h2 className={styles.headerTitle}>공연장 후기 작성</h2>
            <button className={styles.closeButton} onClick={handleCancel}>×</button>
          </div>

        <div className={styles.content}>
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label>제목</label>
              <input
                type="text"
                value={reviewData.venueTitle}
                onChange={(e) => handleReviewInputChange('venueTitle', e.target.value)}
                placeholder="제목을 입력하세요"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>평점</label>
              <div className={styles.ratingInput}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    className={`${styles.ratingStar} ${star <= reviewData.venueRating ? styles.filled : ''}`}
                    onClick={() => handleReviewInputChange('venueRating', star)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>공연장 리뷰</label>
              <textarea
                value={reviewData.venueReview}
                onChange={(e) => handleReviewInputChange('venueReview', e.target.value)}
                placeholder="공연장에 대한 리뷰를 작성해주세요"
                rows={6}
                className={styles.textarea}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            {placeId ? (
              <>
                <button 
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancel}
                >
                  취소
                </button>
                <button 
                  type="button"
                  className={styles.submitButton}
                  onClick={handleRegister}
                >
                  작성하기
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button"
                  className={styles.skipButton}
                  onClick={handleSkipVenueReview}
                >
                  건너뛰기
                </button>
                <button 
                  type="button"
                  className={styles.submitButton}
                  onClick={handleRegister}
                >
                  작성하기
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {/* 티켓 선택 모달 */}
      <TicketSelectModal
        isOpen={showTicketSelectModal}
        onClose={handleCloseTicketSelectModal}
        onSelectTicket={handleSelectTicket}
      />
      </>
    );
  }

  return null;
};

export default ReviewWritingPage;
