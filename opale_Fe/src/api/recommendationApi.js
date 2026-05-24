/* ===================================================================
    🎭 Recommendation API
    - 공연 추천
    - 공연장 추천
    - 채팅방 추천
    - 개인화 추천
=================================================================== */

import axiosInstance from "./axiosInstance";

const base = "/recommendations";

/* ============================================================
    🧩 공통: 추천 응답을 null-safe로 보정하는 함수
    - 전체 객체는 그대로 두되
    - 내부 recommendations 배열만 항상 [] 로 보정
============================================================ */
const normalizeRecommendation = (data) => {
  if (!data) {
    return {
      totalCount: 0,
      requestedSize: 0,
      sort: null,
      recommendations: [],
    };
  }

  return {
    ...data,
    recommendations: data.recommendations ?? [],
  };
};

/* ============================================================
    1) 개인화 추천 (로그인 사용자)
============================================================ */
export const getUserRecommendations = async (params = {}) => {
  try {
    const res = await axiosInstance.get(`${base}/user`, { params });

    if (res.data.success) return normalizeRecommendation(res.data.data);
    throw new Error("개인화 추천 조회 실패");
  } catch (err) {
    console.error("❌ getUserRecommendations 오류:", err);
    throw err;
  }
};

/* ============================================================
    2) 운영자용 개인화 추천
============================================================ */
export const getUserRecommendationsByAdmin = async (userId, params = {}) => {
  try {
    const res = await axiosInstance.get(`${base}/user/${userId}`, { params });

    if (res.data.success) return normalizeRecommendation(res.data.data);
    throw new Error("운영자 개인화 추천 조회 실패");
  } catch (err) {
    console.error("❌ getUserRecommendationsByAdmin 오류:", err);
    throw err;
  }
};

/* ============================================================
    3) 특정 공연과 비슷한 공연 추천
============================================================ */
export const getSimilarPerformances = async (performanceId, params = {}) => {
  try {
    const res = await axiosInstance.get(`${base}/performance/${performanceId}`, {
      params,
    });

    if (res.data.success) return normalizeRecommendation(res.data.data);
    throw new Error("비슷한 공연 추천 조회 실패");
  } catch (err) {
    console.error("❌ getSimilarPerformances 오류:", err);
    throw err;
  }
};

/* ============================================================
    4) 장르 기반 추천
============================================================ */
export const getGenreRecommendations = async (params = {}) => {
  try {
    const res = await axiosInstance.get(`${base}/genre`, { params });

    if (res.data.success) return normalizeRecommendation(res.data.data);
    throw new Error("장르 기반 추천 조회 실패");
  } catch (err) {
    console.error("❌ getGenreRecommendations 오류:", err);
    throw err;
  }
};

/* ============================================================
    5) 인기 공연 추천
============================================================ */
export const getPopularRecommendations = async (params = {}) => {
  try {
    const res = await axiosInstance.get(`${base}/popular`, { params });

    if (res.data.success) return normalizeRecommendation(res.data.data);
    throw new Error("인기 공연 추천 조회 실패");
  } catch (err) {
    console.error("❌ getPopularRecommendations 오류:", err);
    throw err;
  }
};

/* ============================================================
    6) 최신 공연 추천
============================================================ */
export const getLatestRecommendations = async (params = {}) => {
  try {
    const res = await axiosInstance.get(`${base}/latest`, { params });

    if (res.data.success) return normalizeRecommendation(res.data.data);
    throw new Error("최신 공연 추천 조회 실패");
  } catch (err) {
    console.error("❌ getLatestRecommendations 오류:", err);
    throw err;
  }
};

/* ============================================================
    7) 인기 공연장 추천
============================================================ */
export const getPopularPlaces = async (params = {}) => {
  try {
    const res = await axiosInstance.get(`${base}/popular/places`, { params });

    if (res.data.success) return normalizeRecommendation(res.data.data);
    throw new Error("인기 공연장 추천 조회 실패");
  } catch (err) {
    console.error("❌ getPopularPlaces 오류:", err);
    throw err;
  }
};

/* ============================================================
    8) 인기 채팅방 추천
============================================================ */
export const getPopularChatRooms = async (params = {}) => {
  try {
    const res = await axiosInstance.get(`${base}/popular/chatrooms`, { params });

    if (res.data.success) return normalizeRecommendation(res.data.data);
    throw new Error("인기 채팅방 추천 조회 실패");
  } catch (err) {
    console.error("❌ getPopularChatRooms 오류:", err);
    throw err;
  }
};

/* ============================================================
    9) 최근 본 공연 1개 조회
    GET /api/recommendations/recent
============================================================ */
export const getRecentViewedPerformance = async () => {
  try {
    const res = await axiosInstance.get(`${base}/recent`);

    if (res.data.success) {
      return res.data.data ?? { recentPerformanceId: null };
    }

    throw new Error("최근 본 공연 조회 실패");
  } catch (err) {
    console.error("❌ getRecentViewedPerformance 오류:", err);
    throw err;
  }
};

/* ============================================================
    10) 최근 본 공연 → 유사 공연 추천
    GET /api/recommendations/recent/similar
============================================================ */
export const getRecentSimilarRecommendations = async (params = {}) => {
  try {
    const res = await axiosInstance.get(`${base}/recent/similar`, { params });

    if (res.data.success) return normalizeRecommendation(res.data.data);
    throw new Error("최근 본 공연 기반 추천 조회 실패");
  } catch (err) {
    console.error("❌ getRecentSimilarRecommendations 오류:", err);
    throw err;
  }
};

/* ============================================================
    Export
============================================================ */
const recommendationApi = {
  getUserRecommendations,
  getUserRecommendationsByAdmin,
  getSimilarPerformances,
  getGenreRecommendations,
  getPopularRecommendations,
  getLatestRecommendations,
  getPopularPlaces,
  getPopularChatRooms,
  getRecentViewedPerformance,
  getRecentSimilarRecommendations,
};

export default recommendationApi;
