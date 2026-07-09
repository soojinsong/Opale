import React, { useState } from "react";
import { submitPerformanceTip } from "../../api/performanceTipApi";
import styles from "./PerformanceTipModal.module.css";

const IMAGE_TYPE_OPTIONS = [
  { value: "DISCOUNT", label: "할인 정보" },
  { value: "SEAT", label: "좌석 배치도" },
  { value: "CASTING", label: "캐스팅 정보" },
  { value: "NOTICE", label: "공지/안내" },
  { value: "기타", label: "기타" },
];

const PerformanceTipModal = ({ performanceId, onClose, onSubmitted }) => {
  const [imageType, setImageType] = useState(IMAGE_TYPE_OPTIONS[0].value);
  const [file, setFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("제보할 이미지를 첨부해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await submitPerformanceTip({ performanceId, file, imageType, sourceUrl, description });
      alert("제보가 접수되었습니다. 관리자 검토 후 반영됩니다.");
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      const message = err?.response?.data?.message || "제보 접수에 실패했습니다.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>공연 정보 제보하기</h3>
          <button type="button" className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <label htmlFor="tip-type">제보 유형 *</label>
            <select
              id="tip-type"
              value={imageType}
              onChange={(e) => setImageType(e.target.value)}
            >
              {IMAGE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label htmlFor="tip-file">이미지 첨부 *</label>
            <input
              id="tip-file"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className={styles.formRow}>
            <label htmlFor="tip-source">출처 URL (선택)</label>
            <input
              id="tip-source"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="정보를 가져온 예매처 링크 등"
            />
          </div>

          <div className={styles.formRow}>
            <label htmlFor="tip-description">설명 (선택)</label>
            <textarea
              id="tip-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="어떤 정보인지 간단히 설명해주세요."
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={submitting}>
              취소
            </button>
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? "제출 중..." : "제보하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PerformanceTipModal;
