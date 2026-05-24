export const validateEmail = (email) => {
  if (!email) {
    return { isValid: null, message: '' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(email)) {
    return { isValid: true, message: '올바른 이메일 형식입니다.' };
  } else {
    return { isValid: false, message: '올바른 이메일 형식을 입력해주세요.' };
  }
};

export const validateVerificationCode = (code) => {
  if (!code) {
    return { isValid: null, message: '' };
  }

  const codeRegex = /^\d{6}$/;
  if (codeRegex.test(code)) {
    return { isValid: true, message: '인증번호 형식이 올바릅니다.' };
  } else {
    return { isValid: false, message: '인증번호는 6자리 숫자여야 합니다.' };
  }
};

export const validatePassword = (password) => {
  if (!password) {
    return { isValid: null, message: '' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasMinLength = password.length >= 8;

  if (!hasMinLength) {
    return { isValid: false, message: '비밀번호는 8자 이상이어야 합니다.' };
  }
  if (!hasLetter) {
    return { isValid: false, message: '영문자를 포함해주세요.' };
  }
  if (!hasNumber) {
    return { isValid: false, message: '숫자를 포함해주세요.' };
  }
  if (!hasSpecial) {
    return { isValid: false, message: '특수문자를 포함해주세요.' };
  }

  return { isValid: true, message: '사용 가능한 비밀번호입니다.' };
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { isValid: null, message: '' };
  }

  if (password === confirmPassword) {
    return { isValid: true, message: '비밀번호가 일치합니다.' };
  } else {
    return { isValid: false, message: '비밀번호가 일치하지 않습니다.' };
  }
};

export const validateNickname = (nickname) => {
  if (!nickname) {
    return { isValid: null, message: '' };
  }

  if (nickname.length < 2) {
    return { isValid: false, message: '닉네임은 2자 이상이어야 합니다.' };
  }
  if (nickname.length > 10) {
    return { isValid: false, message: '닉네임은 10자 이하여야 합니다.' };
  }

  return { isValid: true, message: '사용 가능한 닉네임 형식입니다.' };
};

export const validateName = (name) => {
  if (!name) {
    return { isValid: null, message: '' };
  }

  if (name.trim().length === 0) {
    return { isValid: false, message: '성명을 입력해주세요.' };
  }

  return { isValid: true, message: '올바른 성명입니다.' };
};

export const validateBirthDate = (birthDate) => {
  if (!birthDate) {
    return { isValid: null, message: '' };
  }

  if (birthDate.trim().length === 0) {
    return { isValid: false, message: '생년월일을 입력해주세요.' };
  }

  const dateRegex = /^\d{8}$/;
  if (!dateRegex.test(birthDate)) {
    return { isValid: false, message: '생년월일은 YYYYMMdd 형식(8자리 숫자)으로 입력해주세요.' };
  }

  const year = parseInt(birthDate.substring(0, 4));
  const month = parseInt(birthDate.substring(4, 6));
  const day = parseInt(birthDate.substring(6, 8));

  if (month < 1 || month > 12) {
    return { isValid: false, message: '올바른 월을 입력해주세요.' };
  }
  if (day < 1 || day > 31) {
    return { isValid: false, message: '올바른 일을 입력해주세요.' };
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { isValid: false, message: '올바른 날짜를 입력해주세요.' };
  }

  return { isValid: true, message: '올바른 생년월일 형식입니다.' };
};

export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: null, message: '' };
  }

  if (phone.trim().length === 0) {
    return { isValid: false, message: '연락처를 입력해주세요.' };
  }

  const phoneRegex = /^010\d{8}$/;
  if (phoneRegex.test(phone)) {
    return { isValid: true, message: '올바른 연락처 형식입니다.' };
  } else {
    return { isValid: false, message: '연락처는 010으로 시작하는 11자리 숫자여야 합니다.' };
  }
};

export const validateAddress = (address) => {
  if (!address) {
    return { isValid: null, message: '' };
  }

  if (address.trim().length === 0) {
    return { isValid: false, message: '주소를 입력해주세요.' };
  }

  return { isValid: true, message: '올바른 주소입니다.' };
};

export const validateDetailAddress = (detailAddress) => {
  if (!detailAddress) {
    return { isValid: null, message: '' };
  }

  if (detailAddress.trim().length === 0) {
    return { isValid: false, message: '상세주소를 입력해주세요.' };
  }

  return { isValid: true, message: '올바른 상세주소입니다.' };
};

export const validateGuardianName = (guardianName) => {
  if (!guardianName) {
    return { isValid: null, message: '' };
  }

  if (guardianName.trim().length === 0) {
    return { isValid: false, message: '보호자 이름을 입력해주세요.' };
  }

  return { isValid: true, message: '올바른 보호자 이름입니다.' };
};
