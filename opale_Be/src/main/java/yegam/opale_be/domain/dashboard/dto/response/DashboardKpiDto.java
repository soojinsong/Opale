package yegam.opale_be.domain.dashboard.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardKpiDto {

  private long totalUsers;
  private long newUsersToday;
  private long totalPerformances;
  private long chatbotQueriesToday;
}
