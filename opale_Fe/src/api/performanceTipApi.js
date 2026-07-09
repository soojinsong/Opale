import axiosInstance from "./axiosInstance";

const base = "/tips";

/* ============================================================
    1) 공연 정보 제보 등록 (회원용, multipart)
    POST /api/tips
============================================================ */
export const submitPerformanceTip = async ({
  performanceId,
  file,
  imageType,
  sourceUrl,
  description,
}) => {
  try {
    const formData = new FormData();
    formData.append("performanceId", performanceId);
    formData.append("file", file);
    formData.append("imageType", imageType);

    if (sourceUrl) formData.append("sourceUrl", sourceUrl);
    if (description) formData.append("description", description);

    const res = await axiosInstance.post(base, formData);

    if (res.data.success) return res.data.data;
    throw new Error("공연 정보 제보 등록 실패");
  } catch (err) {
    console.error("❌ submitPerformanceTip 오류:", err);
    throw err;
  }
};

/* ============================================================
    2) 제보 목록 조회 (관리자용)
    GET /api/tips
============================================================ */
export const fetchPerformanceTips = async ({ page = 1, size = 10, status } = {}) => {
  try {
    const res = await axiosInstance.get(base, {
      params: { page, size, status: status || undefined },
    });

    if (res.data.success) return res.data.data;
    throw new Error("제보 목록 조회 실패");
  } catch (err) {
    console.error("❌ fetchPerformanceTips 오류:", err);
    throw err;
  }
};

/* ============================================================
    3) 제보 처리 (승인/반려, 관리자용)
    PATCH /api/tips/{tipId}/status
============================================================ */
export const updatePerformanceTipStatus = async (tipId, status, adminMemo) => {
  try {
    const res = await axiosInstance.patch(`${base}/${tipId}/status`, {
      status,
      adminMemo,
    });

    if (res.data.success) return res.data.data;
    throw new Error("제보 처리 실패");
  } catch (err) {
    console.error("❌ updatePerformanceTipStatus 오류:", err);
    throw err;
  }
};

export default {
  submitPerformanceTip,
  fetchPerformanceTips,
  updatePerformanceTipStatus,
};
