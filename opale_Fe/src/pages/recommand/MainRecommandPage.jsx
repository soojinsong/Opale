/*
 메인 추천 페이지:
  - 로그인한 사용자: 내 키워드, 개인 맞춤 추천 공연, 최근 본 공연과 유사한 공연, 인기 공연 추천, 장르별 추천 섹션
  - 비로그인 사용자: 인기 공연 추천, 장르별 추천 섹션
  - 각 섹션은 공연 카드 형태로 캐러셀로 보여주기
  - 공연 카드에는 이미지, 제목, 평점, 리뷰 수, 공연 기간, 키워드 등이 표시
  - 공연 카드 클릭 시 공연 상세 페이지로 이동
  - 슬라이드 이동 시 부드러운 애니메이션 효과, 터치 및 마우스 드래그 지원
  - API 요청 시 로딩 스피너 표시, 에러 발생 시 사용자 친화적인 메시지 표시
  - 상단에 MY 티켓 버튼: 로그인한 경우 내 티켓 페이지로, 비로그인 경우 로그인 페이지로 이동
*/

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchFavoritePerformances } from '../../api/favoriteApi';
import { getUserRecommendations, getRecentViewedPerformance, getRecentSimilarRecommendations, getPopularRecommendations, getGenreRecommendations } from '../../api/recommendationApi';
import { fetchPerformanceBasic } from '../../api/performanceApi';
import { normalizeRecommendation } from '../../services/normalizeRecommendation';
import { normalizePerformanceDetail } from '../../services/normalizePerformanceDetail';
import { hasUserTickets } from '../../utils/ticketUtils';
import { hasUserReviews } from '../../utils/reviewUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PerformanceCarousel from '../../components/common/PerformanceCarousel';
import styles from './MainRecommandPage.module.css';

const MainRecommandPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useSelector((state) => state.user);
  const [myKeywords, setMyKeywords] = useState([]);

  const [isNewUser, setIsNewUser] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  const [userRecommendations, setUserRecommendations] = useState([]);
  const [userRecommendationsLoading, setUserRecommendationsLoading] = useState(true);

  const [recentPerformance, setRecentPerformance] = useState(null);
  const [similarPerformances, setSimilarPerformances] = useState([]);
  const [similarPerformancesLoading, setSimilarPerformancesLoading] = useState(false);

  const [popularPerformances, setPopularPerformances] = useState([]);
  const [popularPerformancesLoading, setPopularPerformancesLoading] = useState(true);

  const [selectedGenres, setSelectedGenres] = useState([]);
  const [genreRecommendations, setGenreRecommendations] = useState({});
  const [genreRecommendationsLoading, setGenreRecommendationsLoading] = useState({});

  useEffect(() => {
    const checkNewUser = async () => {
      if (!isLoggedIn) {
        setIsNewUser(false);
        setIsCheckingUser(false);
        return;
      }

      try {
        setIsCheckingUser(true);
        const userId = user?.userId || user?.id;

        if (!userId) {
          setIsNewUser(false);
          setIsCheckingUser(false);
          return;
        }

        const hasTickets = hasUserTickets(userId);

        let hasReviews = false;
        try {
          hasReviews = await hasUserReviews(userId);
        } catch (error) {
          console.warn('리뷰 확인 실패 (새 사용자로 간주):', error);
          hasReviews = false;
        }

        const isNew = !hasTickets && !hasReviews;
        setIsNewUser(isNew);
      } catch (err) {
        console.error('새 사용자 확인 실패:', err);
        setIsNewUser(true);
      } finally {
        setIsCheckingUser(false);
      }
    };

    checkNewUser();
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (!isLoggedIn || isCheckingUser) return;

    const extractMyKeywords = async () => {
      try {
        const favoritePerformances = await fetchFavoritePerformances();
        if (!favoritePerformances || favoritePerformances.length === 0) {
          setMyKeywords([]);
          return;
        }

        const keywordCount = {};
        favoritePerformances.forEach((performance) => {
          const keywords = performance.keywords || [];
          keywords.forEach((keyword) => {
            if (keyword) {
              keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
            }
          });
        });

        const sortedKeywords = Object.entries(keywordCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([keyword]) => keyword);

        setMyKeywords(sortedKeywords);
      } catch (err) {
        console.error('관심 공연 키워드 추출 실패:', err);
        setMyKeywords([]);
      }
    };

    extractMyKeywords();
  }, [isLoggedIn, isNewUser, isCheckingUser]);

  useEffect(() => {
    if (!isLoggedIn || isCheckingUser) return;

    const loadUserRecommendations = async () => {
      try {
        setUserRecommendationsLoading(true);
        const response = await getUserRecommendations({ size: 10 });
        const normalized = normalizeRecommendation(response);
        setUserRecommendations(normalized.recommendations || []);
      } catch (err) {
        console.error('개인 맞춤 추천 조회 실패:', err);
        setUserRecommendations([]);
      } finally {
        setUserRecommendationsLoading(false);
      }
    };

    loadUserRecommendations();
  }, [isLoggedIn, isNewUser, isCheckingUser]);

  useEffect(() => {
    if (!isLoggedIn || isCheckingUser) return;

    const loadRecentAndSimilar = async () => {
      try {
        const recentResponse = await getRecentViewedPerformance();
        const recentPerformanceId = recentResponse?.recentPerformanceId;

        if (!recentPerformanceId) {
          setRecentPerformance(null);
          setSimilarPerformances([]);
          return;
        }

        try {
          const performanceData = await fetchPerformanceBasic(recentPerformanceId);
          const normalized = normalizePerformanceDetail(performanceData);

          if (normalized && normalized.title && normalized.title.trim()) {
            setRecentPerformance(normalized);
          } else {
            console.warn('공연 제목이 없습니다:', normalized);
            setRecentPerformance(null);
            return;
          }
        } catch (perfErr) {
          console.error('최근 본 공연 정보 조회 실패:', perfErr);
          setRecentPerformance(null);
          return;
        }

        setSimilarPerformancesLoading(true);
        try {
          const similarResponse = await getRecentSimilarRecommendations({ size: 10 });
          const normalized = normalizeRecommendation(similarResponse);
          setSimilarPerformances(normalized.recommendations || []);
        } catch (similarErr) {
          console.error('유사 공연 추천 조회 실패:', similarErr);
          setSimilarPerformances([]);
        } finally {
          setSimilarPerformancesLoading(false);
        }
      } catch (err) {
        console.error('최근 본 공연 조회 실패:', err);
        setRecentPerformance(null);
        setSimilarPerformances([]);
      }
    };

    loadRecentAndSimilar();
  }, [isLoggedIn, isNewUser, isCheckingUser]);

  useEffect(() => {
    if (isLoggedIn && !isCheckingUser) return;

    const loadPopularRecommendations = async () => {
      try {
        setPopularPerformancesLoading(true);
        const response = await getPopularRecommendations({ size: 10 });
        const normalized = normalizeRecommendation(response);
        setPopularPerformances(normalized.recommendations || []);
      } catch (err) {
        console.error('인기 공연 추천 조회 실패:', err);
        setPopularPerformances([]);
      } finally {
        setPopularPerformancesLoading(false);
      }
    };

    loadPopularRecommendations();
  }, [isLoggedIn, isNewUser, isCheckingUser]);

  useEffect(() => {
    if (isLoggedIn && !isCheckingUser) return;

    const genres = ['뮤지컬', '연극', '대중음악', '서양음악(클래식)', '한국음악(국악)'];

    const shuffle = [...genres].sort(() => Math.random() - 0.5);
    const selected = shuffle.slice(0, 3);
    setSelectedGenres(selected);

    selected.forEach((genre) => {
      const loadGenreRecommendations = async () => {
        try {
          setGenreRecommendationsLoading((prev) => ({ ...prev, [genre]: true }));
          const response = await getGenreRecommendations({ genre, size: 10 });
          const normalized = normalizeRecommendation(response);
          setGenreRecommendations((prev) => ({
            ...prev,
            [genre]: normalized.recommendations || []
          }));
        } catch (err) {
          console.error(`${genre} 장르 추천 조회 실패:`, err);
          setGenreRecommendations((prev) => ({ ...prev, [genre]: [] }));
        } finally {
          setGenreRecommendationsLoading((prev) => ({ ...prev, [genre]: false }));
        }
      };

      loadGenreRecommendations();
    });
  }, [isLoggedIn, isNewUser, isCheckingUser]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div></div>
        <div className={styles.headerButtons}>
          <button
            className={styles.ticketButton}
            onClick={() => {
              if (isLoggedIn) {
                navigate('/my/tickets');
              } else {
                navigate('/login', { state: { returnUrl: '/recommend' } });
              }
            }}
          >
            MY 티켓
          </button>
        </div>
      </div>

      {isCheckingUser ? (
        <LoadingSpinner />
      ) : (
        <>
          {isLoggedIn && !isCheckingUser && myKeywords.length > 0 && (
            <section className={styles.myKeywordsSection}>
              <h2 className={styles.sectionTitle}>내 키워드</h2>
              <div className={styles.keywordsContainer}>
                {myKeywords.map((keyword, index) => (
                  <div
                    key={index}
                    className={styles.keywordTag}
                    onClick={() => navigate(`/recommend/keyword?keyword=${encodeURIComponent(keyword)}`)}
                  >
                    #{keyword}
                  </div>
                ))}
              </div>
            </section>
          )}

          {isLoggedIn && !isCheckingUser && (
            <section className={styles.seriesSection}>
              <h2 className={styles.sectionTitle}>{user?.nickname || '사용자'} 님을 위한 공연</h2>
              <PerformanceCarousel
                performances={userRecommendations}
                loading={userRecommendationsLoading}
                emptyMessage="추천할 공연이 없습니다."
                styles={styles}
              />
            </section>
          )}

          {isLoggedIn && !isCheckingUser && recentPerformance && (
            <section className={styles.seriesSection}>
              <h2 className={styles.sectionTitle}>
                {recentPerformance.title ? `'${recentPerformance.title}'과 비슷한 공연은` : '최근 본 공연과 비슷한 공연은'}
              </h2>
              <PerformanceCarousel
                performances={similarPerformances}
                loading={similarPerformancesLoading}
                emptyMessage="유사한 공연이 없습니다."
                styles={styles}
              />
            </section>
          )}

          {!isLoggedIn && !isCheckingUser && (
            <section className={styles.seriesSection}>
              <h2 className={styles.sectionTitle}>인기 공연</h2>
              <PerformanceCarousel
                performances={popularPerformances}
                loading={popularPerformancesLoading}
                emptyMessage="인기 공연이 없습니다."
                styles={styles}
              />
            </section>
          )}

          {!isLoggedIn && !isCheckingUser && selectedGenres.map((genre) => (
            <section key={genre} className={styles.seriesSection}>
              <h2 className={styles.sectionTitle}>{genre} 인기 공연</h2>
              <PerformanceCarousel
                performances={genreRecommendations[genre] || []}
                loading={genreRecommendationsLoading[genre] || false}
                emptyMessage={`${genre} 공연이 없습니다.`}
                styles={styles}
              />
            </section>
          ))}

          <section className={styles.testSection}>
            <div className={styles.testCard} onClick={() => navigate('/recommend/signal')}>
              <div className={styles.testContent}>
                <h2 className={styles.testTitle}>공연시그널</h2>
                <p className={styles.testDescription}>
                  나와 찰떡인 공연을 찾아보세요
                </p>
                <p className={styles.testSubDescription}>
                  간단한 질문으로 당신만의 공연을 추천받아보세요
                </p>
                <div className={styles.testButton}>
                  시작하기 →
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default MainRecommandPage;
