package yegam.opale_be.domain.tip.mapper;

import org.springframework.data.domain.Page;
import yegam.opale_be.domain.tip.dto.response.PerformanceTipListResponseDto;
import yegam.opale_be.domain.tip.dto.response.PerformanceTipResponseDto;
import yegam.opale_be.domain.tip.entity.PerformanceTip;

import java.util.List;
import java.util.stream.Collectors;

public class PerformanceTipMapper {

  /** 엔티티 → 응답 DTO */
  public static PerformanceTipResponseDto toResponseDto(PerformanceTip tip) {
    if (tip == null) return null;

    return PerformanceTipResponseDto.builder()
        .performanceTipId(tip.getPerformanceTipId())
        .performanceId(tip.getPerformance().getPerformanceId())
        .performanceTitle(tip.getPerformance().getTitle())
        .submitterId(tip.getSubmitter().getUserId())
        .submitterNickname(tip.getSubmitter().getNickname())
        .imageUrl(tip.getImageUrl())
        .imageType(tip.getImageType())
        .sourceUrl(tip.getSourceUrl())
        .description(tip.getDescription())
        .status(tip.getStatus())
        .adminMemo(tip.getAdminMemo())
        .createdAt(tip.getCreatedAt())
        .build();
  }

  /** 페이지 → 목록 응답 DTO */
  public static PerformanceTipListResponseDto toListResponseDto(Page<PerformanceTip> page) {
    List<PerformanceTipResponseDto> tips = page.getContent().stream()
        .map(PerformanceTipMapper::toResponseDto)
        .collect(Collectors.toList());

    return PerformanceTipListResponseDto.builder()
        .totalCount(page.getTotalElements())
        .currentPage(page.getNumber() + 1)
        .pageSize(page.getSize())
        .totalPages(page.getTotalPages())
        .hasNext(page.hasNext())
        .hasPrev(page.hasPrevious())
        .tips(tips)
        .build();
  }
}
