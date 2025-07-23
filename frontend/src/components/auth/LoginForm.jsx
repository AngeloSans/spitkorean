import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Mail, Lock, LogIn } from 'lucide-react'

import Button, { PrimaryButton, OutlineButton } from '../common/Buttom.jsx'
import TranslatableText, { T } from '@/components/common/TranslatableText'
import Input from '@components/common/Input'
import { useAuth } from '@hooks/useAuth'
import validation from '../../utils/validation.js'

// 유효성 검사 import
const { validators, getErrorMessage } = validation;

// 유효성 검사 스키마 (validation.js의 validators 사용)
const loginSchema = yup.object({
  email: yup
    .string()
    .test('email-validation', '올바른 이메일 형식을 입력해주세요', (value) => 
      validators.email(value)
    )
    .test('required-validation', '이메일을 입력해주세요', (value) => 
      validators.required(value)
    ),
  password: yup
    .string()
    .test('password-validation', '비밀번호는 최소 8자 이상이어야 합니다', (value) => 
      validators.password(value)
    )
    .test('required-validation', '비밀번호를 입력해주세요', (value) => 
      validators.required(value)
    ),
})

/**
 * 로그인 폼 컴포넌트
 */
const LoginForm = ({ 
  onSuccess,
  showTitle = true,
  showSignupLink = true,
  className = ''
}) => {
  // useAuth 훅 사용 (Redux 로직을 모두 래핑)
  const { 
    login,
    isLoginLoading, 
    loginError, 
    isAuthenticated,
    user,
    clearAuthErrors
  } = useAuth()

  const [rememberMe, setRememberMe] = useState(false)
  const [realTimeErrors, setRealTimeErrors] = useState({})

  // React Hook Form 설정
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(loginSchema),
    mode: 'onChange'
  })

  // 폼 값 실시간 감시
  const watchedEmail = watch('email')
  const watchedPassword = watch('password')

  // 컴포넌트 마운트 시 에러 클리어
  useEffect(() => {
    clearAuthErrors()
    
    // 저장된 이메일 불러오기
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setValue('email', savedEmail)
      setRememberMe(true)
    }
  }, [clearAuthErrors, setValue])

  // 로그인 성공 시 처리
  useEffect(() => {
    if (isAuthenticated && user) {
      onSuccess?.(user)
    }
  }, [isAuthenticated, user, onSuccess])

  // 실시간 유효성 검사
  useEffect(() => {
    const newErrors = {}

    // 이메일 실시간 검증
    if (watchedEmail) {
      if (!validators.required(watchedEmail)) {
        newErrors.email = getErrorMessage('required')
      } else if (!validators.email(watchedEmail)) {
        newErrors.email = getErrorMessage('email')
      }
    }

    // 비밀번호 실시간 검증
    if (watchedPassword) {
      if (!validators.required(watchedPassword)) {
        newErrors.password = getErrorMessage('required')
      } else if (!validators.password(watchedPassword)) {
        newErrors.password = getErrorMessage('password')
      }
    }

    setRealTimeErrors(newErrors)
  }, [watchedEmail, watchedPassword])

  // 폼 제출 핸들러
  const onSubmit = async (data) => {
    console.log('Tentando logar com:', data);
    try {
      // 최종 유효성 검사
      const emailValid = validators.required(data.email) && validators.email(data.email)
      const passwordValid = validators.required(data.password) && validators.password(data.password)

      if (!emailValid || !passwordValid) {
        console.error('Form validation failed')
        return
      }

      // 이메일 기억하기 처리
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', data.email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      // useAuth 훅의 login 함수 사용
      const result = await login(data, {
        redirectTo: '/dashboard',
        showSuccessToast: true
      })
      
      console.log('Login result:', result)

      if (result.success) {
        reset()
        onSuccess?.(result.user)
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  // 구글 로그인 핸들러
  const handleGoogleLogin = () => {
    // 구글 OAuth URL로 리다이렉트
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(window.location.origin + '/auth/google/callback')}&` +
      `scope=openid email profile&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent`
    
    window.location.href = googleAuthUrl
  }

  // 데모 계정 로그인
  const handleDemoLogin = () => {
    setValue('email', 'demo@spitkorean.com')
    setValue('password', 'demo123456')
  }

  // 에러 메시지 우선순위: validation.js > react-hook-form > Redux
  const getFieldError = (field) => {
    return realTimeErrors[field] || errors[field]?.message || null
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {showTitle && (
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            <T>로그인</T>
          </h2>
          <p className="text-gray-600">
            <T>SpitKorean과 함께 한국어 학습을 시작하세요</T>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 이메일 입력 */}
        <Input
          label={<T>이메일</T>}
          type="email"
          placeholder={<T>이메일을 입력하세요</T>}
          leftIcon={<Mail />}
          error={getFieldError('email') && <T>{getFieldError('email')}</T>}
          {...register('email')}
          autoComplete="email"
          autoFocus
        />

        {/* 비밀번호 입력 */}
        <Input
          label={<T>비밀번호</T>}
          type="password"
          placeholder={<T>비밀번호를 입력하세요</T>}
          leftIcon={<Lock />}
          error={getFieldError('password') && <T>{getFieldError('password')}</T>}
          {...register('password')}
          autoComplete="current-password"
        />

        {/* 기억하기 & 비밀번호 찾기 */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-600">
              <T>이메일 기억하기</T>
            </span>
          </label>
          
          <Link
            to="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-500 hover:underline"
          >
            <T>비밀번호를 잊으셨나요?</T>
          </Link>
        </div>

        {/* 에러 메시지 (Redux에서 온 전역 에러) */}
        {loginError && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-3">
            <p className="text-error-600 text-sm text-center">
              <T>{loginError}</T>
            </p>
          </div>
        )}

        {/* 로그인 버튼 */}
        <PrimaryButton
          type="submit"
          size="lg"
          fullWidth
          loading={isLoginLoading}
          disabled={!isValid || Object.keys(realTimeErrors).length > 0}
          leftIcon={<LogIn />}
          textKey={isLoginLoading ? '로그인 중...' : '로그인'}
        />

        {/* 구분선 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              <T>또는</T>
            </span>
          </div>
        </div>

        {/* 구글 로그인 */}
        <OutlineButton
          type="button"
          size="lg"
          fullWidth
          onClick={handleGoogleLogin}
          leftIcon={
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          }
          textKey="Google로 로그인"
        />

        {/* 데모 계정 (개발 환경에서만) */}
        {import.meta.env.DEV && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            fullWidth
            onClick={handleDemoLogin}
            className="text-xs"
            textKey="🎯 데모 계정으로 체험하기"
          />
        )}
      </form>

      {/* 회원가입 링크 */}
      {showSignupLink && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            <T>아직 계정이 없으신가요?</T>{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500 hover:underline"
            >
              <T>회원가입</T>
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}

export default LoginForm