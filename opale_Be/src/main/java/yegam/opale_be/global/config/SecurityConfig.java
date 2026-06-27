package yegam.opale_be.global.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import yegam.opale_be.global.security.JwtAuthenticationFilter;
import yegam.opale_be.global.security.handler.CustomAccessDeniedHandler;
import yegam.opale_be.global.security.handler.CustomAuthenticationEntryPoint;


/**
 * Spring Security 설정 파일
 * : 요청이 들어올 때, 어떤 것을 해줄지 설정, 보안 정책 설정.
 * (JWT Filter 등록 / 인증 규칙 설정 / URL 접근 제한)
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtAuthenticationFilter;
  private final UrlBasedCorsConfigurationSource corsConfigurationSource;
  private final CustomAccessDeniedHandler accessDeniedHandler;
  private final CustomAuthenticationEntryPoint authenticationEntryPoint;

  /**
   * 보안 필터 체인 등록
   * : 요청에 대한 보안 관련 설정 체이닝.
   *
   * @param http
   * @return
   * @throws Exception
   */
  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        // 보안 전략 설정
        .csrf(AbstractHttpConfigurer::disable)
        .cors(cors -> cors.configurationSource(corsConfigurationSource)) // CORS 정책 설정 (프론트 요청 허용)
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth // 인증, 인가 관련 검사를 할 것.
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // Preflight 요청 허용 (CORS 때문에 필요)
            .requestMatchers(HttpMethod.POST, "/api/reservations/ocr").permitAll() // POST /api/reservations/ocr 그냥 통과.

            .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll() // swagger 관련은 그냥 통과.
            
            // 비로그인 사용자도 접근 가능한 것은 그냥 통과.
            .requestMatchers(
                "/api/auth/login",
                "/api/auth/refresh",
                "/api/users",
                "/api/users/check-duplicate",
                "/api/users/check-nickname",
                "/api/email/send",
                "/api/email/verify",
                "/health",
                "/api/performances/**",
                "/api/places/**",
                "/api/discounts/**",
                "/ws/**",
                "/api/search/**",
                "/api/chatbot/**"
            ).permitAll() 

            .requestMatchers("/api/admin/performances/**").permitAll()

            .requestMatchers(
                "/api/admin/banners/**",
                "/api/banners/main",
                "/api/main-performance-banners",
                "/api/admin/main-performance-banners/**",
                "/api/main-content-banners",
                "/api/admin/main-content-banners/**"
            ).permitAll()

            .requestMatchers(HttpMethod.POST, "/api/users/password/reset").permitAll()

            .requestMatchers(HttpMethod.GET, "/api/reviews/performances/{reviewId}").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/reviews/performances/performance/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/reviews/performances/user/**").permitAll()

            .requestMatchers(HttpMethod.GET, "/api/reviews/places/{reviewId}").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/reviews/places/place/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/reviews/places/user/**").permitAll()

            .requestMatchers(HttpMethod.GET, "/api/favorites/**").permitAll()

            .requestMatchers(HttpMethod.GET, "/api/chat/rooms/public/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/chat/rooms/public/performance/**").permitAll()
            .requestMatchers(HttpMethod.GET, "/api/chat/messages/**").permitAll()

            .requestMatchers(HttpMethod.GET, "/api/chat/rooms").permitAll()
            .requestMatchers(HttpMethod.POST, "/api/chat/rooms/search").permitAll()

            .requestMatchers(HttpMethod.GET,
                "/api/recommendations/popular",
                "/api/recommendations/latest",
                "/api/recommendations/genre",
                "/api/recommendations/popular/places",
                "/api/recommendations/popular/chatrooms",
                "/api/recommendations/performance/**"
            ).permitAll()

            // 추천 시스템, 채팅은 로그인 필요(JWT 있어야 함)
            .requestMatchers(HttpMethod.GET,
                "/api/recommendations/user",
                "/api/recommendations/user/**"
            ).authenticated()

            .requestMatchers("/api/chat/**").authenticated()

            // 그 외의 요청도 로그인 필요.
            .anyRequest().authenticated()
        )

        // 예외에 따라 해당되는 핸들러로 보냄.
        .exceptionHandling(ex -> ex
            .authenticationEntryPoint(authenticationEntryPoint) // 인증인가 실패
            .accessDeniedHandler(accessDeniedHandler) // 권한 부족
        )

        // 모든 요청에서 JWT Filter가 제일 먼저 실행됨.
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  /**
   * 비밀번호 암호화 (비번 -> 암호)
   * : 로그인 시 입력값과 DB 값이 일치하는지 비교할 때 사용
   *
   * @return
   */
  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(); // BCrypt는 단방향 해시라 복호화 불가능 (matches로 비교만 가능)
  }

  /**
   * Spring Security에서 기본 로그인 인증 처리를 담당하는 객체
   * (현재 프로젝트에서는 직접 로그인 로직을 구현했기 때문에 실제로 사용되지는 않음)
   *
   * @param config
   * @return
   * @throws Exception
   */
  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
    return config.getAuthenticationManager();
  }


}
