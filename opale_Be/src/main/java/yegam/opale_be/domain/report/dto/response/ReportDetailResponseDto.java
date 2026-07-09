package yegam.opale_be.domain.report.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import yegam.opale_be.domain.report.entity.ReportStatus;
import yegam.opale_be.domain.report.entity.ReportTargetType;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(title = "ReportDetailResponse DTO", description = "신고 상세 응답 DTO")
public class ReportDetailResponseDto {

  @Schema(description = "신고 ID", example = "1")
  private Long reportId;

  @Schema(description = "신고자 ID", example = "5")
  private Long reporterId;

  @Schema(description = "신고 대상 유저 ID", example = "7")
  private Long targetUserId;

  @Schema(description = "신고 대상 타입", example = "CHAT_MESSAGE")
  private ReportTargetType targetType;

  @Schema(description = "신고 대상 ID", example = "123")
  private Long targetId;

  @Schema(description = "신고 사유", example = "욕설 및 비방")
  private String reason;

  @Schema(description = "신고 상세 내용")
  private String detail;

  @Schema(description = "처리 상태", example = "PENDING")
  private ReportStatus status;

  @Schema(description = "관리자 메모", example = "1회 경고 처리, 재발 시 이용 제한 예정")
  private String adminMemo;

  @Schema(description = "생성일시")
  private LocalDateTime createdAt;

  @Schema(description = "수정일시")
  private LocalDateTime updatedAt;

  @Schema(description = "신고 대상 원본 콘텐츠 제목 (리뷰인 경우에만 존재)", example = "위키드 후기입니다")
  private String targetContentTitle;

  @Schema(description = "신고 대상 원본 콘텐츠 내용 (리뷰/채팅 메시지)", example = "정말 재밌게 봤어요")
  private String targetContent;

  @Schema(description = "신고 대상 원본 콘텐츠가 이미 삭제(또는 존재하지 않음)되었는지 여부", example = "false")
  private Boolean targetContentDeleted;

  @Schema(description = "신고 승인 처리로 이미 숨김 처리된 콘텐츠인지 여부", example = "false")
  private Boolean targetContentHidden;

  @Schema(description = "원본으로 이동하기 위한 ID (공연 리뷰=공연ID, 공연장 리뷰=공연장ID, 채팅 메시지=채팅방ID)", example = "PF123456")
  private String targetNavigateId;
}
