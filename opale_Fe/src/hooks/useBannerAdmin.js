import { useState, useRef, useEffect } from 'react';

const useBannerAdmin = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedPerformance, setSelectedPerformance] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
    e.target.style.opacity = '0.5';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => setDragOverIndex(null);

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const clearDragState = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const reorderItems = (items, fromIndex, toIndex) => {
    const result = [...items];
    const [moved] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, moved);
    return result.map((item, i) => ({ ...item, displayOrder: i + 1 }));
  };

  const resetSearchState = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedPerformance(null);
  };

  return {
    searchQuery, setSearchQuery,
    debouncedSearchQuery,
    selectedPerformance, setSelectedPerformance,
    draggedIndex, dragOverIndex,
    handleDragStart, handleDragOver, handleDragLeave, handleDragEnd,
    clearDragState, reorderItems, resetSearchState,
  };
};

export default useBannerAdmin;
