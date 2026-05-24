package yegam.opale_be.domain.recommendation.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import yegam.opale_be.domain.recommendation.exception.RecommendationErrorCode;
import yegam.opale_be.global.exception.CustomException;

import java.util.*;


/**
 * 벡터 DB에 직접 접근하는 클래스.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PineconeClientUtil {

  // Pinecone 벡터 DB 설정
  @Value("${pinecone.api-key}")
  private String apiKey;

  @Value("${pinecone.host}")
  private String host;

  @Value("${pinecone.dimension}")
  private int dimension;

  private final ObjectMapper objectMapper;
  private final RestTemplate restTemplate = new RestTemplate();

  /**
   * Pinecone 벡터 DB 조회할 때 호출.
   */
  public List<PineconeMatch> query(List<Double> vector, int topK) {

    // 타겟 벡터가 없다면 예외 발생.
    if (vector == null || vector.isEmpty()) {
      throw new CustomException(RecommendationErrorCode.VECTOR_PARSE_FAILED);
    }

    // 준 벡터 사이즈가 Pinecone에 저장된 벡터의 길이(차원수)랑 다르면 경고.
    if (vector.size() != dimension) {
      log.warn("Pinecone vector dimension mismatch. expected={}, actual={}", dimension, vector.size());
    }

    // 요청 데이터 묶음 구성.
    String url = host + "/query";

    Map<String, Object> body = new HashMap<>();
    body.put("vector", vector);
    body.put("topK", topK);
    body.put("includeValues", false);
    body.put("includeMetadata", false);

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set("Api-Key", apiKey);

    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

    // 벡터 DB 조회 시도.
    try {
      // Pinecone /query API로 POST 요청 보내고 응답 받음
      ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

      // 응답 실패시 예외 발생.
      if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
        log.error("Pinecone query failed. status={}, body={}",
            response.getStatusCode(), response.getBody());
        throw new CustomException(RecommendationErrorCode.PINECONE_QUERY_FAILED);
      }

      // 응답 트리 루트 노드를 찾음.
      JsonNode root = objectMapper.readTree(response.getBody());
      JsonNode matchesNode = root.get("matches");

      // 루트 노드에 아무것도 없으면 경고 발생하고 빈 리스트 반환.
      if (matchesNode == null || !matchesNode.isArray()) {
        log.warn("Pinecone returned no matches");
        return List.of();
      }

      // 노드를 돌며 공연id와 유사도 점수를 묶어서 리스트에 추가.
      List<PineconeMatch> matches = new ArrayList<>();
      for (JsonNode node : matchesNode) {
        String id = node.get("id").asText();
        double score = node.get("score").asDouble();
        matches.add(new PineconeMatch(id, score));
      }

      // 결과 리스트 반환.
      return matches;
      
    } catch (Exception e) {
      log.error("Pinecone query exception", e);
      throw new CustomException(RecommendationErrorCode.PINECONE_QUERY_FAILED);
    }
  }
}
