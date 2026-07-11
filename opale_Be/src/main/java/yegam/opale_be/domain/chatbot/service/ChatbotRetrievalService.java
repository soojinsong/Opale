package yegam.opale_be.domain.chatbot.service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.chatbot.dto.response.ChatbotPerformanceDto;
import yegam.opale_be.domain.chatbot.dto.response.ChatbotQueryRouteDto;
import yegam.opale_be.domain.culture.performance.dto.response.detail.PerformanceRelationResponseDto;
import yegam.opale_be.domain.culture.performance.entity.Performance;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.preference.entity.UserPreferenceVector;
import yegam.opale_be.domain.preference.repository.UserPreferenceVectorRepository;
import yegam.opale_be.domain.recommendation.util.EmbeddingVectorUtil;
import yegam.opale_be.domain.recommendation.util.PineconeClientUtil;
import yegam.opale_be.domain.recommendation.util.PineconeMatch;
import yegam.opale_be.domain.search.performance.service.PerformanceSearchIndexService;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatbotRetrievalService {

  private final PerformanceSearchIndexService searchIndexService;
  private final PerformanceRepository performanceRepository;
  private final UserPreferenceVectorRepository preferenceVectorRepository;
  private final PineconeClientUtil pineconeClientUtil;
  private final EmbeddingVectorUtil embeddingVectorUtil;

  private static final int CHATBOT_TOP_K = 5;
  private static final int PERSONALIZED_FILTER_TOP_K = 30;

  public List<ChatbotPerformanceDto> retrieve(ChatbotQueryRouteDto route, Long userId) {
    return switch (route.getQueryType()) {
      case "PERSONALIZED" -> retrievePersonalized(userId, route);
      case "INFO" -> retrieveInfo(route.getKeyword(), route.getPlace(), route.getGenre());
      default -> retrieveByKeyword(route.getKeyword(), route.getPlace(), route.getGenre()); // KEYWORD, SEMANTIC
    };
  }

  private List<ChatbotPerformanceDto> retrieveByKeyword(String keyword, String place, String genre) {
    if (isBlank(keyword) && isBlank(place) && isBlank(genre)) return List.of();
    List<String> ids = searchIndexService.searchForChatbot(keyword, place, genre);
    return fetchAndConvert(ids);
  }

  private List<ChatbotPerformanceDto> retrievePersonalized(Long userId, ChatbotQueryRouteDto route) {
    if (userId == null) {
      log.info("PERSONALIZED 요청이지만 비로그인 → KEYWORD fallback");
      return retrieveByKeyword(route.getKeyword(), route.getPlace(), route.getGenre());
    }
    try {
      Optional<UserPreferenceVector> vectorOpt = preferenceVectorRepository.findById(userId);
      if (vectorOpt.isEmpty()) {
        log.info("유저 벡터 없음 → KEYWORD fallback, userId={}", userId);
        return retrieveByKeyword(route.getKeyword(), route.getPlace(), route.getGenre());
      }
      List<Double> vector = embeddingVectorUtil.parseToList(vectorOpt.get().getEmbeddingVector());
      if (vector == null) {
        log.info("벡터 파싱 실패 → KEYWORD fallback, userId={}", userId);
        return retrieveByKeyword(route.getKeyword(), route.getPlace(), route.getGenre());
      }

      boolean hasFilter = !isBlank(route.getPlace()) || !isBlank(route.getGenre());
      if (!hasFilter) {
        List<PineconeMatch> matches = pineconeClientUtil.query(vector, CHATBOT_TOP_K);
        List<String> ids = matches.stream().map(PineconeMatch::getId).toList();
        return fetchAndConvert(ids);
      }

      // Pinecone은 취향 유사도만 반영해서 place/genre를 모른다 → 후보를 넉넉히 뽑아 직접 필터링
      List<PineconeMatch> matches = pineconeClientUtil.query(vector, PERSONALIZED_FILTER_TOP_K);
      List<String> ids = matches.stream().map(PineconeMatch::getId).toList();
      List<Performance> ordered = fetchOrderedByIds(ids);

      List<Performance> filtered = ordered.stream()
          .filter(p -> isBlank(route.getGenre()) || route.getGenre().equals(p.getGenrenm()))
          .filter(p -> isBlank(route.getPlace()) || placeMatches(p.getPlaceName(), route.getPlace()))
          .limit(CHATBOT_TOP_K)
          .toList();

      if (!filtered.isEmpty()) {
        return filtered.stream().map(this::toDto).toList();
      }

      log.info("PERSONALIZED 결과가 place/genre 조건과 안 맞음 → KEYWORD fallback, userId={}", userId);
      return retrieveByKeyword(route.getKeyword(), route.getPlace(), route.getGenre());
    } catch (Exception e) {
      log.warn("PERSONALIZED 검색 실패 → KEYWORD fallback: {}", e.getMessage());
      return retrieveByKeyword(route.getKeyword(), route.getPlace(), route.getGenre());
    }
  }

  private List<ChatbotPerformanceDto> retrieveInfo(String keyword, String place, String genre) {
    // INFO는 "특정 공연 하나를 찾는" 질의라 keyword(제목 단서) 없이는 검색이 성립하지 않음.
    // keyword 없이 genre/place만으로 진행하면 동명 장르의 무관한 공연이 걸려 나와
    // "모른다"는 답변 텍스트와 근거 공연 카드가 서로 안 맞는 상황이 생김 (grounding 깨짐).
    if (isBlank(keyword)) return List.of();

    List<String> ids = searchIndexService.searchForChatbotInfo(keyword, place, genre);
    if (!ids.isEmpty()) return fetchAndConvert(ids);

    String fallbackKeyword = !isBlank(place) ? place : keyword;
    return performanceRepository.search(genre, fallbackKeyword, null, null, PageRequest.of(0, CHATBOT_TOP_K))
        .getContent().stream()
        .map(this::toDto)
        .toList();
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private List<ChatbotPerformanceDto> fetchAndConvert(List<String> ids) {
    if (ids.isEmpty()) return List.of();
    return performanceRepository.findByPerformanceIdIn(ids).stream()
        .map(this::toDto)
        .toList();
  }

  /** findByPerformanceIdIn은 ids 순서를 보장하지 않으므로, Pinecone 유사도 순위(ids 순서)를 그대로 복원 */
  private List<Performance> fetchOrderedByIds(List<String> ids) {
    if (ids.isEmpty()) return List.of();
    Map<String, Performance> byId = performanceRepository.findByPerformanceIdIn(ids).stream()
        .collect(Collectors.toMap(Performance::getPerformanceId, p -> p));
    return ids.stream().map(byId::get).filter(Objects::nonNull).toList();
  }

  private boolean placeMatches(String placeName, String place) {
    if (placeName == null) return false;
    return Arrays.stream(place.split("\\s+")).anyMatch(placeName::contains);
  }

  private ChatbotPerformanceDto toDto(Performance p) {
    List<PerformanceRelationResponseDto> bookingSites = p.getPerformanceRelations() == null
        ? List.of()
        : p.getPerformanceRelations().stream()
            .map(r -> PerformanceRelationResponseDto.builder()
                .relationId(r.getRelationId())
                .siteName(r.getSiteName())
                .siteUrl(r.getSiteUrl())
                .build())
            .toList();

    return ChatbotPerformanceDto.builder()
        .performanceId(p.getPerformanceId())
        .title(p.getTitle())
        .genrenm(p.getGenrenm())
        .placeName(p.getPlaceName())
        .poster(p.getPoster())
        .startDate(p.getStartDate() != null ? p.getStartDate().toString() : null)
        .endDate(p.getEndDate() != null ? p.getEndDate().toString() : null)
        .bookingSites(bookingSites)
        .build();
  }
}
