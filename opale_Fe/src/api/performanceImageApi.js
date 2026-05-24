/* ============================================================
    🎨 Performance Image Admin API (공연 수집 이미지 관리)
    - 이미지 목록 조회
    - 이미지 파일 업로드
    - 이미지 삭제
============================================================ */

import axiosInstance from "./axiosInstance";

const base = "/admin/performances";

/* ============================================================
    1) 공연 수집 이미지 목록 조회
    GET /api/admin/performances/{performanceId}/images
============================================================ */
export const fetchPerformanceImages = async (performanceId) => {
  try {
    const res = await axiosInstance.get(`${base}/${performanceId}/images`);

    if (res.data.success) return res.data.data;
    throw new Error("공연 수집 이미지 조회 실패");
  } catch (err) {
    console.error("❌ fetchPerformanceImages 오류:", err);
    throw err;
  }
};

/* ============================================================
    2) 공연 수집 이미지 파일 업로드 (multipart)
    POST /api/admin/performances/{performanceId}/images/file
============================================================ */
export const uploadPerformanceImageFile = async (
  performanceId,
  file,
  imageType,
  sourceUrl = null
) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("imageType", imageType);

    if (sourceUrl !== null && sourceUrl !== undefined) {
      formData.append("sourceUrl", sourceUrl);
    }

    const res = await axiosInstance.post(
      `${base}/${performanceId}/images/file`,
      formData, 
      {
        headers: {
        },
      }
    );

    if (res.data.success) return res.data.data;
    throw new Error("공연 수집 이미지 파일 업로드 실패");
  } catch (err) {
    console.error("❌ uploadPerformanceImageFile 오류:", err);
    throw err;
  }
};

/* ============================================================
    3) 공연 수집 이미지 삭제
    DELETE /api/admin/performances/images/{imageId}
============================================================ */
export const deletePerformanceImage = async (imageId) => {
  try {
    const res = await axiosInstance.delete(`${base}/images/${imageId}`);

    if (res.data.success) return true;
    throw new Error("공연 수집 이미지 삭제 실패");
  } catch (err) {
    console.error("❌ deletePerformanceImage 오류:", err);
    throw err;
  }
};

export default {
  fetchPerformanceImages,
  uploadPerformanceImageFile,
  deletePerformanceImage,
};
