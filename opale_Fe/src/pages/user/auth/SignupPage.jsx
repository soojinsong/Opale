import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SignupPage.module.css';

import Step1EmailVerification from './signup-steps/Step1EmailVerification';
import Step2Password from './signup-steps/Step2Password';
import Step3PersonalInfo from './signup-steps/Step3PersonalInfo';

import TermsAgreementStep from './signup-steps/TermsAgreementStep';
import GuardianInfoStep from './signup-steps/GuardianInfoStep';
import GuardianAgreementStep from './signup-steps/GuardianAgreementStep';

import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateNickname,
  validateName,
  validateBirthDate,
  validatePhone,
  validateAddress,
  validateDetailAddress,
  validateGuardianName,
} from '../../../utils/validation';

import { sendEmailCode, verifyEmailCode } from '../../../api/emailApi';
import { checkNicknameDuplicate, signUp } from '../../../api/userApi';

import { normalizeEmailResponse } from '../../../services/normalizeEmailResponse';
import { normalizeVerifyCodeResponse } from '../../../services/normalizeVerifyCodeResponse';
import { normalizeCheckNicknameResponse } from '../../../services/normalizeCheckNicknameResponse';
import { normalizeSignUpRequest } from '../../../services/normalizeSignUpRequest';
import { normalizeSignUpResponse } from '../../../services/normalizeSignUpResponse';

const SignupPage = () => {
  const navigate = useNavigate();

  // currentStep: 'age-selection' | 'terms' | 'guardian-info' | 'guardian-agreement' | 'email' | 'password' | 'personal-info'
  const [currentStep, setCurrentStep] = useState('age-selection');
  const [isUnder14, setIsUnder14] = useState(null); // null | true | false

  const [formData, setFormData] = useState({
    email: '',
    verificationCode: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    name: '',
    gender: '',
    birthDate: '',
    phone: '',
    address: '',
    detailAddress: '',
    agreeToTerms: false,
    guardianName: '',
    guardianAgreed: false,
  });

  const [validationMessages, setValidationMessages] = useState({});
  const [signupError, setSignupError] = useState('');

  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [emailSendStatus, setEmailSendStatus] = useState(null); // 'success' | 'error' | null
  const [codeVerifyStatus, setCodeVerifyStatus] = useState(null); // 'success' | 'error' | null
  const [timer, setTimer] = useState(300);

  const handleUnder14 = () => {
    setIsUnder14(true);
    setCurrentStep('guardian-info');
  };

  const handleOver14 = () => {
    setIsUnder14(false);
    setCurrentStep('terms');
  };

  const handleNext = () => {
    if (currentStep === 'terms') {
      setCurrentStep('email');
      setIsCodeSent(false);
      setIsCodeVerified(false);
      setEmailSendStatus(null);
      setCodeVerifyStatus(null);
      setTimer(300);
      setValidationMessages(prev => ({
        ...prev,
        email: { isValid: null, message: '' },
        verificationCode: { isValid: null, message: '' },
      }));
    } else if (currentStep === 'guardian-info') {
      setCurrentStep('guardian-agreement');
    } else if (currentStep === 'guardian-agreement') {
      setCurrentStep('terms');
    } else if (currentStep === 'email') {
      setCurrentStep('password');
    } else if (currentStep === 'password') {
      setCurrentStep('personal-info');
    }
  };

  const handlePrev = () => {
    if (currentStep === 'email') {
      setCurrentStep('terms');
    } else if (currentStep === 'password') {
      setCurrentStep('email');
    } else if (currentStep === 'personal-info') {
      setCurrentStep('password');
    } else if (currentStep === 'terms') {
      if (isUnder14) {
        setCurrentStep('guardian-agreement');
      } else {
        setCurrentStep('age-selection');
        setIsUnder14(null);
      }
    } else if (currentStep === 'guardian-agreement') {
      setCurrentStep('guardian-info');
    } else if (currentStep === 'guardian-info') {
      setCurrentStep('age-selection');
      setIsUnder14(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    let result = { isValid: null, message: '' };

    switch (name) {
      case 'email':
        result = validateEmail(value);
        break;
      case 'password':
        result = validatePassword(value);
        if (formData.confirmPassword) {
          const confirmResult = validateConfirmPassword(value, formData.confirmPassword);
          setValidationMessages(prev => ({
            ...prev,
            confirmPassword: confirmResult,
          }));
        }
        break;
      case 'confirmPassword':
        result = validateConfirmPassword(formData.password, value);
        break;
      case 'nickname':
        result = validateNickname(value);
        break;
      case 'name':
        result = validateName(value);
        break;
      case 'birthDate':
        result = validateBirthDate(value);
        break;
      case 'phone':
        result = validatePhone(value);
        break;
      case 'address':
        result = validateAddress(value);
        break;
      case 'detailAddress':
        result = validateDetailAddress(value);
        break;
      case 'guardianName':
        result = validateGuardianName(value);
        break;
      default:
        break;
    }

    setValidationMessages(prev => ({
      ...prev,
      [name]: result,
    }));
  };

  const handleSendCode = async () => {
    try {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        setValidationMessages(prev => ({
          ...prev,
          email: emailValidation,
        }));
        return;
      }

      const response = await sendEmailCode(formData.email);
      const normalized = normalizeEmailResponse(response);

      setEmailSendStatus('success');
      setIsCodeSent(true);
      setTimer(normalized.expiresIn || 300);

      setValidationMessages(prev => ({
        ...prev,
        email: { isValid: true, message: normalized.message || '인증번호가 발송되었습니다.' },
      }));
    } catch (err) {
      setEmailSendStatus('error');
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        '인증번호 전송에 실패했습니다.';
      setValidationMessages(prev => ({
        ...prev,
        email: { isValid: false, message: msg },
      }));
    }
  };

  const handleResendCode = async () => {
    await handleSendCode();
  };

  const handleVerifyCode = async () => {
    try {
      if (!formData.verificationCode || !/^\d{6}$/.test(formData.verificationCode)) {
        setValidationMessages(prev => ({
          ...prev,
          verificationCode: { isValid: false, message: '인증번호는 6자리 숫자여야 합니다.' },
        }));
        return;
      }

      const response = await verifyEmailCode({
        email: formData.email,
        code: formData.verificationCode,
      });
      const normalized = normalizeVerifyCodeResponse(response);

      if (normalized.verified) {
        setCodeVerifyStatus('success');
        setIsCodeVerified(true);
        setValidationMessages(prev => ({
          ...prev,
          verificationCode: {
            isValid: true,
            message: normalized.message || '인증번호가 확인되었습니다.',
          },
        }));
      } else {
        setCodeVerifyStatus('error');
        setIsCodeVerified(false);
        setValidationMessages(prev => ({
          ...prev,
          verificationCode: {
            isValid: false,
            message: normalized.message || '인증번호가 일치하지 않습니다.',
          },
        }));
      }
    } catch (err) {
      setCodeVerifyStatus('error');
      setIsCodeVerified(false);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        '인증번호 검증에 실패했습니다.';
      setValidationMessages(prev => ({
        ...prev,
        verificationCode: { isValid: false, message: msg },
      }));
    }
  };

  const handleCheckNickname = async () => {
    try {
      const nicknameValidation = validateNickname(formData.nickname);
      if (!nicknameValidation.isValid) {
        setValidationMessages(prev => ({
          ...prev,
          nickname: nicknameValidation,
        }));
        return;
      }

      const response = await checkNicknameDuplicate(formData.nickname);
      const normalized = normalizeCheckNicknameResponse(response);

      if (normalized.available) {
        setValidationMessages(prev => ({
          ...prev,
          nickname: { isValid: true, message: '사용 가능한 닉네임입니다.' },
        }));
      } else {
        setValidationMessages(prev => ({
          ...prev,
          nickname: { isValid: false, message: '이미 존재하는 닉네임입니다.' },
        }));
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        '닉네임 중복 확인에 실패했습니다.';
      setValidationMessages(prev => ({
        ...prev,
        nickname: { isValid: false, message: msg },
      }));
    }
  };

  const handleSignup = async () => {
    try {
      setSignupError('');

      const requestData = normalizeSignUpRequest(formData);
      const response = await signUp(requestData);
      const normalized = normalizeSignUpResponse(response);

      if (normalized.userId) {
        navigate('/signup/welcome', {
          state: {
            nickname: normalized.nickname || formData.nickname || '닉네임',
          },
        });
      } else {
        setSignupError('회원가입에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        '회원가입에 실패했습니다. 다시 시도해주세요.';
      setSignupError(msg);
    }
  };

  useEffect(() => {
    if (currentStep === 'email' && isCodeSent && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setValidationMessages(prevMsgs => ({
              ...prevMsgs,
              verificationCode: {
                isValid: false,
                message: '제한 시간 지났습니다. 재전송해주세요.',
              },
            }));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentStep, isCodeSent, timer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (currentStep === 'age-selection') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            ←
          </button>
          <h1 className={styles.headerTitle}>회원가입</h1>
        </div>

        <div className={styles.content}>
          <div className={styles.topSection}>
            <div className={styles.logoSection}>
              <div className={styles.logo}>opale</div>
              <div className={styles.decorativeElements}>
                <div className={styles.dotPink1}></div>
                <div className={styles.dotPink2}></div>
                <div className={styles.dotBlue1}></div>
                <div className={styles.dotBlue2}></div>
                <div className={styles.starPink1}></div>
                <div className={styles.starBlue1}></div>
              </div>
            </div>

            <div className={styles.questionSection}>
              <h2 className={styles.question}>만 14세 미만 이용자입니까?</h2>
              <p className={styles.description}>
                본인에 해당하는 회원유형을 정확히 선택해 주세요.
              </p>
            </div>
          </div>

          <div className={styles.buttonSection}>
            <button className={styles.primaryButton} onClick={handleUnder14}>
              예, 만 14세 미만입니다
            </button>
            <button className={styles.secondaryLink} onClick={handleOver14}>
              아니요, 만 14세 이상입니다
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'terms') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={handlePrev}>
            ←
          </button>
          <h1 className={styles.headerTitle}>약관동의</h1>
        </div>

        <div className={styles.content}>
          <div className={styles.card}>
            <TermsAgreementStep
              formData={formData}
              handleInputChange={handleInputChange}
              onNext={handleNext}
            />
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'guardian-info') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={handlePrev}>
            ←
          </button>
          <h1 className={styles.headerTitle}>보호자 정보 입력</h1>
        </div>

        <div className={styles.content}>
          <div className={styles.card}>
            <GuardianInfoStep
              formData={formData}
              handleInputChange={handleInputChange}
              validationMessages={validationMessages}
              onNext={handleNext}
            />
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'guardian-agreement') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={handlePrev}>
            ←
          </button>
          <h1 className={styles.headerTitle}>보호자 동의</h1>
        </div>

        <div className={styles.content}>
          <div className={styles.card}>
            <GuardianAgreementStep
              formData={formData}
              handleInputChange={handleInputChange}
              onNext={handleNext}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handlePrev}>
          ←
        </button>
        <h1 className={styles.headerTitle}>회원가입</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          {currentStep === 'email' && (
            <Step1EmailVerification
              formData={formData}
              handleInputChange={handleInputChange}
              handleSendCode={handleSendCode}
              handleResendCode={handleResendCode}
              handleVerifyCode={handleVerifyCode}
              timer={timer}
              formatTimer={formatTimer}
              validationMessages={validationMessages}
              isCodeSent={isCodeSent}
            />
          )}

          {currentStep === 'password' && (
            <Step2Password
              formData={formData}
              handleInputChange={handleInputChange}
              validationMessages={validationMessages}
              onNext={handleNext}
            />
          )}

          {currentStep === 'personal-info' && (
            <Step3PersonalInfo
              formData={formData}
              handleInputChange={handleInputChange}
              handleCheckNickname={handleCheckNickname}
              validationMessages={validationMessages}
            />
          )}
        </div>

        {/* 하단 단계 표시 + 버튼 */}
        <div className={styles.bottomSection}>
          <div className={styles.stepIndicators}>
            <div
              className={`${styles.stepDot} ${
                currentStep === 'email' ||
                currentStep === 'password' ||
                currentStep === 'personal-info'
                  ? styles.active
                  : ''
              }`}
            ></div>
            <div
              className={`${styles.stepDot} ${
                currentStep === 'password' || currentStep === 'personal-info'
                  ? styles.active
                  : ''
              }`}
            ></div>
            <div
              className={`${styles.stepDot} ${
                currentStep === 'personal-info' ? styles.active : ''
              }`}
            ></div>
          </div>

          <div className={styles.navigationButtons}>
            <button
              className={styles.prevButton}
              onClick={handlePrev}
              disabled={currentStep === 'age-selection'}
            >
              이전
            </button>

            {currentStep === 'personal-info' ? (
              <>
                {signupError && (
                  <div
                    className={styles.errorMsg}
                    style={{ marginBottom: '10px', textAlign: 'center' }}
                  >
                    {signupError}
                  </div>
                )}
                <button
                  className={styles.signupButton}
                  onClick={handleSignup}
                  disabled={
                    !validationMessages?.nickname ||
                    validationMessages.nickname.isValid !== true ||
                    validationMessages.nickname.message !== '사용 가능한 닉네임입니다.' ||
                    !formData.nickname?.trim() ||
                    !validationMessages?.name ||
                    validationMessages.name.isValid !== true ||
                    !formData.name?.trim() ||
                    !formData.gender ||
                    !validationMessages?.birthDate ||
                    validationMessages.birthDate.isValid !== true ||
                    !formData.birthDate?.trim() ||
                    !validationMessages?.phone ||
                    validationMessages.phone.isValid !== true ||
                    !formData.phone?.trim() ||
                    !validationMessages?.address ||
                    validationMessages.address.isValid !== true ||
                    !formData.address?.trim() ||
                    !validationMessages?.detailAddress ||
                    validationMessages.detailAddress.isValid !== true ||
                    !formData.detailAddress?.trim() ||
                    !formData.agreeToTerms
                  }
                >
                  가입
                </button>
              </>
            ) : (
              <button
                className={styles.nextButton}
                onClick={handleNext}
                disabled={
                  (currentStep === 'email' && !isCodeVerified) ||
                  (currentStep === 'password' &&
                    (!validationMessages?.password?.isValid ||
                      !validationMessages?.confirmPassword?.isValid))
                }
              >
                다음
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
