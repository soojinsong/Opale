package yegam.opale_be.domain.chatbot.service;

import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.chatbot.dto.response.ChatbotPerformanceDto;
import yegam.opale_be.domain.chatbot.dto.response.ChatbotQueryRouteDto;
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

  public List<ChatbotPerformanceDto> retrieve(ChatbotQueryRouteDto route, Long userId) {
    return switch (route.getQueryType()) {
      case "PERSONALIZED" -> retrievePersonalized(userId, route.getKeyword());
      case "INFO" -> retrieveInfo(route.getKeyword());
      default -> retrieveByKeyword(route.getKeyword()); // KEYWORD, SEMANTIC
    };
  }

  private List<ChatbotPerformanceDto> retrieveByKeyword(String keyword) {
    if (keyword == null || keyword.isBlank()) return List.of();
    List<String> ids = searchIndexService.searchForChatbot(keyword);
    return fetchAndConvert(ids);
  }

  private List<ChatbotPerformanceDto> retrievePersonalized(Long userId, String keyword) {
    if (userId == null) {
      log.info("PERSONALIZED 요청이지만 비로그인 → KEYWORD fallback");
      return retrieveByKeyword(keyword);
    }
    try {
      Optional<UserPreferenceVector> vectorOpt = preferenceVectorRepository.findById(userId);
      if (vectorOpt.isEmpty()) {
        log.info("유저 벡터 없음 → KEYWORD fallback, userId={}", userId);
        return retrieveByKeyword(keyword);
      }
      List<Double> vector = embeddingVectorUtil.parseToList(vectorOpt.get().getEmbeddingVector());
      if (vector == null) {
        log.info("벡터 파싱 실패 → KEYWORD fallback, userId={}", userId);
        return retrieveByKeyword(keyword);
      }
      List<PineconeMatch> matches = pineconeClientUtil.query(vector, CHATBOT_TOP_K);
      List<String> ids = matches.stream().map(PineconeMatch::getId).toList();
      return fetchAndConvert(ids);
    } catch (Exception e) {
      log.warn("PERSONALIZED 검색 실패 → KEYWORD fallback: {}", e.getMessage());
      return retrieveByKeyword(keyword);
    }
  }

  private List<ChatbotPerformanceDto> retrieveInfo(String keyword) {
    if (keyword == null || keyword.isBlank()) return List.of();
    List<String> ids = searchIndexService.searchForChatbot(keyword);
    if (!ids.isEmpty()) return fetchAndConvert(ids);
    return performanceRepository.search(null, keyword, null, null, PageRequest.of(0, CHATBOT_TOP_K))
        .getContent().stream()
        .map(this::toDto)
        .toList();
  }

  private List<ChatbotPerformanceDto> fetchAndConvert(List<String> ids) {
    if (ids.isEmpty()) return List.of();
    return performanceRepository.findByPerformanceIdIn(ids).stream()
        .map(this::toDto)
        .toList();
  }

  private ChatbotPerformanceDto toDto(Performance p) {
    return ChatbotPerformanceDto.builder()
        .performanceId(p.getPerformanceId())
        .title(p.getTitle())
        .genrenm(p.getGenrenm())
        .placeName(p.getPlaceName())
        .poster(p.getPoster())
        .startDate(p.getStartDate() != null ? p.getStartDate().toString() : null)
        .endDate(p.getEndDate() != null ? p.getEndDate().toString() : null)
        .build();
  }
}
