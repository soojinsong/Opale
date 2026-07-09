import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchReports, fetchReportDetail, updateReportStatus } from "../../api/reportApi";
import styles from "./ReportAdminPage.module.css";

const TARGET_TYPE_LABELS = {
  CHAT_MESSAGE: "채팅 메시지",
  PERFORMANCE_REVIEW: "공연 리뷰",
  PLACE_REVIEW: "공연장 리뷰",
  USER: "사용자",
};

const STATUS_LABELS = {
  PENDING: "처리 대기",
  APPROVED: "신고 승인",
  REJECTED: "신고 반려",
  MIXED: "처리 완료",
};

const STATUS_BADGE_CLASS = {
  PENDING: "statusPending",
  APPROVED: "statusApproved",
  REJECTED: "statusRejected",
  MIXED: "statusMixed",
};

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "PENDING", label: "처리 대기" },
  { value: "APPROVED", label: "신고 승인" },
  { value: "REJECTED", label: "신고 반려" },
];

const TARGET_LINK_PREFIX = {
  PERFORMANCE_REVIEW: "/culture/",
  PLACE_REVIEW: "/place/",
  CHAT_MESSAGE: "/chat/",
};

const PAGE_SIZE = 10;

/** 같은 신고 대상(targetType + targetId)끼리 하나의 카드로 묶는다 */
const groupReportsByTarget = (reports) => {
  const map = new Map();

  reports.forEach((report) => {
    const key = `${report.targetType}_${report.targetId}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        targetType: report.targetType,
        targetId: report.targetId,
        reports: [],
      });
    }
    map.get(key).reports.push(report);
  });

  return Array.from(map.values())
    .map((group) => {
      const sortedReports = [...group.reports].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      return {
        ...group,
        reports: sortedReports,
        latestCreatedAt: sortedReports[0].createdAt,
        pendingCount: sortedReports.filter((r) => r.status === "PENDING").length,
      };
    })
    .sort((a, b) => new Date(b.latestCreatedAt) - new Date(a.latestCreatedAt));
};

const getGroupStatus = (group) => {
  if (group.pendingCount > 0) return "PENDING";
  if (group.reports.every((r) => r.status === "APPROVED")) return "APPROVED";
  if (group.reports.every((r) => r.status === "REJECTED")) return "REJECTED";
  return "MIXED";
};

const ReportAdminPage = () => {
  const [reports, setReports] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(true);
  const [error, setError] = useState(null);

  const [expandedKey, setExpandedKey] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
      const data = await fetchReports({
        page: targetPage,
        size: PAGE_SIZE,
        status: statusValue || undefined,
      });

      if (reqId !== activeRequestId.current) return;

      setReports((prev) => (isReset ? data.reports : [...prev, ...data.reports]));
      setTotalCount(data.totalCount);
      hasNextRef.current = data.hasNext;
      setHasNext(data.hasNext);
      pageRef.current = targetPage;
    } catch (err) {
      setError("신고 목록을 불러오지 못했습니다.");
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
    setExpandedKey(null);
    setDetail(null);
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

  const groupedReports = groupReportsByTarget(reports);

  const handleFilterChange = (value) => {
    setStatusFilter(value);
  };

  const handleToggleDetail = async (group) => {
    if (expandedKey === group.key) {
      setExpandedKey(null);
      setDetail(null);
      return;
    }

    setExpandedKey(group.key);
    setDetail(null);
    setAdminMemo("");
    setDetailLoading(true);
    try {
      const representative = group.reports.find((r) => r.status === "PENDING") || group.reports[0];
      const data = await fetchReportDetail(representative.reportId);
      setDetail(data);
      setAdminMemo(data.adminMemo || "");
    } catch (err) {
      alert("신고 상세 조회에 실패했습니다.");
      setExpandedKey(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDecide = async (group, status) => {
    const label = status === "APPROVED" ? "승인" : "반려";
    const pendingReports = group.reports.filter((r) => r.status === "PENDING");
    if (pendingReports.length === 0) return;

    const confirmMessage =
      pendingReports.length > 1
        ? `이 대상에 대한 신고 ${pendingReports.length}건을 모두 ${label} 처리하시겠습니까?`
        : `이 신고를 ${label} 처리하시겠습니까?`;
    if (!window.confirm(confirmMessage)) return;

    setProcessing(true);
    try {
      for (const r of pendingReports) {
        await updateReportStatus(r.reportId, status, adminMemo);
      }
      alert(`신고를 ${label} 처리했습니다.`);
      setExpandedKey(null);
      setDetail(null);
      loadPage(1, statusFilter, true);
    } catch (err) {
      alert("신고 처리에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <Link to="/admin" className={styles.breadcrumbLink}>운영자 관리 홈</Link>
        <span className={styles.breadcrumbSeparator}> / </span>
        <span className={styles.breadcrumbCurrent}>신고 관리</span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>신고 관리</h1>
        <p className={styles.subtitle}>리뷰, 채팅, 사용자에 대한 신고를 확인하고 처리할 수 있습니다.</p>
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
      {initialLoading && !error && <div className={styles.noticeBanner}>신고 목록을 불러오는 중입니다...</div>}
      {!initialLoading && !error && groupedReports.length === 0 && (
        <p className={styles.emptyText}>해당 조건의 신고가 없습니다.</p>
      )}

      {!initialLoading && !error && groupedReports.length > 0 && (
        <p className={styles.emptyText}>총 {totalCount}건의 신고</p>
      )}

      <div className={styles.reportList}>
        {groupedReports.map((group) => {
          const groupStatus = getGroupStatus(group);
          const representativeReason = group.reports[0].reason;

          return (
            <div key={group.key} className={styles.reportItem}>
              <div className={styles.reportRow} onClick={() => handleToggleDetail(group)}>
                <span className={`${styles.statusBadge} ${styles[STATUS_BADGE_CLASS[groupStatus]]}`}>
                  {STATUS_LABELS[groupStatus] || groupStatus}
                </span>
                <span className={styles.reportTarget}>
                  {TARGET_TYPE_LABELS[group.targetType] || group.targetType} #{group.targetId}
                  {group.reports.length > 1 && (
                    <span className={styles.reportCountBadge}>신고 {group.reports.length}건</span>
                  )}
                </span>
                <span className={styles.reportReason}>
                  {representativeReason}
                  {group.reports.length > 1 && ` 외 ${group.reports.length - 1}건`}
                </span>
                <span className={styles.reportDate}>
                  {new Date(group.latestCreatedAt).toLocaleString()}
                </span>
              </div>

              {expandedKey === group.key && (
                <div className={styles.reportDetail}>
                  {detailLoading && <p className={styles.emptyText}>상세 정보를 불러오는 중입니다...</p>}
                  {!detailLoading && detail && (
                    <>
                      <div className={styles.detailGrid}>
                        <div><strong>신고 대상 유저 ID</strong> {detail.targetUserId}</div>
                        <div><strong>대상 타입</strong> {TARGET_TYPE_LABELS[detail.targetType] || detail.targetType}</div>
                        <div><strong>대상 ID</strong> {detail.targetId}</div>
                      </div>

                      {detail.targetType !== "USER" && (
                        <div className={styles.originalContentBox}>
                          {detail.targetContentDeleted ? (
                            <p className={styles.emptyText}>원본 콘텐츠가 이미 삭제되어 확인할 수 없습니다.</p>
                          ) : (
                            <>
                              {detail.targetContentHidden && (
                                <span className={styles.hiddenBadge}>신고 승인으로 숨김 처리됨</span>
                              )}
                              {detail.targetContentTitle && (
                                <p className={styles.detailText}><strong>제목:</strong> {detail.targetContentTitle}</p>
                              )}
                              <p className={styles.detailText}>
                                <strong>원본 내용:</strong> {detail.targetContent || "(내용 없음)"}
                              </p>
                              {TARGET_LINK_PREFIX[detail.targetType] && detail.targetNavigateId && (
                                <Link
                                  to={`${TARGET_LINK_PREFIX[detail.targetType]}${detail.targetNavigateId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.originalContentLink}
                                >
                                  원본으로 이동 →
                                </Link>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      <div className={styles.memberList}>
                        <strong>신고 내역 ({group.reports.length}건)</strong>
                        {group.reports.map((r) => (
                          <div key={r.reportId} className={styles.memberRow}>
                            <span className={`${styles.statusBadge} ${styles[STATUS_BADGE_CLASS[r.status]]}`}>
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                            <span>신고자 #{r.reporterId}</span>
                            <span className={styles.memberReason}>{r.reason}</span>
                            <span className={styles.reportDate}>
                              {new Date(r.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {group.pendingCount > 0 ? (
                        <>
                          <div className={styles.memoRow}>
                            <label htmlFor={`memo-${group.key}`}>관리자 메모</label>
                            <textarea
                              id={`memo-${group.key}`}
                              className={styles.memoInput}
                              value={adminMemo}
                              onChange={(e) => setAdminMemo(e.target.value)}
                              placeholder="처리 사유나 조치 내용을 남겨주세요."
                            />
                          </div>

                          <div className={styles.decisionActions}>
                            <button
                              className={styles.approveButton}
                              disabled={processing}
                              onClick={() => handleDecide(group, "APPROVED")}
                            >
                              {group.pendingCount > 1 ? `전체 승인 (${group.pendingCount}건)` : "승인"}
                            </button>
                            <button
                              className={styles.rejectButton}
                              disabled={processing}
                              onClick={() => handleDecide(group, "REJECTED")}
                            >
                              {group.pendingCount > 1 ? `전체 반려 (${group.pendingCount}건)` : "반려"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className={styles.emptyText}>모두 처리된 신고입니다.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!initialLoading && hasNext && <div ref={sentinelRef} style={{ height: 1 }} />}
      {loadingMore && <p className={styles.emptyText}>더 불러오는 중입니다...</p>}
      {!initialLoading && !hasNext && groupedReports.length > 0 && (
        <p className={styles.emptyText}>모든 신고를 불러왔습니다.</p>
      )}
    </div>
  );
};

export default ReportAdminPage;
