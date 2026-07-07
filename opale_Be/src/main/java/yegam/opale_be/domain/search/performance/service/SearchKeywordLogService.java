package yegam.opale_be.domain.search.performance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.search.performance.entity.SearchKeywordLog;
import yegam.opale_be.domain.search.performance.repository.SearchKeywordLogRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchKeywordLogService {

  private final SearchKeywordLogRepository searchKeywordLogRepository;

  /** 통계 대시보드용 검색어 기록 - 실패해도 검색 흐름에 영향 없음 */
  @Transactional
  public void record(String keyword) {
    if (keyword == null || keyword.isBlank()) {
      return;
    }
    try {
      searchKeywordLogRepository.save(
          SearchKeywordLog.builder().keyword(keyword.trim()).build()
      );
    } catch (Exception e) {
      log.warn("검색어 로그 기록 실패: {}", e.getMessage());
    }
  }
}
