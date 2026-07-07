package yegam.opale_be.domain.chatbot.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import yegam.opale_be.domain.chatbot.dto.response.ChatbotPerformanceDto;
import yegam.opale_be.domain.chatbot.dto.response.ChatbotQueryRouteDto;
import yegam.opale_be.domain.chatbot.entity.ChatbotQueryLog;
import yegam.opale_be.domain.chatbot.repository.ChatbotQueryLogRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotService {

  private final ChatbotQueryRouterService queryRouterService;
  private final ChatbotRetrievalService retrievalService;
  private final ChatbotAnswerService answerService;
  private final ChatbotQueryLogRepository chatbotQueryLogRepository;

  public SseEmitter streamAnswer(String message, Long userId) {
    SseEmitter emitter = new SseEmitter(120_000L);

    List<ChatbotPerformanceDto> performances;
    try {
      ChatbotQueryRouteDto route = queryRouterService.route(message);
      recordQueryType(route.getQueryType());
      performances = retrievalService.retrieve(route, userId);
    } catch (Exception e) {
      log.error("챗봇 라우팅/검색 실패, 빈 공연 목록으로 진행: {}", e.getMessage());
      performances = List.of();
    }

    answerService.streamToEmitter(message, performances, emitter);
    return emitter;
  }

  /** 통계 대시보드용 쿼리 유형 기록 - 실패해도 챗봇 응답 흐름에 영향 없음 */
  private void recordQueryType(String queryType) {
    try {
      chatbotQueryLogRepository.save(
          ChatbotQueryLog.builder()
              .queryType(queryType != null ? queryType : "KEYWORD")
              .build()
      );
    } catch (Exception e) {
      log.warn("챗봇 쿼리 로그 기록 실패: {}", e.getMessage());
    }
  }
}
