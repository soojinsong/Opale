package yegam.opale_be.domain.dashboard.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponseDto {

  private DashboardKpiDto kpis;
  private List<SignupTrendPointDto> signupTrend;
  private List<TopPerformanceDto> topPerformances;
  private List<GenreDistributionDto> genreDistribution;
  private List<ChatbotQueryTypeDto> chatbotQueryTypes;
  private List<String> topSearchKeywords;
}
