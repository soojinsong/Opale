package yegam.opale_be.domain.user.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(title = "OnboardingRequest DTO", description = "온보딩 장르 선택 요청")
public class OnboardingRequestDto {

  @Size(max = 3, message = "장르는 최대 3개까지 선택 가능합니다.")
  @Schema(description = "선택한 장르 목록 (최대 3개, 빈 리스트 시 건너뛰기)", example = "[\"뮤지컬\", \"연극\"]")
  private List<String> genres;
}
