package yegam.opale_be.global.common.policy;

import yegam.opale_be.domain.analytics.entity.UserEventLog;

public enum EventWeightPolicy {


  VIEW(1, 4),
  FAVORITE(3, 5),
  BOOKED(5, 6),
  REVIEW_WRITE(10, 7);

  private final int logWeight;
  private final int embeddingWeight;

  EventWeightPolicy(int logWeight, int embeddingWeight) {
    this.logWeight = logWeight;
    this.embeddingWeight = embeddingWeight;
  }

  public int getLogWeight() {
    return logWeight;
  }

  public int getEmbeddingWeight() {
    return embeddingWeight;
  }

  public static EventWeightPolicy from(UserEventLog.EventType type) {
    return EventWeightPolicy.valueOf(type.name());
  }

  public static int getDwellTimeWeight(int seconds) {
    if (seconds < 30)  return 1;
    if (seconds < 120) return 2;
    if (seconds < 600) return 3;
    return 4;
  }

}
