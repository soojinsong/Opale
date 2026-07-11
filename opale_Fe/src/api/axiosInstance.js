// src/api/axiosInstance.js
import axios from "axios";
import store from "../store";
import { reissueToken, logout } from "../store/userSlice";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  // headers: {
  //   "Content-Type": "application/json",
  // },
});

axiosInstance.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem("accessToken");
    if (token) {
      token = token.replace(/^Bearer\s+/i, "").trim();
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 리프레시 토큰이 로테이션(재발급마다 폐기 후 새로 발급)되는 구조라, 여러 요청이 동시에
// 401을 맞으면 먼저 성공한 재발급 이후의 요청들이 "이미 폐기된" 옛 리프레시 토큰으로 또
// 재발급을 시도하다가 실패해서 정상 로그인 상태인데도 로그아웃되는 문제가 있었음.
// (공연 상세 페이지처럼 useEffect가 여러 개라 API가 동시에 여러 개 나가는 페이지에서 특히 잘 터짐)
// → 재발급은 한 번만 진행하고, 그 사이 들어온 401들은 대기시켰다가 완료 후 일괄 재시도.
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// newAccessToken이 null이면 리프레시 실패를 의미 — 대기 중이던 요청들에 실패를 전파
const onRefreshDone = (newAccessToken) => {
  refreshSubscribers.forEach((callback) => callback(newAccessToken));
  refreshSubscribers = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newAccessToken) => {
            if (!newAccessToken) {
              reject(error);
              return;
            }
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("Refresh token missing");

        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { headers: { "Refresh-Token": refreshToken } }
        );

        const { accessToken, refreshToken: newRefresh } =
          refreshResponse.data.data;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", newRefresh);
        store.dispatch(reissueToken(accessToken));
        onRefreshDone(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.warn("❌ 토큰 재발급 실패:", refreshError);
        onRefreshDone(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        store.dispatch(logout());
        window.location.href = "/login";
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
