import React from 'react';

const ReviewEditModal = ({ show, editingReview, editForm, onFormChange, onSubmit, onClose, styles }) => {
  if (!show || !editingReview) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>리뷰 수정</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSubmit} className={styles.editForm || styles.writeForm}>
          <div className={styles.formGroup}>
            <label>제목</label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => onFormChange({ ...editForm, title: e.target.value })}
              placeholder="제목을 입력하세요"
              required
              className={styles.input}
            />
          </div>

          {editingReview.reviewType !== 'EXPECTATION' && (
            <div className={styles.formGroup}>
              <label>평점</label>
              <div className={styles.ratingInput}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    className={`${styles.ratingStar} ${star <= editForm.rating ? styles.filled : ''}`}
                    onClick={() => onFormChange({ ...editForm, rating: star })}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>내용</label>
            <textarea
              value={editForm.content}
              onChange={(e) => onFormChange({ ...editForm, content: e.target.value })}
              placeholder="내용을 입력하세요"
              required
              rows={6}
              className={styles.textarea}
            />
          </div>

          <div className={styles.modalActions || styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              취소
            </button>
            <button type="submit" className={styles.submitButton}>
              수정하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewEditModal;
