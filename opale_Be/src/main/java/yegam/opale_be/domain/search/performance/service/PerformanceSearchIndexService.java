package yegam.opale_be.domain.search.performance.service;

import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;

import org.springframework.data.elasticsearch.core.suggest.Completion;

import yegam.opale_be.domain.culture.performance.entity.Performance;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.search.performance.document.PerformanceSearchDocument;
import yegam.opale_be.domain.search.performance.dto.PerformanceAutoCompleteResponseDto;
import yegam.opale_be.domain.search.performance.mapper.PerformanceAutoCompleteMapper;
import yegam.opale_be.domain.search.performance.repository.PerformanceSearchRepository;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PerformanceSearchIndexService {

  private final PerformanceRepository performanceRepository;
  private final PerformanceSearchRepository searchRepository;
  private final ElasticsearchOperations elasticsearchOperations;

  /** MySQL → Elasticsearch 전체 색인 */
  @Transactional
  public void syncAllToElasticsearch() {

    // DB에서 모든 공연 목록을 가져옴.
    List<PerformanceSearchDocument> docs =
        performanceRepository.findAll().stream()
            .map(p -> PerformanceSearchDocument.builder()
                .performanceId(p.getPerformanceId())
                .title(p.getTitle())
                .genrenm(p.getGenrenm())
                .placeName(p.getPlaceName())

                .startDate(p.getStartDate() != null ? p.getStartDate().getTime() : null)
                .endDate(p.getEndDate() != null ? p.getEndDate().getTime() : null)

                .aiSummary(p.getAiSummary())

                .aiKeywords(
                    p.getAiKeywords() == null
                        ? List.of()
                        : Arrays.stream(p.getAiKeywords().split(","))
                            .map(String::trim)
                            .toList()
                )

                .titleSuggest(new Completion(List.of(p.getTitle())))
                .build())
            .toList();

    // 그걸 ES에 저장.
    searchRepository.saveAll(docs);
  }

  /** ES 단순 조회용 : 오타 허용 + 부분 검색 + 정확도 순 정렬 */
  @Transactional(readOnly = true)
  public List<PerformanceSearchDocument> search(String keyword) {

    // ES에 보낼 검색 조건
    NativeQuery query = NativeQuery.builder()
        .withQuery(q -> q
            .bool(b -> b
                .should(s -> s.matchPhrasePrefix(m -> m.field("title").query(keyword).boost(3.0f)))
                .should(s -> s.prefix(p -> p.field("title").value(keyword).boost(2.0f)))
                .should(s -> s.match(m -> m.field("title").query(keyword).fuzziness("AUTO").boost(1.0f)))
            )
        )
        .withMaxResults(20)
        .build();

    try {
      SearchHits<PerformanceSearchDocument> hits =
          elasticsearchOperations.search(query, PerformanceSearchDocument.class);
      return hits.getSearchHits()
          .stream()
          .map(SearchHit::getContent)
          .toList();
    } catch (Exception e) {
      log.warn("ES search() 실패: {}", e.getMessage());
      return List.of();
    }
  }

  /** 자동완성 섹션에서 호출: 자동완성 공연 검색 (MySQL에서 공연 관련 추가 필드까지 끌어오기) */
  @Transactional(readOnly = true)
  public List<PerformanceAutoCompleteResponseDto> autoComplete(String keyword) {

    // ES 검색 조건
    NativeQuery query = NativeQuery.builder()
        .withQuery(q -> q
            .bool(b -> b
                .should(s -> s.matchPhrasePrefix(m -> m.field("title").query(keyword).boost(5.0f)))
                .should(s -> s.prefix(p -> p.field("title").value(keyword).boost(3.0f)))
                .should(s -> s.match(m -> m.field("title").query(keyword).fuzziness("AUTO").boost(1.0f)))
            )
        )
        .withMaxResults(10)
        .build();

    try {
      SearchHits<PerformanceSearchDocument> hits =
          elasticsearchOperations.search(query, PerformanceSearchDocument.class);

      List<String> ids = hits.getSearchHits()
          .stream()
          .map(hit -> hit.getContent().getPerformanceId())
          .toList();

      List<Performance> performances =
          performanceRepository.findByPerformanceIdIn(ids);

      Map<String, Performance> performanceMap =
          performances.stream()
              .collect(Collectors.toMap(Performance::getPerformanceId, p -> p));

      return hits.getSearchHits()
          .stream()
          .map(hit -> {
            String id = hit.getContent().getPerformanceId();
            Performance p = performanceMap.get(id);
            if (p == null) return null;
            return PerformanceAutoCompleteMapper.toDto(p);
          })
          .filter(Objects::nonNull)
          .toList();

    } catch (Exception e) {
      log.warn("ES autoComplete() 실패, MySQL fallback: {}", e.getMessage());
      return performanceRepository.search(null, keyword, null, null, PageRequest.of(0, 10))
          .getContent().stream()
          .map(PerformanceAutoCompleteMapper::toDto)
          .toList();
    }
  }

  /** 공연 검색 목록 페이지: 정확도 순 performanceId 리스트 반환(ES), 이후 DB에서 실제 데이터를 조회하기 위한 용도 */
  @Transactional(readOnly = true)
  public List<String> searchIdsByAccuracy(String keyword, int page, int size) {

    // 검색 조건
    NativeQuery query = NativeQuery.builder()
        .withQuery(q -> q
            .bool(b -> b
                .should(s -> s.matchPhrasePrefix(m -> m.field("title").query(keyword).boost(5.0f)))
                .should(s -> s.prefix(p -> p.field("title").value(keyword).boost(3.0f)))
                .should(s -> s.match(m -> m.field("title").query(keyword).fuzziness("AUTO").boost(1.0f)))
            )
        )
        .withPageable(PageRequest.of(page, size)) // 페이지네이션
        .build();

    try {
      SearchHits<PerformanceSearchDocument> hits =
          elasticsearchOperations.search(query, PerformanceSearchDocument.class);
      return hits.getSearchHits()
          .stream()
          .map(hit -> hit.getContent().getPerformanceId())
          .toList();
    } catch (Exception e) {
      log.warn("ES searchIdsByAccuracy() 실패, MySQL fallback: {}", e.getMessage());
      return performanceRepository.search(null, keyword, null, null, PageRequest.of(page, size))
          .getContent().stream()
          .map(Performance::getPerformanceId)
          .toList();
    }
  }

}
