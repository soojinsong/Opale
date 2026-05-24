import axiosInstance from "./axiosInstance";

const base = "/logs";

export const createLog = async (dto) => {
  try {
    const res = await axiosInstance.post(base, dto);

    if (res.data.success) return res.data.data;
    throw new Error("사용자 행동 로그 저장 실패");
  } catch (err) {
    console.error("❌ createLog 오류:", err);
    throw err;
  }
};

export const getLogs = async (params = {}) => {
  try {
    const res = await axiosInstance.get(base, { params });

    if (res.data.success) return res.data.data;
    throw new Error("사용자 행동 로그 조회 실패");
  } catch (err) {
    console.error("❌ getLogs 오류:", err);
    throw err;
  }
};

const logApi = {
  createLog,
  getLogs,
};

export default logApi;
