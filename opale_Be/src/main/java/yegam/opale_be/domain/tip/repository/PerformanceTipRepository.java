package yegam.opale_be.domain.tip.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import yegam.opale_be.domain.tip.entity.PerformanceTip;
import yegam.opale_be.domain.tip.entity.PerformanceTipStatus;

@Repository
public interface PerformanceTipRepository extends JpaRepository<PerformanceTip, Long> {

  /** 상태별 제보 목록 페이징 조회 (관리자용) */
  Page<PerformanceTip> findByStatus(PerformanceTipStatus status, Pageable pageable);
}
