import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../../../store/userSlice';
import { submitOnboarding } from '../../../api/userApi';
import styles from './OnboardingPage.module.css';

const GENRES = [
  { id: '뮤지컬', label: '뮤지컬', emoji: '🎭' },
  { id: '연극', label: '연극', emoji: '🎪' },
  { id: '대중음악', label: '대중음악', emoji: '🎵' },
  { id: '서양음악(클래식)', label: '서양음악\n(클래식)', emoji: '🎻' },
  { id: '한국음악(국악)', label: '한국음악\n(국악)', emoji: '🥁' },
];

const MAX_SELECT = 3;

const OnboardingPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const [selected, setSelected] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.onboardingCompleted === true) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const toggleGenre = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, id];
    });
  };

  const handleSubmit = async (genres) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitOnboarding(genres);
      dispatch(updateUser({ onboardingCompleted: true }));
      navigate('/');
    } catch (err) {
      dispatch(updateUser({ onboardingCompleted: true }));
      navigate('/');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>취향 설정</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>좋아하는 장르를 골라주세요</h2>
          <p className={styles.subtitle}>최대 {MAX_SELECT}개 선택 · 선택한 장르 기반으로 공연을 추천해드려요</p>
        </div>

        <div className={styles.genreGrid}>
          {GENRES.map((genre) => {
            const isSelected = selected.includes(genre.id);
            const isDisabled = !isSelected && selected.length >= MAX_SELECT;
            return (
              <button
                key={genre.id}
                className={`${styles.genreCard} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
                onClick={() => toggleGenre(genre.id)}
                disabled={isDisabled}
              >
                <span className={styles.genreEmoji}>{genre.emoji}</span>
                <span className={styles.genreLabel}>{genre.label}</span>
                {isSelected && <span className={styles.checkmark}>✓</span>}
              </button>
            );
          })}
        </div>

        <p className={styles.selectCount}>
          {selected.length > 0 ? `${selected.length}개 선택됨` : '아직 선택하지 않았어요'}
        </p>

        <div className={styles.buttonGroup}>
          <button
            className={styles.submitButton}
            onClick={() => handleSubmit(selected)}
            disabled={selected.length === 0 || isSubmitting}
          >
            {isSubmitting ? '저장 중...' : '선택 완료'}
          </button>
          <button
            className={styles.skipButton}
            onClick={() => handleSubmit([])}
            disabled={isSubmitting}
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
