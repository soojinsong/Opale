package yegam.opale_be.domain.recommendation.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import yegam.opale_be.domain.analytics.entity.UserEventLog;
import yegam.opale_be.domain.analytics.repository.UserEventLogRepository;
import yegam.opale_be.domain.chat.room.entity.ChatRoom;
import yegam.opale_be.domain.chat.room.repository.ChatRoomRepository;
import yegam.opale_be.domain.culture.performance.entity.Performance;
import yegam.opale_be.domain.culture.performance.exception.PerformanceErrorCode;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.place.entity.Place;
import yegam.opale_be.domain.place.repository.PlaceRepository;
import yegam.opale_be.domain.preference.entity.UserPreferenceVector;
import yegam.opale_be.domain.preference.repository.UserPreferenceVectorRepository;
import yegam.opale_be.domain.preference.service.GlobalPreferenceService;
import yegam.opale_be.domain.recommendation.dto.response.*;
import yegam.opale_be.domain.recommendation.exception.RecommendationErrorCode;
import yegam.opale_be.domain.recommendation.mapper.RecommendationMapper;
import yegam.opale_be.domain.recommendation.util.EmbeddingVectorUtil;
import yegam.opale_be.domain.recommendation.util.PineconeClientUtil;
import yegam.opale_be.domain.recommendation.util.PineconeMatch;
import yegam.opale_be.global.exception.CustomException;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;


/**
 * 추천(Recommendation) 결과를 생성하고 제공 (조회 + 가공 + 캐싱 포함)
 * : 현재는 벡터 DB로 부터 조건(사용자 선호 벡터)에 맞는 공연들을 가져와서 반환.
 * (인기, 장르 추천은 Redis로 캐시 관리)
 *
 * ----------------------------------------------------------------------------
 * 벡터 DB 사용
 * - buildVectorBasedRecommendation() : Pinecone에서 유사도 기반 공연 조회
 * - getUserRecommendations() : 사용자 선호 벡터 기반 추천
 * - getUserRecommendationsByAdmin() : 특정 사용자 기준 추천
 * - getSimilarPerformances() : 특정 공연 기준 유사 공연 추천
 * - getRecentSimilarRecommendations() : 최근 본 공연 기반 추천
 *
 * 레디스 사용
 * - getGenreRecommendations() : 장르별 추천 캐싱
 * - getPopularRecommendations() : 인기 공연 추천 캐싱
 *
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationService {

  private final UserPreferenceVectorRepository preferenceRepository;
  private final PerformanceRepository performanceRepository;
  private final PlaceRepository placeRepository;
  private final ChatRoomRepository chatRoomRepository;
  private final UserEventLogRepository userEventLogRepository;

  private final RecommendationMapper recommendationMapper;
  private final EmbeddingVectorUtil embeddingVectorUtil;
  private final PineconeClientUtil pineconeClientUtil;
  private final GlobalPreferenceService globalPreferenceService;

  /** Redis */
  private final StringRedisTemplate redisTemplate;

  /** LocalDate 직렬화 대응 */
  private final ObjectMapper objectMapper = new ObjectMapper()
      .registerModule(new JavaTimeModule())
      .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

  private static final long POPULAR_CACHE_TTL_MINUTES = 30;
  private static final String POPULAR_CACHE_KEY = "recommendation:popular";
  private static final String GENRE_CACHE_KEY_PREFIX = "recommendation:genre:";

  // 상수
  private static final double SIMILARITY_WEIGHT = 0.6;
  private static final double RECENCY_WEIGHT = 0.2;
  private static final double POPULARITY_WEIGHT = 0.2;
  private static final double DECAY_DAYS = 30.0;

  // utils
  // 기본값 = 10, 최대 제한 = 50
  private String normalizeSort(String sort) {
    if (sort == null || sort.isBlank()) return "auto";
    return sort.toLowerCase();
  }
  // 입력값 정리(null 방지, 대소문자 통일)
  private int normalizeSize(Integer size) {
    if (size == null || size <= 0) return 10;
    if (size > 50) return 50;
    return size;
  }

  // 최신 여부 계산용.
  private double calculateRecency(LocalDate startDate, LocalDate now) {
    if (startDate == null) return 0.0;

    long daysDiff = ChronoUnit.DAYS.between(now, startDate);

    // 미래/과거 분리 처리
    if (daysDiff >= 0) {
      // 미래 공연: 너무 멀면 오히려 감점
      return Math.exp(-daysDiff / DECAY_DAYS);
    } else {
      // 과거 공연: 시간이 지날수록 감소
      return Math.exp(daysDiff / DECAY_DAYS);
    }
  }


  // 초기 Pinecone 결과 순서를 기반으로 DTO 생성 후,
  // 최종 점수 또는 옵션에 따라 재정렬
  private RecommendationPerformanceListResponseDto buildVectorBasedRecommendation(
      List<Double> vector, int size, String sort
  ) {
    // 정렬
    String normalizedSort = normalizeSort(sort); // sort 옵션 저장. ("latest"/"auto")
    int topK = normalizeSize(size); // 벡터DB에서 가져 올 개수

    // 벡터 DB에서 가져옴
    List<PineconeMatch> matches = pineconeClientUtil.query(vector, topK);

    // 비워져 있다면, 0개인 리스트로 Dto 생성
    if (matches.isEmpty()) {
      return RecommendationPerformanceListResponseDto.builder()
          .totalCount(0)
          .requestedSize(topK)
          .sort(normalizedSort)
          .recommendations(List.of())
          .build();
    }


    // 벡터 DB에서 가져온 결과를 기반으로 ID + score 추출.
    List<String> ids = matches.stream().map(PineconeMatch::getId).toList();

    Map<String, Double> scoreMap = matches.stream()
        .collect(Collectors.toMap(PineconeMatch::getId, PineconeMatch::getScore));

    // DB 조회
    List<Performance> performances = performanceRepository.findByPerformanceIdIn(ids);

    Map<String, Performance> performanceMap = performances.stream()
        .collect(Collectors.toMap(Performance::getPerformanceId, p -> p));



    LocalDate now = LocalDate.now();

    long maxViewCount = performances.stream()
        .mapToLong(p -> p.getViewCount() != null ? p.getViewCount() : 0L)
        .max()
        .orElse(1L);

    List<RecommendedPerformanceDto> dtoList = new ArrayList<>();

    for (String id : ids) {
      Performance p = performanceMap.get(id);
      if (p == null) continue;

      double similarity = scoreMap.getOrDefault(id, 0.0);

      double recency = 0.0;
      if (p.getStartDate() != null) {
        recency = calculateRecency(p.getStartDate().toLocalDate(), now);
      }

      long viewCount = p.getViewCount() != null ? p.getViewCount() : 0L;
      double popularity = (double) viewCount / Math.max(maxViewCount, 1L);

      double finalScore =
          similarity * SIMILARITY_WEIGHT +
          recency   * RECENCY_WEIGHT +
          popularity * POPULARITY_WEIGHT;

      dtoList.add(recommendationMapper.toPerformance(p, finalScore));
    }

    // 최종 점수 순으로 dto 리스트로 변환.
    dtoList.sort(Comparator.comparing(
        RecommendedPerformanceDto::getScore
    ).reversed());
    
//    // 정렬 옵션에 따라 정렬.
//    if ("latest".equals(normalizedSort)) {
//      dtoList.sort(Comparator.comparing(
//          RecommendedPerformanceDto::getStartDate,
//          Comparator.nullsLast(Comparator.reverseOrder())
//      ));
//    } else {
//      dtoList.sort(Comparator.comparing(
//          RecommendedPerformanceDto::getScore
//      ).reversed());
//    }

    // dto로 만들고 보내기.
    return RecommendationPerformanceListResponseDto.builder()
        .totalCount(dtoList.size())
        .requestedSize(topK)
        .sort(normalizedSort)
        .recommendations(dtoList)
        .build();
  }


  // (벡터 DB 사용) 로그인한 사용자에게 개인화 추천 - 사용자 벡터가 없으면 인기 공연 fallback
  @Transactional
  public RecommendationPerformanceListResponseDto getUserRecommendations(
      Long userId, Integer size, String sort
  ) {
    UserPreferenceVector vec = preferenceRepository.findById(userId).orElse(null);

    if (vec == null || vec.getEmbeddingVector() == null || vec.getEmbeddingVector().isBlank()) {
      log.info("콜드 스타터 감지 → 인기 공연 fallback, userId={}", userId);
      return getPopularRecommendations(size);
    }

    List<Double> vector;
    try {
      vector = embeddingVectorUtil.parseToList(vec.getEmbeddingVector());
    } catch (Exception e) {
      log.warn("벡터 파싱 실패 → 인기 공연 fallback, userId={}", userId);
      return getPopularRecommendations(size);
    }

    return buildVectorBasedRecommendation(vector, size, sort);
  }

  // (벡터 DB 사용) 운영자용 사용자 추천 (userId 직접 입력)
  public RecommendationPerformanceListResponseDto getUserRecommendationsByAdmin(
      Long userId, Integer size, String sort
  ) {
    // 선택한 사용자의 선호에 맞춰서, 벡터 DB에서 공연들을 가져옴.
    return getUserRecommendations(userId, size, sort);
  }

  // (벡터 DB 사용) 특정 공연의 임베딩 벡터를 기준으로 유사 공연 추천
  public RecommendationPerformanceListResponseDto getSimilarPerformances(
      String performanceId, Integer size, String sort
  ) {
    // 특정 공연을 가져옴.
    Performance p = performanceRepository.findById(performanceId)
        .orElseThrow(() -> new CustomException(PerformanceErrorCode.PERFORMANCE_NOT_FOUND));

    // 그 공연의 벡터값이 없으면 예외 처리.
    if (p.getEmbeddingVector() == null || p.getEmbeddingVector().isBlank()) {
      throw new CustomException(RecommendationErrorCode.PERFORMANCE_VECTOR_NOT_FOUND);
    }

    // 공연 벡터를 리스트화 시키고, 벡터 DB에서 공연들을 가져옴.
    List<Double> vector = embeddingVectorUtil.parseToList(p.getEmbeddingVector());
    RecommendationPerformanceListResponseDto result =
        buildVectorBasedRecommendation(vector, size, sort);

    // 특정 공연은 그 중에서 삭제.
    List<RecommendedPerformanceDto> filtered = result.getRecommendations().stream()
        .filter(dto -> !performanceId.equals(dto.getPerformanceId()))
        .toList();

    // 리스트 필드를 변경하고 반환.
    result.setRecommendations(filtered);
    result.setTotalCount(filtered.size());
    return result;
  }

  
  // 장르 기반 추천 (Redis 캐싱 적용)
  public RecommendationPerformanceListResponseDto getGenreRecommendations(
      String genre, Integer size, String sort
  ) {
    // sort 옵션 전처리("latest", "Popular"), 사이즈 재기.
    String normalizedSort = normalizeSort(sort);
    int limit = normalizeSize(size);
    PageRequest pageable = PageRequest.of(0, limit);


    // Redis에 저장할 키 (genre + 정렬 + 사이즈 기준으로 캐시 분리)
    String cacheKey = GENRE_CACHE_KEY_PREFIX + genre + ":" + normalizedSort + ":" + limit;

    // Redis에 접근해서 장르 기반 추천 값이 있는지 조회.
    try {
      String cached = redisTemplate.opsForValue().get(cacheKey);
      if (cached != null) {
        // 있으면 그거 반환.
        return objectMapper.readValue(cached, RecommendationPerformanceListResponseDto.class);
      }
    } catch (Exception e) {
      log.warn("Genre Redis 캐시 파싱 실패");
    }


    // performanceRepository에서 해당 공연 찾아오기
    List<Performance> performances =
        "latest".equals(normalizedSort)
            ? performanceRepository.findLatestByGenre(genre, pageable)
            : performanceRepository.findPopularByGenre(genre, pageable);

    // dto 리스트로 변환.
    List<RecommendedPerformanceDto> dtoList =
        performances.stream().map(p -> recommendationMapper.toPerformance(p, null)).toList();

    // 필드 반영해서 리스트 만들기.
    RecommendationPerformanceListResponseDto response =
        RecommendationPerformanceListResponseDto.builder()
            .totalCount(dtoList.size())
            .requestedSize(limit)
            .sort(normalizedSort)
            .recommendations(dtoList)
            .build();

    // 나온 결과를 Redis에 반영.
    try {
      redisTemplate.opsForValue().set(
          cacheKey,
          objectMapper.writeValueAsString(response),
          POPULAR_CACHE_TTL_MINUTES,
          TimeUnit.MINUTES
      );
    } catch (Exception e) {
      log.warn("Genre Redis 저장 실패");
    }

    // 나온 결과 반환.
    return response;
  }

  // 인기 공연 추천 (Redis 캐싱 적용)
  public RecommendationPerformanceListResponseDto getPopularRecommendations(Integer size) {

    // 사이즈 계산.
    int limit = normalizeSize(size);
    PageRequest pageable = PageRequest.of(0, limit);

    // 캐시 키 (정렬 + 사이즈 기준으로 캐시 분리)
    String cacheKey = POPULAR_CACHE_KEY + ":" + limit;

    // 인기 공연 Redis에서 있는지 조회.
    try {
      String cached = redisTemplate.opsForValue().get(cacheKey);
      if (cached != null) {
        // 있으면 그거 반환.
        return objectMapper.readValue(cached, RecommendationPerformanceListResponseDto.class);
      }
    } catch (Exception e) {
      log.warn("Popular Redis 캐시 파싱 실패");
    }



    // 공연을 인기순으로 가져옴.
    List<Performance> list = performanceRepository.findPopularPerformances(pageable);

    // dto 리스트로 변환.
    List<RecommendedPerformanceDto> dtoList =
        list.stream().map(p -> recommendationMapper.toPerformance(p, null)).toList();

    // 필드에 반영해서 리스트 만듦.
    RecommendationPerformanceListResponseDto response =
        RecommendationPerformanceListResponseDto.builder()
            .totalCount(dtoList.size())
            .requestedSize(limit)
            .sort("popularity")
            .recommendations(dtoList)
            .build();

    // Redis에 저장.
    try {
      redisTemplate.opsForValue().set(
          cacheKey,
          objectMapper.writeValueAsString(response),
          POPULAR_CACHE_TTL_MINUTES,
          TimeUnit.MINUTES
      );
    } catch (Exception e) {
      log.warn("Popular Redis 저장 실패");
    }

    // 결과 반환.
    return response;
  }

  // 최신 공연 추천
  public RecommendationPerformanceListResponseDto getLatestRecommendations(Integer size) {
    // 사이즈 계산.
    int limit = normalizeSize(size);
    PageRequest pageable = PageRequest.of(0, limit);

    // 공연을 최신순으로 가져옴.
    List<Performance> list = performanceRepository.findLatestPerformances(pageable);

    // dto 리스트로 변환.
    List<RecommendedPerformanceDto> dtoList =
        list.stream().map(p -> recommendationMapper.toPerformance(p, null)).toList();

    // 필드에 반영해서 리스트 만듦.
    return RecommendationPerformanceListResponseDto.builder()
        .totalCount(dtoList.size())
        .requestedSize(limit)
        .sort("latest")
        .recommendations(dtoList)
        .build();
  }

  // 인기 공연장 추천
  public RecommendationPlaceListResponseDto getPopularPlaces(Integer size) {

    // 사이즈 계산.
    int limit = normalizeSize(size);
    PageRequest pageable = PageRequest.of(0, limit);

    // 공연장을 인기순으로 가져옴.
    List<Place> list = placeRepository.findPopularPlaces(pageable);

    // dto 리스트로 변환.
    List<RecommendedPlaceDto> dtoList =
        list.stream().map(recommendationMapper::toPlace).toList();

    // 필드에 반영해서 리스트 만듦.
    return RecommendationPlaceListResponseDto.builder()
        .totalCount(dtoList.size())
        .requestedSize(limit)
        .sort("popularity")
        .recommendations(dtoList)
        .build();
  }

  // 인기 채팅방 추천
  public RecommendationChatRoomListResponseDto getPopularChatRooms(Integer size) {

    // 사이즈 계산.
    int limit = normalizeSize(size);
    PageRequest pageable = PageRequest.of(0, limit);

    // 채팅방을 인기순으로 가져옴.
    List<ChatRoom> list = chatRoomRepository.findPopularChatRooms(pageable);

    // dto 리스트로 변환.
    List<RecommendedChatRoomDto> dtoList =
        list.stream().map(recommendationMapper::toChatRoom).toList();

    // 필드에 반영해서 리스트 만듦.
    return RecommendationChatRoomListResponseDto.builder()
        .totalCount(dtoList.size())
        .requestedSize(limit)
        .sort("popularity")
        .recommendations(dtoList)
        .build();
  }

  // 사용자가 가장 최근에 조회한 공연 ID 조회
  public String getRecentViewedPerformance(Long userId) {

    // 사용자의 가장 최근 조회 행동 로그를 가져옴.
    var log = userEventLogRepository
        .findTopByUser_UserIdAndEventTypeOrderByCreatedAtDesc(
            userId, UserEventLog.EventType.VIEW
        ).orElse(null);

    // 없거나 공연이 아니면 에러보냄.
    if (log == null || !"PERFORMANCE".equalsIgnoreCase(log.getTargetType().name())) {
      throw new CustomException(RecommendationErrorCode.RECENT_PERFORMANCE_NOT_FOUND);
    }

    // 가장 최근에 조회한 공연 id를 반환.
    return log.getTargetId();
  }

  // (벡터 DB 사용) 최근 본 공연 → 유사 공연 추천
  public RecommendationPerformanceListResponseDto getRecentSimilarRecommendations(
      Long userId, Integer size, String sort
  ) {
    // 사용자가 가장 최근 본 공연 id를 조회.
    String recentPerformanceId = getRecentViewedPerformance(userId);
    // 그 공연과 비슷한 공연들을 벡터 DB에서 가져옴.
    return getSimilarPerformances(recentPerformanceId, size, sort);
  }

}
