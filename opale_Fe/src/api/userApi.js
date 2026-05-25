import axiosInstance from "./axiosInstance";
import { normalizePasswordResetRequest } from "../services/normalizePasswordResetRequest";
import { normalizePasswordResetResponse } from "../services/normalizePasswordResetResponse";

const base = "/users";

export const checkEmailDuplicate = async (email) => {
  try {
    const res = await axiosInstance.post(`${base}/check-duplicate`, { email });

    if (res.data.success) return res.data.message;
    throw new Error("이메일 중복 확인 실패");
  } catch (err) {
    console.error("❌ checkEmailDuplicate 오류:", err);
    throw err;
  }
};

export const checkNicknameDuplicate = async (nickname) => {
  try {
    const res = await axiosInstance.post(`${base}/check-nickname`, { nickname });

    if (res.data.success) return res.data.data;
    throw new Error("닉네임 중복 확인 실패");
  } catch (err) {
    console.error("❌ checkNicknameDuplicate 오류:", err);
    throw err;
  }
};

export const signUp = async (dto) => {
  try {
    const res = await axiosInstance.post(base, dto);

    if (res.data.success) return res.data.data;
    throw new Error("회원가입 실패");
  } catch (err) {
    console.error("❌ signUp 오류:", err);
    throw err;
  }
};

export const fetchMyInfo = async () => {
  try {
    const res = await axiosInstance.get(`${base}/me`);

    if (res.data.success) return res.data.data;
    throw new Error("내 정보 조회 실패");
  } catch (err) {
    console.error("❌ fetchMyInfo 오류:", err);
    throw err;
  }
};

export const updateMyInfo = async (dto) => {
  try {
    const res = await axiosInstance.put(`${base}/me`, dto);

    if (res.data.success) return res.data.data;
    throw new Error("내 정보 수정 실패");
  } catch (err) {
    console.error("❌ updateMyInfo 오류:", err);
    throw err;
  }
};

export const changePassword = async (dto) => {
  try {
    const res = await axiosInstance.patch(`${base}/me/password`, dto);

    if (res.data.success) return true;
    throw new Error("비밀번호 변경 실패");
  } catch (err) {
    console.error("❌ changePassword 오류:", err);
    throw err;
  }
};

export const deleteUser = async (dto) => {
  try {
    const res = await axiosInstance.patch(`${base}/me`, dto || {});

    if (res.data.success) return true;
    throw new Error("회원 탈퇴 실패");
  } catch (err) {
    console.error("❌ deleteUser 오류:", err);
    throw err;
  }
};

export const submitOnboarding = async (genres) => {
  try {
    const res = await axiosInstance.post(`${base}/onboarding`, { genres });
    if (res.data.success) return true;
    throw new Error("온보딩 완료 실패");
  } catch (err) {
    console.error("❌ submitOnboarding 오류:", err);
    throw err;
  }
};

export const resetPassword = async (email) => {
  try {
    const requestData = normalizePasswordResetRequest(email);
    const res = await axiosInstance.post(`${base}/password/reset`, requestData);

    if (res.data.success) {
      return normalizePasswordResetResponse(res.data.data);
    }
    throw new Error("임시 비밀번호 발급 실패");
  } catch (err) {
    console.error("❌ resetPassword 오류:", err);
    throw err;
  }
};

export default {
  checkEmailDuplicate,
  checkNicknameDuplicate,
  signUp,
  fetchMyInfo,
  updateMyInfo,
  changePassword,
  deleteUser,
  resetPassword,
};
