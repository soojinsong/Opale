// src/hooks/usePlaceList.js

import { useEffect, useState, useRef, useCallback } from "react";
import { fetchPlaceList } from "../api/placeApi";
import { normalizePlace } from "../services/normalizePlace";

export const usePlaceList = (initialParams = {}) => {
  const {
    area,
    keyword,
    sortType,
    enabled = true,
  } = initialParams;

  const [places, setPlaces] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const observerRef = useRef(null);
  const activeRequestId = useRef(0);
  const paramsRef = useRef({ area, keyword, sortType });
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

      const res = await fetchPlaceList(dto);

      if (reqId !== activeRequestId.current) return;

      const list = res.places?.map(normalizePlace) ?? [];

      if (isReset || targetPage === 1) {
        setPlaces(list);
      } else {
        setPlaces((prev) => [...prev, ...list]);
      }

      hasNextRef.current = res.hasNext ?? false;
      setHasNext(res.hasNext ?? false);
      setTotalCount(res.totalCount ?? 0);
    } catch (e) {
      console.error("❌ 공연장 목록 호출 실패:", e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  /** ⭐ 초기 마운트 및 params 변경 감지 */
  useEffect(() => {
    if (!enabled) {
      setPlaces([]);
      setLoading(false);
      return;
    }

    const currentParams = JSON.stringify({
      area,
      keyword,
      sortType,
    });
    const prevParams = prevParamsRef.current;

    if (!isMountedRef.current || prevParams !== currentParams) {
      isMountedRef.current = true;
      prevParamsRef.current = currentParams;
      paramsRef.current = { area, keyword, sortType };

      setPlaces([]);
      setHasNext(true);
      setPage(1);
      pageRef.current = 1;
      hasNextRef.current = true;
      activeRequestId.current++;

      loadPage(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, area, keyword, sortType]);

  /** ⭐ page 변경될 때만 API 호출 */
  useEffect(() => {
    if (!enabled || !isMountedRef.current) return;

    if (page > 1) {
      loadPage(page, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, page]);

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

  return { places, sentinelRef, loading, totalCount };
};
