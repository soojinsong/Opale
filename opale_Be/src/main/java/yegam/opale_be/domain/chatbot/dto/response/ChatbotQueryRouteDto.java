package yegam.opale_be.domain.chatbot.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotQueryRouteDto {

  private String queryType;
  private String keyword;
  private String place;
  private String genre;
}
