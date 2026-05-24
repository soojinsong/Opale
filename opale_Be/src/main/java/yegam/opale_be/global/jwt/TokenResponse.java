package yegam.opale_be.global.jwt;

import lombok.*;


/**
 * 서버 → 프론트로 토큰 전달용 DTO
 *
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TokenResponse {
  private String accessToken;
  private String refreshToken;
}
