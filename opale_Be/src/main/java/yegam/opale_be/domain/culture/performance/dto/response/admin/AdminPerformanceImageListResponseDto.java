package yegam.opale_be.domain.culture.performance.dto.response.admin;

import lombok.*;
import java.sql.Date;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPerformanceImageListResponseDto {

  private String performanceId;
  private String title;
  private String placeName;
  private Date startDate;
  private Date endDate;

  private int totalCount;
  private int discountCount;
  private int castingCount;
  private int seatCount;
  private int noticeCount;
  private int otherCount;

  private List<AdminPerformanceImageResponseDto> discountImages;
  private List<AdminPerformanceImageResponseDto> castingImages;
  private List<AdminPerformanceImageResponseDto> seatImages;
  private List<AdminPerformanceImageResponseDto> noticeImages;
  private List<AdminPerformanceImageResponseDto> otherImages;
}
