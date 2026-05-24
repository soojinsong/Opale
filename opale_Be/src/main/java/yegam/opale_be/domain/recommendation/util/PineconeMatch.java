package yegam.opale_be.domain.recommendation.util;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Pinecone 검색 결과 매칭 정보 (공연 id + 유사도 score)
 * : 벡터 DB에서 조회한 요소 모음
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PineconeMatch {

  private String id;
  private Double score;
}
