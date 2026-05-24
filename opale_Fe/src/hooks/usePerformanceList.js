// src/hooks/usePerformanceList.js

import { useEffect, useState, useRef, useCallback } from "react";
import { fetchPerformanceList } from "../api/performanceApi";
import { normalizePerformance } from "../services/normalizePerformance";

export const usePerformanceList = (initialParams = {}) => {
  const [performances, setPerformances] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);

  const observerRef = useRef(null);
  const activeRequestId = useRef(0);
  const paramsRef = useRef(initialParams);
  const pageRef = useRef(1);
  const hasNextRef = useRef(true);
  const loadingRef = useRef(false);
  const isMountedRef = useRef(false);
  const prevParamsRef = useRef(null);

  /** ⭐ 페이지 로드 함수 (무한 루프 방지를 위해 ref 사용) */
  const loadPage = useCallback(async (targetPage, isReset = false) => {
    if (loadingRef.current || (!isReset && !hasNextRef.current)) return;

    const reqId = ++activeRequestId.current;
    loadingRef.current = true;
    setLoading(true);

    try {
      const dto = {
        ...paramsRef.current,
        page: targetPage,
        size: 20,
      };

      const res = await fetchPerformanceList(dto);

      if (reqId !== activeRequestId.current) return;

      const list = res.performances.map(normalizePerformance);

      if (isReset || targetPage === 1) {
        const uniqueList = list.filter((item, index, self) => 
          index === self.findIndex((t) => t.id === item.id)
        );
        setPerformances(uniqueList);
      } else {
        setPerformances((prev) => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = list.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }

      hasNextRef.current = res.hasNext;
      setHasNext(res.hasNext);
    } catch (e) {
      console.error("❌ 공연 목록 호출 실패:", e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  /** ⭐ 초기 마운트 및 params 변경 감지 */
  useEffect(() => {
    const currentParams = JSON.stringify({
      genre: initialParams.genre,
      sortType: initialParams.sortType,
      keyword: initialParams.keyword,
      area: initialParams.area,
    });
    const prevParams = prevParamsRef.current;

    if (!isMountedRef.current || prevParams !== currentParams) {
      isMountedRef.current = true;
      prevParamsRef.current = currentParams;
      paramsRef.current = initialParams;

      setPerformances([]);
      setHasNext(true);
      setPage(1);
      pageRef.current = 1;
      hasNextRef.current = true;
      activeRequestId.current++;

      loadPage(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialParams.genre, initialParams.sortType, initialParams.keyword, initialParams.area]);

  /** ⭐ page 변경될 때만 API 호출 */
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (page > 1) {
      loadPage(page, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /** ⭐ 무한스크롤 */
  const sentinelRef = useCallback(
    (node) => {
      if (loadingRef.current) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextRef.current && !loadingRef.current) {
          setPage((p) => {
            const nextPage = p + 1;
            pageRef.current = nextPage;
            return nextPage;
          });
        }
      });

      if (node) observerRef.current.observe(node);
    },
    []
  );

  return { performances, sentinelRef, loading };
};
