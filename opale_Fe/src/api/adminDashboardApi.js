import axiosInstance from "./axiosInstance";

const base = "/admin";

export const fetchAdminDashboard = async () => {
  try {
    const res = await axiosInstance.get(`${base}/dashboard`);
    if (res.data.success) return res.data.data;
    throw new Error("통계 대시보드 조회 실패");
  } catch (err) {
    console.error("❌ fetchAdminDashboard 오류:", err);
    throw err;
  }
};

export default {
  fetchAdminDashboard,
};
