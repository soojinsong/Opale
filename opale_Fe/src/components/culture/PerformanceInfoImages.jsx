import React from 'react';
import styles from './PerformanceInfoImages.module.css';

const PerformanceInfoImages = ({ images, loading }) => {
  if (!loading && (!images || images.length === 0)) {
    return null;
  }

  return (
    <div className={styles.productionImagesSection}>
      {/* <h3 className={styles.contentTitle}>공연 소개</h3> */}
      <div className={styles.productionImagesContainer}>
        {loading ? (
          <div className={styles.imagePlaceholder}>
            <p className={styles.placeholderText}>이미지를 불러오는 중...</p>
          </div>
        ) : (
          images.map((image, index) => (
            <img
              key={index}
              src={image.imageUrl}
              alt={`공연 소개 이미지 ${image.orderIndex}`}
              className={styles.productionImage}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default PerformanceInfoImages;
