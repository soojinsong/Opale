package yegam.opale_be.domain.dashboard.service;

import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.chatbot.repository.ChatbotQueryLogRepository;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.dashboard.dto.response.ChatbotQueryTypeDto;
import yegam.opale_be.domain.dashboard.dto.response.DashboardKpiDto;
import yegam.opale_be.domain.dashboard.dto.response.DashboardResponseDto;
import yegam.opale_be.domain.dashboard.dto.response.GenreDistributionDto;
import yegam.opale_be.domain.dashboard.dto.response.SignupTrendPointDto;
import yegam.opale_be.domain.dashboard.dto.response.TopPerformanceDto;
import yegam.opale_be.domain.search.performance.repository.SearchKeywordLogRepository;
import yegam.opale_be.domain.user.repository.UserRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

  private static final int SIGNUP_TREND_DAYS = 14;
  private static final int TOP_SEARCH_KEYWORD_LIMIT = 5;

  private final UserRepository userRepository;
  private final PerformanceRepository performanceRepository;
  private final ChatbotQueryLogRepository chatbotQueryLogRepository;
  private final SearchKeywordLogRepository searchKeywordLogRepository;

  public DashboardResponseDto getDashboard() {
    LocalDate today = LocalDate.now();
    LocalDateTime startOfToday = today.atStartOfDay();
    LocalDateTime trendStart = today.minusDays(SIGNUP_TREND_DAYS - 1L).atStartOfDay();

    DashboardKpiDto kpis = DashboardKpiDto.builder()
        .totalUsers(userRepository.countByIsDeletedFalse())
        .newUsersToday(userRepository.countByIsDeletedFalseAndCreatedAtGreaterThanEqual(startOfToday))
        .totalPerformances(performanceRepository.count())
        .chatbotQueriesToday(chatbotQueryLogRepository.countByCreatedAtGreaterThanEqual(startOfToday))
        .build();

    List<TopPerformanceDto> topPerformances = performanceRepository.findTop5ByOrderByViewCountDesc()
        .stream()
        .map(p -> TopPerformanceDto.builder()
            .title(p.getTitle())
            .viewCount(p.getViewCount())
            .startYear(p.getStartDate() != null ? p.getStartDate().toLocalDate().getYear() : null)
            .build())
        .toList();

    List<GenreDistributionDto> genreDistribution = performanceRepository.countGroupByGenre()
        .stream()
        .map(row -> GenreDistributionDto.builder()
            .genre((String) row[0])
            .count(((Number) row[1]).longValue())
            .build())
        .toList();

    List<ChatbotQueryTypeDto> chatbotQueryTypes = chatbotQueryLogRepository.countGroupByQueryType()
        .stream()
        .map(row -> ChatbotQueryTypeDto.builder()
            .type((String) row[0])
            .count(((Number) row[1]).longValue())
            .build())
        .toList();

    List<String> topSearchKeywords = searchKeywordLogRepository
        .countGroupByKeyword(PageRequest.of(0, TOP_SEARCH_KEYWORD_LIMIT))
        .stream()
        .map(row -> (String) row[0])
        .toList();

    return DashboardResponseDto.builder()
        .kpis(kpis)
        .signupTrend(buildSignupTrend(today, trendStart))
        .topPerformances(topPerformances)
        .genreDistribution(genreDistribution)
        .chatbotQueryTypes(chatbotQueryTypes)
        .topSearchKeywords(topSearchKeywords)
        .build();
  }

  /** 최근 14일 가입자 추이 - 가입자가 없는 날짜는 0으로 채움 */
  private List<SignupTrendPointDto> buildSignupTrend(LocalDate today, LocalDateTime trendStart) {
    Map<LocalDate, Long> countsByDate = new HashMap<>();
    for (Object[] row : userRepository.countDailySignupsSince(trendStart)) {
      LocalDate date = ((Date) row[0]).toLocalDate();
      countsByDate.put(date, ((Number) row[1]).longValue());
    }

    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/dd");
    List<SignupTrendPointDto> trend = new ArrayList<>();
    for (int i = SIGNUP_TREND_DAYS - 1; i >= 0; i--) {
      LocalDate date = today.minusDays(i);
      trend.add(SignupTrendPointDto.builder()
          .date(date.format(formatter))
          .count(countsByDate.getOrDefault(date, 0L))
          .build());
    }
    return trend;
  }
}
