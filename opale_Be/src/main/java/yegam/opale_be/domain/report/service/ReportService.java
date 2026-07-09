package yegam.opale_be.domain.report.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.chat.message.repository.ChatMessageRepository;
import yegam.opale_be.domain.report.dto.request.ReportCreateRequestDto;
import yegam.opale_be.domain.report.dto.request.ReportStatusUpdateRequestDto;
import yegam.opale_be.domain.report.dto.response.ReportDetailResponseDto;
import yegam.opale_be.domain.report.dto.response.ReportListResponseDto;
import yegam.opale_be.domain.report.dto.response.ReportSummaryResponseDto;
import yegam.opale_be.domain.report.entity.Report;
import yegam.opale_be.domain.report.entity.ReportStatus;
import yegam.opale_be.domain.report.exception.ReportErrorCode;
import yegam.opale_be.domain.report.mapper.ReportMapper;
import yegam.opale_be.domain.report.repository.ReportRepository;
import yegam.opale_be.domain.review.performance.repository.PerformanceReviewRepository;
import yegam.opale_be.domain.review.performance.service.PerformanceReviewService;
import yegam.opale_be.domain.review.place.repository.PlaceReviewRepository;
import yegam.opale_be.domain.review.place.service.PlaceReviewService;
import yegam.opale_be.domain.user.repository.UserRepository;
import yegam.opale_be.global.exception.CustomException;
import yegam.opale_be.global.exception.GlobalErrorCode;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

  private final ReportRepository reportRepository;
  private final PerformanceReviewRepository performanceReviewRepository;
  private final PlaceReviewRepository placeReviewRepository;
  private final ChatMessageRepository chatMessageRepository;
  private final UserRepository userRepository;
  private final PerformanceReviewService performanceReviewService;
  private final PlaceReviewService placeReviewService;

  /**
   * 신고 생성
   */
  @Transactional
  public ReportDetailResponseDto createReport(Long reporterId, ReportCreateRequestDto dto) {

    if (reporterId == null) {
      throw new CustomException(GlobalErrorCode.UNAUTHORIZED);
    }

    if (reporterId.equals(dto.getTargetUserId())) {
      throw new CustomException(ReportErrorCode.SELF_REPORT_NOT_ALLOWED);
    }

    Report report = ReportMapper.toEntity(dto, reporterId);
    Report saved = reportRepository.save(report);

    return ReportMapper.toDetailDto(saved);
  }

  /**
   * 신고 목록 조회 (운영자용)
   */
  public ReportListResponseDto getReports(int page, int size, ReportStatus status) {

    if (page < 1) page = 1;
    if (size < 1) size = 10;

    Pageable pageable =
        PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));

    Page<Report> reportPage =
        (status != null)
            ? reportRepository.findByStatus(status, pageable)
            : reportRepository.findAll(pageable);

    List<ReportSummaryResponseDto> summaries =
        ReportMapper.toSummaryDtoList(reportPage.getContent());

    return ReportListResponseDto.builder()
        .totalCount(reportPage.getTotalElements())
        .currentPage(page)
        .pageSize(size)
        .totalPages(reportPage.getTotalPages())
        .hasNext(reportPage.hasNext())
        .hasPrev(reportPage.hasPrevious())
        .reports(summaries)
        .build();
  }

  /**
   * 신고 단건 조회 (운영자용)
   */
  public ReportDetailResponseDto getReportDetail(Long reportId) {

    Report report = reportRepository.findById(reportId)
        .orElseThrow(() ->
            new CustomException(ReportErrorCode.REPORT_NOT_FOUND)
        );

    ReportDetailResponseDto dto = ReportMapper.toDetailDto(report);
    attachTargetContent(dto, report);
    return dto;
  }

  /**
   * 신고 대상 타입에 따라 원본 콘텐츠(리뷰/채팅 메시지 내용, 이동용 ID)를 조회해 DTO에 채워준다.
   */
  private void attachTargetContent(ReportDetailResponseDto dto, Report report) {
    switch (report.getTargetType()) {
      case PERFORMANCE_REVIEW -> performanceReviewRepository.findById(report.getTargetId())
          .ifPresentOrElse(review -> {
            dto.setTargetContentTitle(review.getTitle());
            dto.setTargetContent(review.getContents());
            dto.setTargetContentDeleted(Boolean.TRUE.equals(review.getIsDeleted()));
            dto.setTargetContentHidden(Boolean.TRUE.equals(review.getHiddenByReport()));
            dto.setTargetNavigateId(
                review.getPerformance() != null ? review.getPerformance().getPerformanceId() : null);
          }, () -> dto.setTargetContentDeleted(true));
      case PLACE_REVIEW -> placeReviewRepository.findById(report.getTargetId())
          .ifPresentOrElse(review -> {
            dto.setTargetContentTitle(review.getTitle());
            dto.setTargetContent(review.getContents());
            dto.setTargetContentDeleted(Boolean.TRUE.equals(review.getIsDeleted()));
            dto.setTargetContentHidden(Boolean.TRUE.equals(review.getHiddenByReport()));
            dto.setTargetNavigateId(
                review.getPlace() != null ? review.getPlace().getPlaceId() : null);
          }, () -> dto.setTargetContentDeleted(true));
      case CHAT_MESSAGE -> chatMessageRepository.findById(report.getTargetId())
          .ifPresentOrElse(message -> {
            dto.setTargetContent(message.getContents());
            dto.setTargetContentDeleted(Boolean.TRUE.equals(message.getIsDeleted()));
            dto.setTargetContentHidden(Boolean.TRUE.equals(message.getHiddenByReport()));
            dto.setTargetNavigateId(
                message.getChatRoom() != null ? String.valueOf(message.getChatRoom().getRoomId()) : null);
          }, () -> dto.setTargetContentDeleted(true));
      case USER -> {
      }
    }
  }

  /**
   * 신고 처리 (승인 / 반려 + 관리자 메모)
   */
  @Transactional
  public ReportDetailResponseDto updateReportStatus(
      Long adminId,
      Long reportId,
      ReportStatusUpdateRequestDto dto
  ) {

    if (adminId == null) {
      throw new CustomException(GlobalErrorCode.UNAUTHORIZED);
    }

    Report report = reportRepository.findById(reportId)
        .orElseThrow(() ->
            new CustomException(ReportErrorCode.REPORT_NOT_FOUND)
        );

    if (report.getStatus() != ReportStatus.PENDING) {
      throw new CustomException(ReportErrorCode.INVALID_REPORT_STATUS);
    }

    report.setStatus(dto.getStatus());
    report.setAdminMemo(dto.getAdminMemo());

    if (dto.getStatus() == ReportStatus.APPROVED) {
      boolean alreadyHidden = isTargetAlreadyHidden(report);
      hideApprovedTarget(report);

      // 같은 콘텐츠에 대한 중복 신고가 각각 승인되더라도, 실제로 조치된 사고는 1건이므로
      // 이미 숨김 처리된 콘텐츠라면 카운트를 추가로 올리지 않는다.
      if (!alreadyHidden) {
        incrementTargetUserReportCount(report);
      }
    }

    return ReportMapper.toDetailDto(report);
  }

  /**
   * 신고 승인 전, 대상 콘텐츠가 이미 다른 신고 승인으로 숨김 처리돼 있었는지 확인한다.
   * USER 타입은 콘텐츠 자체가 없으므로 항상 별개 사고로 취급한다.
   */
  private boolean isTargetAlreadyHidden(Report report) {
    return switch (report.getTargetType()) {
      case PERFORMANCE_REVIEW -> performanceReviewRepository.findById(report.getTargetId())
          .map(review -> Boolean.TRUE.equals(review.getHiddenByReport()))
          .orElse(false);
      case PLACE_REVIEW -> placeReviewRepository.findById(report.getTargetId())
          .map(review -> Boolean.TRUE.equals(review.getHiddenByReport()))
          .orElse(false);
      case CHAT_MESSAGE -> chatMessageRepository.findById(report.getTargetId())
          .map(message -> Boolean.TRUE.equals(message.getHiddenByReport()))
          .orElse(false);
      case USER -> false;
    };
  }

  /**
   * 신고 승인 시 대상 콘텐츠를 숨김 처리한다. 작성자 본인 삭제(isDeleted)와 구분되도록
   * hiddenByReport 플래그를 별도로 사용 — 다른 신고를 조회할 때도 이미 조치된 콘텐츠임을 알 수 있다.
   */
  private void hideApprovedTarget(Report report) {
    switch (report.getTargetType()) {
      case PERFORMANCE_REVIEW -> performanceReviewRepository.findById(report.getTargetId())
          .ifPresent(review -> {
            review.setHiddenByReport(true);
            performanceReviewService.updatePerformanceAverageRating(review.getPerformance().getPerformanceId());
          });
      case PLACE_REVIEW -> placeReviewRepository.findById(report.getTargetId())
          .ifPresent(review -> {
            review.setHiddenByReport(true);
            placeReviewService.updatePlaceAverageRating(review.getPlace().getPlaceId());
          });
      case CHAT_MESSAGE -> chatMessageRepository.findById(report.getTargetId())
          .ifPresent(message -> message.setHiddenByReport(true));
      case USER -> {
      }
    }
  }

  /**
   * 신고 승인 시 대상 유저(targetUserId)의 누적 신고 승인 횟수를 1 증가시킨다.
   * targetType과 무관하게 항상 "신고당한 콘텐츠/행동의 당사자"이므로 타입 분기 없이 적용한다.
   */
  private void incrementTargetUserReportCount(Report report) {
    userRepository.findById(report.getTargetUserId())
        .ifPresent(user -> {
          int current = user.getReportApprovedCount() == null ? 0 : user.getReportApprovedCount();
          user.setReportApprovedCount(current + 1);
        });
  }
}
