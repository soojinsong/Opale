package yegam.opale_be.global.websocket;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.messaging.handler.invocation.HandlerMethodArgumentResolver;


/**
 * 웹소켓 전체 설정 클래스
 * : 프론트에서 호출할때 사용되는 경로 명시.
 *
 *
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

  private final StompHandler stompHandler;

  /**
   * 웹소켓자체 경로.
   *
   * @param registry
   */
  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    registry.addEndpoint("/ws") // 웹소켓 최초 연결 경로. WebSocket 연결을 시작하는 엔드포인트
        .setAllowedOriginPatterns("*") // 어디서 요청하든 WebSocket 연결 허용
        .withSockJS(); // WebSocket 안되면 fallback으로 HTTP 방식 사용
  }


  /**
   * 웹소켓 구독 관련 경로.
   * 
   * @param registry
   */
  @Override
  public void configureMessageBroker(MessageBrokerRegistry registry) {
    // /~~로 시작하는 것은
    registry.enableSimpleBroker("/topic"); // 구독하는 경로. (서버->클라)
    registry.setApplicationDestinationPrefixes("/app"); // 서버로 보내는 경로. (클라->서버)
  }


  /**
   * 클라이언트 → 서버로 들어오는 모든 WebSocket 메시지를 가로챔
   * (CONNECT, SEND, SUBSCRIBE 등 모든 STOMP 메시지 포함)
   *
   * @param registration
   */
  @Override
  public void configureClientInboundChannel(ChannelRegistration registration) {
    // 클라->서버 들어오는 모든 메시지를 stompHandler가 가로챔.
    registration.interceptors(stompHandler); // stompHandler에서 메시지 전처리 가능.
  }


  /**
   * WebSocket에서도 @AuthenticationPrincipal 쓰게 해주는 설정.
   *
   * @param resolvers
   */
  @Override
  public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
    // @AuthenticationPrincipal 파라미터를 처리할 수 있는 Resolver를 등록
    resolvers.add(new WebSocketUserArgumentResolver()); // 웹소켓에 이 기능을 추가하겠다는 뜻.
  }

}