package yegam.opale_be.domain.reservation.service;

import java.util.Base64;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import yegam.opale_be.domain.reservation.dto.response.TicketOcrResponseDto;
import yegam.opale_be.domain.reservation.exception.ReservationErrorCode;
import yegam.opale_be.global.exception.CustomException;
import yegam.opale_be.global.google.GoogleVisionOcrClient;
import yegam.opale_be.global.openai.OpenAiTicketParserService;

/**
 * 이미지 파일을 받아서, 구글 OCR -> OpenAi API 처리 후 티켓 데이터 추출해 반환.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OcrService {

  private final GoogleVisionOcrClient googleVisionOcrClient;
  private final OpenAiTicketParserService openAiTicketParserService;

  public TicketOcrResponseDto extractFromImage(MultipartFile file) {

    try {
      // Base64 변환
      byte[] bytes = file.getBytes();
      String base64Image = Base64.getEncoder().encodeToString(bytes);

      // Google OCR
      String rawText =
          googleVisionOcrClient.extractTextFromImageBase64(base64Image);

      log.info("Google OCR 전체 텍스트:\n{}", rawText);

      if (rawText == null || rawText.isBlank()) {
        throw new CustomException(ReservationErrorCode.OCR_FAIL);
      }

      // GPT로 티켓 정보 구조화
      TicketOcrResponseDto parsed =
          openAiTicketParserService.parse(rawText);

      return parsed;

    } catch (CustomException e) {
      throw e;

    } catch (Exception e) {
      log.error("OCR 전체 처리 실패", e);
      throw new CustomException(ReservationErrorCode.OCR_FAIL);
    }
  }
}
