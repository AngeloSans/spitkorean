import React, { useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { clsx } from 'clsx'

/**
 * 재사용 가능한 Input 컴포넌트
 */
const Input = React.forwardRef(({
  type = 'text',
  label,
  placeholder,
  labelKey,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  readonly = false,
  required = false,
  error,
  success,
  helperText,
  leftIcon,
  rightIcon,
  size = 'md',
  fullWidth = true,
  className,
  containerClassName,
  labelClassName,
  id,
  name,
  autoComplete,
  autoFocus,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const labelText = labelKey || label;
  
  // 실제 input type (비밀번호 토글 고려)
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type
  
  // 고유 ID 생성
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  
  // 사이즈별 클래스
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-3 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base'
  }
  
  // 상태별 클래스
  const getInputClasses = () => {
    const baseClasses = 'block w-full rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0'
    
    let stateClasses = ''
    if (error) {
      stateClasses = 'border-error-300 text-error-900 placeholder-error-300 focus:border-error-500 focus:ring-error-500'
    } else if (success) {
      stateClasses = 'border-success-300 text-success-900 focus:border-success-500 focus:ring-success-500'
    } else if (isFocused) {
      stateClasses = 'border-primary-300 focus:border-primary-500 focus:ring-primary-500'
    } else {
      stateClasses = 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500'
    }
    
    const disabledClasses = disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'
    const readonlyClasses = readonly ? 'bg-gray-50' : ''
    
    return clsx(
      baseClasses,
      sizes[size],
      stateClasses,
      disabledClasses,
      readonlyClasses,
      leftIcon && 'pl-10',
      (rightIcon || type === 'password') && 'pr-10',
      className
    )
  }
  
  // 포커스 핸들러
  const handleFocus = (e) => {
    setIsFocused(true)
    onFocus?.(e)
  }
  
  const handleBlur = (e) => {
    setIsFocused(false)
    onBlur?.(e)
  }
  
  // 비밀번호 토글
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }
  
  return (
    <div className={clsx(fullWidth ? 'w-full' : '', containerClassName)}>
      {labelText && (
        <label htmlFor={id} className={clsx('block text-sm font-medium text-gray-700 mb-1', required && "after:content-['*'] after:text-error-500 after:ml-1", labelClassName)}>
          {labelText}
        </label>
      )}
      {/* 라벨 */}

      
      {/* Input 컨테이너 */}
      <div className="relative">
        {/* 왼쪽 아이콘 */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className={clsx(
              'w-5 h-5',
              error ? 'text-error-400' : 
              success ? 'text-success-400' :
              isFocused ? 'text-primary-400' : 'text-gray-400'
            )}>
              {leftIcon}
            </span>
          </div>
        )}
        
        {/* Input 필드 */}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readonly}
          required={required}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={getInputClasses()}
          {...props}
        />
        
        {/* 오른쪽 아이콘 */}
        <div className="absolute inset-y-0 right-0 flex items-center">
          {/* 상태 아이콘 */}
          {error && (
            <AlertCircle className="w-5 h-5 text-error-400 mr-3" />
          )}
          {success && !error && (
            <CheckCircle className="w-5 h-5 text-success-400 mr-3" />
          )}
          
          {/* 비밀번호 토글 버튼 */}
          {type === 'password' && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
          
          {/* 커스텀 오른쪽 아이콘 */}
          {rightIcon && type !== 'password' && (
            <span className="pr-3 text-gray-400">
              {rightIcon}
            </span>
          )}
        </div>
      </div>
      
      {/* 도움말 텍스트 또는 에러 메시지 */}
      {(helperText || error || success) && (
        <div className="mt-1">
          {error && (
            <p className="text-sm text-error-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-sm text-success-600 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              {success}
            </p>
          )}
          {helperText && !error && !success && (
            <p className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  )
})

Input.displayName = 'Input'

// 특수한 Input 변형들
export const PasswordInput = (props) => (
  <Input type="password" {...props} />
)

export const EmailInput = (props) => (
  <Input 
    type="email" 
    autoComplete="email"
    {...props} 
  />
)

export const SearchInput = ({ onSearch, searchIcon, ...props }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(e.target.value)
    }
  }
  
  return (
    <Input
      type="search"
      leftIcon={searchIcon}
      onKeyPress={handleKeyPress}
      {...props}
    />
  )
}

export const NumberInput = (props) => (
  <Input 
    type="number"
    {...props} 
  />
)

export const TelInput = (props) => (
  <Input 
    type="tel"
    autoComplete="tel"
    {...props} 
  />
)

export const UrlInput = (props) => (
  <Input 
    type="url"
    {...props} 
  />
)

export default Input