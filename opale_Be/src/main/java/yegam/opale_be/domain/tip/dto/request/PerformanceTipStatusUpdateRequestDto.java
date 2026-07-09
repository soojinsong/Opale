package yegam.opale_be.domain.tip.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import yegam.opale_be.domain.tip.entity.PerformanceTipStatus;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(title = "PerformanceTipStatusUpdateRequest DTO", description = "제보 처리 상태 변경 요청 DTO")
public class PerformanceTipStatusUpdateRequestDto {

  @Schema(description = "변경할 제보 상태 (APPROVED / REJECTED)", example = "APPROVED")
  @NotNull(message = "제보 상태는 필수입니다.")
  private PerformanceTipStatus status;

  @Schema(description = "관리자 메모", example = "확인 후 할인정보에 반영했습니다.")
  private String adminMemo;
}
