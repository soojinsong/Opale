import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  fetchAllMainPerformanceBanners, 
  createMainPerformanceBanner, 
  updateMainPerformanceBanner, 
  deleteMainPerformanceBanner 
} from "../../api/bannerApi";
import { normalizeAdminMainPerformanceBannerList } from "../../services/normalizeBanner";
import PerformanceSelector from "../../components/admin/PerformanceSelector";
import styles from "./PerformanceBannerAdminPage.module.css";
import useBannerAdmin from "../../hooks/useBannerAdmin";

const PerformanceBannerAdminPage = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    searchQuery, setSearchQuery,
    debouncedSearchQuery,
    selectedPerformance, setSelectedPerformance,
    draggedIndex, dragOverIndex,
    handleDragStart, handleDragOver, handleDragLeave, handleDragEnd,
    clearDragState, reorderItems, resetSearchState,
  } = useBannerAdmin();
  
  const [formData, setFormData] = useState({
    performanceId: "",
    displayOrder: 0,
    isActive: true,
  });

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await fetchAllMainPerformanceBanners();
      const normalized = normalizeAdminMainPerformanceBannerList(data);
      normalized.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setBanners(normalized);
    } catch (err) {
      console.error("공연 배너 목록 조회 실패:", err);
      alert("공연 배너 목록을 불러오는데 실패했습니다.");
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
      performanceId: "",
      displayOrder: newDisplayOrder,
      isActive: true,
    });
    setEditingBanner(null);
    setIsFormOpen(false);
    resetSearchState();
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      performanceId: banner.performanceId || "",
      displayOrder: banner.displayOrder || 0,
      isActive: banner.isActive ?? true,
    });
    resetSearchState();
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.performanceId.trim()) {
      alert("공연 ID를 입력해주세요.");
      return;
    }

    try {
      if (editingBanner) {
        await updateMainPerformanceBanner(editingBanner.bannerId, formData);
        alert("공연 배너가 수정되었습니다.");
      } else {
        await createMainPerformanceBanner(formData);
        alert("공연 배너가 등록되었습니다.");
      }
      resetForm();
      loadBanners();
    } catch (err) {
      console.error("공연 배너 저장 실패:", err);
      alert("공연 배너 저장에 실패했습니다.");
    }
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm("정말 이 공연 배너를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteMainPerformanceBanner(bannerId);
      alert("공연 배너가 삭제되었습니다.");
      loadBanners();
    } catch (err) {
      console.error("공연 배너 삭제 실패:", err);
      alert("공연 배너 삭제에 실패했습니다.");
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
          performanceId: banner.performanceId || "",
          displayOrder: banner.displayOrder,
          isActive: banner.isActive ?? true,
        };
        return updateMainPerformanceBanner(banner.bannerId, updateData);
      });
      await Promise.all(updatePromises);
      alert("공연 배너 순서가 변경되었습니다.");
    } catch (err) {
      console.error("공연 배너 순서 변경 실패:", err);
      alert("공연 배너 순서 변경에 실패했습니다. 페이지를 새로고침합니다.");
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
        <span className={styles.breadcrumbCurrent}>홈 공연 배너 관리</span>
      </div>
      <div className={styles.header}>
        <h1 className={styles.title}>홈 공연 배너 관리</h1>
        <p className={styles.subtitle}>메인 페이지의 추천 공연 배너를 관리할 수 있습니다.</p>
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
              <h2>{editingBanner ? "공연 배너 수정" : "공연 배너 등록"}</h2>
              <button className={styles.closeButton} onClick={resetForm}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* 공연 검색 섹션 */}
              <div className={styles.performanceSelectorWrapper}>
                <PerformanceSelector
                  searchQuery={searchQuery}
                  debouncedSearchQuery={debouncedSearchQuery}
                  onSearchChange={setSearchQuery}
                  selectedPerformance={selectedPerformance}
                  onSelectPerformance={setSelectedPerformance}
                />
              </div>

              <div className={styles.formRow}>
                <label>공연 ID *</label>
                <input
                  type="text"
                  value={formData.performanceId}
                  onChange={(e) => setFormData({ ...formData, performanceId: e.target.value })}
                  placeholder="예: PF264321"
                  required
                />
                <small style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                  위에서 공연을 검색하여 선택하거나, 직접 공연 ID를 입력하세요.
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
          <div className={styles.emptyMessage}>등록된 공연 배너가 없습니다.</div>
        )}
        {!loading && banners.map((banner, index) => (
          <div 
            key={banner.bannerId} 
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
            <div className={styles.bannerInfo}>
              <div className={styles.bannerHeader}>
                <h3>{banner.performanceTitle || banner.performanceId || "제목 없음"}</h3>
                <div className={styles.bannerBadges}>
                  {banner.isActive && <span className={styles.activeBadge}>활성</span>}
                  <span className={styles.orderBadge}>순서: {banner.displayOrder}</span>
                </div>
              </div>
              <div className={styles.bannerDetails}>
                <p><strong>공연 ID:</strong> {banner.performanceId || "-"}</p>
                {banner.performanceTitle && <p><strong>공연명:</strong> {banner.performanceTitle}</p>}
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
                  onClick={() => handleDelete(banner.bannerId)}
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

export default PerformanceBannerAdminPage;
