package yegam.opale_be.domain.preference.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import yegam.opale_be.domain.preference.service.PreferenceBatchService;

import java.util.Set;


/**
 * 일정 시간(1분)마다 작동
 * : 로그 찍힌 사용자 행동 로그가 반영되며, 선호 벡터값이 업데이트.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VectorUpdateScheduler {

  private final StringRedisTemplate redisTemplate;
  private final PreferenceBatchService batchService;

  @Scheduled(fixedDelay = 60000) // 1분마다 실행
  public void updateDirtyUsers() {
    // 레디스에서 가져옴.
    Set<String> keys = redisTemplate.keys("vector:update:*");

    // 없으면 return
    if (keys == null || keys.isEmpty()) return;

    // 행동 로그 업데이트 진행.
    log.info("dirty user {}명 벡터 업데이트 시작", keys.size());

    for (String key : keys) {
      try {
        Long userId = Long.valueOf(key.split(":")[2]);
        
        // 업데이트 하고
        batchService.updateSingleUserVector(userId);
        // 레디스에서 지워줌
        redisTemplate.delete(key);

      } catch (Exception e) {
        log.error("dirty user 업데이트 실패 key={}", key, e);
      }
    }

    log.info("dirty user 벡터 업데이트 완료");
  }
}