package yegam.opale_be.domain.tip.entity;

import jakarta.persistence.*;
import lombok.*;
import yegam.opale_be.domain.culture.performance.entity.Performance;
import yegam.opale_be.domain.culture.performance.entity.PerformanceImage;
import yegam.opale_be.domain.user.entity.User;
import yegam.opale_be.global.common.BaseTimeEntity;

/**
 * PerformanceTip
 * - 회원이 공연 할인/좌석 정보 등을 이미지로 제보
 * - 관리자 승인 시 PerformanceImage로 반영됨 (신고와 달리 사전 승인 게이트라 별도 신고 기능 불필요)
 */
@Entity
@Table(name = "performance_tips")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceTip extends BaseTimeEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "performance_tip_id", nullable = false)
  private Long performanceTipId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "performance_id", nullable = false,
      foreignKey = @ForeignKey(name = "fk_perf_tip_performance"))
  private Performance performance;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "submitter_id", nullable = false,
      foreignKey = @ForeignKey(name = "fk_perf_tip_submitter"))
  private User submitter;

  @Column(name = "image_url", length = 255, nullable = false)
  private String imageUrl;

  @Enumerated(EnumType.STRING)
  @Column(name = "image_type", length = 20, nullable = false)
  private PerformanceImage.ImageType imageType;

  @Column(name = "source_url", length = 255)
  private String sourceUrl;

  @Lob
  @Column(name = "description")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", length = 20, nullable = false)
  @Builder.Default
  private PerformanceTipStatus status = PerformanceTipStatus.PENDING;

  @Column(name = "admin_memo", length = 500)
  private String adminMemo;
}
