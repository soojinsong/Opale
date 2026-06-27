package yegam.opale_be.domain.chatbot.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import yegam.opale_be.domain.chatbot.dto.request.ChatbotMessageRequestDto;
import yegam.opale_be.domain.chatbot.service.ChatbotService;

@RestController
@RequestMapping("/api/chatbot")
@Tag(name = "Chatbot", description = "공연 챗봇 API")
@RequiredArgsConstructor
public class ChatbotController {

  private final ChatbotService chatbotService;

  @Operation(summary = "챗봇 메시지 전송", description = "자연어 질의를 받아 공연 정보 기반 스트리밍 답변을 반환합니다.")
  @PostMapping(value = "/message", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter sendMessage(
      @RequestBody ChatbotMessageRequestDto request,
      @AuthenticationPrincipal Long userId
  ) {
    return chatbotService.streamAnswer(request.getMessage(), userId);
  }
}
