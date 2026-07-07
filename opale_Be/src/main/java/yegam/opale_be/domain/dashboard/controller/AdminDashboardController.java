package yegam.opale_be.domain.dashboard.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import yegam.opale_be.domain.dashboard.dto.response.DashboardResponseDto;
import yegam.opale_be.domain.dashboard.service.AdminDashboardService;
import yegam.opale_be.global.response.BaseResponse;

/**
 * AdminDashboardController
 *
 *  운영자용 통계 대시보드 API 요청을 받는 Controller.
 *  - 요청 경로: /api/admin/dashboard
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "AdminDashboard", description = "관리자용 통계 대시보드 API")
public class AdminDashboardController {

  private final AdminDashboardService adminDashboardService;

  @Operation(summary = "(운영자) 통계 대시보드 조회",
      description = "회원/공연/챗봇 사용 현황 통계를 한 번에 조회합니다.")
  @GetMapping("/dashboard")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<BaseResponse<DashboardResponseDto>> getDashboard() {
    DashboardResponseDto response = adminDashboardService.getDashboard();
    return ResponseEntity.ok(BaseResponse.success("통계 대시보드 조회 성공", response));
  }
}
