package yegam.opale_be.global.config;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.json.jackson.JacksonJsonpMapper;
import co.elastic.clients.transport.ElasticsearchTransport;
import co.elastic.clients.transport.rest_client.RestClientTransport;
import org.apache.http.HttpHost;
import org.elasticsearch.client.RestClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ElasticsearchConfig {

  // ES URI 주입
  @Value("${spring.elasticsearch.uris}")
  private String elasticUri;

  @Bean
  public ElasticsearchClient elasticsearchClient() {

    // ES 서버 - HTTP 통신하는 기본 클라이언트 (Spring → RestClient → ES로 HTTP 요청)
    RestClient restClient = RestClient.builder(
        HttpHost.create(elasticUri)
    ).build();

    // 통신 + 데이터 변환 기능
    ElasticsearchTransport transport =
        new RestClientTransport(
            restClient,
            new JacksonJsonpMapper()
        );

    // ES 조작하는 클라이언트. 실제로 사용하는 ES API ex)client.search(...)
    return new ElasticsearchClient(transport);
  }
}
