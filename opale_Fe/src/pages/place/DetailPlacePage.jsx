/* 
공연장 상세 페이지:
 - 공연장 기본 정보: 이름, 주소, 연락처, 홈페이지 링크, 개관연도, 객석수, 공연관 수 등
 - 공연장 시설 정보: 편의시설, 주차시설 등
 - 공연관 정보: 각 공연관명, 객석수, 무대시설 등
 - 관련 공연: 진행중인 작품과 지난 작품을 탭으로 구분하여 표시
 - 공연장 후기: 후기 목록과 후기 작성 기능, 후기 작성은 티켓 구매 이력이 있는 사용자만 가능, 후기 작성 시 공연장 리뷰 API 호출, 후기 목록은 인기순으로 정렬하여 표시
 - 공연장 위치 지도: 공연장 위치를 지도에 표시, 지도는 Google Maps API 또는 Kakao Maps API 활용
 - 에러 및 로딩 상태 처리: API 요청 실패 시 에러 메시지 표시, 로딩 중에는 스켈레톤 UI 또는 로딩 스피너 표시
*/


import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './DetailPlacePage.module.css';
import PlaceShowHistory from '../../components/place/PlaceShowHistory';
import PlaceReviewCard from '../../components/place/PlaceReviewCard';
import PlaceMap from '../../components/place/PlaceMap';
import { usePlaceDetail } from '../../hooks/usePlaceDetail';
import { usePlaceFacilities } from '../../hooks/usePlaceFacilities';
import { usePlaceStages } from '../../hooks/usePlaceStages';
import { fetchPlaceReviewsByPlace, createPlaceReview } from '../../api/reviewApi';
import { normalizePlaceReviews } from '../../services/normalizePlaceReview';
import { normalizePlaceReviewRequest } from '../../services/normalizePlaceReviewRequest';
import logApi from '../../api/logApi';
import PlaceDetailSkeleton from '../../components/common/PlaceDetailSkeleton';

const DetailPlacePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);
  const currentUserId = user?.userId || user?.id || null;
  const { place, loading, error } = usePlaceDetail(id);
  const { convenienceFacilities, parkingFacilities } = usePlaceFacilities(id);
  const { stages } = usePlaceStages(id);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [writeForm, setWriteForm] = useState({ title: '', content: '', rating: 5 });
  const [isStageTableOpen, setIsStageTableOpen] = useState(false);
  
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);

  const loadReviews = async () => {
    if (!id) return;

    try {
      setReviewsLoading(true);
      setReviewsError(null);

      const apiData = await fetchPlaceReviewsByPlace(id, 'PLACE');
      
      const reviewsData = Array.isArray(apiData) ? { reviews: [] } : apiData;

      const normalizedReviews = normalizePlaceReviews(reviewsData);
      setReviews(normalizedReviews);
    } catch (err) {
      console.error('공연장 리뷰 조회 실패:', err);
      setReviewsError(err.message || '리뷰를 불러오는 중 오류가 발생했습니다.');
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
    
    if (id && currentUserId) {
      logApi.createLog({
        eventType: "VIEW",
        targetType: "PLACE",
        targetId: String(id)
      }).catch((logErr) => {
        console.error('로그 기록 실패:', logErr);
      });
    }
  }, [id, currentUserId]);

  if (loading) {
    return <PlaceDetailSkeleton />;
  }

  if (error || !place) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error || '공연장 정보를 찾을 수 없습니다.'}</p>
          <button onClick={() => navigate('/place', { state: { fromDetailPlace: true } })} className={styles.backBtn}>
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 시설특성 섹션 */}
      <div className={styles.section}>
        {/* 헤더 섹션 */}
        <div className={styles.header}>
          <div className={styles.sectionTitle}>{place.facilityType}</div>
          <h1 className={styles.title}>{place.name}</h1>
          <div className={styles.address}>{place.address}</div>
          <div className={styles.headerTop}>
            <div className={styles.ratingRow}>
              <span className={styles.star}>★</span>
              <span className={styles.rating}>
                {typeof place.rating === 'number' ? place.rating.toFixed(1) : parseFloat(place.rating || 0).toFixed(1)}
              </span>
              <span className={styles.count}>({place.reviewCount || 0})</span>
            </div>
            <a href={place.homepage} target="_blank" rel="noopener noreferrer" className={styles.homeButton}>
              홈
            </a>
          </div>
          
        </div>

        <div className={styles.facilityInfoContainer}>
          <div className={styles.facilityInfoTable}>
            <table className={styles.infoTable}>
              <tbody>
                <tr>
                  <th>개관연도</th>
                  <td>{place.openingYear}</td>
                </tr>
                <tr>
                  <th>객석수</th>
                  <td>총 {place.totalSeats.toLocaleString()}석</td>
                </tr>
                <tr>
                  <th>공연관 수</th>
                  <td>{place.numberOfStages}개</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className={styles.mapArea}>
            <PlaceMap 
              latitude={place.latitude} 
              longitude={place.longitude}
              placeName={place.name}
            />
          </div>
        </div>
        <button className={styles.facilityDetailsButton}>
          <div className={styles.facilityDetailsContent}>
            <div className={styles.facilityGroup}>
              <span className={styles.facilityLabel}>편의시설:</span>
              {convenienceFacilities.length > 0 ? (
                <span className={styles.facilityItem}>√ {convenienceFacilities.join(', ')}</span>
              ) : (
                <span className={styles.noFacility}>-</span>
              )}
            </div>
            <div className={styles.facilityGroup}>
              <span className={styles.facilityLabel}>주차시설:</span>
              {parkingFacilities.length > 0 ? (
                <span className={styles.facilityItem}>√ {parkingFacilities.join(', ')}</span>
              ) : (
                <span className={styles.noFacility}>-</span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* 공연장 정보 */}
      <div className={styles.section}>
        <h2 
          className={styles.sectionTitle} 
          onClick={() => setIsStageTableOpen(!isStageTableOpen)}
          style={{ cursor: 'pointer' }}
        >
          공연관 정보
          <span className={styles.toggleIcon}>
            {isStageTableOpen ? '▲' : '▼'}
          </span>
        </h2>
        {isStageTableOpen && (
          <table className={styles.stageTable}>
            <thead>
              <tr>
                <th>공연관명</th>
                <th>객석수</th>
                <th>무대시설</th>
              </tr>
            </thead>
            <tbody>
              {stages.length > 0 ? (
                stages.map((stage) => (
                  <tr key={stage.id}>
                    <td>{stage.name}</td>
                    <td>
                      총 {stage.seatscale.toLocaleString()}석
                      {stage.disabledseatscale > 0 && (
                        <span className={styles.disabledSeats}> (장애인석 {stage.disabledseatscale}석)</span>
                      )}
                    </td>
                    <td>
                      {stage.stageFacilities.length > 0 ? (
                        <span className={styles.facilityItem}>√ {stage.stageFacilities.join(', ')}</span>
                      ) : (
                        <span className={styles.noFacility}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className={styles.empty}>
                    공연관 정보가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 관련공연 (진행중인 작품 / 지난 작품) */}
      <div className={styles.section}>
        <PlaceShowHistory placeId={place.id} />
      </div>

      {/* 공연장 후기 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>공연장 후기</h2>
        
        {/* 글쓰기 버튼 */}
        <div className={styles.writeButtonContainer}>
          <button 
            className={styles.writeButton}
            onClick={() => {
              navigate('/my/tickets/register', {
                state: {
                  forReview: true,
                  nextReviewPage: '/my/placeReviews/register',
                  ticketData: {
                    performanceName: '',
                    performanceDate: '',
                    performanceTime: '',
                    section: '',
                    row: '',
                    number: '',
                    placeId: id
                  },
                  placeId: id,
                  returnUrl: `/place/${id}`
                }
              });
            }}
          >
            후기 작성하기
          </button>
        </div>

        {/* 후기 목록 */}
        <div className={styles.reviewList}>
          <div className={styles.reviewListHeader}>
            <h4>후기 목록</h4>
            <span className={styles.sortOption}>인기순</span>
          </div>
          
          {reviewsLoading ? (
            <div className={styles.empty}>로딩 중...</div>
          ) : reviewsError ? (
            <div className={styles.empty} style={{ color: '#666' }}>
              {reviewsError}
            </div>
          ) : reviews.length === 0 ? (
            <div className={styles.empty}>등록된 후기가 없습니다.</div>
          ) : (
            reviews.map(review => (
              <PlaceReviewCard
                key={review.id}
                id={review.id}
                title={review.title}
                rating={review.rating}
                content={review.content}
                author={review.author}
                date={review.date}
              />
            ))
          )}
        </div>
      </div>

      {/* 글쓰기 모달 */}
      {showWriteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>후기 작성</h3>
              <button className={styles.closeButton} onClick={() => {
                setShowWriteModal(false);
                setWriteForm({ title: '', content: '', rating: 5 });
              }}>×</button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              
              if (!id) {
                alert('공연장 정보가 없습니다.');
                return;
              }

              try {
                const requestDto = normalizePlaceReviewRequest(writeForm, id);

                await createPlaceReview(requestDto);

                try {
                  await logApi.createLog({
                    eventType: "REVIEW_WRITE",
                    targetType: "PLACE",
                    targetId: String(id)
                  });
                } catch (logErr) {
                  console.error('로그 기록 실패:', logErr);
                }

                setShowWriteModal(false);
                setWriteForm({ title: '', content: '', rating: 5 });

                await loadReviews();
              } catch (err) {
                console.error('공연장 리뷰 작성 실패:', err);
                alert(err.response?.data?.message || err.message || '공연장 리뷰 작성에 실패했습니다.');
              }
            }} className={styles.writeForm}>
              <div className={styles.formGroup}>
                <label>제목</label>
                <input 
                  type="text" 
                  value={writeForm.title}
                  onChange={(e) => setWriteForm({...writeForm, title: e.target.value})}
                  placeholder="제목을 입력하세요"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>평점</label>
                <div className={styles.ratingInput}>
                  {[1,2,3,4,5].map(star => (
                    <button 
                      key={star} 
                      type="button"
                      className={`${styles.ratingStar} ${star <= writeForm.rating ? styles.filled : ''}`}
                      onClick={() => setWriteForm({...writeForm, rating: star})}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>내용</label>
                <textarea 
                  value={writeForm.content}
                  onChange={(e) => setWriteForm({...writeForm, content: e.target.value})}
                  placeholder="내용을 입력하세요"
                  rows={6}
                  required
                />
              </div>
              
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={() => {
                  setShowWriteModal(false);
                  setWriteForm({ title: '', content: '', rating: 5 });
                }}>
                  취소
                </button>
                <button type="submit" className={styles.submitButton}>
                  작성하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailPlacePage;