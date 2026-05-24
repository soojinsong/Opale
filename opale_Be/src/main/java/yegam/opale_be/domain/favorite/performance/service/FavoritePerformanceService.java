package yegam.opale_be.domain.favorite.performance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.culture.performance.entity.Performance;
import yegam.opale_be.domain.culture.performance.exception.PerformanceErrorCode;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.favorite.performance.dto.response.FavoritePerformanceResponseDto;
import yegam.opale_be.domain.favorite.performance.entity.FavoritePerformance;
import yegam.opale_be.domain.favorite.performance.mapper.FavoritePerformanceMapper;
import yegam.opale_be.domain.favorite.performance.repository.FavoritePerformanceRepository;
import yegam.opale_be.domain.user.entity.User;
import yegam.opale_be.domain.user.exception.UserErrorCode;
import yegam.opale_be.domain.user.repository.UserRepository;
import yegam.opale_be.global.exception.CustomException;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class FavoritePerformanceService {

  private final FavoritePerformanceRepository favoritePerformanceRepository;
  private final PerformanceRepository performanceRepository;
  private final UserRepository userRepository;
  private final FavoritePerformanceMapper favoritePerformanceMapper;

  /** 공연 관심 토글 */
  public boolean toggleFavorite(Long userId, String performanceId) {

    // 사용자, 공연, 관심 정보를 불러옴.
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new CustomException(UserErrorCode.USER_NOT_FOUND));

    Performance performance = performanceRepository.findById(performanceId)
        .orElseThrow(() -> new CustomException(PerformanceErrorCode.PERFORMANCE_NOT_FOUND));

    FavoritePerformance favorite = favoritePerformanceRepository
        .findByUser_UserIdAndPerformance_PerformanceId(userId, performanceId)
        .orElse(null);

    // 관심이 없는 상태라면, 관심 O으로 추가해줌.
    if (favorite == null) {
      favoritePerformanceRepository.save(
          FavoritePerformance.builder()
              .user(user)
              .performance(performance)
              .isLiked(true)
              .isDeleted(false)
              .build()
      );
      log.info("공연 관심 등록 userId={}, performanceId={}", userId, performanceId);
      return true;
    }

    // 삭제 O 상태라면, 삭제 X로 변경.
    if (favorite.getIsDeleted()) {
      favorite.setIsDeleted(false);
      favorite.setDeletedAt(null);
      favorite.setIsLiked(true);
      log.info("공연 관심 soft-delete 복구 userId={}, performanceId={}", userId, performanceId);
      return true;
    }

    // 좋아요 여부 기존에서 반대로 토글.
    boolean newState = !favorite.getIsLiked();
    favorite.setIsLiked(newState);
    log.info("공연 관심 토글 userId={}, performanceId={}, now={}", userId, performanceId, newState);

    return newState;
  }

  /** 관심 단건 조회 (내가 이 공연 관심 했는지 반환) */
  @Transactional(readOnly = true)
  public boolean isLiked(Long userId, String performanceId) {
    if (userId == null) return false;

    return favoritePerformanceRepository
        .existsByUser_UserIdAndPerformance_PerformanceIdAndIsLikedTrue(userId, performanceId);
  }

  /** 공연 목록 페이지용: performanceId 목록 반환 */
  @Transactional(readOnly = true)
  public List<String> getFavoritePerformanceIds(Long userId) {
    if (userId == null) return List.of();
    return favoritePerformanceRepository.findLikedPerformanceIdsByUserId(userId);
  }

  /** 마이페이지 목록용: performance 목록 반환 */
  @Transactional(readOnly = true)
  public List<FavoritePerformanceResponseDto> getFavoritePerformances(Long userId) {

    userRepository.findById(userId)
        .orElseThrow(() -> new CustomException(UserErrorCode.USER_NOT_FOUND));

    List<Performance> likedPerformances =
        favoritePerformanceRepository.findLikedPerformancesByUserId(userId);

    if (likedPerformances.isEmpty()) return List.of();

    return favoritePerformanceMapper.toResponseDtoList(likedPerformances);
  }
}
