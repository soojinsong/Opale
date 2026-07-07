import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { fetchAdminDashboard } from "../../api/adminDashboardApi";
import styles from "./DashboardAdminPage.module.css";

const emptyDashboard = {
  kpis: { totalUsers: 0, newUsersToday: 0, totalPerformances: 0, chatbotQueriesToday: 0 },
  signupTrend: [],
  topPerformances: [],
  genreDistribution: [],
  chatbotQueryTypes: [],
  topSearchKeywords: [],
};

const tooltipStyle = {
  backgroundColor: "#fcfcfb",
  border: "1px solid #e1e0d9",
  borderRadius: 8,
  fontSize: 13,
  color: "#0b0b0b",
};

const axisTick = { fontSize: 12, fill: "#898781" };
const categoryAxisTick = { fontSize: 12, fill: "#52514e" };

const StatTile = ({ label, value }) => (
  <div className={styles.statTile}>
    <div className={styles.statLabel}>{label}</div>
    <div className={styles.statValue}>{value.toLocaleString()}</div>
  </div>
);

const DashboardAdminPage = () => {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const data = await fetchAdminDashboard();
        if (isMounted) setDashboard(data);
      } catch (err) {
        if (isMounted) setError("통계 데이터를 불러오지 못했습니다.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const { kpis, signupTrend, topPerformances, genreDistribution, chatbotQueryTypes, topSearchKeywords } =
    dashboard;

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <Link to="/admin" className={styles.breadcrumbLink}>운영자 관리 홈</Link>
        <span className={styles.breadcrumbSeparator}> / </span>
        <span className={styles.breadcrumbCurrent}>통계 대시보드</span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>통계 대시보드</h1>
        <p className={styles.subtitle}>회원, 공연, 챗봇 이용 현황을 한눈에 확인할 수 있습니다.</p>
      </div>

      {error && <div className={styles.noticeBanner}>{error}</div>}
      {loading && !error && <div className={styles.noticeBanner}>통계 데이터를 불러오는 중입니다...</div>}

      <div className={styles.kpiRow}>
        <StatTile label="총 회원 수" value={kpis.totalUsers} />
        <StatTile label="오늘 신규 가입" value={kpis.newUsersToday} />
        <StatTile label="등록 공연 수" value={kpis.totalPerformances} />
        <StatTile label="오늘 챗봇 문의" value={kpis.chatbotQueriesToday} />
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>회원 통계</h2>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>최근 14일 가입자 추이</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={signupTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e1e0d9" />
              <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#52514e" }} />
              <Line
                type="monotone"
                dataKey="count"
                name="가입자 수"
                stroke="#2a78d6"
                strokeWidth={2}
                dot={{ r: 4, fill: "#2a78d6" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>공연 통계</h2>
        <div className={styles.chartGrid}>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>조회수 TOP 5 공연</h3>
            {topPerformances.length > 0 ? (
              <ol className={styles.rankList}>
                {topPerformances.map((p, index) => (
                  <li key={`${p.title}_${index}`} className={styles.rankItem}>
                    <span className={styles.rankNumber}>{index + 1}</span>
                    <span className={styles.rankKeyword}>
                      {p.title}
                      {p.startYear ? ` (${p.startYear})` : ""}
                    </span>
                    <span className={styles.rankValue}>{p.viewCount.toLocaleString()}회</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.emptyText}>아직 집계된 공연 데이터가 없습니다.</p>
            )}
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>장르별 공연 분포</h3>
            {genreDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={genreDistribution}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke="#e1e0d9" />
                  <XAxis type="number" tick={axisTick} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="genre" width={100} tick={categoryAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="공연 수" fill="#2a78d6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className={styles.emptyText}>아직 집계된 장르 데이터가 없습니다.</p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>사이트 현황</h2>
        <div className={styles.chartGrid}>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>챗봇 쿼리 유형 분포</h3>
            {chatbotQueryTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={chatbotQueryTypes}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke="#e1e0d9" />
                  <XAxis type="number" tick={axisTick} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="type" width={100} tick={categoryAxisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="문의 수" fill="#2a78d6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className={styles.emptyText}>아직 챗봇 이용 기록이 없습니다.</p>
            )}
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>인기 검색어 TOP 5</h3>
            {topSearchKeywords.length > 0 ? (
              <ol className={styles.rankList}>
                {topSearchKeywords.map((keyword, index) => (
                  <li key={keyword} className={styles.rankItem}>
                    <span className={styles.rankNumber}>{index + 1}</span>
                    <span className={styles.rankKeyword}>{keyword}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.emptyText}>아직 집계된 검색어가 없습니다.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardAdminPage;
