package yegam.opale_be.domain.search.performance.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import yegam.opale_be.domain.search.performance.entity.SearchKeywordLog;

import java.util.List;

@Repository
public interface SearchKeywordLogRepository extends JpaRepository<SearchKeywordLog, Long> {

  /** 검색어별 건수 상위 N개 */
  @Query("""
      SELECT s.keyword, COUNT(s)
      FROM SearchKeywordLog s
      GROUP BY s.keyword
      ORDER BY COUNT(s) DESC
      """)
  List<Object[]> countGroupByKeyword(Pageable pageable);
}
