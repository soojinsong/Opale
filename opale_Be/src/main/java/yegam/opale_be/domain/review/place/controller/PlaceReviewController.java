package yegam.opale_be.domain.review.place.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import yegam.opale_be.domain.review.common.ReviewType;
import yegam.opale_be.domain.review.place.dto.request.PlaceReviewRequestDto;
import yegam.opale_be.domain.review.place.dto.response.PlaceReviewListResponseDto;
import yegam.opale_be.domain.review.place.dto.response.PlaceReviewResponseDto;
import yegam.opale_be.domain.review.place.service.PlaceReviewService;
import yegam.opale_be.global.exception.CustomException;
import yegam.opale_be.global.exception.GlobalErrorCode;
import yegam.opale_be.global.response.BaseResponse;

@RestController
@RequestMapping("/api/reviews/places")
@Tag(name = "Place Review", description = "공연장 리뷰 API")
@RequiredArgsConstructor
public class PlaceReviewController {

  private final PlaceReviewService reviewService;

  /** 단일 공연장 리뷰 조회 (비로그인 가능) */
  @Operation(summary = "공연장 리뷰 단건 조회", description = "특정 공연장 리뷰 1건을 조회합니다.")
  @GetMapping("/{reviewId}")
  public ResponseEntity<BaseResponse<PlaceReviewResponseDto>> getReview(@PathVariable Long reviewId) {
    PlaceReviewResponseDto response = reviewService.getReview(reviewId);
    return ResponseEntity.ok(BaseResponse.success("공연장 리뷰 조회 성공", response));
  }

  /** 공연장별 리뷰 목록 조회 (비로그인 가능) */
  @Operation(summary = "공연장별 리뷰 목록 조회", description = "공연장 ID 기준으로 등록된 리뷰 목록을 조회합니다. (reviewType 옵션)")
  @GetMapping("/place/{placeId}")
  public ResponseEntity<BaseResponse<PlaceReviewListResponseDto>> getReviewsByPlace(
      @PathVariable String placeId,
      @RequestParam(required = false) ReviewType reviewType
  ) {
    PlaceReviewListResponseDto response = reviewService.getReviewsByPlace(placeId, reviewType);
    return ResponseEntity.ok(BaseResponse.success("공연장별 리뷰 목록 조회 성공", response));
  }

  /** 작성한 본인 공연장 리뷰 목록 조회 (로그인 필요) */
  @Operation(summary = "작성한 본인 공연장 리뷰 목록 조회", description = "사용자가 작성한 공연장 리뷰 목록을 조회합니다.")
  @GetMapping("/me")
  public ResponseEntity<BaseResponse<PlaceReviewListResponseDto>> getMyReviews(
      @AuthenticationPrincipal Long userId,
      @RequestParam(required = false) ReviewType reviewType
  ) {
    if (userId == null) throw new CustomException(GlobalErrorCode.UNAUTHORIZED);
    PlaceReviewListResponseDto response = reviewService.getReviewsByUser(userId, reviewType);
    return ResponseEntity.ok(BaseResponse.success("내 공연장 리뷰 목록 조회 성공", response));
  }

  /** 특정 회원의 공연장 리뷰 목록 조회 (비로그인 가능) */
  @Operation(summary = "특정 회원의 공연장 리뷰 목록 조회", description = "회원 ID와 리뷰 타입을 기준으로 해당 사용자가 작성한 공연장 리뷰 목록을 조회합니다.")
  @GetMapping("/user/{userId}")
  public ResponseEntity<BaseResponse<PlaceReviewListResponseDto>> getReviewsByUserPublic(
      @PathVariable Long userId,
      @RequestParam(required = false) ReviewType reviewType
  ) {
    PlaceReviewListResponseDto response = reviewService.getReviewsByUserPublic(userId, reviewType);
    return ResponseEntity.ok(BaseResponse.success("회원 공연장 리뷰 목록 조회 성공", response));
  }

  /** 공연장 리뷰 작성 (로그인 필요) */
  @Operation(summary = "공연장 리뷰 작성", description = "새 공연장 리뷰를 작성합니다.")
  @PostMapping
  public ResponseEntity<BaseResponse<PlaceReviewResponseDto>> createReview(
      @AuthenticationPrincipal Long userId,
      @RequestBody PlaceReviewRequestDto dto
  ) {
    if (userId == null) throw new CustomException(GlobalErrorCode.UNAUTHORIZED);
    PlaceReviewResponseDto response = reviewService.createReview(userId, dto);
    return ResponseEntity.ok(BaseResponse.success("공연장 리뷰 작성 성공", response));
  }

  /** 공연장 리뷰 수정 (로그인 필요) */
  @Operation(summary = "공연장 리뷰 수정", description = "본인이 작성한 공연장 리뷰를 수정합니다.")
  @PutMapping("/{reviewId}")
  public ResponseEntity<BaseResponse<PlaceReviewResponseDto>> updateReview(
      @AuthenticationPrincipal Long userId,
      @PathVariable Long reviewId,
      @RequestBody PlaceReviewRequestDto dto
  ) {
    if (userId == null) throw new CustomException(GlobalErrorCode.UNAUTHORIZED);
    PlaceReviewResponseDto response = reviewService.updateReview(userId, reviewId, dto);
    return ResponseEntity.ok(BaseResponse.success("공연장 리뷰 수정 성공", response));
  }

  /** 공연장 리뷰 삭제 (로그인 필요) */
  @Operation(summary = "공연장 리뷰 삭제", description = "본인이 작성한 공연장 리뷰를 삭제합니다.")
  @DeleteMapping("/{reviewId}")
  public ResponseEntity<BaseResponse<String>> deleteReview(
      @AuthenticationPrincipal Long userId,
      @PathVariable Long reviewId
  ) {
    if (userId == null) throw new CustomException(GlobalErrorCode.UNAUTHORIZED);
    reviewService.deleteReview(userId, reviewId);
    return ResponseEntity.ok(BaseResponse.success("공연장 리뷰 삭제 성공", null));
  }
}
