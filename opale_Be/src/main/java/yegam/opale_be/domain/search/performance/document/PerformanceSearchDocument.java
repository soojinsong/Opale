package yegam.opale_be.domain.search.performance.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.CompletionField;
import org.springframework.data.elasticsearch.core.suggest.Completion;

import java.util.List;


/**
 * ES에 저장되는 공연 데이터 형태
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "performances", createIndex = false)
public class PerformanceSearchDocument {

  @Id
  private String performanceId;

  private String title;
  private String genrenm;
  private String placeName;

  private Long startDate;
  private Long endDate;

  private String aiSummary;
  private List<String> aiKeywords;

  @CompletionField
  private Completion titleSuggest;
}
