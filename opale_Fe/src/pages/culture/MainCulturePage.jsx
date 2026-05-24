/* 
메인 공연 페이지: 
  - 검색창 (공연명 입력 → 자동완성 드롭다운, 검색 제출 시 검색 결과 페이지로 이동)
  - 카테고리 탭 (전체, 뮤지컬, 연극, 대중음악, 서양음악(클래식), 한국음악(국악))
  - 진행중인 공연 필터 (체크박스)
  - 공연 카드 리스트 (관심 토글, 카드 클릭 시 상세 페이지로 이동)
  - 무한 스크롤 (페이지네이션 API 연동)
  - 관심 공연 ID 목록은 별도 API로 조회하여 상태 관리 
  - 자동완성 API는 검색어 입력 시 호출, 결과는 공연명, 공연장명, 날짜 범위 포함하여 표시
  - 자동완성 결과는 최대 5개까지 보여주고, "전체 검색 결과 보기" 옵션 추가
  - 진행중인 공연 필터는 로컬에서 적용 (API에서는 전체 데이터 받아온 후 프론트에서 필터링)
  - 카테고리 필터는 API 요청 시 genre 파라미터로 전달하여 백엔드에서 처리
  - 로딩 상태 및 에러 상태에 대한 UI 처리 (로딩 스피너, 에러 메시지 등)
  - 검색창 외부 클릭 시 자동완성 드롭다운 숨기기
  - 관심 토글 시 API 호출하여 상태 업데이트 (관심 추가/제거)
  - 자동완성 결과 클릭 시 해당 공연 상세 페이지로 이동
*/


import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setSelectedCategory, setShowOngoingOnly } from "../../store/performanceSlice";

import styles from "./MainCulturePage.module.css";
import { usePerformanceList } from "../../hooks/usePerformanceList";
import PerformanceApiCard from "../../components/cards/PerformanceApiCard";
import { fetchFavoritePerformanceIds, togglePerformanceFavorite } from "../../api/favoriteApi";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { fetchEsPerformanceAutoComplete } from "../../api/searchEsApi";
import { normalizePerformanceAutoComplete } from "../../services/normalizePerformanceAutoComplete";

const MainCulturePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const searchRef = useRef(null);

  /** Redux 상태 */
  const selectedCategory = useSelector((state) => state.performance.selectedCategory);
  const showOngoingOnly = useSelector((state) => state.performance.showOngoingOnly);
  
  /** 로컬 상태 */
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autoCompleteList, setAutoCompleteList] = useState([]);
  const [isLoadingAutoComplete, setIsLoadingAutoComplete] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const prevAutoCompleteListRef = useRef([]);

  /** ⭐ 영어 → 한국어 장르명 매핑 */
  const categoryMapForRequest = {
    musical: "뮤지컬",
    play: "연극",
    popular: "대중음악",
    classical: "서양음악(클래식)",
    traditional: "한국음악(국악)",
  };

  /** API 연동 */
  const { performances, sentinelRef, loading } = usePerformanceList({
    genre:
      selectedCategory === "all"
        ? null
        : categoryMapForRequest[selectedCategory],
    sortType: "인기",
  });

  /** 관심 공연 ID 목록 조회 */
  useEffect(() => {
    const loadFavoriteIds = async () => {
      try {
        const ids = await fetchFavoritePerformanceIds();
        setFavoriteIds(new Set(ids));
      } catch (err) {
        console.error("관심 공연 ID 목록 조회 실패:", err);
        setFavoriteIds(new Set());
      }
    };
    loadFavoriteIds();
  }, []);

  /** 관심 토글 핸들러 */
  const handleFavoriteToggle = async (performanceId) => {
    try {
      const result = await togglePerformanceFavorite(performanceId);
      setFavoriteIds((prev) => {
        const newSet = new Set(prev);
        if (result) {
          newSet.add(performanceId);
        } else {
          newSet.delete(performanceId);
        }
        return newSet;
      });
    } catch (err) {
      console.error("관심 토글 실패:", err);
    }
  };

  /** 자동완성 API 호출 (debouncing 적용) */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setShowSuggestions(false);
      setAutoCompleteList([]);
      prevAutoCompleteListRef.current = [];
      setIsLoadingAutoComplete(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoadingAutoComplete(true);
        const response = await fetchEsPerformanceAutoComplete(searchQuery.trim());
        const normalized = normalizePerformanceAutoComplete(response);
        
        if (normalized.length > 0) {
          setAutoCompleteList(normalized);
          prevAutoCompleteListRef.current = normalized;
          setShowSuggestions(true);
        } else {
          if (prevAutoCompleteListRef.current.length === 0) {
            setShowSuggestions(false);
          }
          setAutoCompleteList([]);
        }
      } catch (err) {
        console.error("자동완성 조회 실패:", err);
        if (prevAutoCompleteListRef.current.length === 0) {
          setShowSuggestions(false);
        }
        setAutoCompleteList([]);
      } finally {
        setIsLoadingAutoComplete(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  /** 자동완성 항목 클릭 핸들러 */
  const handleAutoCompleteClick = useCallback((performanceId) => {
    if (!performanceId) return;
    setSearchQuery("");
    setShowSuggestions(false);
    navigate(`/culture/${performanceId}`);
  }, [navigate]);

  /** 검색창 외부 클릭 시 자동완성 숨기기 */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** 검색 제출 */
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/culture/search?q=${searchQuery}`);
  };

  /** 진행중 공연 여부 판단 */
  const isOngoing = (item) => {
    if (!item.startDate || !item.endDate) return false;

    const today = new Date();
    const s = new Date(item.startDate);
    const e = new Date(item.endDate);

    return today >= s && today <= e;
  };

  /** 🔥 진행중 필터만 로컬에서 적용 (장르는 백엔드에서 처리됨) */
  const finalList = showOngoingOnly
    ? performances.filter((p) => isOngoing(p))
    : performances;

  /** 카테고리 UI */
  const categories = [
    { id: "all", label: "전체" },
    { id: "musical", label: "뮤지컬" },
    { id: "play", label: "연극" },
    { id: "popular", label: "대중음악" },
    { id: "classical", label: "서양음악(클래식)" },
    { id: "traditional", label: "한국음악(국악)" },
  ];

  return (
    <div className={styles.container}>
      {/* 검색창 */}
      <div className={styles.searchSection} ref={searchRef}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <input
            type="text"
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="공연명을 입력하세요"
            onFocus={() => {
              if (autoCompleteList.length > 0) {
                setShowSuggestions(true);
              }
            }}
          />
        </form>
        
        {/* 자동완성 드롭다운 */}
        {showSuggestions && autoCompleteList.length > 0 && (
          <div className={styles.suggestionsContainer}>
            <div className={styles.suggestionsDivider} />
            <div className={styles.suggestionsList}>
              {autoCompleteList.slice(0, 5).map((item, index) => {
                const formatDate = (dateString) => {
                  if (!dateString) return "";
                  try {
                    const date = new Date(dateString);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    return `${year}.${month}.${day}`;
                  } catch {
                    return dateString;
                  }
                };

                const startDateStr = formatDate(item.startDate);
                const endDateStr = formatDate(item.endDate);
                const dateRange = startDateStr && endDateStr 
                  ? `${startDateStr} ~ ${endDateStr}`
                  : startDateStr || endDateStr || "";

                return (
                  <div
                    key={item.performanceId || index}
                    className={styles.suggestionItem}
                    onClick={() => handleAutoCompleteClick(item.performanceId)}
                  >
                    <div className={styles.suggestionContent}>
                      <span className={styles.suggestionText}>{item.title}</span>
                      {(item.placeName || dateRange) && (
                        <div className={styles.suggestionMeta}>
                          {item.placeName && (
                            <span className={styles.suggestionPlace}>{item.placeName}</span>
                          )}
                          {dateRange && (
                            <span className={styles.suggestionDate}>{dateRange}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className={styles.viewAllResults}
              onClick={() => {
                if (searchQuery.trim()) {
                  navigate(`/culture/search?q=${searchQuery}`);
                  setShowSuggestions(false);
                }
              }}
            >
              <span className={styles.viewAllText}>전체 검색 결과 보기</span>
            </div>
          </div>
        )}
      </div>

      {/* 카테고리 + 진행중 체크 */}
      <div className={styles.categorySection}>
        <div className={styles.categoryTabs}>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`${styles.categoryTab} ${
                selectedCategory === c.id ? styles.activeCategory : ""
              }`}
              onClick={() => dispatch(setSelectedCategory(c.id))}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className={styles.ongoingFilter}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showOngoingOnly}
              onChange={(e) => dispatch(setShowOngoingOnly(e.target.checked))}
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>진행중인 공연만 보기</span>
          </label>
        </div>
      </div>

      {/* 카드 리스트 */}
      <div className={styles.performanceGrid}>
        {finalList.map((p, index) => {
          return (
            <PerformanceApiCard
              key={p.id + "_" + index}
              {...p}
              isFavorite={favoriteIds.has(p.id)}
              onFavoriteToggle={handleFavoriteToggle}
              onClick={() => navigate(`/culture/${p.id}`)}
            />
          );
        })}
      </div>

      <div ref={sentinelRef} style={{ height: 40 }} />
      {loading && <LoadingSpinner />}
    </div>
  );
};

export default MainCulturePage;
