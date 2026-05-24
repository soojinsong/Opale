package yegam.opale_be.global.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;
import yegam.opale_be.global.jwt.JwtProvider;


/**
 * 모든 STOMP 메시지에서 실행됨(CONNECT, SUBSCRIBE, SEND, DISCONNECT)
 * 전처리 내용.
 *
 * 프론트 -> 서버 ( {현재 여기} -> controller )
 *
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompHandler implements ChannelInterceptor {

  private final JwtProvider jwtProvider;

  /**
   * 모든 STOMP 메시지에서 전처리로서 실행됨(CONNECT, SUBSCRIBE, SEND, DISCONNECT)
   * : STOMP 세션 시작(CONNECT) 시 사용자 인증 처리.
   * 이후에는 sessionAttributes로 계속 사용
   *
   * @param message // STOMP 프레임 전체 - command (CONNECT / SEND / SUBSCRIBE), headers (Authorization 등), body (실제 채팅 내용)
   * @param channel // 메시지가 지나가는 통로(파이프)
   * @return
   */
  @Override
  public Message<?> preSend(Message<?> message, MessageChannel channel) {
    // Message를 STOMP 형식으로 감싸서 command, header 등을 쉽게 접근하도록 변환
    // STOMP 메시지를 다루기 위한 accessor 객체 생성 (accessor : STOMP 메시지의 메타데이터(command, header 등)를 다루는 객체)
    StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

    // 웹소켓 연결할 때만 JWT 검사 (처음 CONNECT 할 때)
    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
      // header에서 해당 key의 첫 번째 값 가져오기
      String token = accessor.getFirstNativeHeader("Authorization"); // Authorization이라는 이름의 헤더 중 첫 번째 값 가져와라

      // 토큰이 비정상이면, 비로그인 사용자 계정으로 취급.
      if (token == null || token.isBlank()) {
        log.info("비로그인 사용자 WebSocket CONNECT - 게스트 모드");

        // Guest 사용자로 취급됨.
        accessor.getSessionAttributes().put("guest", true);

        return message;
      }

      // 토큰에서 추출.
      if (token.startsWith("Bearer ")) {
        token = token.substring(7).trim();
      }


      try {
        // 토큰 유효한지 확인.
        jwtProvider.validateTokenOrThrow(token);

        // 토큰 안에서 사용자Id 추출하고, 해당 계정으로 취급.
        Long userId = jwtProvider.extractUserIdAsLong(token);
        accessor.getSessionAttributes().put("userId", userId);
        log.info("WebSocket CONNECT 인증 성공 - userId={}", userId);

      } catch (Exception e) {
        // 검증 실패 시, Guest 사용자 계정으로 취급됨.
        log.warn("WebSocket JWT 검증 실패: {}", e.getMessage());
        accessor.getSessionAttributes().put("guest", true);
      }
    }

    return message;
  }
}
