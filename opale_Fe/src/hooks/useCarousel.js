import { useState, useRef, useEffect } from 'react';

const useCarousel = (items = []) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (items.length > 0 && !initializedRef.current) {
      setDisplayIndex(items.length * 2);
      initializedRef.current = true;
    }
  }, [items.length]);

  const goToSlide = (index) => {
    if (items.length === 0) return;
    setIsTransitioning(true);

    let targetIndex = index;
    if (index < 0) targetIndex = items.length - 1;
    else if (index >= items.length) targetIndex = 0;

    const direction = index - currentIndex;
    let newDisplayIndex = displayIndex;
    if (direction < 0) newDisplayIndex = displayIndex - 1;
    else if (direction > 0) newDisplayIndex = displayIndex + 1;

    const maxIndex = items.length * 5 - 1;
    if (newDisplayIndex < 0) newDisplayIndex = maxIndex;
    else if (newDisplayIndex > maxIndex) newDisplayIndex = 0;

    setDisplayIndex(newDisplayIndex);
    setCurrentIndex(targetIndex);
  };

  const handleStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches ? e.touches[0].clientX : e.clientX);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
  };

  const handleEnd = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diffX = startX - clientX;
    if (Math.abs(diffX) > 50) {
      goToSlide(diffX > 0 ? currentIndex + 1 : currentIndex - 1);
    }
  };

  const handleTransitionEnd = () => {
    const seriesLength = items.length;
    if (displayIndex < seriesLength) {
      setIsTransitioning(false);
      setDisplayIndex(seriesLength * 2 + currentIndex);
    } else if (displayIndex >= seriesLength * 4) {
      setIsTransitioning(false);
      setDisplayIndex(seriesLength * 2 + currentIndex);
    }
  };

  const infiniteItems = [
    ...items, ...items, ...items, ...items, ...items,
  ];

  return {
    currentIndex, displayIndex, isTransitioning,
    sliderRef, infiniteItems,
    goToSlide, handleStart, handleMove, handleEnd, handleTransitionEnd,
  };
};

export default useCarousel;
