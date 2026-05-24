package yegam.opale_be.domain.chat.room.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.chat.room.dto.request.ChatRoomCreateRequestDto;
import yegam.opale_be.domain.chat.room.dto.request.ChatRoomJoinRequestDto;
import yegam.opale_be.domain.chat.room.dto.request.ChatRoomSearchRequestDto;
import yegam.opale_be.domain.chat.room.dto.response.*;
import yegam.opale_be.domain.chat.room.entity.ChatRoom;
import yegam.opale_be.domain.chat.room.entity.RoomType;
import yegam.opale_be.domain.chat.room.exception.ChatRoomErrorCode;
import yegam.opale_be.domain.chat.room.mapper.ChatRoomMapper;
import yegam.opale_be.domain.chat.room.repository.ChatRoomRepository;
import yegam.opale_be.domain.culture.performance.entity.Performance;
import yegam.opale_be.domain.culture.performance.repository.PerformanceRepository;
import yegam.opale_be.domain.user.entity.User;
import yegam.opale_be.domain.user.repository.UserRepository;
import yegam.opale_be.global.exception.CustomException;
import yegam.opale_be.global.exception.GlobalErrorCode;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatRoomService {

  private final ChatRoomRepository chatRoomRepository;
  private final ChatRoomMapper chatRoomMapper;
  private final PerformanceRepository performanceRepository;
  private final UserRepository userRepository;
  private final SimpMessagingTemplate messagingTemplate;

  /**
   * 채팅방 생성
   * 
   * @param userId
   * @param dto
   * @return
   */
  @Transactional
  public ChatRoomResponseDto createRoom(Long userId, ChatRoomCreateRequestDto dto) {
    Long creatorId = (dto.getCreatorId() != null && dto.getCreatorId() == -1) ? 2L : userId;

    User creator = userRepository.findById(creatorId)
        .orElseThrow(() -> new CustomException(ChatRoomErrorCode.CREATOR_NOT_FOUND));

    Performance performance = null;
    if (dto.getPerformanceId() != null) {
      performance = performanceRepository.findById(dto.getPerformanceId()).orElse(null);
    }

    ChatRoom room = chatRoomMapper.toEntity(dto, performance, creator);
    chatRoomRepository.save(room);

    return chatRoomMapper.toResponseDto(room);
  }

  /**
   * 채팅방 목록 조회
   * 
   * @param dto
   * @return
   */
  public ChatRoomListResponseDto getChatRooms(ChatRoomSearchRequestDto dto) {

    String roomTypeStr = (dto.getRoomType() == null || dto.getRoomType().isBlank()) ? null : dto.getRoomType();
    String performanceId = (dto.getPerformanceId() == null || dto.getPerformanceId().isBlank()) ? null : dto.getPerformanceId();
    String keyword = (dto.getKeyword() == null || dto.getKeyword().isBlank()) ? null : dto.getKeyword();

    RoomType roomType = null;
    if (roomTypeStr != null) {
      try {
        roomType = RoomType.valueOf(roomTypeStr);
      } catch (IllegalArgumentException e) {
        throw new CustomException(ChatRoomErrorCode.INVALID_ROOM_TYPE);
      }
    }

    List<ChatRoom> rooms = chatRoomRepository.searchRooms(roomType, performanceId, keyword);

    return chatRoomMapper.toListResponseDto(rooms);
  }

  /**
   * 특정 채팅방 조회
   * 
   * @param roomId
   * @return
   */
  public ChatRoomResponseDto getChatRoom(Long roomId) {
    ChatRoom room = chatRoomRepository.findById(roomId)
        .orElseThrow(() -> new CustomException(ChatRoomErrorCode.ROOM_NOT_FOUND));
    return chatRoomMapper.toResponseDto(room);
  }

  /**
   * 특정 채팅방 삭제
   * 
   * @param userId
   * @param roomId
   */
  @Transactional
  public void deleteChatRoom(Long userId, Long roomId) {
    if (userId == null) throw new CustomException(GlobalErrorCode.UNAUTHORIZED);

    ChatRoom room = chatRoomRepository.findById(roomId)
        .orElseThrow(() -> new CustomException(ChatRoomErrorCode.ROOM_NOT_FOUND));

    if (!room.getCreator().getUserId().equals(userId)) {
      throw new CustomException(GlobalErrorCode.FORBIDDEN);
    }

    chatRoomRepository.delete(room);
    log.info("채팅방 삭제 완료 - roomId={}, deletedBy={}", roomId, userId);

    ChatRoomUpdateDto updateDto = chatRoomMapper.toUpdateDto(room);
    updateDto.setIsActive(false);
    messagingTemplate.convertAndSend("/topic/rooms", updateDto);
  }

  /**
   * 특정 채팅방 입장
   *
   * @param userId
   * @param roomId
   * @param dto
   * @return
   */
  @Transactional
  public ChatRoomResponseDto joinRoom(Long userId, Long roomId, ChatRoomJoinRequestDto dto) {
    if (userId == null) throw new CustomException(GlobalErrorCode.UNAUTHORIZED);

    ChatRoom room = chatRoomRepository.findById(roomId)
        .orElseThrow(() -> new CustomException(ChatRoomErrorCode.ROOM_NOT_FOUND));

    if (!room.getIsPublic()) {
      String inputPassword = (dto != null && dto.getPassword() != null) ? dto.getPassword() : "";
      if (room.getPassword() == null || !room.getPassword().equals(inputPassword)) {
        throw new CustomException(ChatRoomErrorCode.INVALID_ROOM_PASSWORD);
      }
    }

    room.setVisitCount(room.getVisitCount() + 1);
    room.setIsActive(true);

    log.info("사용자 {} 채팅방 입장 완료 - roomId={}, totalVisits={}", userId, roomId, room.getVisitCount());

    ChatRoomUpdateDto updateDto = chatRoomMapper.toUpdateDto(room);
    messagingTemplate.convertAndSend("/topic/rooms", updateDto);

    return chatRoomMapper.toResponseDto(room);
  }

  /**
   * 특정 공연의 오픈채팅방 존재 여부 조회
   * 
   * @param performanceId
   * @return
   */
  public ChatRoomExistenceResponseDto getPublicRoomByPerformance(String performanceId) {
    ChatRoom room = chatRoomRepository
        .findFirstByRoomTypeAndPerformance_PerformanceId(RoomType.PERFORMANCE_PUBLIC, performanceId)
        .orElse(null);

    return chatRoomMapper.toExistenceDto(room);
  }

}
