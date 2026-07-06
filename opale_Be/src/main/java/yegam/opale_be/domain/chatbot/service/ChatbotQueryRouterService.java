package yegam.opale_be.domain.chatbot.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import yegam.opale_be.domain.chatbot.dto.response.ChatbotQueryRouteDto;

@Slf4j
@Service
public class ChatbotQueryRouterService {

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Value("${openai.gpt-model}")
  private String model;

  private static final String OPENAI_URL = "https://api.openai.com/v1/responses";

  public ChatbotQueryRouterService(
      @Qualifier("openAiRestTemplate") RestTemplate restTemplate
  ) {
    this.restTemplate = restTemplate;
  }

  public ChatbotQueryRouteDto route(String message) {
    try {
      String prompt = """
          다음은 공연 챗봇 사용자 질의다.
          아래 기준에 따라 분류하고 JSON으로만 응답해라.

          queryType 분류 기준:
          - KEYWORD: 공연명, 장소, 지역, 장르처럼 구체적인 키워드로 검색 가능한 질의
            예: "혜화에서 하는 연극", "데스노트 시리즈", "뮤지컬 추천"
          - SEMANTIC: 분위기, 상황, 감성으로 검색해야 하는 질의
            예: "데이트할때 좋은 공연", "잔잔한 분위기 공연", "가족과 볼 만한 공연"
          - PERSONALIZED: 사용자 개인 취향 기반 추천 요청
            예: "내가 좋아할 공연", "나한테 맞는 추천"
          - INFO: 특정 공연의 내용, 평가, 예매처 등 정보 조회
            예: "위키드 내용 알려줘", "이 공연 어디서 예매해"

          응답 형식 (JSON만):
          {
            "queryType": "KEYWORD|SEMANTIC|PERSONALIZED|INFO",
            "keyword": "검색에 사용할 핵심 키워드 (PERSONALIZED면 null)"
          }

          조건:
          - 오직 JSON 객체만 반환
          - 절대 설명, 백틱, 추가 텍스트 넣지 마라
          - keyword는 반드시 사용자가 입력한 원문 그대로의 언어/표기를 유지해라.
            절대 번역하거나 영문/외래어 표기로 정규화하지 마라.
            (예: 사용자가 "위키드"라고 썼으면 keyword도 "위키드"여야 하고, "Wicked"로 바꾸면 안 된다)

          [질의]
          """ + message;

      Map<String, Object> body = new HashMap<>();
      body.put("model", model);
      body.put("input", prompt);
      body.put("temperature", 0);

      HttpEntity<Map<String, Object>> request = new HttpEntity<>(body);
      ResponseEntity<String> response = restTemplate.postForEntity(OPENAI_URL, request, String.class);

      JsonNode root = objectMapper.readTree(response.getBody());
      String rawJson = root.path("output").get(0)
          .path("content").get(0)
          .path("text").asText();

      String cleanJson = rawJson.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson
            .replaceFirst("```[\\w]*\\n", "")
            .replaceAll("```", "")
            .trim();
      }

      JsonNode node = objectMapper.readTree(cleanJson);

      return ChatbotQueryRouteDto.builder()
          .queryType(node.path("queryType").asText("KEYWORD"))
          .keyword(node.path("keyword").asText(null))
          .build();

    } catch (Exception e) {
      log.warn("쿼리 의도 분류 실패, KEYWORD fallback: {}", e.getMessage());
      return ChatbotQueryRouteDto.builder()
          .queryType("KEYWORD")
          .keyword(message)
          .build();
    }
  }
}
