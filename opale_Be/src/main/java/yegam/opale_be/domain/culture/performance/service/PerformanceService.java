package yegam.opale_be.domain.culture.performance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.culture.performance.dto.request.PerformanceSearchRequestDto;
import yegam.opale_be.domain.culture.performance.dto.response.detail.*;
import yegam.opale_be.domain.culture.performance.dto.response.list.*;
import yegam.opale_be.domain.culture.performance.entity.*;
import yegam.opale_be.domain.culture.performance.exception.PerformanceErrorCode;
import yegam.opale_be.domain.culture.performance.mapper.PerformanceMapper;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.review.common.ReviewType;
import yegam.opale_be.domain.review.performance.repository.PerformanceReviewRepository;
import yegam.opale_be.domain.search.performance.service.PerformanceSearchIndexService;
import yegam.opale_be.global.common.BasePerformanceListResponseDto;
import yegam.opale_be.global.exception.CustomException;

import java.util.Map;
import java.util.HashMap;
import java.util.Comparator;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PerformanceService {

  private final PerformanceRepository performanceRepository;
  private final PerformanceMapper performanceMapper;

  private final PerformanceReviewRepository performanceReviewRepository;

  private final PerformanceSearchIndexService performanceSearchIndexService;

  // ---------------------------------------------------------------------

  /** 공연 목록 조회 (reviewCount 포함) */
  public PerformanceListResponseDto getPerformanceList(PerformanceSearchRequestDto dto) {

    // 조건 확인
    String genre = emptyToNull(dto.getGenre());
    String keyword = emptyToNull(dto.getKeyword());
    String area = emptyToNull(dto.getArea());
    String sortType =
        (dto.getSortType() == null || dto.getSortType().isBlank()) ? "최신" : dto.getSortType();

    int page = (dto.getPage() != null && dto.getPage() > 0) ? dto.getPage() - 1 : 0;
    int size = (dto.getSize() != null && dto.getSize() > 0) ? dto.getSize() : 20;
    PageRequest pageable = PageRequest.of(page, size);

    // 검색어 존재
    if (keyword != null) {

      List<String> esIds;

      // ES로 시도.
      try {
        esIds = performanceSearchIndexService.searchIdsByAccuracy(keyword, page, size);
      } catch (Exception e) {
        log.error("ES search failed", e);

        // ES 실패 시, MySQL에서 검색한 결과를 리턴.
        Page<Performance> fallback =
            performanceRepository.search(genre, keyword, area, sortType, pageable);

        return performanceMapper.toPagedPerformanceListDtoWithReviewCount(
            fallback,
            performanceReviewRepository
        );
      }

      // ES로 찾았을때 공연이 없으면 빈 리스트 반환.
      if (esIds.isEmpty()) {
        return performanceMapper.toPerformanceListDtoWithReviewCount(
            List.of(),
            performanceReviewRepository
        );
      }

      // ES 결과 ID 순서 기준으로 정렬 후, 장르/지역 조건으로 필터링해서 리턴
      List<Performance> performances =
          performanceRepository.findByPerformanceIdIn(esIds);

      Map<String, Integer> orderMap = new HashMap<>();
      for (int i = 0; i < esIds.size(); i++) {
        orderMap.put(esIds.get(i), i);
      }

      performances.sort(
          Comparator.comparingInt(p ->
              orderMap.getOrDefault(p.getPerformanceId(), Integer.MAX_VALUE)
          )
      );

      performances = performances.stream()
          .filter(p -> genre == null || genre.equals(p.getGenrenm()))
          .filter(p -> area == null || area.equals(p.getArea()))
          .toList();

      return performanceMapper.toPerformanceListDtoWithReviewCount(
          performances,
          performanceReviewRepository
      );
    }

    // 검색어 X, MySQL에서 조회해서 리턴.
    Page<Performance> performancePage =
        performanceRepository.search(genre, keyword, area, sortType, pageable);

    return performanceMapper.toPagedPerformanceListDtoWithReviewCount(
        performancePage,
        performanceReviewRepository
    );
  }

  /** 오늘 공연 조회 */
  public PerformanceListResponseDto getTodayPerformances(String type) {
    List<Performance> performances =
        performanceRepository.findPerformancesByTypeAndDate(type, LocalDate.now());

    return performanceMapper.toPerformanceListDtoWithReviewCount(
        performances,
        performanceReviewRepository
    );
  }

  /** 공연 기본 정보 조회 */
  public PerformanceBasicResponseDto getPerformanceBasic(String performanceId) {

    Performance performance = performanceRepository.findById(performanceId)
        .orElseThrow(() -> new CustomException(PerformanceErrorCode.PERFORMANCE_NOT_FOUND));

    Long reviewCount =
        performanceReviewRepository.countByPerformanceIdAndType(
            performanceId, ReviewType.AFTER
        );

    PerformanceBasicResponseDto dto = performanceMapper.toPerformanceBasicDto(performance);
    dto.setReviewCount(reviewCount);

    return dto;
  }

  // ---------------------------------------------------------------------

  /** 공연 예매처 목록 */
  public BasePerformanceListResponseDto<PerformanceRelationResponseDto> getPerformanceRelations(String performanceId) {
    Performance p = performanceRepository.findByIdWithRelations(performanceId)
        .orElseThrow(() -> new CustomException(PerformanceErrorCode.PERFORMANCE_NOT_FOUND));

    List<PerformanceRelationResponseDto> list = p.getPerformanceRelations().stream()
        .map(performanceMapper::toPerformanceRelationDto)
        .collect(Collectors.toList());

    return performanceMapper.toBaseListResponse(p, list);
  }

  /** 공연 영상 목록(유튜브) */
  public BasePerformanceListResponseDto<PerformanceVideoResponseDto> getPerformanceVideos(String performanceId) {
    Performance p = performanceRepository.findByIdWithVideos(performanceId)
        .orElseThrow(() -> new CustomException(PerformanceErrorCode.PERFORMANCE_NOT_FOUND));

    List<PerformanceVideoResponseDto> list = p.getPerformanceVideos().stream()
        .map(performanceMapper::toPerformanceVideoDto)
        .collect(Collectors.toList());

    return performanceMapper.toBaseListResponse(p, list);
  }

  /** 공연 수집 이미지 목록 */
  public BasePerformanceListResponseDto<PerformanceImageResponseDto> getPerformanceImages(String performanceId) {
    Performance p = performanceRepository.findByIdWithImages(performanceId)
        .orElseThrow(() -> new CustomException(PerformanceErrorCode.PERFORMANCE_NOT_FOUND));

    List<PerformanceImageResponseDto> list = p.getPerformanceImages().stream()
        .map(performanceMapper::toPerformanceImageDto)
        .collect(Collectors.toList());

    return performanceMapper.toBaseListResponse(p, list);
  }

  /** 공연 소개 이미지 */
  public BasePerformanceListResponseDto<PerformanceInfoImageResponseDto> getPerformanceInfoImages(String performanceId) {
    Performance p = performanceRepository.findByIdWithInfoImages(performanceId)
        .orElseThrow(() -> new CustomException(PerformanceErrorCode.PERFORMANCE_NOT_FOUND));

    List<PerformanceInfoImageResponseDto> list = p.getPerformanceInfoImages().stream()
        .sorted((a, b) -> a.getOrderIndex().compareTo(b.getOrderIndex()))
        .map(img -> PerformanceInfoImageResponseDto.builder()
            .imageUrl(img.getImageUrl())
            .orderIndex(img.getOrderIndex())
            .build()
        )
        .collect(Collectors.toList());

    return performanceMapper.toBaseListResponse(p, list);
  }

  /** 공연 예매 정보 조회 */
  public PerformanceDetailResponseDto getPerformanceBooking(String performanceId) {
    Performance p = performanceRepository.findById(performanceId)
        .orElseThrow(() -> new CustomException(PerformanceErrorCode.PERFORMANCE_NOT_FOUND));

    return performanceMapper.toPerformanceDetailDto(
        p,
        p.getPerformanceImages(),
        p.getPerformanceRelations(),
        p.getPerformanceVideos()
    );
  }

  private String emptyToNull(String s) {
    return (s == null || s.isBlank()) ? null : s;
  }

  /** 인기 공연 조회 */
  public PerformanceListResponseDto getTopPerformances() {
    List<Performance> performances =
        performanceRepository.findTop10ByOrderByUpdatedateDesc();

    return performanceMapper.toPerformanceListDtoWithReviewCount(
        performances,
        performanceReviewRepository
    );
  }

}
