package yegam.opale_be.domain.preference.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import yegam.opale_be.domain.analytics.entity.UserEventLog;
import yegam.opale_be.domain.recommendation.util.EmbeddingVectorUtil;
import yegam.opale_be.global.common.policy.EventWeightPolicy;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * 실제 사용자의 선호 벡터값 계산 로직
 * : 이벤트 가중치 + 시간 감쇠(Exponential Decay)를 적용해서
 *  계산한 최종 사용자 선호 벡터를 반환.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VectorEmbeddingAggregator {

  private final EmbeddingVectorUtil embeddingVectorUtil;

  /** 임베딩 차원 (OpenAI 1536) */
  public static final int VECTOR_DIM = 1536;

  /** time-decay용 반감기 (대략 30일 기준) */
  private static final double HALF_LIFE_DAYS = 30.0;

  /**
   * 유저 선호 벡터 계산
   *
   * @param logs          해당 유저의 이벤트 로그들
   * @param embeddingMap  key: performanceId, value: 공연 임베딩 벡터
   * @return 유저 최종 임베딩 (길이 1536), 로그/임베딩 없으면 0-vector
   */
  public List<Double> buildUserEmbeddingVector(
      List<UserEventLog> logs,
      Map<String, List<Double>> embeddingMap
  ) {
    // 사용자의 행동 로그가 없을 때, 콜드 스타터용 벡터값 반환.
    if (logs == null || logs.isEmpty() || embeddingMap == null || embeddingMap.isEmpty()) {
      log.debug("유저 로그 또는 임베딩 없음 → 0-vector 반환");
      return zeroVector();
    }

    double[] acc = new double[VECTOR_DIM];
    double totalWeight = 0.0;
    LocalDateTime now = LocalDateTime.now();

    for (UserEventLog logEvent : logs) {
      if (logEvent.getTargetType() != UserEventLog.TargetType.PERFORMANCE) {
        continue;
      }

      // 행동 타겟이 공연일 때
      String performanceId = logEvent.getTargetId();

      // 해당 공연 데이터에 문제가 있다면 다음 로그로 넘어감.
      if (performanceId == null) continue;

      List<Double> perfVector = embeddingMap.get(performanceId);
      if (perfVector == null || perfVector.size() != VECTOR_DIM) {
        log.debug("공연 임베딩 없음 또는 차원 불일치: performanceId={}", performanceId);
        continue;
      }

      double baseWeight;
      if (logEvent.getEventType() == UserEventLog.EventType.DWELL_TIME) {
        baseWeight = logEvent.getWeight() != null ? logEvent.getWeight() : 0;
      } else {
        baseWeight = EventWeightPolicy.from(logEvent.getEventType()).getEmbeddingWeight();
      }

      // 행동 발생 경과 계산
      long daysAgo = ChronoUnit.DAYS.between(
          logEvent.getCreatedAt().toLocalDate(),
          now.toLocalDate()
      );
      if (daysAgo < 0) daysAgo = 0;
      double decay = Math.exp(-daysAgo / HALF_LIFE_DAYS); // 경과된 만큼 영향도 축소

      double finalWeight = baseWeight * decay;
      if (finalWeight <= 0) continue;

      // totalWeight: 전체 중요도 합
      totalWeight += finalWeight;

      // acc: 벡터 누적
      for (int i = 0; i < VECTOR_DIM; i++) {
        acc[i] += perfVector.get(i) * finalWeight;
      }
    }

    // 누적된 중요도 값이 0이면, 기본 벡터값 반환.
    if (totalWeight <= 0) {
      log.debug("totalWeight=0 → 0-vector 반환");
      return zeroVector();
    }

    // 각 차원별 평균을 계산해 1536차원 벡터를 구성해서 반환
    List<Double> result = new ArrayList<>(VECTOR_DIM);
    for (int i = 0; i < VECTOR_DIM; i++) {
      result.add(acc[i] / totalWeight);
    }

    return result;
  }

  /** 1536차원 0-vector 생성 (cold start용) */
  public List<Double> zeroVector() {
    List<Double> list = new ArrayList<>(VECTOR_DIM);
    for (int i = 0; i < VECTOR_DIM; i++) {
      list.add(0.0);
    }
    return list;
  }
}
