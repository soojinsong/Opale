package yegam.opale_be.domain.analytics.service;

import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import yegam.opale_be.domain.analytics.dto.request.UserEventLogCreateRequestDto;
import yegam.opale_be.domain.analytics.dto.request.UserEventLogSearchRequestDto;
import yegam.opale_be.domain.analytics.dto.response.UserEventLogListResponseDto;
import yegam.opale_be.domain.analytics.dto.response.UserEventLogResponseDto;
import yegam.opale_be.domain.analytics.entity.UserEventLog;
import yegam.opale_be.domain.analytics.exception.AnalyticsErrorCode;
import yegam.opale_be.domain.analytics.mapper.UserEventLogMapper;
import yegam.opale_be.domain.analytics.repository.UserEventLogRepository;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.place.repository.PlaceRepository;
import yegam.opale_be.domain.chat.room.repository.ChatRoomRepository;

import yegam.opale_be.domain.user.entity.User;
import yegam.opale_be.domain.user.exception.UserErrorCode;
import yegam.opale_be.domain.user.repository.UserRepository;
import yegam.opale_be.global.exception.CustomException;
import yegam.opale_be.global.common.policy.EventWeightPolicy;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;


/**
 * 사용자 행동 로그(UserEventLog)를 관리하는 Service 클래스
 * - UserEventLog 생성, 조회
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserEventLogService {

  private final UserEventLogRepository userEventLogRepository;
  private final UserEventLogMapper userEventLogMapper;
  private final UserRepository userRepository;

  private final PerformanceRepository performanceRepository;
  private final PlaceRepository placeRepository;
  private final ChatRoomRepository chatRoomRepository;

  private final StringRedisTemplate redisTemplate;

  private int determineWeight(UserEventLog.EventType eventType, Integer requested, Integer dwellTimeSeconds) {
    if (requested != null) return requested;
    if (eventType == UserEventLog.EventType.DWELL_TIME) {
      return EventWeightPolicy.getDwellTimeWeight(dwellTimeSeconds != null ? dwellTimeSeconds : 0);
    }
    return EventWeightPolicy.from(eventType).getLogWeight();
  }

  /** 사용자 행동 로그 생성 */
  @Transactional
  public UserEventLogResponseDto createUserEventLog(Long userId, UserEventLogCreateRequestDto dto) {

    // 사용자 찾기
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new CustomException(UserErrorCode.USER_NOT_FOUND));

    // 이벤트 로그 가중치 별로 
    UserEventLog.EventType eventType = parseEventType(dto.getEventType());
    int weight = determineWeight(eventType, dto.getWeight(), dto.getDwellTimeSeconds());
    
    // DB에 저장
    UserEventLog entity = userEventLogMapper.toEntity(user, dto, weight);
    UserEventLog saved = userEventLogRepository.save(entity);

    log.info("로그 생성: user={}, type={}, targetType={}, targetId={}",
        userId, eventType, dto.getTargetType(), dto.getTargetId());

    // 행동 로그 여러번 쌓인 다음에 업데이트할 예정 (debounce dirty flag)
    try {
      redisTemplate.opsForValue().set(
          "vector:update:" + userId,
          "1",
          2, TimeUnit.MINUTES // 이 key는 2분 뒤 자동 삭제(TTL)
      );
    } catch (Exception e) {
      log.warn("vector dirty flag 저장 실패 userId={}", userId, e);
    }

    // 조회였다면 개체의 조회수를 늘려줌.
    if (eventType == UserEventLog.EventType.VIEW) {

      switch (dto.getTargetType().toUpperCase()) {

        case "PERFORMANCE" -> {
          performanceRepository.incrementViewCount(dto.getTargetId());
          log.info("공연 조회수 +1 → {}", dto.getTargetId());
        }

        case "PLACE" -> {
          placeRepository.incrementViewCount(dto.getTargetId());
          log.info("공연장 조회수 +1 → {}", dto.getTargetId());
        }

        case "CHATROOM" -> {
          chatRoomRepository.incrementVisitCount(Long.valueOf(dto.getTargetId()));
          log.info("채팅방 방문수 +1 → {}", dto.getTargetId());
        }

        default -> log.warn("알 수 없는 VIEW targetType={}", dto.getTargetType());
      }
    }

    return userEventLogMapper.toResponseDto(saved);
  }


  /** 사용자 행동 로그 조회  */
  public UserEventLogListResponseDto searchUserEventLogs(UserEventLogSearchRequestDto dto) {

    // 조건에 맞는 이벤트 로그 Entity 조회
    Long userId = dto.getUserId();
    UserEventLog.EventType eventType = null;
    if (dto.getEventType() != null && !dto.getEventType().isBlank()) {
      eventType = parseEventType(dto.getEventType());
    }

    UserEventLog.TargetType targetType = null;
    if (dto.getTargetType() != null && !dto.getTargetType().isBlank()) {
      targetType = parseTargetType(dto.getTargetType());
    }

    String targetId = (dto.getTargetId() != null && !dto.getTargetId().isBlank())
        ? dto.getTargetId() : null;

    LocalDateTime startAt = null;
    LocalDateTime endAt = null;

    if (dto.getStartDate() != null && !dto.getStartDate().isBlank()) {
      LocalDate start = LocalDate.parse(dto.getStartDate());
      startAt = start.atStartOfDay();
    }

    if (dto.getEndDate() != null && !dto.getEndDate().isBlank()) {
      LocalDate end = LocalDate.parse(dto.getEndDate());
      endAt = end.atTime(23, 59, 59);
    }

    if (startAt != null && endAt != null && startAt.isAfter(endAt)) {
      throw new CustomException(AnalyticsErrorCode.INVALID_DATE_RANGE);
    }

    Pageable pageable = PageRequest.of(
        dto.getPage() != null ? dto.getPage() - 1 : 0,
        dto.getSize() != null ? dto.getSize() : 20,
        Sort.by(Sort.Direction.DESC, "createdAt")
    );

    // 맞는 이벤트 로그를 DB에서 검색
    var result = userEventLogRepository.searchLogs(
        userId, eventType, targetType, targetId, startAt, endAt, pageable
    );

    return userEventLogMapper.toListResponseDto(result);
  }

  // String → Enum 변환용
  private UserEventLog.EventType parseEventType(String value) {
    try {
      return UserEventLog.EventType.valueOf(value.toUpperCase());
    } catch (Exception e) {
      throw new CustomException(AnalyticsErrorCode.INVALID_EVENT_TYPE);
    }
  }

  private UserEventLog.TargetType parseTargetType(String value) {
    try {
      return UserEventLog.TargetType.valueOf(value.toUpperCase());
    } catch (Exception e) {
      throw new CustomException(AnalyticsErrorCode.INVALID_TARGET_TYPE);
    }
  }

}
