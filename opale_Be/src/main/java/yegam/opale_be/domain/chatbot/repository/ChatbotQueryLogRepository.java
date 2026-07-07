package yegam.opale_be.domain.chatbot.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import yegam.opale_be.domain.chatbot.entity.ChatbotQueryLog;

@Repository
public interface ChatbotQueryLogRepository extends JpaRepository<ChatbotQueryLog, Long> {

  long countByCreatedAtGreaterThanEqual(LocalDateTime from);

  /** 쿼리 유형별 건수 (전체 기간) */
  @Query("""
      SELECT c.queryType, COUNT(c)
      FROM ChatbotQueryLog c
      GROUP BY c.queryType
      ORDER BY COUNT(c) DESC
      """)
  List<Object[]> countGroupByQueryType();
}
