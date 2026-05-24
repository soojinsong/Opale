import axiosInstance from "./axiosInstance";

const base = "/reservations";

export const createTicket = async (dto) => {
  try {
    const res = await axiosInstance.post(`${base}`, dto);

    if (res.data.success) return res.data.data;
    throw new Error("티켓 인증 등록 실패");
  } catch (err) {
    console.error("❌ createTicket 오류:", err);
    throw err;
  }
};

export const updateTicket = async (ticketId, dto) => {
  try {
    const res = await axiosInstance.patch(`${base}/${ticketId}`, dto);

    if (res.data.success) return res.data.data;
    throw new Error("티켓 인증 수정 실패");
  } catch (err) {
    console.error("❌ updateTicket 오류:", err);
    throw err;
  }
};

export const deleteTicket = async (ticketId) => {
  try {
    const res = await axiosInstance.delete(`${base}/${ticketId}`);

    if (res.data.success) return true;
    throw new Error("티켓 인증 삭제 실패");
  } catch (err) {
    console.error("❌ deleteTicket 오류:", err);
    throw err;
  }
};

export const getTicket = async (ticketId) => {
  try {
    const res = await axiosInstance.get(`${base}/${ticketId}`);

    if (res.data.success) return res.data.data;
    throw new Error("티켓 인증 정보 조회 실패");
  } catch (err) {
    console.error("❌ getTicket 오류:", err);
    throw err;
  }
};

export const getTicketList = async (page = 1, size = 10) => {
  try {
    const res = await axiosInstance.get(`${base}/list`, {
      params: { page, size },
    });

    if (res.data.success) return res.data.data;
    throw new Error("티켓 인증 목록 조회 실패");
  } catch (err) {
    console.error("❌ getTicketList 오류:", err);
    throw err;
  }
};

export const getTicketReviews = async (ticketId) => {
  try {
    const res = await axiosInstance.get(`${base}/${ticketId}/reviews`);

    if (res.data.success) return res.data.data;
    throw new Error("티켓 기반 리뷰 조회 실패");
  } catch (err) {
    console.error("❌ getTicketReviews 오류:", err);
    throw err;
  }
};

export const extractTicketByOcr = async (file) => {
  try {
    console.log('🌐 [extractTicketByOcr] API 호출 시작, 파일:', {
      name: file.name || 'blob',
      size: file.size,
      type: file.type
    });

    const formData = new FormData();
    formData.append("file", file);

    console.log('📦 [extractTicketByOcr] FormData 생성 완료');

    const res = await axiosInstance.post(
      `${base}/ocr`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log('✅ [extractTicketByOcr] API 응답 받음:', res.data);

    if (res.data.success) {
      console.log('✅ [extractTicketByOcr] 성공, 데이터:', res.data.data);
      return res.data.data;
    }

    throw new Error("티켓 OCR 실패");
  } catch (err) {
    console.error("❌ [extractTicketByOcr] 오류:", err);
    console.error("❌ [extractTicketByOcr] 에러 상세:", {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      statusText: err.response?.statusText
    });
    throw err;
  }
};

export const getTicketDetailList = async (page = 1, size = 10) => {
  try {
    const res = await axiosInstance.get(`${base}/list/detail`, {
      params: { page, size },
    });

    if (res.data.success) return res.data.data;
    throw new Error("티켓 인증 상세 목록 조회 실패");
  } catch (err) {
    console.error("❌ getTicketDetailList 오류:", err);
    throw err;
  }
};

export default {
  createTicket,
  updateTicket,
  deleteTicket,
  getTicket,
  getTicketList,
  getTicketDetailList,
  getTicketReviews,
  extractTicketByOcr,
};
