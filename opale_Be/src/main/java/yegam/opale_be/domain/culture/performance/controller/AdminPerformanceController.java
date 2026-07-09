package yegam.opale_be.domain.culture.performance.controller;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import yegam.opale_be.domain.culture.performance.dto.response.admin.AdminPerformanceImageResponseDto;
import yegam.opale_be.domain.culture.performance.dto.response.admin.AdminPerformanceImageListResponseDto;
import yegam.opale_be.domain.culture.performance.dto.response.admin.AdminPerformanceVideoListResponseDto;
import yegam.opale_be.domain.culture.performance.dto.response.admin.AdminPerformanceVideoResponseDto;
import yegam.opale_be.domain.culture.performance.entity.PerformanceImage;
import yegam.opale_be.domain.culture.performance.service.AdminPerformanceService;
import yegam.opale_be.global.response.BaseResponse;

@RestController
@RequestMapping("/api/admin/performances")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPerformanceController {

  private final AdminPerformanceService adminService;

  @Operation(summary = "공연 수집 이미지 목록 조회")
  @GetMapping("/{performanceId}/images")
  public ResponseEntity<BaseResponse<AdminPerformanceImageListResponseDto>> getImages(
      @PathVariable String performanceId) {

    return ResponseEntity.ok(BaseResponse.success(
        "공연 수집 이미지 조회 성공",
        adminService.getImages(performanceId)
    ));
  }

  @Operation(summary = "공연 수집 이미지 파일 업로드 (multipart)")
  @PostMapping(
      value = "/{performanceId}/images/file",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE
  )
  public ResponseEntity<BaseResponse<AdminPerformanceImageResponseDto>> uploadImageFile(
      @PathVariable String performanceId,
      @RequestPart("file") MultipartFile file,
      @RequestPart("imageType") String imageTypeStr,
      @RequestPart(value = "sourceUrl", required = false) String sourceUrl
  ) {

    PerformanceImage.ImageType imageType =
        PerformanceImage.ImageType.valueOf(imageTypeStr);

    return ResponseEntity.ok(BaseResponse.success(
        "공연 수집 이미지 파일 업로드 성공",
        adminService.uploadImageFile(performanceId, file, imageType, sourceUrl)
    ));
  }

  @Operation(summary = "공연 수집 이미지 삭제")
  @DeleteMapping("/images/{imageId}")
  public ResponseEntity<BaseResponse<Void>> deleteImage(
      @PathVariable Long imageId) {

    adminService.deleteImage(imageId);
    return ResponseEntity.ok(BaseResponse.success("공연 수집 이미지 삭제 완료", null));
  }

  @Operation(summary = "[swagger TEST] 공연 수집 이미지 파일 업로드")
  @PostMapping(
      value = "/{performanceId}/images/file/test",
      consumes = MediaType.MULTIPART_FORM_DATA_VALUE
  )
  public ResponseEntity<BaseResponse<AdminPerformanceImageResponseDto>> uploadImageFileSwaggerTest(
      @PathVariable String performanceId,
      @RequestParam("file") MultipartFile file,
      @RequestParam("imageType") PerformanceImage.ImageType imageType,
      @RequestParam(value = "sourceUrl", required = false) String sourceUrl
  ) {

    return ResponseEntity.ok(BaseResponse.success(
        "Swagger TEST 업로드 성공",
        adminService.uploadImageFile(performanceId, file, imageType, sourceUrl)
    ));
  }

  // ============================================================
  // GET /api/admin/performances/{performanceId}/videos
  // ============================================================
  @Operation(summary = "공연 유튜브 영상 목록 조회")
  @GetMapping("/{performanceId}/videos")
  public ResponseEntity<BaseResponse<AdminPerformanceVideoListResponseDto>> getVideos(
      @PathVariable String performanceId
  ) {
    return ResponseEntity.ok(BaseResponse.success(
        "공연 유튜브 영상 조회 성공",
        adminService.getVideos(performanceId)
    ));
  }

  // ============================================================
  // POST /api/admin/performances/{performanceId}/videos
  // ============================================================
  @Operation(summary = "공연 유튜브 영상 등록")
  @PostMapping("/{performanceId}/videos")
  public ResponseEntity<BaseResponse<AdminPerformanceVideoResponseDto>> uploadYoutubeVideo(
      @PathVariable String performanceId,
      @RequestParam("youtubeVideoId") String youtubeVideoId,
      @RequestParam("title") String title,
      @RequestParam(value = "thumbnailUrl", required = false) String thumbnailUrl,
      @RequestParam(value = "sourceUrl", required = false) String sourceUrl
  ) {
    return ResponseEntity.ok(BaseResponse.success(
        "공연 유튜브 영상 등록 성공",
        adminService.uploadYoutubeVideo(
            performanceId,
            youtubeVideoId,
            title,
            thumbnailUrl,
            sourceUrl
        )
    ));
  }

  // ============================================================
  // DELETE /api/admin/performances/videos/{videoId}
  // ============================================================
  @Operation(summary = "공연 유튜브 영상 삭제")
  @DeleteMapping("/videos/{videoId}")
  public ResponseEntity<BaseResponse<Void>> deleteVideo(
      @PathVariable Long videoId
  ) {
    adminService.deleteVideo(videoId);
    return ResponseEntity.ok(BaseResponse.success("공연 유튜브 영상 삭제 완료", null));
  }
}
