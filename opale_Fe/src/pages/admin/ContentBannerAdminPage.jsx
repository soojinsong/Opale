import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  fetchAllMainContentBanners, 
  createMainContentBannerWithFile,
  createMainContentBannerWithoutFile,
  updateMainContentBanner, 
  deleteMainContentBanner 
} from "../../api/bannerApi";
import { normalizeAdminMainContentBannerList } from "../../services/normalizeBanner";
import PerformanceSelector from "../../components/admin/PerformanceSelector";
import styles from "./ContentBannerAdminPage.module.css";
import useBannerAdmin from "../../hooks/useBannerAdmin";

const ContentBannerAdminPage = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [registrationMode, setRegistrationMode] = useState("image");

  const {
    searchQuery, setSearchQuery,
    debouncedSearchQuery,
    selectedPerformance, setSelectedPerformance,
    draggedIndex, dragOverIndex,
    handleDragStart, handleDragOver, handleDragLeave, handleDragEnd,
    clearDragState, reorderItems, resetSearchState,
  } = useBannerAdmin();
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    linkUrl: "",
    performanceId: "",
    displayOrder: 0,
    isActive: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await fetchAllMainContentBanners();
      const normalized = normalizeAdminMainContentBannerList(data);
      normalized.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setBanners(normalized);
    } catch (err) {
      console.error("컨텐츠 배너 목록 조회 실패:", err);
      alert("컨텐츠 배너 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    if (selectedPerformance && selectedPerformance.id) {
      setFormData(prev => ({
        ...prev,
        performanceId: selectedPerformance.id,
      }));
    }
  }, [selectedPerformance]);

  const resetForm = () => {
    const newDisplayOrder = banners.length + 1;
    setFormData({
      title: "",
      content: "",
      linkUrl: "",
      performanceId: "",
      displayOrder: newDisplayOrder,
      isActive: true,
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingBanner(null);
    setRegistrationMode("image");
    setIsFormOpen(false);
    resetSearchState();
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || "",
      content: banner.content || "",
      linkUrl: banner.linkUrl || "",
      performanceId: banner.performanceId || "",
      displayOrder: banner.displayOrder || 0,
      isActive: banner.isActive ?? true,
    });
    setImagePreview(banner.imageUrl || null);
    setImageFile(null);
    setRegistrationMode(banner.performanceId ? "performance" : "image");
    resetSearchState();
    setIsFormOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!formData.content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    if (registrationMode === "image") {
      if (!editingBanner && !imageFile) {
        alert("이미지 파일을 선택해주세요.");
        return;
      }
    } else {
      if (!formData.performanceId.trim()) {
        alert("공연을 선택해주세요.");
        return;
      }
    }

    try {
      if (editingBanner) {
        await updateMainContentBanner(editingBanner.contentBannerId, formData, imageFile);
        alert("컨텐츠 배너가 수정되었습니다.");
      } else {
        if (registrationMode === "image") {
          await createMainContentBannerWithFile(formData, imageFile);
        } else {
          await createMainContentBannerWithoutFile(formData);
        }
        alert("컨텐츠 배너가 등록되었습니다.");
      }
      resetForm();
      loadBanners();
    } catch (err) {
      console.error("컨텐츠 배너 저장 실패:", err);
      alert("컨텐츠 배너 저장에 실패했습니다.");
    }
  };

  const handleDelete = async (contentBannerId) => {
    if (!window.confirm("정말 이 컨텐츠 배너를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteMainContentBanner(contentBannerId);
      alert("컨텐츠 배너가 삭제되었습니다.");
      loadBanners();
    } catch (err) {
      console.error("컨텐츠 배너 삭제 실패:", err);
      alert("컨텐츠 배너 삭제에 실패했습니다.");
    }
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      clearDragState();
      return;
    }

    const updatedBanners = reorderItems(banners, draggedIndex, dropIndex);
    setBanners(updatedBanners);
    clearDragState();

    try {
      const updatePromises = updatedBanners.map((banner) => {
        const updateData = {
          title: banner.title || "",
          content: banner.content || "",
          linkUrl: banner.linkUrl || "",
          performanceId: banner.performanceId || "",
          displayOrder: banner.displayOrder,
          isActive: banner.isActive ?? true,
        };
        return updateMainContentBanner(banner.contentBannerId, updateData, null);
      });
      await Promise.all(updatePromises);
      alert("컨텐츠 배너 순서가 변경되었습니다.");
    } catch (err) {
      console.error("컨텐츠 배너 순서 변경 실패:", err);
      alert("컨텐츠 배너 순서 변경에 실패했습니다. 페이지를 새로고침합니다.");
      loadBanners();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <Link to="/admin" className={styles.breadcrumbLink}>운영자 관리 홈</Link>
        <span className={styles.breadcrumbSeparator}> / </span>
        <span className={styles.breadcrumbItem}>배너 관리</span>
        <span className={styles.breadcrumbSeparator}> / </span>
        <span className={styles.breadcrumbCurrent}>홈 컨텐츠 배너 관리</span>
      </div>
      <div className={styles.header}>
        <h1 className={styles.title}>홈 컨텐츠 배너 관리</h1>
        <p className={styles.subtitle}>메인 페이지의 함께 보는 공연 숏텐츠 배너를 관리할 수 있습니다.</p>
      </div>

      {/* 등록 버튼 */}
      <div className={styles.actions}>
        <button
          className={styles.addButton}
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
        >
          + 배너 등록
        </button>
      </div>

      {/* 등록/수정 폼 */}
      {isFormOpen && (
        <div className={styles.formModal}>
          <div className={styles.formContent}>
            <div className={styles.formHeader}>
              <h2>{editingBanner ? "컨텐츠 배너 수정" : "컨텐츠 배너 등록"}</h2>
              <button className={styles.closeButton} onClick={resetForm}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* 등록 방식 선택 (새 등록 시에만) */}
              {!editingBanner && (
                <div className={styles.formRow}>
                  <label>등록 방식 *</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="registrationMode"
                        value="image"
                        checked={registrationMode === "image"}
                        onChange={(e) => {
                          setRegistrationMode(e.target.value);
                          setImageFile(null);
                          setImagePreview(null);
                          setFormData(prev => ({ ...prev, performanceId: "" }));
                          setSelectedPerformance(null);
                        }}
                      />
                      <span>이미지 업로드</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="registrationMode"
                        value="performance"
                        checked={registrationMode === "performance"}
                        onChange={(e) => {
                          setRegistrationMode(e.target.value);
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                      />
                      <span>공연 선택</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 이미지 업로드 섹션 */}
              {registrationMode === "image" && (
                <div className={styles.formRow}>
                  <label>이미지 {!editingBanner && "*"}</label>
                  <div className={styles.imageUpload}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className={styles.fileInput}
                    />
                    {imagePreview && (
                      <img src={imagePreview} alt="미리보기" className={styles.previewImage} />
                    )}
                  </div>
                </div>
              )}

              {/* 공연 선택 섹션 */}
              {registrationMode === "performance" && (
                <div className={styles.performanceSelectorWrapper}>
                  <PerformanceSelector
                    searchQuery={searchQuery}
                    debouncedSearchQuery={debouncedSearchQuery}
                    onSearchChange={setSearchQuery}
                    selectedPerformance={selectedPerformance}
                    onSelectPerformance={setSelectedPerformance}
                  />
                </div>
              )}

              <div className={styles.formRow}>
                <label>제목 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="예: 차은우·김재환, 군복 깜찍 투샷"
                  required
                />
              </div>

              <div className={styles.formRow}>
                <label>내용 *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="예: 차은우와 김재환이 군복을 입고 찍은 깜찍한 투샷이 공개되었습니다."
                  rows="3"
                  required
                />
              </div>

              <div className={styles.formRow}>
                <label>링크 URL (선택)</label>
                <input
                  type="text"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="예: https://news.site/article/123"
                />
                <small style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                  링크 URL과 공연 ID 중 하나는 반드시 입력해야 합니다.
                </small>
              </div>

              {editingBanner && (
                <div className={styles.formRow}>
                  <label>노출 순서 *</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                  />
                  <small style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                    순서는 드래그 앤 드롭으로도 변경할 수 있습니다.
                  </small>
                </div>
              )}

              <div className={styles.formRow}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  활성화
                </label>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={resetForm} className={styles.cancelButton}>
                  취소
                </button>
                <button type="submit" className={styles.submitButton}>
                  {editingBanner ? "수정" : "등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 배너 목록 */}
      <div className={styles.bannerList}>
        {loading && <div className={styles.loading}>로딩 중...</div>}
        {!loading && banners.length === 0 && (
          <div className={styles.emptyMessage}>등록된 컨텐츠 배너가 없습니다.</div>
        )}
        {!loading && banners.map((banner, index) => (
          <div 
            key={banner.contentBannerId} 
            className={`${styles.bannerItem} ${draggedIndex === index ? styles.dragging : ''} ${dragOverIndex === index ? styles.dragOver : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className={styles.dragHandle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="5" r="1"></circle>
                <circle cx="9" cy="12" r="1"></circle>
                <circle cx="9" cy="19" r="1"></circle>
                <circle cx="15" cy="5" r="1"></circle>
                <circle cx="15" cy="12" r="1"></circle>
                <circle cx="15" cy="19" r="1"></circle>
              </svg>
            </div>
            <div className={styles.bannerImage}>
              {banner.imageUrl ? (
                <img src={banner.imageUrl} alt={banner.title} />
              ) : (
                <div className={styles.noImage}>이미지 없음</div>
              )}
            </div>
            <div className={styles.bannerInfo}>
              <div className={styles.bannerHeader}>
                <h3>{banner.title || "제목 없음"}</h3>
                <div className={styles.bannerBadges}>
                  {banner.isActive && <span className={styles.activeBadge}>활성</span>}
                  <span className={styles.orderBadge}>순서: {banner.displayOrder}</span>
                </div>
              </div>
              <div className={styles.bannerDetails}>
                <p><strong>내용:</strong> {banner.content || "-"}</p>
                {banner.linkUrl && <p className={styles.linkText}><strong>링크:</strong> {banner.linkUrl}</p>}
                {banner.performanceId && <p><strong>공연 ID:</strong> {banner.performanceId}</p>}
              </div>
              <div className={styles.bannerActions}>
                <button
                  className={styles.editButton}
                  onClick={() => handleEdit(banner)}
                >
                  수정
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(banner.contentBannerId)}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentBannerAdminPage;
