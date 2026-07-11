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
        StringBuilder fullAnswer = new StringBuilder();

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
                    fullAnswer.append(chunk);
                    // SSE data 필드는 원본 개행을 그대로 실으면 줄 구분자로 오인돼 유실됨 → 이스케이프해서 전송
                    String escaped = chunk.replace("\n", "\\n");
                    emitter.send(SseEmitter.event().name("chunk").data(escaped));
                  }
                }
              }
              return null;
            }
        );

        // 검색 결과(performances)가 있어도, LLM이 실제로는 "관련 없다/모른다"고 판단해 답변한 경우엔
        // (예: 인기 공연 폴백 결과가 질문과 무관할 때) 카드를 같이 보내면 답변-근거가 안 맞아 보임 →
        // 최종 답변 텍스트를 다 받은 뒤에 부정 응답 여부를 확인해서 그럴 때만 카드 전송을 건너뜀
        if (!performances.isEmpty() && !isNegativeAnswer(fullAnswer.toString())) {
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
    sb.append("당신은 공연 안내 챗봇입니다. 아래 [공연 정보]에 있는 내용만 근거로 답변해주세요.\n");
    sb.append("[공연 정보]에 없는 내용은 당신이 알고 있더라도 절대 답변에 포함하지 마세요.\n");
    sb.append("[공연 정보]로 답할 수 없는 질문이면 요청하신 조건에 맞는 공연 정보를 찾지 못했다고 안내하고, 다른 키워드로 검색해보시길 제안하세요.\n");
    sb.append("[공연 정보]에 공연이 하나라도 있으면, 있다고 확실하게 답변하세요 — 사용자가 쓴 표현과 글자가 달라도 ")
        .append("(예: 사용자는 '혜화'라고 했는데 공연 정보엔 '대학로'로만 나와도) 같은 지역/조건으로 이미 검색된 결과이니 그대로 신뢰하고 안내하세요.\n");
    sb.append("[공연 정보] 항목은 화면에 카드로 이미 전부 표시됩니다. 답변에서는 각 공연을 번호 매겨 전부 나열하지 말고, ")
        .append("몇 건을 찾았는지와 간단한 특징만 1~2문장으로 요약하고 '아래 목록에서 확인해보세요' 식으로 안내하세요.\n");
    sb.append("단, 사용자가 예매 방법이나 예매 링크를 구체적으로 물어보면, 해당 공연의 [예매처] 항목에 있는 ")
        .append("예매처 이름과 링크를 답변에 그대로 포함해서 안내하세요. 예매처가 '등록된 예매처 정보 없음'이면 ")
        .append("예매처 정보를 찾지 못했다고 안내하세요.\n")
        .append("예매처가 여러 개면 한 문단에 이어 쓰지 말고, 예매처마다 줄바꿈해서 하나씩 나열하세요. ")
        .append("사이트명 자체를 마크다운 링크로 감싸고, 그 뒤에 실제 URL도 그대로 적어주세요 ")
        .append("(형식: \"- [사이트명](URL) — URL\" 줄마다 반복. 예: \"- [예스24](https://ticket.yes24.com/Perf/1) — https://ticket.yes24.com/Perf/1\").\n");
    sb.append("답변은 반드시 한국어로 해주세요.\n\n");

    if (performances.isEmpty()) {
      sb.append("[공연 정보]\n검색된 공연 정보가 없습니다. 이 경우 절대 다른 공연을 지어내거나 알고 있는 지식으로 답하지 말고, 요청하신 조건에 맞는 공연 정보를 찾지 못했다고 안내하세요.");
    } else {
      sb.append("[공연 정보]\n");
      for (int i = 0; i < performances.size(); i++) {
        ChatbotPerformanceDto p = performances.get(i);
        sb.append(i + 1).append(". ")
            .append("공연명: ").append(p.getTitle()).append("\n")
            .append("   장르: ").append(p.getGenrenm()).append("\n")
            .append("   공연장: ").append(p.getPlaceName()).append("\n")
            .append("   기간: ").append(p.getStartDate()).append(" ~ ").append(p.getEndDate()).append("\n");

        if (p.getBookingSites() != null && !p.getBookingSites().isEmpty()) {
          sb.append("   예매처: ");
          sb.append(p.getBookingSites().stream()
              .map(site -> site.getSiteName() + "(" + site.getSiteUrl() + ")")
              .collect(java.util.stream.Collectors.joining(", ")));
          sb.append("\n");
        } else {
          sb.append("   예매처: 등록된 예매처 정보 없음\n");
        }
        sb.append("\n");
      }
    }

    return sb.toString();
  }

  /** 시스템 프롬프트가 부정 응답(찾지 못함)일 때 쓰도록 지시한 문구가 실제 답변에 있는지로 판별.
   *  검색 결과(performances)는 있어도 LLM이 질문과 무관하다고 판단해 부정 응답을 한 경우
   *  카드까지 같이 보내면 답변-근거가 안 맞아 보이므로, 이 경우엔 카드 전송을 건너뛰는 데 사용. */
  private boolean isNegativeAnswer(String answer) {
    return answer.contains("찾지 못했");
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
