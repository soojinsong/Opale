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

  /** 행정구역(시/도) 단위 정제된 값. placeName(공연장명 자유텍스트)과 달리 controlled vocabulary라
   *  동음이의어 오매칭 없이 정확한 지역 필터링에 사용 (예: "경기"). Keyword 타입 = 분석 없이 정확히 일치. */
  @Field(type = FieldType.Keyword)
  private String area;

  private Long startDate;
  private Long endDate;

  @Field(type = FieldType.Text, analyzer = "nori")
  private String aiSummary;

  @Field(type = FieldType.Text, analyzer = "nori")
  private List<String> aiKeywords;

  @CompletionField
  private Completion titleSuggest;
}
