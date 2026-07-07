package yegam.opale_be.domain.search.performance.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.CompletionField;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
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
@Document(indexName = "performances", createIndex = true)
public class PerformanceSearchDocument {

  @Id
  private String performanceId;

  @Field(type = FieldType.Text, analyzer = "nori")
  private String title;

  @Field(type = FieldType.Text, analyzer = "nori")
  private String genrenm;

  @Field(type = FieldType.Text, analyzer = "nori")
  private String placeName;

  private Long startDate;
  private Long endDate;

  @Field(type = FieldType.Text, analyzer = "nori")
  private String aiSummary;

  @Field(type = FieldType.Text, analyzer = "nori")
  private List<String> aiKeywords;

  @CompletionField
  private Completion titleSuggest;
}
