import React, { useMemo, useCallback } from "react";
import { usePerformanceList } from "../../hooks/usePerformanceList";
import styles from "./PerformanceSelector.module.css";

const PerformanceSelector = ({ searchQuery, debouncedSearchQuery, onSearchChange, selectedPerformance, onSelectPerformance }) => {
  const trimmedKeyword = useMemo(() => {
    const trimmed = (debouncedSearchQuery || searchQuery).trim();
    return trimmed || null;
  }, [debouncedSearchQuery, searchQuery]);

  const listParams = useMemo(() => ({
    keyword: trimmedKeyword,
    sortType: "인기",
  }), [trimmedKeyword]);

  const { performances, sentinelRef, loading: loadingPerformances } = usePerformanceList(listParams);

  const handlePerformanceClick = useCallback((performance, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onSearchChange(performance.title);
    onSelectPerformance(performance);
  }, [onSelectPerformance, onSearchChange]);

  return (
    <div className={styles.searchSection}>
      <div className={styles.searchHeader}>
        <h2 className={styles.sectionTitle}>공연 선택</h2>
      </div>
      
      <div className={styles.searchInputWrapper}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="공연명으로 검색하세요..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* 공연 목록 */}
      <div className={styles.performanceList}>
        {loadingPerformances && <div className={styles.loading}>로딩 중...</div>}
        {!loadingPerformances && performances.length === 0 && (
          <div className={styles.emptyMessage}>검색 결과가 없습니다.</div>
        )}
        {performances.map((performance, index) => (
          <div
            key={`${performance.id}-${index}`}
            className={`${styles.performanceItem} ${
              selectedPerformance?.id === performance.id ? styles.selected : ""
            }`}
            onClick={(e) => handlePerformanceClick(performance, e)}
          >
            <div className={styles.performanceInfo}>
              <div className={styles.performanceTitle}>{performance.title}</div>
              <div className={styles.performanceVenue}>{performance.venue}</div>
              <div className={styles.performanceDate}>
                {performance.startDate} ~ {performance.endDate}
              </div>
            </div>
          </div>
        ))}
        <div ref={sentinelRef} style={{ height: 20 }} />
      </div>
    </div>
  );
};

export default PerformanceSelector;
