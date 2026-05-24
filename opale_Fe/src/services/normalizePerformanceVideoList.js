// src/services/normalizePerformanceVideoList.js

/**
 * 공연 유튜브 영상 목록 API 응답을 정제하는 함수
 * 
 * @param {Array} data - API 응답 데이터 (PerformanceVideoDto 배열)
 * @returns {Array} 정제된 영상 목록 데이터
 */
/**
 * 공연 유튜브 영상 목록 API 응답을 정제하는 함수
 * 백엔드 응답: AdminPerformanceVideoListResponseDto
 * {
 *   performanceId: String,
 *   title: String,
 *   totalCount: int,
 *   videos: List<AdminPerformanceVideoResponseDto>
 * }
 * 
 * @param {Object} data - API 응답 데이터 (AdminPerformanceVideoListResponseDto)
 * @returns {Object} 정제된 영상 목록 데이터
 */
export const normalizePerformanceVideoList = (data) => {
  if (!data) {
    console.warn("⚠️ normalizePerformanceVideoList: data가 없습니다");
    return {
      performanceId: "",
      title: "",
      totalCount: 0,
      videos: [],
    };
  }

  const videos = (data.videos || []).map((video) => ({
    id: video.performanceVideoId,
    performanceVideoId: video.performanceVideoId,
    youtubeVideoId: video.youtubeVideoId || "",
    title: video.title || "",
    thumbnailUrl: video.thumbnailUrl || "",
    sourceUrl: video.sourceUrl || "",
    embedUrl: video.embedUrl || "",
    videoId: video.youtubeVideoId || "",
    youtubeUrl: video.sourceUrl || `https://www.youtube.com/watch?v=${video.youtubeVideoId || ""}`,
  }));

  return {
    performanceId: data.performanceId || "",
    title: data.title || "",
    totalCount: data.totalCount || videos.length,
    videos: videos,
  };
};

/**
 * 공연 유튜브 영상 단건 응답을 정제하는 함수
 * 
 * @param {Object} data - API 응답 데이터 (PerformanceVideoDto)
 * @returns {Object} 정제된 영상 데이터
 */
export const normalizePerformanceVideo = (data) => {
  if (!data) {
    return null;
  }

  return {
    id: data.performanceVideoId,
    performanceVideoId: data.performanceVideoId,
    youtubeVideoId: data.youtubeVideoId || "",
    title: data.title || "",
    thumbnailUrl: data.thumbnailUrl || "",
    sourceUrl: data.sourceUrl || "",
    embedUrl: data.embedUrl || "",
    videoId: data.youtubeVideoId || "",
    youtubeUrl: data.sourceUrl || `https://www.youtube.com/watch?v=${data.youtubeVideoId || ""}`,
  };
};
