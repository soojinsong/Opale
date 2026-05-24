package yegam.opale_be.domain.analytics.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import yegam.opale_be.domain.analytics.entity.UserEventLog;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserEventLogRepository extends JpaRepository<UserEventLog, Long> {

  // 기존 검색 기능
  @Query("""
      SELECT l
      FROM UserEventLog l
      WHERE (:userId IS NULL OR l.user.userId = :userId)
        AND (:eventType IS NULL OR l.eventType = :eventType)
        AND (:targetType IS NULL OR l.targetType = :targetType)
        AND (:targetId IS NULL OR l.targetId = :targetId)
        AND (:startAt IS NULL OR l.createdAt >= :startAt)
        AND (:endAt IS NULL OR l.createdAt <= :endAt)
      """)
  Page<UserEventLog> searchLogs(
      @Param("userId") Long userId,
      @Param("eventType") UserEventLog.EventType eventType,
      @Param("targetType") UserEventLog.TargetType targetType,
      @Param("targetId") String targetId,
      @Param("startAt") LocalDateTime startAt,
      @Param("endAt") LocalDateTime endAt,
      Pageable pageable
  );

  // 벡터 계산에 필요한 로그 조회 기능
  /** 특정 유저의 전체 로그 조회 */
  List<UserEventLog> findByUser_UserId(Long userId);

  // 벡터 계산에 필요한 로그 조회 기능
  /** 특정 유저의 최근 N일 간 로그 조회 */
  @Query("""
      SELECT l
      FROM UserEventLog l
      WHERE l.user.userId = :userId
        AND l.createdAt >= :from
      """)
  List<UserEventLog> findRecentLogs(
      @Param("userId") Long userId,
      @Param("from") LocalDateTime from
  );

  Optional<UserEventLog> findTopByUser_UserIdAndEventTypeOrderByCreatedAtDesc(
      Long userId, UserEventLog.EventType eventType
  );

}
