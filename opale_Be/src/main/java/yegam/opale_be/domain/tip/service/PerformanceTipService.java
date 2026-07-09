package yegam.opale_be.domain.tip.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import yegam.opale_be.domain.culture.performance.entity.Performance;
import yegam.opale_be.domain.culture.performance.entity.PerformanceImage;
import yegam.opale_be.domain.culture.performance.exception.PerformanceErrorCode;
import yegam.opale_be.domain.culture.performance.repository.PerformanceImageRepository;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.tip.dto.request.PerformanceTipStatusUpdateRequestDto;
import yegam.opale_be.domain.tip.dto.response.PerformanceTipListResponseDto;
import yegam.opale_be.domain.tip.dto.response.PerformanceTipResponseDto;
import yegam.opale_be.domain.tip.entity.PerformanceTip;
import yegam.opale_be.domain.tip.entity.PerformanceTipStatus;
import yegam.opale_be.domain.tip.exception.PerformanceTipErrorCode;
import yegam.opale_be.domain.tip.mapper.PerformanceTipMapper;
import yegam.opale_be.domain.tip.repository.PerformanceTipRepository;
import yegam.opale_be.domain.user.entity.User;
import yegam.opale_be.domain.user.repository.UserRepository;
import yegam.opale_be.global.exception.CustomException;
import yegam.opale_be.global.exception.GlobalErrorCode;
import yegam.opale_be.global.storage.FileStorageService;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PerformanceTipService {

  private final PerformanceTipRepository tipRepository;
  private final PerformanceRepository performanceRepository;
  private final PerformanceImageRepository performanceImageRepository;
  private final UserRepository userRepository;
  private final FileStorageService fileStorageService;

  /**
   * 제보 생성 (회원용)
   * 관리자 승인 전까지는 아무에게도 노출되지 않음 (사전 승인 게이트)
   */
  @Transactional
  public PerformanceTipResponseDto createTip(
      Long userId,
      String performanceId,
      MultipartFile file,
      PerformanceImage.ImageType imageType,
      String sourceUrl,
      String description
  ) {
    if (userId == null) throw new CustomException(GlobalErrorCode.UNAUTHORIZED);
    if (file == null || file.isEmpty()) {
      throw new CustomException(PerformanceTipErrorCode.TIP_IMAGE_REQUIRED);
    }

    User submitter = userRepository.findById(userId)
        .orElseThrow(() -> new CustomException(GlobalErrorCode.UNAUTHORIZED));

    Performance performance = performanceRepository.findById(performanceId)
        .orElseThrow(() -> new CustomException(PerformanceErrorCode.PERFORMANCE_NOT_FOUND));

    String uploadedUrl = fileStorageService.saveFileAndReturnUrl(file, "performance-tips");

    PerformanceTip tip = PerformanceTip.builder()
        .performance(performance)
        .submitter(submitter)
        .imageUrl(uploadedUrl)
        .imageType(imageType)
        .sourceUrl(sourceUrl)
        .description(description)
        .status(PerformanceTipStatus.PENDING)
        .build();

    return PerformanceTipMapper.toResponseDto(tipRepository.save(tip));
  }

  /** 제보 목록 조회 (관리자용) */
  public PerformanceTipListResponseDto getTips(int page, int size, PerformanceTipStatus status) {
    if (page < 1) page = 1;
    if (size < 1) size = 10;

    Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));

    Page<PerformanceTip> tipPage = (status != null)
        ? tipRepository.findByStatus(status, pageable)
        : tipRepository.findAll(pageable);

    return PerformanceTipMapper.toListResponseDto(tipPage);
  }

  /**
   * 제보 처리 (승인/반려, 관리자용)
   * 승인 시 PerformanceImage로 그대로 복사해서 실제 공연 정보에 반영
   */
  @Transactional
  public PerformanceTipResponseDto updateTipStatus(
      Long adminId,
      Long tipId,
      PerformanceTipStatusUpdateRequestDto dto
  ) {
    if (adminId == null) throw new CustomException(GlobalErrorCode.UNAUTHORIZED);

    PerformanceTip tip = tipRepository.findById(tipId)
        .orElseThrow(() -> new CustomException(PerformanceTipErrorCode.TIP_NOT_FOUND));

    if (tip.getStatus() != PerformanceTipStatus.PENDING) {
      throw new CustomException(PerformanceTipErrorCode.INVALID_TIP_STATUS);
    }

    tip.setStatus(dto.getStatus());
    tip.setAdminMemo(dto.getAdminMemo());

    if (dto.getStatus() == PerformanceTipStatus.APPROVED) {
      PerformanceImage image = PerformanceImage.builder()
          .performance(tip.getPerformance())
          .imageUrl(tip.getImageUrl())
          .imageType(tip.getImageType())
          .sourceUrl(tip.getSourceUrl())
          .build();
      performanceImageRepository.save(image);
    }

    return PerformanceTipMapper.toResponseDto(tip);
  }
}
