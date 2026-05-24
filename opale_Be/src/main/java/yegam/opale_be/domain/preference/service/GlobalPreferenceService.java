package yegam.opale_be.domain.preference.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import yegam.opale_be.domain.culture.performance.entity.Performance;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.recommendation.util.EmbeddingVectorUtil;

/**
 * 콜드 스타터용 글로벌 벡터 생성
 * : 전체 공연 임베딩의 평균 벡터를 계산하여 반환 (Redis 캐싱 시도)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GlobalPreferenceService {

  private final PerformanceRepository performanceRepository;
  private final EmbeddingVectorUtil embeddingVectorUtil;
  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;

  private static final String GLOBAL_VECTOR_KEY = "global:vector";
  private static final long TTL = 60; // 분

  public List<Double> getGlobalVector() {

    // Redis 안의 평균 벡터를 조회
    try {
      String cached = redisTemplate.opsForValue().get(GLOBAL_VECTOR_KEY);
      // 캐시 있으면 그거 반환.
      if (cached != null) {
        return objectMapper.readValue(
            cached,
            new TypeReference<List<Double>>() {}
        );
      }
    } catch (Exception e) {
      log.warn("Redis 조회 실패 → DB fallback 사용", e);
    }

    // 없으면 계산 - DB에서 가져와서 전체 벡터값의 평균을 구함.
    List<Performance> all = performanceRepository.findAll();

    double[] acc = new double[1536];
    int count = 0;

    for (Performance p : all) {
      List<Double> vec = embeddingVectorUtil.parseToList(p.getEmbeddingVector());
      if (vec == null || vec.size() != 1536) continue;

      for (int i = 0; i < 1536; i++) {
        acc[i] += vec.get(i);
      }
      count++;
    }

    List<Double> result = new ArrayList<>();
    for (int i = 0; i < 1536; i++) {
      result.add(acc[i] / Math.max(count, 1));
    }

    // 그 평균을 Redis에 저장
    try {
      redisTemplate.opsForValue().set(
          GLOBAL_VECTOR_KEY,
          objectMapper.writeValueAsString(result),
          TTL,
          TimeUnit.MINUTES
      );
    } catch (Exception e) {
      log.warn("Redis 저장 실패 → 캐싱 없이 진행", e);
    }

    return result;
  }
}
