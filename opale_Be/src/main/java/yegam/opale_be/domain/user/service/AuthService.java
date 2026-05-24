package yegam.opale_be.domain.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.user.dto.request.LoginRequestDto;
import yegam.opale_be.domain.user.dto.response.LoginResponseDto;
import yegam.opale_be.domain.user.dto.response.UserResponseDto;
import yegam.opale_be.domain.user.entity.User;
import yegam.opale_be.domain.user.exception.UserErrorCode;
import yegam.opale_be.domain.user.mapper.UserMapper;
import yegam.opale_be.domain.user.repository.UserRepository;
import yegam.opale_be.global.exception.CustomException;
import yegam.opale_be.global.jwt.JwtProvider;
import yegam.opale_be.global.jwt.TokenResponse;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AuthService {

  private final JwtProvider jwtProvider;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final UserMapper userMapper;
  private final StringRedisTemplate redisTemplate;

  private final Set<String> blacklistedTokens = new HashSet<>();

  private static final String REFRESH_TOKEN_KEY_PREFIX = "refresh:token:";

  /**
   * 로그인
   *
   * @param dto
   * @return
   */
  public LoginResponseDto login(LoginRequestDto dto) {
    // 사용자 찾기.
    User user = userRepository.findByEmail(dto.getEmail())
        .orElseThrow(() -> new CustomException(UserErrorCode.USER_NOT_FOUND));

    // 비밀번호 검증
    if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
      throw new CustomException(UserErrorCode.PASSWORD_NOT_MATCHED);
    }

    // accessToken, refreshToken 준비.
    String accessToken = jwtProvider.createAccessToken(user.getUserId(), user.getEmail(), user.getRole().name());
    String refreshToken = jwtProvider.createRefreshToken(user.getUserId());

    // refreshToken 자체를 저장 + TTL(만료시간) 설정
    String redisKey = REFRESH_TOKEN_KEY_PREFIX + user.getUserId();
    redisTemplate.opsForValue().set(redisKey, refreshToken, 7, TimeUnit.DAYS);

    log.info("로그인 성공: userId={}, email={}", user.getUserId(), user.getEmail());

    // TokenResponse dto 생성
    TokenResponse tokenResponse = TokenResponse.builder()
        .accessToken("Bearer " + accessToken)
        .refreshToken(refreshToken)
        .build();

    // UserResponseDto 생성
    UserResponseDto userResponse = userMapper.toUserResponseDto(user);

    // LoginResponseDto 반환.
    return LoginResponseDto.builder()
        .token(tokenResponse)
        .user(userResponse)
        .build();
  }

  /**
   * RefreshToken 기반 AccessToken 재발급
   *
   * @param refreshToken
   * @return
   */
  public TokenResponse refreshAccessToken(String refreshToken) {
    
    // refreshToken 유효성 검사
    if (refreshToken == null || refreshToken.isBlank()) {
      throw new CustomException(UserErrorCode.JWT_INVALID);
    }

    // refreshToken이 유효한지 검증
    jwtProvider.validateTokenOrThrow(refreshToken);

    // refreshToken에서 userId를 추출해서 검증
    Long userId = jwtProvider.extractUserIdAsLong(refreshToken);
    if (userId == null) {
      throw new CustomException(UserErrorCode.JWT_INVALID);
    }

    // redis에서 그 사용자의 savedToken 가져오기
    String redisKey = REFRESH_TOKEN_KEY_PREFIX + userId;
    String savedToken = redisTemplate.opsForValue().get(redisKey);

    // redis에 가져온 savedToken이 만료됐으면(null) 예외 처리
    if (savedToken == null) {
      throw new CustomException(UserErrorCode.REFRESH_TOKEN_NOT_FOUND);
    }

    // 전송한 refreshToken이 savedToken과 다르면 예외 처리
    if (!refreshToken.equals(savedToken)) {
      throw new CustomException(UserErrorCode.REFRESH_TOKEN_MISMATCH);
    }

    // 사용자를 찾고 다시 newAccessToken, newRefreshToken 토큰 재발급
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new CustomException(UserErrorCode.USER_NOT_FOUND));

    String newAccessToken = jwtProvider.createAccessToken(userId, user.getEmail(), user.getRole().name());
    String newRefreshToken = jwtProvider.createRefreshToken(userId);

    // refreshToken 자체를 저장 + TTL(만료시간) 설정
    redisTemplate.opsForValue().set(redisKey, newRefreshToken, 7, TimeUnit.DAYS);

    log.info("AccessToken & RefreshToken 재발급 완료: userId={}", userId);

    // 재발급한 토큰들을 반환
    return TokenResponse.builder()
        .accessToken("Bearer " + newAccessToken)
        .refreshToken(newRefreshToken)
        .build();
  }

  /**
   * 로그아웃 (AccessToken 자동 인식)
   *
   * @param userId
   */
  public void logout(Long userId) {
    // 사용자 찾기
    if (userId == null) {
      throw new CustomException(UserErrorCode.JWT_INVALID);
    }

    // redis에서 refreshToken 유효기간 삭제
    String redisKey = REFRESH_TOKEN_KEY_PREFIX + userId;
    redisTemplate.delete(redisKey);

    log.info("로그아웃 완료: userId={} (RefreshToken 삭제)", userId);
  }

  // 토큰 주면 그걸 블랙리스트에 추가
  public boolean isBlacklisted(String token) {
    return blacklistedTokens.contains(token);
  }
}
