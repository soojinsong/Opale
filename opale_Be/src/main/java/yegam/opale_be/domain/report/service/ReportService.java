package yegam.opale_be.domain.report.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
import yegam.opale_be.global.exception.CustomException;
import yegam.opale_be.global.exception.GlobalErrorCode;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

  private final ReportRepository reportRepository;

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

    return ReportMapper.toDetailDto(report);
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

    return ReportMapper.toDetailDto(report);
  }
}
