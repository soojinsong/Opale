package yegam.opale_be.domain.chatbot.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

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
}
