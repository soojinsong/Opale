package yegam.opale_be.domain.tip.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;
import yegam.opale_be.global.exception.model.BaseErrorCode;

/**
 * PerformanceTipErrorCode
 * - 공연 정보 제보(PerformanceTip) 도메인 전용 예외 코드 정의
 */
@Getter
@AllArgsConstructor
public enum PerformanceTipErrorCode implements BaseErrorCode {

  TIP_NOT_FOUND("TIP_4001", "요청한 제보 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
  INVALID_TIP_STATUS("TIP_4002", "이미 처리된 제보입니다.", HttpStatus.BAD_REQUEST),
  TIP_IMAGE_REQUIRED("TIP_4003", "제보 이미지를 첨부해주세요.", HttpStatus.BAD_REQUEST);

  private final String code;
  private final String message;
  private final HttpStatus status;
}
