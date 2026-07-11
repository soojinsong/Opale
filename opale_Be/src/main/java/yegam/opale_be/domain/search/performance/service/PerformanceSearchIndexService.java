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
import java.util.Comparator;
import java.util.Set;

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
                // DB엔 "경기도"/"서울특별시"처럼 접미사 포함 전체 행정명으로 저장돼 있어서,
                // 챗봇 검색어(normalizedPlace)와 같은 규칙으로 접미사를 떼어 정규화해야 term 매칭이 맞음
                .area(p.getArea() != null ? stripAdminSuffixes(p.getArea()) : null)

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

  /** 한국 행정구역 접미사. 길이 긴 순으로 정렬해 "특별자치도" 같은 복합 접미사부터 제거되도록 함.
   *  Nori는 "제주도"를 "제주"+"도"로 쪼개는데, "도" 단독 토큰은 거의 모든 도(道) 단위 지명에
   *  공통으로 들어있어 match 쿼리의 OR 매칭에서 무관한 지역이 함께 걸리는 원인이 됨. */
  /** 광역 행정구역(시/도) 표준 명칭. "경기"처럼 접미사를 뗀 결과가 이 목록에 속하면
   *  placeName(자유텍스트) 대신 area(controlled vocabulary)로 매칭해 동음이의어 오매칭을 피함
   *  (예: "경기" 검색 시 "역도경기장"처럼 placeName에 우연히 "경기"가 포함된 무관한 결과 방지).
   *  "대학로"/"혜화"처럼 이 목록에 없는 세부 지명은 기존대로 placeName 매칭을 사용. */
  private static final Set<String> KNOWN_AREAS = Set.of(
      "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
      "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
  );

  private static final List<String> ADMIN_SUFFIXES = List.of(
      "특별자치도", "특별자치시", "광역시", "특별시", "자치도", "자치시", "자치군", "자치구",
      "도", "시", "군", "구", "읍", "면", "동", "리"
  ).stream()
      .sorted(Comparator.comparingInt(String::length).reversed())
      .toList();

  /** place 문자열의 각 지명 토큰에서 행정구역 접미사를 제거 (검색 매칭 정확도 향상용, 표시용 원본 유지 안 함) */
  private String stripAdminSuffixes(String place) {
    return Arrays.stream(place.split("\\s+"))
        .map(term -> {
          for (String suffix : ADMIN_SUFFIXES) {
            if (term.length() > suffix.length() + 1 && term.endsWith(suffix)) {
              return term.substring(0, term.length() - suffix.length());
            }
          }
          return term;
        })
        .collect(Collectors.joining(" "));
  }

  /** 챗봇 전용: 자연어 키워드로 공연 ID 목록 반환 (title/aiSummary/aiKeywords는 관련도 스코어링용 OR,
   *  place/genre가 추출된 경우 해당 필드는 MUST로 강제해 장르만 맞는 무관한 결과가 섞이는 것을 방지) */
  @Transactional(readOnly = true)
  public List<String> searchForChatbot(String keyword, String place, String genre) {
    return searchForChatbot(keyword, place, genre, false);
  }

  /** 챗봇 INFO 전용: keyword가 title/aiSummary/aiKeywords 중 하나라도 실제로 매칭돼야만 결과를 인정.
   *  일반 KEYWORD/SEMANTIC과 달리 INFO는 특정 공연 하나를 찾는 질의라, place/genre MUST만 만족하고
   *  keyword가 아무데도 안 걸린 "장르만 같은 무관한 공연"이 새어나오는 것을 막기 위함. */
  @Transactional(readOnly = true)
  public List<String> searchForChatbotInfo(String keyword, String place, String genre) {
    return searchForChatbot(keyword, place, genre, true);
  }

  private List<String> searchForChatbot(String keyword, String place, String genre, boolean requireKeywordMatch) {

    boolean hasKeyword = keyword != null && !keyword.isBlank();
    boolean hasPlace = place != null && !place.isBlank();
    boolean hasGenre = genre != null && !genre.isBlank();
    String normalizedPlace = hasPlace ? stripAdminSuffixes(place) : place;

    // genre가 keyword 안에도 중복으로 들어있으면(예: keyword="타이타닉 뮤지컬", genre="뮤지컬") OR 매칭에서
    // "뮤지컬" 토큰 하나만으로 MUST를 통과시켜버려 무관한 결과가 새어나옴 → strict 매칭에서는 genre 중복 제거.
    // keyword가 genre랑 완전히 같아서(예: keyword="연극", genre="연극") 제거하면 아예 남는 게 없는 경우엔
    // "실질적으로 구분되는 keyword가 없다"고 보고 아래 minimumShouldMatch 강제 자체를 건너뜀 — 안 그러면
    // genre로 이미 다 걸러진 결과인데도 aiSummary 등에 그 장르 단어가 우연히 없다는 이유로 정상 결과가 탈락함
    // (예: "혜화에서 하는 연극 추천해줘" → keyword="연극"인데 aiSummary에 "연극"이란 단어가 없는 대학로 연극이 통째로 빠짐).
    String strictKeyword = keyword;
    boolean hasDistinctKeyword = hasKeyword;
    if (hasKeyword && hasGenre) {
      String stripped = keyword.replace(genre, "").trim();
      if (!stripped.isBlank()) {
        strictKeyword = stripped;
      } else {
        hasDistinctKeyword = false;
      }
    }
    String finalStrictKeyword = strictKeyword;
    boolean finalHasDistinctKeyword = hasDistinctKeyword;

    NativeQuery query = NativeQuery.builder()
        .withQuery(q -> q
            .bool(b -> {
              if (finalHasDistinctKeyword && requireKeywordMatch) {
                b.must(m -> m.bool(bb -> bb
                    .should(s -> s.matchPhrasePrefix(mm -> mm.field("title").query(finalStrictKeyword).boost(5.0f)))
                    .should(s -> s.match(mm -> mm.field("title").query(finalStrictKeyword).fuzziness("AUTO").boost(2.0f)))
                    .should(s -> s.match(mm -> mm.field("aiSummary").query(finalStrictKeyword).boost(3.0f)))
                    .should(s -> s.match(mm -> mm.field("aiKeywords").query(finalStrictKeyword).boost(2.0f)))
                    .minimumShouldMatch("1")
                ));
              } else if (finalHasDistinctKeyword) {
                // genre/place가 must로 걸리면 아래 should절들이 minimumShouldMatch 없이는
                // 전부 선택사항이 되어버려서, keyword가 하나도 안 맞아도 genre/place만 맞는
                // 무관한 결과가 새어나옴 (예: "위티두" → genre=뮤지컬만으로 무관한 뮤지컬 반환).
                // strict 경로와 동일하게 "최소 1개는 실제로 걸려야 함" 조건을 강제.
                // (keyword가 genre랑 완전히 겹쳐 구분되는 키워드가 없는 경우는 hasDistinctKeyword=false라
                //  이 강제 자체가 적용 안 되고 genre/place MUST만으로 판단 — 위 "혜화" 회귀 케이스 참고)
                b.must(m -> m.bool(bb -> bb
                    .should(s -> s.matchPhrasePrefix(mm -> mm.field("title").query(finalStrictKeyword).boost(5.0f)))
                    .should(s -> s.match(mm -> mm.field("title").query(finalStrictKeyword).fuzziness("AUTO").boost(2.0f)))
                    .should(s -> s.match(mm -> mm.field("aiSummary").query(finalStrictKeyword).boost(3.0f)))
                    .should(s -> s.match(mm -> mm.field("aiKeywords").query(finalStrictKeyword).boost(2.0f)))
                    .minimumShouldMatch("1")
                ));
              }

              if (hasPlace && KNOWN_AREAS.contains(normalizedPlace)) {
                // 광역 지명(경기/서울 등)은 controlled vocabulary인 area로 정확히 매칭
                // → placeName 자유텍스트에 우연히 같은 글자가 섞여 있어도(예: 역도경기장) 영향받지 않음
                b.must(m -> m.term(mm -> mm.field("area").value(normalizedPlace)));
              } else if (hasPlace) {
                // "대학로", "혜화"처럼 area 목록에 없는 세부 지명은 기존대로 placeName 텍스트 매칭
                b.must(m -> m.match(mm -> mm.field("placeName").query(normalizedPlace)));
              } else if (hasKeyword) {
                b.should(s -> s.match(m -> m.field("placeName").query(keyword).boost(1.0f)));
              }

              if (hasGenre) {
                b.must(m -> m.match(mm -> mm.field("genrenm").query(genre)));
              } else if (hasKeyword) {
                b.should(s -> s.match(m -> m.field("genrenm").query(keyword).boost(1.5f)));
              }

              return b;
            })
        )
        .withMaxResults(5)
        .build();

    try {
      SearchHits<PerformanceSearchDocument> hits =
          elasticsearchOperations.search(query, PerformanceSearchDocument.class);
      return hits.getSearchHits()
          .stream()
          .map(hit -> hit.getContent().getPerformanceId())
          .toList();
    } catch (Exception e) {
      log.warn("ES searchForChatbot() 실패, MySQL fallback: {}", e.getMessage());
      String fallbackKeyword = hasPlace ? place : keyword;
      return performanceRepository.search(genre, fallbackKeyword, null, null, PageRequest.of(0, 5))
          .getContent().stream()
          .map(Performance::getPerformanceId)
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
