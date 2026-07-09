import React, { useState } from "react";
import { createReport } from "../../api/reportApi";
import styles from "./ReportModal.module.css";

const REASON_OPTIONS = [
  "욕설 및 비방",
  "스팸 및 광고",
  "음란물 및 불건전한 내용",
  "기타",
];

const ReportModal = ({ targetType, targetId, targetUserId, onClose, onSubmitted }) => {
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReport({ targetType, targetId, targetUserId, reason, detail });
      alert("신고가 접수되었습니다.");
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      const message = err?.response?.data?.message || "신고 접수에 실패했습니다.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>신고하기</h3>
          <button type="button" className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <label htmlFor="report-reason">신고 사유 *</label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASON_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label htmlFor="report-detail">상세 설명 (선택)</label>
            <textarea
              id="report-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="신고 내용을 구체적으로 작성해주세요."
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={submitting}>
              취소
            </button>
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? "제출 중..." : "신고하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
