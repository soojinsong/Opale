package yegam.opale_be.global.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import yegam.opale_be.global.jwt.JwtProvider;

import java.io.IOException;
import java.util.Collections;
import java.util.List;


/**
 * JwtFillter 담당
 * : 요청마다 Authorization 헤더에서 JWT 토큰을 꺼내
 * 토큰을 검증하고, payload에서 userId / role을 추출하여
 * SecurityContext에 인증 정보를 저장.
 *
 */
@Slf4j
@RequiredArgsConstructor
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private static final String AUTHORIZATION_HEADER = "Authorization";
  private static final String BEARER_PREFIX = "Bearer ";

  private final JwtProvider jwtProvider;

  /**
   * 토큰 받아서 정보 저장하는 기능.
   *
   * @param request
   * @param response
   * @param filterChain
   * @throws ServletException
   * @throws IOException
   */
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    // 전처리한 토큰 값
    String token = resolveToken(request);

    // null이 아니면 진행 토큰의 정보를 SecurityContext에 저장.
    if (token != null) {
      try {
        // 토큰 유효성 검사
        jwtProvider.validateTokenOrThrow(token);

        // 토큰에서 userId랑 role 추출
        Long userId = jwtProvider.extractUserIdAsLong(token);
        String role = jwtProvider.extractUserRole(token);

        // authorities: 이 사용자가 가진 권한 목록 (["ROLE_USER", "ROLE_ADMIN"])
        // (ex) @PreAuthorize / .hasRole("ADMIN") 에서 사용됨.
        List<SimpleGrantedAuthority> authorities = Collections.singletonList(
            new SimpleGrantedAuthority("ROLE_" + role)
        );

        // 로그인 완료 객체 생성 -  Authentication 구현체(요청 사용자가 누구인지 저장)
        UsernamePasswordAuthenticationToken authentication =
            // principal(사용자), credentials(비밀번호), authorities(인가 리스트)
            new UsernamePasswordAuthenticationToken(userId, null, authorities);
        // request 정보 추가 저장 (IP 주소, sessionId, 요청 정보)
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

        // SecurityContext에 authentication 객체 저장 (principal=userId, authorities=권한)
        SecurityContextHolder.getContext().setAuthentication(authentication);

        log.debug("JWT 인증 성공 - userId={}, role={}", userId, role);

      } catch (Exception e) {
        // 에러 터지면 SecurityContext 안에 정보 제거.
        log.warn("JWT 인증 실패: {}", e.getMessage());
        SecurityContextHolder.clearContext();
      }
    }

    // 다음 필터 체인으로 요청을 전달 (이걸 호출 안 하면 요청이 멈춤)
    filterChain.doFilter(request, response);
  }


  /**
   * 전송된 토큰 형태 전처리
   *  Authorization 헤더에서 "Bearer " 제거 후 순수 토큰만 반환.
   *  형식이 올바르지 않으면 null 반환.
   *
   * @param request
   * @return
   */
  private String resolveToken(HttpServletRequest request) {
    // request의 헤더에서 Authorization 꺼냄
    String bearerToken = request.getHeader(AUTHORIZATION_HEADER);

    // null이거나 공백이면 null
    if (bearerToken == null || bearerToken.isBlank()) return null;
    // 정해놓은 BEARER_PREFIX로 시작하지 않으면 null
    if (!bearerToken.startsWith(BEARER_PREFIX)) return null;

    // Authorization에서 BEARER_PREFIX만 뺀 뒤에 부분을 token에 저장해서, 있으면 token 반환.
    String token = bearerToken.substring(BEARER_PREFIX.length()).trim();
    return token.isEmpty() ? null : token;
  }
}
