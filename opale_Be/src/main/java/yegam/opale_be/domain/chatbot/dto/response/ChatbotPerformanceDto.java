package yegam.opale_be.domain.chatbot.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import yegam.opale_be.domain.culture.performance.dto.response.detail.PerformanceRelationResponseDto;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotPerformanceDto {

  private String performanceId;
  private String title;
  private String genrenm;
  private String placeName;
  private String poster;
  private String startDate;
  private String endDate;
  private List<PerformanceRelationResponseDto> bookingSites;
}
