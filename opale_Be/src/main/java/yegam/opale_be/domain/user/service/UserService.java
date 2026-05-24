package yegam.opale_be.domain.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.email.service.EmailService;
import yegam.opale_be.domain.preference.entity.UserPreferenceVector;
import yegam.opale_be.domain.preference.repository.UserPreferenceVectorRepository;
import yegam.opale_be.domain.user.dto.request.*;
import yegam.opale_be.domain.user.dto.response.*;
import yegam.opale_be.domain.user.entity.User;
import yegam.opale_be.domain.user.exception.UserErrorCode;
import yegam.opale_be.domain.user.mapper.UserMapper;
import yegam.opale_be.domain.user.repository.UserRepository;
import yegam.opale_be.global.exception.CustomException;

import java.time.LocalDateTime;


/**
 * 회원 User의 정보 관련 비즈니스 로직.
 *
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final UserMapper userMapper;
  private final EmailService emailService;

  private final UserPreferenceVectorRepository vectorRepository;

  /**
   * 회원가입
   * 
   * @param dto
   * @return
   */
  @Transactional
  public UserResponseDto signUp(UserSignUpRequestDto dto) {

    // 이메일 인증 여부 검증
    if (!emailService.isVerifiedForSignUp(dto.getEmail())) {
      throw new CustomException(UserErrorCode.EMAIL_NOT_VERIFIED);
    }

    // 이메일 중복 여부 검증
    if (userRepository.existsByEmail(dto.getEmail())) {
      throw new CustomException(UserErrorCode.DUPLICATE_EMAIL);
    }
    // 닉네임 중복 여부 검증
    if (userRepository.existsByNickname(dto.getNickname())) {
      throw new CustomException(UserErrorCode.DUPLICATE_NICKNAME);
    }

    // 해당 정보를 바탕으로 User 객체 생성하고 DB에 저장.
    User user = User.builder()
        .email(dto.getEmail())
        .password(passwordEncoder.encode(dto.getPassword()))
        .name(dto.getName())
        .birth(dto.getBirth())
        .gender(dto.getGender())
        .phone(dto.getPhone())
        .address1(dto.getAddress1())
        .address2(dto.getAddress2())
        .nickname(dto.getNickname())
        .role(User.Role.USER)
        .isDeleted(false)
        .build();

    userRepository.save(user);

    log.info("회원가입 완료: userId={}, email={}", user.getUserId(), user.getEmail());

    // 이메일 인증 여부 삭제
    emailService.clearVerifiedEmail(dto.getEmail());

    // 사용자 선호 벡터 null로 생성해서 DB에 미리 생성해놓음.
    UserPreferenceVector vector = UserPreferenceVector.builder()
        .user(user)
        .embeddingVector(null)
        .build();

    vectorRepository.save(vector);

    log.info("신규 유저 벡터 초기화 완료: userId={}", user.getUserId());

    // dto를 반환.
    return userMapper.toUserResponseDto(user);
  }

  /**
   * 닉네임 중복 여부 확인
   * 
   * @param nickname
   * @return
   */
  @Transactional(readOnly = true)
  public CheckNicknameResponseDto checkDuplicateNickname(String nickname) {
    // 해당 닉네임이 DB에 있는지 여부를 반환.
    boolean exists = userRepository.existsByNickname(nickname);
    return userMapper.toCheckNicknameResponseDto(nickname, exists);
  }

  /**
   * 이메일 중복 여부 확인
   * 
   * @param email
   * @return
   */
  @Transactional(readOnly = true)
  public boolean checkDuplicateEmail(String email) {
    // 해당 이메일이 DB에 있는지 여부를 반환.
    return userRepository.existsByEmail(email);
  }

  /**
   * 사용자 정보 조회
   * 
   * @param userId
   * @return
   */
  @Transactional(readOnly = true)
  public UserResponseDto getUser(Long userId) {
    // userId에 일치하는 정보를 dto로 생성해서 반환. (soft Deleted된 사용자 제외)
    return userRepository.findById(userId)
        .filter(u -> !Boolean.TRUE.equals(u.getIsDeleted()))
        .map(userMapper::toUserResponseDto)
        .orElseThrow(() -> new CustomException(UserErrorCode.USER_NOT_FOUND)); // 없으면 예외 처리
  }

  /**
   * 사용자 정보 업데이트(put)
   *
   * @param userId
   * @param dto
   * @return
   */
  @Transactional
  public UserResponseDto updateUser(Long userId, UserUpdateRequestDto dto) {

    // userId와 일치하는 사용자를 DB에서 찾고 dto의 정보를 업데이트.
    return userRepository.findById(userId)
        .map(user -> {
          // 닉네임이 null이 아니면
          if (dto.getNickname() != null) {
            // 중복된 닉네임이 아니고, 현재 닉네임과 같지 않으면 
            if (userRepository.existsByNickname(dto.getNickname())
                && !dto.getNickname().equals(user.getNickname())) {
              throw new CustomException(UserErrorCode.DUPLICATE_NICKNAME);
            }
            // 닉네임 반영.
            user.setNickname(dto.getNickname());
          }

          // null이 아닌 연락처, 주소1, 주소2 반영.
          if (dto.getPhone() != null) user.setPhone(dto.getPhone());
          if (dto.getAddress1() != null) user.setAddress1(dto.getAddress1());
          if (dto.getAddress2() != null) user.setAddress2(dto.getAddress2());

          // 반영된 User를 dto로 변환하고 반환.
          log.info("회원 정보 수정: userId={}, email={}", user.getUserId(), user.getEmail());
          return userMapper.toUserResponseDto(user);
        })
        .orElseThrow(() -> new CustomException(UserErrorCode.USER_NOT_FOUND)); // 없으면 예외 처리
  }

  /**
   * 비밀번호 변경
   * 
   * @param userId
   * @param dto
   */
  @Transactional
  public void changePassword(Long userId, PasswordChangeRequestDto dto) {
    // DB에서 userId의 User를 찾음.
    userRepository.findById(userId)
        .map(user -> {
          // 그 User의 비밀번호와 입력한 현재 비밀번호가 다르면 예외.
          if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            throw new CustomException(UserErrorCode.CURRENT_PASSWORD_NOT_MATCHED);
          }
          // 입력한 새 비밀번호를 암호화하고 DB에 반영함.
          user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
          log.info("비밀번호 변경 완료: userId={}", user.getUserId());
          return user;
        })
        .orElseThrow(() -> new CustomException(UserErrorCode.USER_NOT_FOUND)); // 없으면 예외 처리
  }


  /**
   * 회원 탈퇴
   * 
   * @param userId
   * @param dto
   */
  @Transactional
  public void deleteUser(Long userId, UserDeleteRequestDto dto) {
    // DB에서 userId의 User를 찾음.
    userRepository.findById(userId)
        .map(user -> {
          // soft Delete 처리해주고 반영.
          user.setIsDeleted(true);
          user.setDeletedAt(LocalDateTime.now());
          log.info("회원 탈퇴 처리: userId={}, email={}", user.getUserId(), user.getEmail());
          return user;
        })
        .orElseThrow(() -> new CustomException(UserErrorCode.USER_NOT_FOUND)); // 없으면 예외 처리
  }

  /**
   * 임시 비밀번호 발급
   * 
   * @param dto
   * @return
   */
  @Transactional
  public PasswordResetResponseDto resetPassword(PasswordResetRequestDto dto) {
    // 입력한 이메일을 가진 사용자를 찾음.
    User user = userRepository.findByEmail(dto.getEmail())
        .orElseThrow(() -> new CustomException(UserErrorCode.USER_NOT_FOUND)); // 없으면 예외 처리

    // 임시 비밀번호를 발급하고, 그걸 암호화해서, 임시로 사용자의 비밀번호로 반영시킴.
    String tempPassword = generateTempPassword();
    String encodedTempPw = passwordEncoder.encode(tempPassword);

    user.setPassword(encodedTempPw);

    log.info("임시 비밀번호 발급 완료: email={}, tempPassword(raw)={}",
        user.getEmail(), tempPassword);

    // 임시 비밀번호를 사용자의 이메일로 발송함.
    emailService.sendTempPassword(user.getEmail(), tempPassword);

    return userMapper.toPasswordResetResponseDto(user.getEmail());
  }


  /**
   * 랜덤하게 임시 비밀번호를 만들어주는 utils 함수
   *
   * @return
   */
  private String generateTempPassword() {

    String upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    String lower = "abcdefghijklmnopqrstuvwxyz";
    String digits = "0123456789";
    String special = "!@#$%^&*()_+-=";

    String all = upper + lower + digits + special;
    java.util.Random random = new java.util.Random();

    StringBuilder password = new StringBuilder();
    password.append(upper.charAt(random.nextInt(upper.length())));
    password.append(digits.charAt(random.nextInt(digits.length())));
    password.append(special.charAt(random.nextInt(special.length())));

    for (int i = 0; i < 7; i++) {
      password.append(all.charAt(random.nextInt(all.length())));
    }

    java.util.List<Character> chars = password.chars()
        .mapToObj(c -> (char) c)
        .collect(java.util.stream.Collectors.toList());

    java.util.Collections.shuffle(chars);

    StringBuilder finalPw = new StringBuilder();
    chars.forEach(finalPw::append);

    return finalPw.toString();
  }

}
