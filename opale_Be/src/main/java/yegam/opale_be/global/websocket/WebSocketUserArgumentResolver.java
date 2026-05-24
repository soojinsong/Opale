package yegam.opale_be.global.websocket;

import org.springframework.core.MethodParameter;
import org.springframework.messaging.Message;
import org.springframework.messaging.handler.invocation.HandlerMethodArgumentResolver;
import org.springframework.stereotype.Component;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

/**
 * WebSocket에서도 @AuthenticationPrincipal 쓰게 해주는 어댑터
 * : REST API랑 달리 웹소켓에서는 @AuthenticationPrincipal이 자동 주입되지 않기 때문에,
 * accessor.getUser()에서 user를 꺼내 Long userId로 변환해주는 기능.
 *
 * true면? 이 Resolver가 선택됨
 *
 */
@Component
public class WebSocketUserArgumentResolver implements HandlerMethodArgumentResolver {

  /**
   * 내가 처리 가능한지 판단
   *
   * : 웹소켓 호출하는 API controller 중에서
   * @AuthenticationPrincipal 붙어있고, 타입이 Long이면
   * → true
   * ( true면? 이 Resolver가 선택됨 )
   *
   * @param parameter
   * @return
   */
  @Override
  public boolean supportsParameter(MethodParameter parameter) {
    return parameter.hasParameterAnnotation(AuthenticationPrincipal.class)
        && parameter.getParameterType().equals(Long.class);
  }

  /**
   * 실제 값 만들어서 넣기
   * : 맞으면 결과를 처리해줌.
   *
   * 1. 메시지에서 accessor 꺼냄
   * 2. user 꺼냄
   * 3. user → userId(Long) 변환
   * 4. return
   * ( 메시지에서 뽑은게 userId로 들어감 = @AuthenticationPrincipal )
   *
   * @param parameter
   * @param message
   * @return
   */
  @Override
  public Object resolveArgument(MethodParameter parameter, Message<?> message) {
    StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
    if (accessor.getUser() == null) return null;
    return Long.valueOf(accessor.getUser().getName());
  }
}
