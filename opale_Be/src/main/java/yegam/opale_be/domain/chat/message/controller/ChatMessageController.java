package yegam.opale_be.domain.chat.message.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import yegam.opale_be.domain.chat.message.dto.request.ChatMessageRequestDto;
import yegam.opale_be.domain.chat.message.dto.response.*;
import yegam.opale_be.domain.chat.message.service.ChatMessageService;
import yegam.opale_be.domain.chat.room.dto.response.ChatRoomUpdateDto;
import yegam.opale_be.domain.chat.room.mapper.ChatRoomMapper;
import yegam.opale_be.global.exception.CustomException;
import yegam.opale_be.global.exception.GlobalErrorCode;
import yegam.opale_be.global.response.BaseResponse;

@RestController
@RequestMapping("/api/chat/messages")
@RequiredArgsConstructor
@Tag(name = "ChatMessage", description = "채팅 메시지 관련 API")
public class ChatMessageController {

  private final ChatMessageService chatMessageService;
  private final SimpMessagingTemplate messagingTemplate;
  private final ChatRoomMapper chatRoomMapper;


  /**
   * 채팅방 입장 시, 해당 채팅방의 과거 메시지 목록 조회
   *
   * @param roomId
   * @param page
   * @param size
   * @return
   */
  @Operation(summary = "채팅방 과거 메시지 조회", description = "특정 채팅방의 과거 메시지를 페이지 단위로 조회합니다.")
  @GetMapping("/{roomId}")
  public ResponseEntity<BaseResponse<ChatMessageListResponseDto>> getMessages(
      @PathVariable Long roomId,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "50") int size
  ) {
    ChatMessageListResponseDto response = chatMessageService.getMessages(roomId, page, size);
    return ResponseEntity.ok(BaseResponse.success("메시지 목록 조회 성공", response));
  }


  /**
   * 내가 작성한 메시지 목록
   *
   * @param userId
   * @param page
   * @param size
   * @return
   */
  @Operation(summary = "내 메시지 목록 조회", description = "로그인 사용자가 작성한 메시지들을 채팅방 정보와 함께 조회합니다.")
  @GetMapping("/my")
  public ResponseEntity<BaseResponse<ChatMessageListWithRoomResponseDto>> getMyMessages(
      @AuthenticationPrincipal Long userId,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "30") int size
  ) {
    ChatMessageListWithRoomResponseDto response = chatMessageService.getMyMessages(userId, page, size);
    return ResponseEntity.ok(BaseResponse.success("내 메시지 목록 조회 성공", response));
  }


  /**
   * REST 테스트용 메시지 전송
   *
   * @param userId
   * @param dto
   * @return
   */
  @Operation(summary = "채팅 메시지 전송 (REST)", description = "테스트용 메시지 전송 API")
  @PostMapping
  public ResponseEntity<BaseResponse<ChatMessageResponseDto>> sendMessage(
      @AuthenticationPrincipal Long userId,
      @RequestBody ChatMessageRequestDto dto
  ) {
    ChatMessageResponseDto response = chatMessageService.saveMessage(userId, dto);
    return ResponseEntity.ok(BaseResponse.success("메시지 전송 성공", response));
  }

  /**
   * STOMP 메시지 핸들러 (@Controller 역할, HTTP 아님)
   *
   * @param request
   * @param accessor
   */
  @MessageMapping("/chat/send") // @MessageMapping = WebSocket 메시지 핸들러(Controller) (실제 경로 : /app/chat/send)
  public void sendMessageWebSocket(ChatMessageRequestDto request, SimpMessageHeaderAccessor accessor) {

    // WebSocket 세션에서 userId를 가져와 인증 확인
    Long userId = (Long) accessor.getSessionAttributes().get("userId");
    if (userId == null) {
      throw new CustomException(GlobalErrorCode.UNAUTHORIZED);
    }

    // 채팅 메시지 DB에 저장하고, 채팅메시지 Dto를 생성.
    ChatMessageResponseDto response = chatMessageService.saveMessage(userId, request);

    // (웹소켓) 해당 채팅방(/topic/rooms/{roomId})을 구독 중인 모든 클라이언트에게 메시지 Dto를 전송함.
    messagingTemplate.convertAndSend("/topic/rooms/" + response.getRoomId(), response);

    // 채팅방 목록 업데이트(이 메시지가 최근 마지막으로 간 메시지가 될 수 있도록)하고, 채팅방 Dto를 생성.
    ChatRoomUpdateDto updateDto = chatRoomMapper.toUpdateDtoFromMessage(response);

    // (웹소켓) 채팅방 목록(/topic/rooms)을 구독 중인 모든 클라이언트(채팅방 목록 보고 있는 모두)에게 업데이트하라고 채팅방 Dto를 전송함.
    messagingTemplate.convertAndSend("/topic/rooms", updateDto);
  }
}
