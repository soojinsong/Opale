package yegam.opale_be.domain.tip.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import yegam.opale_be.domain.culture.performance.entity.PerformanceImage;
import yegam.opale_be.domain.tip.dto.request.PerformanceTipStatusUpdateRequestDto;
import yegam.opale_be.domain.tip.dto.response.PerformanceTipListResponseDto;
import yegam.opale_be.domain.tip.dto.response.PerformanceTipResponseDto;
import yegam.opale_be.domain.tip.entity.PerformanceTipStatus;
import yegam.opale_be.domain.tip.service.PerformanceTipService;
import yegam.opale_be.global.response.BaseResponse;

@RestController
@RequestMapping("/api/tips")
@RequiredArgsConstructor
@Tag(name = "Performance Tip API", description = "공연 정보 제보 관련 API")
public class PerformanceTipController {

  private final PerformanceTipService tipService;

  /**
   * 공연 정보 제보 등록 (회원용)
   */
  @Operation(summary = "공연 정보 제보 등록", description = "회원이 공연 할인/좌석 정보 등을 이미지로 제보합니다.")
  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<BaseResponse<PerformanceTipResponseDto>> createTip(
      @AuthenticationPrincipal Long userId,
      @RequestPart("performanceId") String performanceId,
      @RequestPart("file") MultipartFile file,
      @RequestPart("imageType") String imageTypeStr,
      @RequestPart(value = "sourceUrl", required = false) String sourceUrl,
      @RequestPart(value = "description", required = false) String description
  ) {
    PerformanceImage.ImageType imageType = PerformanceImage.ImageType.valueOf(imageTypeStr);

    PerformanceTipResponseDto response = tipService.createTip(
        userId, performanceId, file, imageType, sourceUrl, description
    );
    return ResponseEntity.ok(BaseResponse.success("공연 정보 제보 등록 성공", response));
  }

  /**
   * 제보 목록 조회 (운영자용)
   */
  @Operation(summary = "제보 목록 조회 (운영자용)", description = "제보 목록을 페이지네이션하여 조회합니다.")
  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<BaseResponse<PerformanceTipListResponseDto>> getTips(
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(required = false) PerformanceTipStatus status
  ) {
    PerformanceTipListResponseDto response = tipService.getTips(page, size, status);
    return ResponseEntity.ok(BaseResponse.success("제보 목록 조회 성공", response));
  }

  /**
   * 제보 처리 (승인/반려, 운영자용)
   */
  @Operation(summary = "제보 처리 (운영자용)", description = "제보 상태를 승인/반려로 변경합니다. 승인 시 실제 공연 이미지로 반영됩니다.")
  @PatchMapping("/{tipId}/status")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<BaseResponse<PerformanceTipResponseDto>> updateTipStatus(
      @AuthenticationPrincipal Long adminId,
      @PathVariable Long tipId,
      @Valid @RequestBody PerformanceTipStatusUpdateRequestDto requestDto
  ) {
    PerformanceTipResponseDto response = tipService.updateTipStatus(adminId, tipId, requestDto);
    return ResponseEntity.ok(BaseResponse.success("제보 처리 성공", response));
  }
}
