import { useState, useRef, useCallback, useEffect } from 'react';

const MIN_SHEET_HEIGHT = 150;
const HEADER_HEIGHT = 61;

const useBottomSheet = () => {
  const [sheetHeight, setSheetHeight] = useState(180);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const dragStateRef = useRef({ startY: 0, startHeight: 0 });
  const sheetRef = useRef(null);
  const sheetContentRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scrollStateRef = useRef({
    startY: 0,
    isDraggingSheet: false,
    wasDraggingDown: false,
    initialScrollTop: 0,
    isContentScrolling: false
  });
  const globalTouchHandlersRef = useRef({ move: null, end: null });

  const getMaxSheetHeight = useCallback(() => {
    return window.innerHeight - HEADER_HEIGHT;
  }, []);

  const getSnapHeight = useCallback((currentHeight, wasDraggingDown = false) => {
    const maxHeight = getMaxSheetHeight();
    const midHeight = (MIN_SHEET_HEIGHT + maxHeight) / 2;

    if (wasDraggingDown && currentHeight < maxHeight - 10) {
      const snapPoints = [MIN_SHEET_HEIGHT, midHeight];
      return snapPoints.reduce((prev, curr) =>
        Math.abs(curr - currentHeight) < Math.abs(prev - currentHeight) ? curr : prev
      );
    }

    const snapPoints = [MIN_SHEET_HEIGHT, midHeight, maxHeight];
    const closest = snapPoints.reduce((prev, curr) =>
      Math.abs(curr - currentHeight) < Math.abs(prev - currentHeight) ? curr : prev
    );

    if (wasDraggingDown && closest === maxHeight && currentHeight < maxHeight - 10) {
      return midHeight;
    }

    return closest;
  }, [getMaxSheetHeight]);

  const isAtTopAndMaxHeight = useCallback(() => {
    const maxHeight = getMaxSheetHeight();
    const isMaxHeight = Math.abs(sheetHeight - maxHeight) < 5;
    if (!isMaxHeight) return false;
    const contentEl = sheetContentRef.current;
    if (!contentEl) return false;
    return contentEl.scrollTop <= 5;
  }, [sheetHeight, getMaxSheetHeight]);

  const isScrollAtTop = useCallback(() => {
    const contentEl = sheetContentRef.current;
    if (!contentEl) return false;
    return contentEl.scrollTop <= 5;
  }, []);

  const handleSheetMouseDown = useCallback((e) => {
    setIsDragging(true);
    setIsTransitioning(false);
    dragStateRef.current.startY = e.clientY;
    dragStateRef.current.startHeight = sheetHeight;
    scrollStateRef.current.wasDraggingDown = false;
    e.preventDefault();
  }, [sheetHeight]);

  const handleSheetMouseMove = useCallback((e) => {
    if (!isDragging) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      const currentY = e.clientY;
      const startY = dragStateRef.current.startY;
      const deltaY = startY - currentY;
      let newHeight = dragStateRef.current.startHeight + deltaY;
      const maxHeight = getMaxSheetHeight();
      newHeight = Math.max(MIN_SHEET_HEIGHT, Math.min(maxHeight, newHeight));
      if (currentY > startY) scrollStateRef.current.wasDraggingDown = true;
      setSheetHeight(newHeight);
    });
  }, [isDragging, getMaxSheetHeight]);

  const handleSheetMouseUp = useCallback(() => {
    setIsDragging(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    const wasDraggingDown = scrollStateRef.current.wasDraggingDown;
    const finalHeight = sheetHeight;
    const startHeight = dragStateRef.current.startHeight;
    const actuallyDraggedDown = wasDraggingDown || (finalHeight < startHeight - 5);
    if (actuallyDraggedDown && finalHeight < getMaxSheetHeight() - 10) {
      const targetHeight = Math.max(finalHeight, MIN_SHEET_HEIGHT);
      setIsTransitioning(true);
      setSheetHeight(targetHeight);
    } else {
      setIsTransitioning(true);
      const snapHeight = getSnapHeight(finalHeight, actuallyDraggedDown);
      setSheetHeight(snapHeight);
    }
    setTimeout(() => setIsTransitioning(false), 200);
  }, [sheetHeight, getSnapHeight, getMaxSheetHeight]);

  const handleSheetTouchStart = useCallback((e) => {
    setIsDragging(true);
    setIsTransitioning(false);
    dragStateRef.current.startY = e.touches[0].clientY;
    dragStateRef.current.startHeight = sheetHeight;
    scrollStateRef.current.wasDraggingDown = false;
  }, [sheetHeight]);

  const handleSheetTouchMove = useCallback((e) => {
    if (!isDragging) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      const currentY = e.touches[0].clientY;
      const startY = dragStateRef.current.startY;
      const deltaY = startY - currentY;
      let newHeight = dragStateRef.current.startHeight + deltaY;
      const maxHeight = getMaxSheetHeight();
      newHeight = Math.max(MIN_SHEET_HEIGHT, Math.min(maxHeight, newHeight));
      if (currentY > startY) scrollStateRef.current.wasDraggingDown = true;
      setSheetHeight(newHeight);
    });
  }, [isDragging, getMaxSheetHeight]);

  const handleSheetTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    const wasDraggingDown = scrollStateRef.current.wasDraggingDown;
    const finalHeight = sheetHeight;
    const startHeight = dragStateRef.current.startHeight;
    const actuallyDraggedDown = wasDraggingDown || (finalHeight < startHeight - 5);
    if (actuallyDraggedDown && finalHeight < getMaxSheetHeight() - 10) {
      const targetHeight = Math.max(finalHeight, MIN_SHEET_HEIGHT);
      setIsTransitioning(true);
      setSheetHeight(targetHeight);
    } else {
      setIsTransitioning(true);
      const snapHeight = getSnapHeight(finalHeight, actuallyDraggedDown);
      setSheetHeight(snapHeight);
    }
    setTimeout(() => setIsTransitioning(false), 200);
  }, [sheetHeight, getSnapHeight, getMaxSheetHeight]);

  const handleMaxHeightDragDown = useCallback((e) => {
    const maxHeight = getMaxSheetHeight();
    const isMaxHeight = Math.abs(sheetHeight - maxHeight) < 5;
    if (!isMaxHeight) return;
    const deltaY = e.touches[0].clientY - dragStateRef.current.startY;
    if (deltaY > 3) {
      e.preventDefault();
      e.stopPropagation();
      if (scrollStateRef.current.isDraggingSheet) return;
      scrollStateRef.current.isDraggingSheet = true;
      scrollStateRef.current.wasDraggingDown = true;
      setIsDragging(true);
      setIsTransitioning(false);
      dragStateRef.current.startY = e.touches[0].clientY;
      dragStateRef.current.startHeight = sheetHeight;

      if (globalTouchHandlersRef.current.move) {
        document.removeEventListener('touchmove', globalTouchHandlersRef.current.move);
      }
      if (globalTouchHandlersRef.current.end) {
        document.removeEventListener('touchend', globalTouchHandlersRef.current.end);
      }

      const handleGlobalTouchMove = (globalE) => {
        if (!scrollStateRef.current.isDraggingSheet) return;
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(() => {
          const currentY = globalE.touches[0].clientY;
          const startY = dragStateRef.current.startY;
          const globalDeltaY = startY - currentY;
          let newHeight = dragStateRef.current.startHeight + globalDeltaY;
          const maxHeight = getMaxSheetHeight();
          newHeight = Math.max(MIN_SHEET_HEIGHT, Math.min(maxHeight, newHeight));
          if (currentY > startY) scrollStateRef.current.wasDraggingDown = true;
          setSheetHeight(newHeight);
        });
        globalE.preventDefault();
      };

      const handleGlobalTouchEnd = () => {
        const wasDraggingDown = scrollStateRef.current.wasDraggingDown;
        const finalHeight = sheetHeight;
        const startHeight = dragStateRef.current.startHeight;
        const actuallyDraggedDown = wasDraggingDown || (finalHeight < startHeight - 5);
        scrollStateRef.current.isDraggingSheet = false;
        scrollStateRef.current.wasDraggingDown = false;
        setIsDragging(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (actuallyDraggedDown && finalHeight < getMaxSheetHeight() - 10) {
          const targetHeight = Math.max(finalHeight, MIN_SHEET_HEIGHT);
          setIsTransitioning(true);
          setSheetHeight(targetHeight);
        } else {
          setIsTransitioning(true);
          const snapHeight = getSnapHeight(finalHeight, actuallyDraggedDown);
          setSheetHeight(snapHeight);
        }
        setTimeout(() => {
          setIsTransitioning(false);
          document.removeEventListener('touchmove', handleGlobalTouchMove);
          document.removeEventListener('touchend', handleGlobalTouchEnd);
          globalTouchHandlersRef.current.move = null;
          globalTouchHandlersRef.current.end = null;
        }, 300);
      };

      globalTouchHandlersRef.current.move = handleGlobalTouchMove;
      globalTouchHandlersRef.current.end = handleGlobalTouchEnd;
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }
  }, [sheetHeight, getMaxSheetHeight, getSnapHeight]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleSheetMouseMove);
      document.addEventListener('mouseup', handleSheetMouseUp);
      document.addEventListener('touchmove', handleSheetTouchMove, { passive: false });
      document.addEventListener('touchend', handleSheetTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleSheetMouseMove);
        document.removeEventListener('mouseup', handleSheetMouseUp);
        document.removeEventListener('touchmove', handleSheetTouchMove);
        document.removeEventListener('touchend', handleSheetTouchEnd);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }
  }, [isDragging, handleSheetMouseMove, handleSheetMouseUp, handleSheetTouchMove, handleSheetTouchEnd]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return {
    sheetHeight, setSheetHeight,
    isDragging, setIsDragging,
    isTransitioning, setIsTransitioning,
    sheetRef, sheetContentRef,
    dragStateRef, scrollStateRef, animationFrameRef, globalTouchHandlersRef,
    MIN_SHEET_HEIGHT,
    getMaxSheetHeight, getSnapHeight, isAtTopAndMaxHeight, isScrollAtTop,
    handleSheetMouseDown, handleSheetTouchStart, handleSheetTouchMove,
    handleSheetTouchEnd, handleMaxHeightDragDown,
  };
};

export default useBottomSheet;
