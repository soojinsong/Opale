package yegam.opale_be.domain.user.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.culture.performance.entity.Performance;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.preference.entity.UserPreferenceVector;
import yegam.opale_be.domain.preference.repository.UserPreferenceVectorRepository;
import yegam.opale_be.domain.user.dto.request.OnboardingRequestDto;
import yegam.opale_be.domain.user.entity.User;
import yegam.opale_be.domain.user.exception.UserErrorCode;
import yegam.opale_be.domain.user.repository.UserRepository;
import yegam.opale_be.global.exception.CustomException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OnboardingService {

  private final UserRepository userRepository;
  private final PerformanceRepository performanceRepository;
  private final UserPreferenceVectorRepository preferenceVectorRepository;
  private final ObjectMapper objectMapper;

  private static final int VECTOR_DIM = 1536;
  private static final int PERFORMANCES_PER_GENRE = 5;

  public void completeOnboarding(Long userId, OnboardingRequestDto dto) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new CustomException(UserErrorCode.USER_NOT_FOUND));

    List<String> genres = dto.getGenres();
    if (genres != null && !genres.isEmpty()) {
      List<List<Double>> vectors = collectVectors(genres);
      if (!vectors.isEmpty()) {
        List<Double> averaged = averageVectors(vectors);
        saveOrUpdateVector(user, averaged);
      }
    }

    user.setOnboardingCompleted(true);
  }

  private List<List<Double>> collectVectors(List<String> genres) {
    List<List<Double>> vectors = new ArrayList<>();
    for (String genre : genres) {
      List<Performance> performances = performanceRepository.findPopularByGenre(
          genre, PageRequest.of(0, PERFORMANCES_PER_GENRE)
      );
      for (Performance p : performances) {
        if (p.getEmbeddingVector() == null || p.getEmbeddingVector().isBlank()) continue;
        try {
          Double[] arr = objectMapper.readValue(p.getEmbeddingVector(), Double[].class);
          if (arr != null && arr.length == VECTOR_DIM) {
            vectors.add(Arrays.asList(arr));
          }
        } catch (JsonProcessingException e) {
          log.warn("임베딩 파싱 실패 (performanceId={}): {}", p.getPerformanceId(), e.getMessage());
        }
      }
    }
    return vectors;
  }

  private List<Double> averageVectors(List<List<Double>> vectors) {
    double[] acc = new double[VECTOR_DIM];
    for (List<Double> v : vectors) {
      for (int i = 0; i < VECTOR_DIM; i++) {
        acc[i] += v.get(i);
      }
    }
    List<Double> result = new ArrayList<>(VECTOR_DIM);
    int count = vectors.size();
    for (int i = 0; i < VECTOR_DIM; i++) {
      result.add(acc[i] / count);
    }
    return result;
  }

  private void saveOrUpdateVector(User user, List<Double> vector) {
    try {
      String json = objectMapper.writeValueAsString(vector);
      UserPreferenceVector entity = preferenceVectorRepository.findById(user.getUserId())
          .orElse(UserPreferenceVector.builder().user(user).build());
      entity.setEmbeddingVector(json);
      preferenceVectorRepository.save(entity);
      log.info("온보딩 벡터 저장 완료: userId={}", user.getUserId());
    } catch (JsonProcessingException e) {
      log.error("벡터 직렬화 실패: userId={}", user.getUserId(), e);
    }
  }
}
