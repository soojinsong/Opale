package yegam.opale_be.domain.chatbot.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import yegam.opale_be.domain.chatbot.dto.response.ChatbotPerformanceDto;

@Slf4j
@Service
public class ChatbotAnswerService {

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Value("${openai.gpt-model}")
  private String model;

  private static final String CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

  public ChatbotAnswerService(
      @Qualifier("openAiRestTemplate") RestTemplate restTemplate
  ) {
    this.restTemplate = restTemplate;
  }

  public void streamToEmitter(String message, List<ChatbotPerformanceDto> performances, SseEmitter emitter) {
    emitter.onTimeout(emitter::complete);
    emitter.onError(e -> log.warn("SSE 연결 오류: {}", e.getMessage()));

    CompletableFuture.runAsync(() -> {
      try {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", List.of(
            Map.of("role", "system", "content", buildSystemPrompt(performances)),
            Map.of("role", "user", "content", message)
        ));
        body.put("stream", true);
        body.put("temperature", 0.7);

        byte[] bodyBytes = objectMapper.writeValueAsBytes(body);

        restTemplate.execute(
            CHAT_COMPLETIONS_URL,
            HttpMethod.POST,
            req -> {
              req.getHeaders().setContentType(MediaType.APPLICATION_JSON);
              req.getBody().write(bodyBytes);
            },
            response -> {
              try (BufferedReader reader = new BufferedReader(
                  new InputStreamReader(response.getBody(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                  if (!line.startsWith("data: ")) continue;
                  String data = line.substring(6).trim();
                  if ("[DONE]".equals(data)) break;
                  String chunk = extractContent(data);
                  if (chunk != null && !chunk.isEmpty()) {
                    emitter.send(SseEmitter.event().name("chunk").data(chunk));
                  }
                }
              }
              return null;
            }
        );

        if (!performances.isEmpty()) {
          emitter.send(SseEmitter.event()
              .name("performances")
              .data(objectMapper.writeValueAsString(performances)));
        }

        emitter.send(SseEmitter.event().name("done").data(""));
        emitter.complete();

      } catch (Exception e) {
        log.error("챗봇 스트리밍 실패", e);
        emitter.completeWithError(e);
      }
    });
  }

  private String buildSystemPrompt(List<ChatbotPerformanceDto> performances) {
    StringBuilder sb = new StringBuilder();
    sb.append("당신은 공연 안내 챗봇입니다. 아래 공연 정보를 참고하여 사용자의 질문에 친절하고 자연스럽게 답변해주세요.\n");
    sb.append("답변은 반드시 한국어로 해주세요.\n\n");

    if (performances.isEmpty()) {
      sb.append("[공연 정보]\n관련 공연 정보를 찾지 못했습니다. 다른 키워드로 검색해보세요.");
    } else {
      sb.append("[공연 정보]\n");
      for (int i = 0; i < performances.size(); i++) {
        ChatbotPerformanceDto p = performances.get(i);
        sb.append(i + 1).append(". ")
            .append("공연명: ").append(p.getTitle()).append("\n")
            .append("   장르: ").append(p.getGenrenm()).append("\n")
            .append("   공연장: ").append(p.getPlaceName()).append("\n")
            .append("   기간: ").append(p.getStartDate()).append(" ~ ").append(p.getEndDate()).append("\n\n");
      }
    }

    return sb.toString();
  }

  private String extractContent(String json) {
    try {
      JsonNode root = objectMapper.readTree(json);
      JsonNode content = root.path("choices").get(0).path("delta").path("content");
      if (content.isMissingNode() || content.isNull()) return null;
      return content.asText();
    } catch (Exception e) {
      return null;
    }
  }
}
