package yegam.opale_be.domain.preference.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.analytics.entity.UserEventLog;
import yegam.opale_be.domain.analytics.repository.UserEventLogRepository;
import yegam.opale_be.domain.culture.performance.entity.Performance;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.preference.entity.UserPreferenceVector;
import yegam.opale_be.domain.preference.repository.UserPreferenceVectorRepository;
import yegam.opale_be.domain.preference.util.VectorEmbeddingAggregator;
import yegam.opale_be.domain.recommendation.util.EmbeddingVectorUtil;
import yegam.opale_be.domain.user.entity.User;
import yegam.opale_be.domain.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 사용자 선호 벡터값을 계산해서 업데이트
 * : 가중 평균 백터를 직접 계산하는 vectorEmbeddingAggregator 호출
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PreferenceBatchService {

  private static final int RECENT_DAYS = 90;

  private final UserEventLogRepository eventLogRepository;
  private final UserPreferenceVectorRepository vectorRepository;
  private final PerformanceRepository performanceRepository;
  private final UserRepository userRepository;

  private final VectorEmbeddingAggregator vectorEmbeddingAggregator;
  private final EmbeddingVectorUtil embeddingVectorUtil;
  private final ObjectMapper objectMapper;

  /** 전체 유저 벡터 업데이트(비상용) */
  @Transactional
  public void updateAllUserVectors() {
    // 전체 유저 조회
    List<User> users = userRepository.findAll();
    log.info("전체 유저 벡터 업데이트 시작 — {}명", users.size());

    int success = 0;
    for (User user : users) {
      try {
        // 특정 유저 벡터 업데이트
        updateSingleUserVector(user.getUserId());
        success++;
      } catch (Exception e) {
        log.error("벡터 업데이트 실패: userId={}", user.getUserId(), e);
      }
    }

    log.info("전체 벡터 업데이트 완료 — 성공 {}/{}", success, users.size());
  }

  /** 특정 유저 벡터 업데이트 */
  @Transactional
  public void updateSingleUserVector(Long userId) {
    // 사용자 조회
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

    // 최근 N일(90일) 동안의 사용자 행동 로그 조회
    LocalDateTime from = LocalDateTime.now().minusDays(RECENT_DAYS);
    List<UserEventLog> logs = eventLogRepository.findRecentLogs(userId, from);

    // 공연 id에 해당하는 임베딩 벡터 조회 (DB → 문자열 → 벡터 변환)
    Set<String> performanceIds = logs.stream()
        .filter(log -> log.getTargetType() == UserEventLog.TargetType.PERFORMANCE)
        .map(UserEventLog::getTargetId)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());

    // 공연 ID 목록으로 DB 조회 후 embedding 문자열 → 벡터 변환
    Map<String, List<Double>> embeddingMap = new HashMap<>();
    if (!performanceIds.isEmpty()) {
      List<Performance> performances = performanceRepository.findByPerformanceIdIn(
          new ArrayList<>(performanceIds));

      for (Performance p : performances) {
        try {
          // 문자열 → 벡터 변환
          List<Double> vec = embeddingVectorUtil.parseToList(p.getEmbeddingVector());

          if (vec == null || vec.size() != VectorEmbeddingAggregator.VECTOR_DIM) continue;

          // performanceId → 벡터
          embeddingMap.put(p.getPerformanceId(), vec);
        } catch (Exception ignored) {}
      }
    }

    // 사용자 행동 로그 + 공연 벡터를 기반으로 가중 평균 벡터 계산 (시간 감쇠 + 이벤트 가중치 적용)
    List<Double> userVector = vectorEmbeddingAggregator.buildUserEmbeddingVector(logs, embeddingMap);

    // List<Double> → JSON 문자열로 직렬화 (DB 저장용)
    String vectorJson;
    try {
      vectorJson = objectMapper.writeValueAsString(userVector);
    } catch (JsonProcessingException e) {
      return;
    }

    // 계산된 유저 벡터를 JSON 형태로 DB에 저장 (insert or update)
    UserPreferenceVector entity = vectorRepository.findById(userId)
        .orElseGet(() -> {
          UserPreferenceVector v = new UserPreferenceVector();
          v.setUser(user);
          return v;
        });

    entity.setEmbeddingVector(vectorJson);
    vectorRepository.save(entity);
  }

}


