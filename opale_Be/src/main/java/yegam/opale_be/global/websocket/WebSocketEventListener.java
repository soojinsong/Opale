package yegam.opale_be.global.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;


/**
 * WebSocket 연결/해제 이벤트 감지용.
 * : 연결, 해제될 때 전처리/후처리 기능 추가 가능.
 * ex) 로그, 접속자 관리, 유저 상태 관리
 */
@Slf4j
@Component
public class WebSocketEventListener {

  /**
   * 웹소켓 연결(SessionConnectEvent) 시 호출.
   * : 연결 상태 로그 찍는 용도
   *
   * @param event
   */
  @EventListener
  public void handleWebSocketConnectListener(SessionConnectEvent event) {
    // WebSocket 이벤트 안에 들어있는 STOMP 메시지를 편하게 다루기 위한 래퍼로 감싸는 것
    StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
    // 연결된 사용자 식별용 메타데이터 추출 + 로그용
    log.info("WebSocket connected: {}", headerAccessor.getSessionId()); // STOMP 세션 단위의 고유 ID (연결마다 새로 생성됨)
  }

  /**
   * 웹소켓 연결 해제(SessionDisconnectEvent) 시 호출.
   * : 연결 상태 로그 찍는 용도
   *
   * @param event
   */
  @EventListener
  public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
    // WebSocket 이벤트 안에 들어있는 STOMP 메시지를 편하게 다루기 위한 래퍼로 감싸는 것
    StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
    // 연결된 사용자 식별용 메타데이터 추출 + 로그용
    log.info("WebSocket disconnected: {}", headerAccessor.getSessionId()); // STOMP 세션 단위의 고유 ID (연결마다 새로 생성됨)
  }
}
