import axiosInstance from "./axiosInstance";

const performanceBase = "/favorites/performances";
const performanceReviewBase = "/favorites/performance-reviews";
const placeReviewBase = "/favorites/place-reviews";

export const togglePerformanceFavorite = async (performanceId) => {
  try {
    const res = await axiosInstance.post(`${performanceBase}/${performanceId}`);
    if (res.data.success) return res.data.data;
    throw new Error("공연 관심 토글 실패");
  } catch (err) {
    console.error("❌ togglePerformanceFavorite 오류:", err);
    throw err;
  }
};

export const isPerformanceLiked = async (performanceId) => {
  try {
    const res = await axiosInstance.get(`${performanceBase}/${performanceId}`);
    if (res.data.success) return res.data.data;
    throw new Error("공연 관심 여부 조회 실패");
  } catch (err) {
    console.error("❌ isPerformanceLiked 오류:", err);
    throw err;
  }
};

export const fetchFavoritePerformanceIds = async () => {
  try {
    const res = await axiosInstance.get(`${performanceBase}/ids`);
    if (res.data.success) return res.data.data ?? [];
    throw new Error("관심 공연 ID 목록 조회 실패");
  } catch (err) {
    console.error("❌ fetchFavoritePerformanceIds 오류:", err);
    throw err;
  }
};

export const fetchFavoritePerformances = async () => {
  try {
    const res = await axiosInstance.get(`${performanceBase}`);
    if (res.data.success) return res.data.data;
    throw new Error("공연 관심 목록 조회 실패");
  } catch (err) {
    console.error("❌ fetchFavoritePerformances 오류:", err);
    throw err;
  }
};

export const togglePerformanceReviewFavorite = async (performanceReviewId) => {
  try {
    const res = await axiosInstance.post(
      `${performanceReviewBase}/${performanceReviewId}`
    );
    if (res.data.success) return res.data.data;
    throw new Error("공연 리뷰 관심 토글 실패");
  } catch (err) {
    console.error("❌ togglePerformanceReviewFavorite 오류:", err);
    throw err;
  }
};

export const isPerformanceReviewLiked = async (performanceReviewId) => {
  try {
    const res = await axiosInstance.get(
      `${performanceReviewBase}/${performanceReviewId}`
    );
    if (res.data.success) return res.data.data;
    throw new Error("공연 리뷰 관심 여부 조회 실패");
  } catch (err) {
    console.error("❌ isPerformanceReviewLiked 오류:", err);
    throw err;
  }
};

export const fetchFavoritePerformanceReviewIds = async () => {
  try {
    const res = await axiosInstance.get(`${performanceReviewBase}/ids`);
    if (res.data.success) return res.data.data ?? [];
    throw new Error("관심 공연 리뷰 ID 목록 조회 실패");
  } catch (err) {
    console.error("❌ fetchFavoritePerformanceReviewIds 오류:", err);
    throw err;
  }
};

export const fetchFavoritePerformanceReviews = async () => {
  try {
    const res = await axiosInstance.get(`${performanceReviewBase}`);
    if (res.data.success) return res.data.data;
    throw new Error("관심 공연 리뷰 목록 조회 실패");
  } catch (err) {
    console.error("❌ fetchFavoritePerformanceReviews 오류:", err);
    throw err;
  }
};

export const togglePlaceReviewFavorite = async (placeReviewId) => {
  try {
    const res = await axiosInstance.post(`${placeReviewBase}/${placeReviewId}`);
    if (res.data.success) return res.data.data;
    throw new Error("공연장 리뷰 관심 토글 실패");
  } catch (err) {
    console.error("❌ togglePlaceReviewFavorite 오류:", err);
    throw err;
  }
};

export const isPlaceReviewLiked = async (placeReviewId) => {
  try {
    const res = await axiosInstance.get(`${placeReviewBase}/${placeReviewId}`);
    if (res.data.success) return res.data.data;
    throw new Error("공연장 리뷰 관심 여부 조회 실패");
  } catch (err) {
    console.error("❌ isPlaceReviewLiked 오류:", err);
    throw err;
  }
};

export const fetchFavoritePlaceReviewIds = async () => {
  try {
    const res = await axiosInstance.get(`${placeReviewBase}/ids`);
    if (res.data.success) return res.data.data ?? [];
    throw new Error("관심 공연장 리뷰 ID 목록 조회 실패");
  } catch (err) {
    console.error("❌ fetchFavoritePlaceReviewIds 오류:", err);
    throw err;
  }
};

export const fetchFavoritePlaceReviews = async () => {
  try {
    const res = await axiosInstance.get(`${placeReviewBase}`);
    if (res.data.success) return res.data.data;
    throw new Error("관심 공연장 리뷰 목록 조회 실패");
  } catch (err) {
    console.error("❌ fetchFavoritePlaceReviews 오류:", err);
    throw err;
  }
};

export default {
  togglePerformanceFavorite,
  isPerformanceLiked,
  fetchFavoritePerformanceIds,
  fetchFavoritePerformances,
  togglePerformanceReviewFavorite,
  isPerformanceReviewLiked,
  fetchFavoritePerformanceReviewIds,
  fetchFavoritePerformanceReviews,
  togglePlaceReviewFavorite,
  isPlaceReviewLiked,
  fetchFavoritePlaceReviewIds,
  fetchFavoritePlaceReviews,
};
