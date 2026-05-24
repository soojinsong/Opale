import React, { useState, useEffect } from "react";
import { fetchPerformanceVideos, uploadPerformanceYoutubeVideo, deletePerformanceVideo } from "../../api/performanceVideoApi";
import { normalizePerformanceVideoList } from "../../services/normalizePerformanceVideoList";
import { extractYoutubeVideoId, buildYoutubeThumbnailUrl } from "../../utils/youtube";
import AdminVideoCard from "./AdminVideoCard";
import styles from "./PerformanceVideoSection.module.css";

const PerformanceVideoSection = ({ selectedPerformance }) => {
  const [videoListData, setVideoListData] = useState({
    performanceId: "",
    title: "",
    totalCount: 0,
    videos: [],
  });
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  useEffect(() => {
    if (!selectedPerformance) {
      setVideoListData({
        performanceId: "",
        title: "",
        totalCount: 0,
        videos: [],
      });
      return;
    }

    const loadVideos = async () => {
      setLoadingVideos(true);
      try {
        console.log("📹 영상 목록 조회 시작 - performanceId:", selectedPerformance.id);
        const response = await fetchPerformanceVideos(selectedPerformance.id);
        console.log("📹 API 응답 원본:", response);
        
        const normalized = normalizePerformanceVideoList(response);
        console.log("📹 정제된 영상 목록:", normalized);
        console.log("📹 영상 개수:", normalized.videos.length);
        
        setVideoListData(normalized);
      } catch (err) {
        console.error("❌ 영상 목록 조회 실패:", err);
        setVideoListData({
          performanceId: "",
          title: "",
          totalCount: 0,
          videos: [],
        });
      } finally {
        setLoadingVideos(false);
      }
    };

    loadVideos();
  }, [selectedPerformance]);

  const handleYoutubeUrlChange = (e) => {
    setYoutubeUrl(e.target.value);
  };

  const handleVideoTitleChange = (e) => {
    setVideoTitle(e.target.value);
  };

  const handleSourceUrlChange = (e) => {
    setSourceUrl(e.target.value);
  };

  const handleAddVideo = async () => {
    if (!youtubeUrl.trim() || !videoTitle.trim()) {
      alert("유튜브 URL과 제목을 입력해주세요.");
      return;
    }

    const youtubeVideoId = extractYoutubeVideoId(youtubeUrl);
    if (!youtubeVideoId) {
      alert("유효한 유튜브 URL을 입력해주세요.");
      return;
    }

    const thumbnailUrl = buildYoutubeThumbnailUrl(youtubeVideoId);

    setUploading(true);
    try {
      await uploadPerformanceYoutubeVideo(
        selectedPerformance.id,
        youtubeVideoId,
        videoTitle,
        thumbnailUrl,
        sourceUrl.trim() || null
      );
      
      const response = await fetchPerformanceVideos(selectedPerformance.id);
      const normalized = normalizePerformanceVideoList(response);
      setVideoListData(normalized);
      
      setYoutubeUrl("");
      setVideoTitle("");
      setSourceUrl("");
      alert("영상이 등록되었습니다.");
    } catch (err) {
      console.error("영상 등록 실패:", err);
      alert("영상 등록에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("정말 이 영상을 삭제하시겠습니까?")) {
      return;
    }

    setDeleting(true);
    try {
      await deletePerformanceVideo(videoId);
      
      const response = await fetchPerformanceVideos(selectedPerformance.id);
      const normalized = normalizePerformanceVideoList(response);
      setVideoListData(normalized);
      
      alert("영상이 삭제되었습니다.");
    } catch (err) {
      console.error("영상 삭제 실패:", err);
      alert("영상 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  if (!selectedPerformance) {
    return null;
  }

  return (
    <div className={styles.videoSection}>
      <div className={styles.videoSectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            {selectedPerformance.title} - 유튜브 영상
          </h2>
          {videoListData.totalCount > 0 && (
            <div className={styles.videoStats}>
              <span>전체: {videoListData.totalCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* 영상 등록 폼 */}
      <div className={styles.addVideoForm}>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>유튜브 URL *</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="유튜브 URL을 입력하세요"
            value={youtubeUrl}
            onChange={handleYoutubeUrlChange}
            disabled={uploading || deleting}
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>영상 제목 *</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="영상 제목을 입력하세요"
            value={videoTitle}
            onChange={handleVideoTitleChange}
            disabled={uploading || deleting}
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.formLabel}>출처 URL (선택)</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="출처 링크를 입력하세요 (선택사항)"
            value={sourceUrl}
            onChange={handleSourceUrlChange}
            disabled={uploading || deleting}
          />
        </div>
        <button
          className={styles.addButton}
          onClick={handleAddVideo}
          disabled={uploading || deleting || !youtubeUrl.trim() || !videoTitle.trim()}
        >
          {uploading ? "등록 중..." : "영상 등록"}
        </button>
      </div>

      {/* 영상 목록 */}
      <div className={styles.videoList}>
        {loadingVideos && <div className={styles.loading}>영상 로딩 중...</div>}
        {!loadingVideos && videoListData.videos.length === 0 && (
          <div className={styles.emptyMessage}>등록된 영상이 없습니다.</div>
        )}
        {!loadingVideos && videoListData.videos.map((video) => (
          <AdminVideoCard
            key={video.performanceVideoId}
            video={video}
            onDelete={handleDeleteVideo}
            deleting={deleting}
          />
        ))}
      </div>
    </div>
  );
};

export default PerformanceVideoSection;
