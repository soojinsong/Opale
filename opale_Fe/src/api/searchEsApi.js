import axiosInstance from "./axiosInstance";

const base = "/search";

export const fetchEsPerformanceSearch = async (keyword) => {
  try {
    const res = await axiosInstance.get(`${base}/performances`, {
      params: { keyword },
    });

    if (res.data.success) return res.data.data;
    throw new Error("ES 공연 검색 실패");
  } catch (err) {
    console.error("❌ fetchEsPerformanceSearch 오류:", err);
    throw err;
  }
};

export const fetchEsPerformanceAutoComplete = async (keyword) => {
  try {
    if (!keyword || keyword.trim() === "") return [];

    const res = await axiosInstance.get(
      `${base}/performances/suggest`,
      { params: { keyword } }
    );

    if (res.data.success) return res.data.data ?? [];
    throw new Error("ES 자동완성 조회 실패");
  } catch (err) {
    console.error("❌ fetchEsPerformanceAutoComplete 오류:", err);
    throw err;
  }
};

export default {
  fetchEsPerformanceSearch,
  fetchEsPerformanceAutoComplete,
};
