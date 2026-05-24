package yegam.opale_be.global.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import yegam.opale_be.global.exception.CustomException;
import yegam.opale_be.global.exception.GlobalErrorCode;

import java.security.Key;
import java.util.Base64;
import java.util.Date;


/**
 * 프론트한테 줄 JWT 토큰 만들고 / 검증 / 파싱.
 * : 토큰 = 헤더, 페이로드, 시그니쳐
 *
 */
@Slf4j
@Component
public class JwtProvider {

  private final Key key;
  private final long accessTokenExpireTime;
  private final long refreshTokenExpireTime;

  /**
   * JwtProvider 생성자.
   *
   * @param secretKey
   * @param accessTokenExpireTime
   * @param refreshTokenExpireTime
   */
  public JwtProvider(
      @Value("${spring.jwt.secret}") String secretKey,
      @Value("${spring.jwt.access-token-expire-time}") long accessTokenExpireTime,
      @Value("${spring.jwt.refresh-token-expire-time}") long refreshTokenExpireTime
  ) {
    // 서명(Signature) 만들 때 쓰는 비밀키
    byte[] keyBytes = Base64.getDecoder().decode(secretKey);
    this.key = Keys.hmacShaKeyFor(keyBytes);

    // Access Token, Refresh Token 유효시간
    this.accessTokenExpireTime = accessTokenExpireTime;
    this.refreshTokenExpireTime = refreshTokenExpireTime;
  }

  /**
   * 토큰 유효성 검증 (토큰 위조 + 만료 검사)
   * : 내부적으로 서명 검증 + 만료 시간 검증까지 수행
   * -> 아무일도 안일어나면 유효o / 에러나면 유효x
   *
   * @param token
   */
  public void validateTokenOrThrow(String token) {
    try {
      // JWT 유효성 검증
      Jwts.parserBuilder()
          .setSigningKey(key) // 검증용 키 설정
          .build() // parser 생성
          .parseClaimsJws(token); // 받은 토큰 파싱 + 검증

    } catch (ExpiredJwtException e) {
      // 유효 시간 만료시, 토큰 만료 예외 반환.
      log.warn("JWT 만료: {}", e.getMessage());
      throw new CustomException(GlobalErrorCode.JWT_EXPIRED);
    } catch (JwtException | IllegalArgumentException e) {
      // 인증되지 않은 토큰이라면, 토큰 유효x 예외 반환.
      log.warn("JWT 유효하지 않음: {}", e.getMessage());
      throw new CustomException(GlobalErrorCode.JWT_INVALID);
    }
  }


  /**
   * AccessToken 생성
   *
   * @param userId
   * @param email
   * @param role
   * @return
   */
  public String createAccessToken(Long userId, String email, String role) {
    // (현재 + 유효 시간)을 알아냄.
    Date now = new Date();
    Date expiry = new Date(now.getTime() + accessTokenExpireTime);

    // access 토큰 만들어서 반환.
    return Jwts.builder()
        .setSubject(String.valueOf(userId)) // (String)userId를 Subject로 넣음.
        // email, role 추가
        .claim("email", email) 
        .claim("role", role)
        
        .setIssuedAt(now) // 토큰 발급 시각
        .setExpiration(expiry) // 토큰 유효 시각
        
        //  header + payload를 secret key로 서명하여 signature 생성
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
  }


  /**
   * RefreshToken 생성
   *
   * @param userId
   * @return
   */
  public String createRefreshToken(Long userId) {
    // (현재 + 유효 시간)을 알아냄.
    Date now = new Date();
    Date expiry = new Date(now.getTime() + refreshTokenExpireTime);

    // refresh 토큰 만들어서 반환.
    return Jwts.builder()
        .setSubject(String.valueOf(userId)) // (String)userId를 Subject로 넣음.
        .setIssuedAt(now) // 토큰 발급 시각
        .setExpiration(expiry) // 토큰 유효 시각
        .signWith(key, SignatureAlgorithm.HS256) // 시그니쳐
        .compact();
  }



  /**
   * 사용자 ID(Long) 추출
   *
   * @param token
   * @return
   */
  public Long extractUserIdAsLong(String token) {
    try {
      // 토큰에서 (Long) userId를 추출해서 반환.
      return Long.parseLong(
          Jwts.parserBuilder()
              .setSigningKey(key)
              .build()
              .parseClaimsJws(token) // 토큰 해석 + 검증 => 결과) Jws<Claims>
              .getBody() // payload(=Claims =body)를 추출
              .getSubject() // payload에서 subject 추출(userId)
      );
    } catch (Exception e) {
      // 에러 나면, 토큰 유효x 예외 반환.
      throw new CustomException(GlobalErrorCode.JWT_INVALID);
    }
  }


  /**
   * 역할(Role) 추출
   *
   * @param token
   * @return
   */
  public String extractUserRole(String token) {
    try {
      // 토큰에서 Role을 추출해서 반환.
      return Jwts.parserBuilder()
          .setSigningKey(key)
          .build()
          .parseClaimsJws(token)
          .getBody() // payload(=Claims =body)를 추출
          .get("role", String.class); // payload의 claim 중 "role" 키에 해당하는 값 추출
    } catch (Exception e) {
      // 에러 나면, 토큰 유효x 예외 반환.
      throw new CustomException(GlobalErrorCode.JWT_INVALID);
    }
  }


}
