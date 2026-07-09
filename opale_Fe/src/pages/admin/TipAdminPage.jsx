import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPerformanceTips, updatePerformanceTipStatus } from "../../api/performanceTipApi";
import styles from "./TipAdminPage.module.css";

const IMAGE_TYPE_LABELS = {
  DISCOUNT: "할인 정보",
  SEAT: "좌석 배치도",
  CASTING: "캐스팅 정보",
  NOTICE: "공지/안내",
  기타: "기타",
};

const STATUS_LABELS = {
  PENDING: "처리 대기",
  APPROVED: "제보 승인",
  REJECTED: "제보 반려",
};

const STATUS_BADGE_CLASS = {
  PENDING: "statusPending",
  APPROVED: "statusApproved",
  REJECTED: "statusRejected",
};

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "PENDING", label: "처리 대기" },
  { value: "APPROVED", label: "제보 승인" },
  { value: "REJECTED", label: "제보 반려" },
];

const PAGE_SIZE = 10;

const TipAdminPage = () => {
  const [tips, setTips] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(true);
  const [error, setError] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [adminMemo, setAdminMemo] = useState("");
  const [processing, setProcessing] = useState(false);

  const pageRef = useRef(1);
  const hasNextRef = useRef(true);
  const loadingRef = useRef(false);
  const activeRequestId = useRef(0);
  const observerRef = useRef(null);

  /** 무한스크롤: isReset이면 목록을 새로 갈아끼우고, 아니면 뒤에 이어 붙인다 */
  const loadPage = useCallback(async (targetPage, statusValue, isReset) => {
    if (loadingRef.current) return;
    if (!isReset && !hasNextRef.current) return;

    const reqId = ++activeRequestId.current;
    loadingRef.current = true;
    if (isReset) setInitialLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const data = await fetchPerformanceTips({
        page: targetPage,
        size: PAGE_SIZE,
        status: statusValue || undefined,
      });

      if (reqId !== activeRequestId.current) return;

      setTips((prev) => (isReset ? data.tips : [...prev, ...data.tips]));
      setTotalCount(data.totalCount);
      hasNextRef.current = data.hasNext;
      setHasNext(data.hasNext);
      pageRef.current = targetPage;
    } catch (err) {
      setError("제보 목록을 불러오지 못했습니다.");
    } finally {
      loadingRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    pageRef.current = 1;
    hasNextRef.current = true;
    setHasNext(true);
    setExpandedId(null);
    loadPage(1, statusFilter, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const sentinelRef = useCallback(
    (node) => {
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextRef.current && !loadingRef.current) {
          loadPage(pageRef.current + 1, statusFilter, false);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loadPage, statusFilter]
  );

  const handleFilterChange = (value) => {
    setStatusFilter(value);
  };

  const handleToggleDetail = (tip) => {
    if (expandedId === tip.performanceTipId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(tip.performanceTipId);
    setAdminMemo(tip.adminMemo || "");
  };

  const handleDecide = async (tip, status) => {
    const label = status === "APPROVED" ? "승인" : "반려";
    const confirmMessage =
      status === "APPROVED"
        ? "이 제보를 승인 처리하시겠습니까? 승인 시 실제 공연 정보에 바로 반영됩니다."
        : "이 제보를 반려 처리하시겠습니까?";
    if (!window.confirm(confirmMessage)) return;

    setProcessing(true);
    try {
      await updatePerformanceTipStatus(tip.performanceTipId, status, adminMemo);
      alert(`제보를 ${label} 처리했습니다.`);
      setExpandedId(null);
      loadPage(1, statusFilter, true);
    } catch (err) {
      alert("제보 처리에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <Link to="/admin" className={styles.breadcrumbLink}>운영자 관리 홈</Link>
        <span className={styles.breadcrumbSeparator}> / </span>
        <span className={styles.breadcrumbCurrent}>제보 관리</span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>제보 관리</h1>
        <p className={styles.subtitle}>회원이 제보한 공연 할인/좌석 정보를 확인하고 승인/반려할 수 있습니다.</p>
      </div>

      <div className={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value || "ALL"}
            className={`${styles.filterButton} ${statusFilter === filter.value ? styles.filterButtonActive : ""}`}
            onClick={() => handleFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <div className={styles.noticeBanner}>{error}</div>}
      {initialLoading && !error && <div className={styles.noticeBanner}>제보 목록을 불러오는 중입니다...</div>}
      {!initialLoading && !error && tips.length === 0 && (
        <p className={styles.emptyText}>해당 조건의 제보가 없습니다.</p>
      )}
      {!initialLoading && !error && tips.length > 0 && (
        <p className={styles.emptyText}>총 {totalCount}건의 제보</p>
      )}

      <div className={styles.tipList}>
        {tips.map((tip) => (
          <div key={tip.performanceTipId} className={styles.tipItem}>
            <div className={styles.tipRow} onClick={() => handleToggleDetail(tip)}>
              <img src={tip.imageUrl} alt="제보 썸네일" className={styles.thumbnail} />
              <span className={`${styles.statusBadge} ${styles[STATUS_BADGE_CLASS[tip.status]]}`}>
                {STATUS_LABELS[tip.status] || tip.status}
              </span>
              <span className={styles.tipTarget}>
                {tip.performanceTitle} · {IMAGE_TYPE_LABELS[tip.imageType] || tip.imageType}
              </span>
              <span className={styles.tipSubmitter}>{tip.submitterNickname}</span>
              <span className={styles.tipDate}>{new Date(tip.createdAt).toLocaleString()}</span>
            </div>

            {expandedId === tip.performanceTipId && (
              <div className={styles.tipDetail}>
                <img src={tip.imageUrl} alt="제보 원본 이미지" className={styles.previewImage} />
                {tip.sourceUrl && (
                  <a
                    href={tip.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                  >
                    출처 보기 →
                  </a>
                )}
                {tip.description && (
                  <p className={styles.detailText}><strong>설명:</strong> {tip.description}</p>
                )}

                {tip.status === "PENDING" ? (
                  <>
                    <div className={styles.memoRow}>
                      <label htmlFor={`memo-${tip.performanceTipId}`}>관리자 메모</label>
                      <textarea
                        id={`memo-${tip.performanceTipId}`}
                        className={styles.memoInput}
                        value={adminMemo}
                        onChange={(e) => setAdminMemo(e.target.value)}
                        placeholder="처리 사유를 남겨주세요."
                      />
                    </div>
                    <div className={styles.decisionActions}>
                      <button
                        className={styles.approveButton}
                        disabled={processing}
                        onClick={() => handleDecide(tip, "APPROVED")}
                      >
                        승인
                      </button>
                      <button
                        className={styles.rejectButton}
                        disabled={processing}
                        onClick={() => handleDecide(tip, "REJECTED")}
                      >
                        반려
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className={styles.emptyText}>
                      {STATUS_LABELS[tip.status]} 처리됨{tip.adminMemo ? ` — ${tip.adminMemo}` : ""}
                    </p>
                    {tip.status === "APPROVED" && (
                      <Link
                        to={`/culture/${tip.performanceId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.sourceLink}
                      >
                        공연 상세 페이지로 이동 →
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!initialLoading && hasNext && <div ref={sentinelRef} style={{ height: 1 }} />}
      {loadingMore && <p className={styles.emptyText}>더 불러오는 중입니다...</p>}
      {!initialLoading && !hasNext && tips.length > 0 && (
        <p className={styles.emptyText}>모든 제보를 불러왔습니다.</p>
      )}
    </div>
  );
};

export default TipAdminPage;
