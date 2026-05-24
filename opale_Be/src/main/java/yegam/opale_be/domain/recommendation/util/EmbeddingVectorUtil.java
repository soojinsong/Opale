package yegam.opale_be.domain.recommendation.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import yegam.opale_be.domain.recommendation.exception.RecommendationErrorCode;
import yegam.opale_be.global.exception.CustomException;

import java.util.Arrays;
import java.util.List;

/**
 * DB에 JSON 문자열로 저장된 임베딩 벡터를
 * List<Double> 형태로 파싱하여 반환.
 */
@Component
@RequiredArgsConstructor
public class EmbeddingVectorUtil {

  private final ObjectMapper objectMapper;

  /**
   * 벡터 리스트를 실수형으로 변환해서 반환.
   */
  public List<Double> parseToList(String json) {

    // cold start 상태일 때, null 반환.
    if (json == null || json.isBlank()) {
      return null;
    }

    // 있다면 실수형 배열로 변환 시도.
    try {
      Double[] arr = objectMapper.readValue(json, Double[].class);

      // 빈 배열일 때, null 반환.
      if (arr == null || arr.length == 0) {
        return null;
      }

      return Arrays.asList(arr);

    } catch (JsonProcessingException e) {
      throw new CustomException(RecommendationErrorCode.VECTOR_PARSE_FAILED);
    }
  }
}
