import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchAllBanners, createBannerWithoutFile, createBannerWithFile, updateBanner, deleteBanner } from "../../api/bannerApi";
import { normalizeAdminBannerList } from "../../services/normalizeBanner";
import PerformanceSelector from "../../components/admin/PerformanceSelector";
import styles from "./HomeBannerAdminPage.module.css";
import useBannerAdmin from "../../hooks/useBannerAdmin";

const HomeBannerAdminPage = () => {
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
    titleText: "",
    subtitleText: "",
    descriptionText: "",
    dateText: "",
    placeText: "",
    displayOrder: 0,
    isActive: true,
    linkUrl: "",
  });
  const [registrationMode, setRegistrationMode] = useState("image"); // "image" or "performance"
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await fetchAllBanners();
      const normalized = normalizeAdminBannerList(data);
      normalized.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setBanners(normalized);
    } catch (err) {
      console.error("배너 목록 조회 실패:", err);
      alert("배너 목록을 불러오는데 실패했습니다.");
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

      if (selectedPerformance.image) {
        setImagePreview(selectedPerformance.image);
      }
    }
  }, [selectedPerformance]);

  const resetForm = () => {
    const newDisplayOrder = banners.length + 1;
    setFormData({
      performanceId: "",
      titleText: "",
      subtitleText: "",
      descriptionText: "",
      dateText: "",
      placeText: "",
      displayOrder: newDisplayOrder,
      isActive: true,
      linkUrl: "",
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
      performanceId: banner.performanceId || "",
      titleText: banner.titleText || "",
      subtitleText: banner.subtitleText || "",
      descriptionText: banner.descriptionText || "",
      dateText: banner.dateText || "",
      placeText: banner.placeText || "",
      displayOrder: banner.displayOrder || 0,
      isActive: banner.isActive ?? true,
      linkUrl: banner.linkUrl || "",
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
      setSelectedPerformance(null);
      setFormData(prev => ({ ...prev, performanceId: "" }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subtitleText.trim()) {
      alert("메인 문구를 입력해주세요.");
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
        await updateBanner(editingBanner.bannerId, formData, imageFile);
        alert("배너가 수정되었습니다.");
      } else {
        if (registrationMode === "image") {
          await createBannerWithFile(formData, imageFile);
        } else {
          await createBannerWithoutFile(formData);
        }
        alert("배너가 등록되었습니다.");
      }
      resetForm();
      loadBanners();
    } catch (err) {
      console.error("배너 저장 실패:", err);
      alert("배너 저장에 실패했습니다.");
    }
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm("정말 이 배너를 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteBanner(bannerId);
      alert("배너가 삭제되었습니다.");
      loadBanners();
    } catch (err) {
      console.error("배너 삭제 실패:", err);
      alert("배너 삭제에 실패했습니다.");
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
          titleText: banner.titleText || "",
          subtitleText: banner.subtitleText || "",
          descriptionText: banner.descriptionText || "",
          dateText: banner.dateText || "",
          placeText: banner.placeText || "",
          displayOrder: banner.displayOrder,
          isActive: banner.isActive ?? true,
          linkUrl: banner.linkUrl || "",
        };
        return updateBanner(banner.bannerId, updateData, null);
      });
      await Promise.all(updatePromises);
      alert("배너 순서가 변경되었습니다.");
    } catch (err) {
      console.error("배너 순서 변경 실패:", err);
      alert("배너 순서 변경에 실패했습니다. 페이지를 새로고침합니다.");
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
        <span className={styles.breadcrumbCurrent}>홈 배너 관리</span>
      </div>
      <div className={styles.header}>
        <h1 className={styles.title}>홈 배너 관리</h1>
        <p className={styles.subtitle}>홈페이지 배너를 관리할 수 있습니다.</p>
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
              <h2>{editingBanner ? "배너 수정" : "배너 등록"}</h2>
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
                <label>부제</label>
                <input
                  type="text"
                  value={formData.titleText}
                  onChange={(e) => setFormData({ ...formData, titleText: e.target.value })}
                  placeholder="예: 12년을 기다린 오리지널 내한공연"
                  
                />
              </div>

              <div className={styles.formRow}>
                <label>메인 문구 *</label>
                <input
                  type="text"
                  value={formData.subtitleText}
                  onChange={(e) => setFormData({ ...formData, subtitleText: e.target.value })}
                  placeholder="예: 뮤지컬 위키드"
                  required
                />
              </div>

              <div className={styles.formRow}>
                <label>설명 문구</label>
                <input
                  type="text"
                  value={formData.descriptionText}
                  onChange={(e) => setFormData({ ...formData, descriptionText: e.target.value })}
                  placeholder="예: The untold true story of the Witches of Oz"
                />
              </div>

              <div className={styles.formRow}>
                <label>날짜 텍스트</label>
                <input
                  type="text"
                  value={formData.dateText}
                  onChange={(e) => setFormData({ ...formData, dateText: e.target.value })}
                  placeholder="예: 2025.7.12 Flying Soon"
                />
              </div>

              <div className={styles.formRow}>
                <label>장소 텍스트</label>
                <input
                  type="text"
                  value={formData.placeText}
                  onChange={(e) => setFormData({ ...formData, placeText: e.target.value })}
                  placeholder="예: BLUESQUARE 신한카드홀"
                />
              </div>

              <div className={styles.formRow}>
                <label>공연 ID (선택)</label>
                <input
                  type="text"
                  value={formData.performanceId}
                  onChange={(e) => setFormData({ ...formData, performanceId: e.target.value })}
                  placeholder="예: PF271999"
                />
                <small style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                  위에서 공연을 선택하면 자동으로 입력됩니다. 또는 직접 입력할 수 있습니다.
                </small>
              </div>

              <div className={styles.formRow}>
                <label>링크 URL (선택)</label>
                <input
                  type="text"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="예: https://youtube.com/..."
                />
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
                  <small style={{ color: '#999', fontSize: '12px' }}>
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
          <div className={styles.emptyMessage}>등록된 배너가 없습니다.</div>
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
            <div className={styles.bannerImage}>
              {banner.imageUrl ? (
                <img src={banner.imageUrl} alt={banner.titleText} />
              ) : (
                <div className={styles.noImage}>이미지 없음</div>
              )}
            </div>
            <div className={styles.bannerInfo}>
              <div className={styles.bannerHeader}>
                <h3>{banner.titleText || "제목 없음"}</h3>
                <div className={styles.bannerBadges}>
                  {banner.isActive && <span className={styles.activeBadge}>활성</span>}
                  <span className={styles.orderBadge}>순서: {banner.displayOrder}</span>
                </div>
              </div>
              <div className={styles.bannerDetails}>
                <p><strong>부제:</strong> {banner.subtitleText || "-"}</p>
                <p><strong>설명:</strong> {banner.descriptionText || "-"}</p>
                <p><strong>날짜:</strong> {banner.dateText || "-"}</p>
                <p><strong>장소:</strong> {banner.placeText || "-"}</p>
                {banner.performanceId && <p><strong>공연 ID:</strong> {banner.performanceId}</p>}
                {banner.linkUrl && <p><strong>링크:</strong> {banner.linkUrl}</p>}
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

export default HomeBannerAdminPage;
