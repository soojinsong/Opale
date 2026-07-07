import React from "react";
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
import styles from "./DashboardAdminPage.module.css";

const dummyKpis = {
  totalUsers: 1284,
  newUsersToday: 12,
  totalPerformances: 842,
  chatbotQueriesToday: 57,
};

const dummySignupTrend = [
  { date: "06/24", count: 5 },
  { date: "06/25", count: 8 },
  { date: "06/26", count: 4 },
  { date: "06/27", count: 11 },
  { date: "06/28", count: 7 },
  { date: "06/29", count: 6 },
  { date: "06/30", count: 9 },
  { date: "07/01", count: 13 },
  { date: "07/02", count: 10 },
  { date: "07/03", count: 8 },
  { date: "07/04", count: 14 },
  { date: "07/05", count: 9 },
  { date: "07/06", count: 12 },
  { date: "07/07", count: 12 },
];

const dummyTopPerformances = [
  { title: "위키드", viewCount: 1240 },
  { title: "레미제라블", viewCount: 980 },
  { title: "데스노트", viewCount: 860 },
  { title: "그레이하우스", viewCount: 710 },
  { title: "트루웨스트", viewCount: 640 },
];

const dummyGenreDistribution = [
  { genre: "뮤지컬", count: 320 },
  { genre: "연극", count: 210 },
  { genre: "콘서트", count: 150 },
  { genre: "무용", count: 60 },
  { genre: "전시", count: 45 },
];

const dummyChatbotQueryTypes = [
  { type: "KEYWORD", count: 152 },
  { type: "SEMANTIC", count: 88 },
  { type: "PERSONALIZED", count: 41 },
  { type: "INFO", count: 63 },
];

const dummyTopSearchKeywords = ["위키드", "대학로 연극", "데스노트 시리즈", "혜화", "데이트 뮤지컬"];

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

      <div className={styles.noticeBanner}>
        현재 더미 데이터로 구성된 화면입니다. 실제 통계 API 연동 전 레이아웃 확인용입니다.
      </div>

      <div className={styles.kpiRow}>
        <StatTile label="총 회원 수" value={dummyKpis.totalUsers} />
        <StatTile label="오늘 신규 가입" value={dummyKpis.newUsersToday} />
        <StatTile label="등록 공연 수" value={dummyKpis.totalPerformances} />
        <StatTile label="오늘 챗봇 문의" value={dummyKpis.chatbotQueriesToday} />
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>회원 통계</h2>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>최근 14일 가입자 추이</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dummySignupTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={dummyTopPerformances}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="#e1e0d9" />
                <XAxis type="number" tick={axisTick} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="title" width={90} tick={categoryAxisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="viewCount" name="조회수" fill="#2a78d6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>장르별 공연 분포</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={dummyGenreDistribution}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="#e1e0d9" />
                <XAxis type="number" tick={axisTick} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="genre" width={90} tick={categoryAxisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="공연 수" fill="#2a78d6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>사이트 현황</h2>
        <div className={styles.chartGrid}>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>챗봇 쿼리 유형 분포</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={dummyChatbotQueryTypes}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="#e1e0d9" />
                <XAxis type="number" tick={axisTick} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="type" width={90} tick={categoryAxisTick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="문의 수" fill="#2a78d6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>인기 검색어 TOP 5</h3>
            <ol className={styles.rankList}>
              {dummyTopSearchKeywords.map((keyword, index) => (
                <li key={keyword} className={styles.rankItem}>
                  <span className={styles.rankNumber}>{index + 1}</span>
                  <span className={styles.rankKeyword}>{keyword}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardAdminPage;
