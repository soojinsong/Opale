package yegam.opale_be.domain.tip.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import yegam.opale_be.domain.culture.performance.entity.PerformanceImage;
import yegam.opale_be.domain.tip.entity.PerformanceTipStatus;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(title = "PerformanceTipResponse DTO", description = "공연 정보 제보 응답 DTO")
public class PerformanceTipResponseDto {

  @Schema(description = "제보 ID", example = "1")
  private Long performanceTipId;

  @Schema(description = "공연 ID", example = "PF12345")
  private String performanceId;

  @Schema(description = "공연명", example = "레미제라블")
  private String performanceTitle;

  @Schema(description = "제보자 ID", example = "7")
  private Long submitterId;

  @Schema(description = "제보자 닉네임", example = "musical_fan_01")
  private String submitterNickname;

  @Schema(description = "제보 이미지 URL")
  private String imageUrl;

  @Schema(description = "이미지 유형 (DISCOUNT/CASTING/SEAT/NOTICE/기타)", example = "DISCOUNT")
  private PerformanceImage.ImageType imageType;

  @Schema(description = "출처 URL (선택)")
  private String sourceUrl;

  @Schema(description = "제보 설명 (선택)")
  private String description;

  @Schema(description = "처리 상태")
  private PerformanceTipStatus status;

  @Schema(description = "관리자 메모")
  private String adminMemo;

  @Schema(description = "제보일")
  private LocalDateTime createdAt;
}
