package yegam.opale_be.domain.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import yegam.opale_be.domain.user.entity.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findByEmail(String email);

  boolean existsByEmail(String email);

  boolean existsByNickname(String nickname);

  /** 전체 회원 목록 (ADMIN 포함) */
  @Query("SELECT u FROM User u ORDER BY u.createdAt DESC")
  List<User> findAllUsersOrderByCreatedAt();

  /** ADMIN 제외 전체 회원 목록 */
  @Query("SELECT u FROM User u WHERE u.role <> 'ADMIN' ORDER BY u.createdAt DESC")
  List<User> findAllUsersExceptAdminOrderByCreatedAt();

  /** 탈퇴하지 않은 사용자만 조회 */
  @Query("SELECT u FROM User u WHERE u.isDeleted = false")
  List<User> findAllActiveUsers();

  /** 대시보드: 탈퇴하지 않은 총 회원 수 */
  long countByIsDeletedFalse();

  /** 대시보드: 특정 시점 이후 가입한 (탈퇴하지 않은) 회원 수 */
  long countByIsDeletedFalseAndCreatedAtGreaterThanEqual(LocalDateTime from);

  /** 대시보드: 일자별 가입자 수 (탈퇴하지 않은 회원 대상) */
  @Query(
      value = """
          SELECT DATE(created_at) AS signup_date, COUNT(*) AS cnt
          FROM users
          WHERE is_deleted = false AND created_at >= :from
          GROUP BY DATE(created_at)
          """,
      nativeQuery = true
  )
  List<Object[]> countDailySignupsSince(@Param("from") LocalDateTime from);
}
