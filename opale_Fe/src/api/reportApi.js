import axiosInstance from "./axiosInstance";

const base = "/reports";

export const createReport = async ({ targetType, targetId, targetUserId, reason, detail }) => {
  try {
    const res = await axiosInstance.post(base, {
      targetType,
      targetId,
      targetUserId,
      reason,
      detail,
    });
    if (res.data.success) return res.data.data;
    throw new Error("신고 등록 실패");
  } catch (err) {
    console.error("❌ createReport 오류:", err);
    throw err;
  }
};

export const fetchReports = async ({ page = 1, size = 10, status } = {}) => {
  try {
    const params = { page, size };
    if (status) params.status = status;
    const res = await axiosInstance.get(base, { params });
    if (res.data.success) return res.data.data;
    throw new Error("신고 목록 조회 실패");
  } catch (err) {
    console.error("❌ fetchReports 오류:", err);
    throw err;
  }
};

export const fetchReportDetail = async (reportId) => {
  try {
    const res = await axiosInstance.get(`${base}/${reportId}`);
    if (res.data.success) return res.data.data;
    throw new Error("신고 상세 조회 실패");
  } catch (err) {
    console.error("❌ fetchReportDetail 오류:", err);
    throw err;
  }
};

export const updateReportStatus = async (reportId, status, adminMemo) => {
  try {
    const res = await axiosInstance.patch(`${base}/${reportId}/status`, {
      status,
      adminMemo,
    });
    if (res.data.success) return res.data.data;
    throw new Error("신고 처리 실패");
  } catch (err) {
    console.error("❌ updateReportStatus 오류:", err);
    throw err;
  }
};

export default {
  createReport,
  fetchReports,
  fetchReportDetail,
  updateReportStatus,
};
