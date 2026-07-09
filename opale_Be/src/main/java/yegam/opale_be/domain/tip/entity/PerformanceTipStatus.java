package yegam.opale_be.domain.tip.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PerformanceTipStatus {

  /** 접수된 상태 (기본값) */
  PENDING("처리 대기"),

  /** 제보 내용이 유효하여 실제 공연 정보에 반영한 상태 */
  APPROVED("제보 승인"),

  /** 제보 반려 */
  REJECTED("제보 반려");

  private final String description;
}
