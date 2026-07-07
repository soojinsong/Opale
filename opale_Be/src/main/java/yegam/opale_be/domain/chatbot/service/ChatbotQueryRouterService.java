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
          - PERSONALIZED: 사용자 개인 취향 기반 추천 요청. 장소/지역/장르/공연명 등 구체적 조건이
            전혀 없이 "내가/나에게/내 취향" 같은 개인 지칭으로만 추천을 요청하는 경우에만 해당.
            예: "내가 좋아할 공연", "나한테 맞는 추천"
            주의: 장소·지역·장르·공연명 중 하나라도 구체적으로 언급되면 "추천해줘"가 붙어 있어도
            PERSONALIZED가 아니라 KEYWORD 또는 SEMANTIC으로 분류해라.
            (예: "혜화에서 하는 연극 추천해줘"는 지역+장르가 있으므로 KEYWORD)
          - INFO: 구체적인 공연명(또는 대화 맥락상 명확히 특정되는 공연)의 내용, 평가, 예매처 등 정보 조회.
            공연명이 없고 장소/지역/장르 조건만으로 여러 공연을 찾는 요청은 INFO가 아니라 KEYWORD다.
            예: "위키드 내용 알려줘"(O, 공연명 있음), "이 공연 어디서 예매해"(O, 특정 공연 지칭)
            "종로에서 하는 공연 알려줘"(X, 공연명 없음 → KEYWORD)

          응답 형식 (JSON만):
          {
            "queryType": "KEYWORD|SEMANTIC|PERSONALIZED|INFO",
            "keyword": "검색에 사용할 핵심 키워드",
            "place": "질의에 지역/동네/공연장 이름이 있으면 그 지명 (없으면 null)",
            "genre": "질의에 장르(연극, 뮤지컬, 콘서트, 무용, 전시 등)가 있으면 그 장르 (없으면 null)"
          }

          keyword 규칙 (공연 제목 등 고유명사 포함 일반 검색어):
          - queryType과 무관하게, 질의에서 검색에 쓸 수 있는 단어/구가 하나라도 있으면 반드시 채워라.
            (예: PERSONALIZED로 분류돼도 "겨울 공연" 같은 단서가 있으면 keyword는 "겨울 공연")
          - 정말로 아무 단서 없이 순수하게 "나한테 맞는 거 추천해줘" 수준일 때만 null로 남겨라.
          - 반드시 사용자가 입력한 원문 그대로의 언어/표기를 유지해라.
          - 절대 번역하거나 영문/외래어 표기로 정규화하지 마라.
            (예: 사용자가 "위키드"라고 썼으면 keyword도 "위키드"여야 하고, "Wicked"로 바꾸면 안 된다)

          place 규칙 (keyword와 반대로 여기서는 동의어 확장이 필요함):
          - 사용자가 쓴 동네/역 이름이 콜로키얼한 별칭이면(예: "혜화"), 실제 데이터에 저장돼 있을 법한
            공식 지명이나 관련 지역명(예: "대학로")을 아는 대로 함께 적어라.
          - 원문 표기와 확장된 표기를 공백으로 구분해 하나의 문자열에 담아라.
            (예: 사용자가 "혜화"라고 썼으면 place는 "혜화 대학로")
          - 확장할 지명을 모르면 원문 그대로만 넣어라.

          genre 규칙:
          - 표준 명칭으로 정규화해라 (예: "연극", "뮤지컬", "콘서트", "무용", "전시")

          조건:
          - 오직 JSON 객체만 반환
          - 절대 설명, 백틱, 추가 텍스트 넣지 마라

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

      ChatbotQueryRouteDto result = ChatbotQueryRouteDto.builder()
          .queryType(node.path("queryType").asText("KEYWORD"))
          .keyword(node.path("keyword").asText(null))
          .place(node.path("place").asText(null))
          .genre(node.path("genre").asText(null))
          .build();
      log.info("쿼리 라우팅 결과: queryType={}, keyword={}, place={}, genre={}",
          result.getQueryType(), result.getKeyword(), result.getPlace(), result.getGenre());
      return result;

    } catch (Exception e) {
      log.warn("쿼리 의도 분류 실패, KEYWORD fallback: {}", e.getMessage());
      return ChatbotQueryRouteDto.builder()
          .queryType("KEYWORD")
          .keyword(message)
          .build();
    }
  }
}
