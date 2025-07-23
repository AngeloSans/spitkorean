import React from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Sparkles, 
  Globe, 
  Users, 
  Award, 
  TrendingUp,
  MessageCircle,
  Film,
  BookOpen,
  Map,
  Star,
  Shield,
  Clock,
  Heart,
  CheckCircle,
  Play
} from 'lucide-react'

/**
 * 브랜딩 섹션 컴포넌트
 */
const BrandingSection = ({ 
  config, 
  features, 
  showFeatures, 
  stats, 
  showStats, 
  testimonials, 
  showTestimonials, 
  className = '' 
}) => {
  return (
    <div className={`space-y-8 ${className}`}>
      {/* 메인 브랜딩 메시지 */}
      <div className="text-center lg:text-left">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {config.title}
        </h1>
        <p className="text-xl text-gray-600 leading-relaxed">
          {config.subtitle}
        </p>
      </div>

      {/* 통계 */}
      {showStats && (
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  {React.cloneElement(stat.icon, { className: "w-5 h-5 text-primary-600" })}
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{stat.number}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 주요 특징 */}
      {showFeatures && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            왜 SpitKorean인가요?
          </h3>
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`p-2 bg-${feature.color}-100 rounded-lg flex-shrink-0`}>
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사용자 후기 */}
      {showTestimonials && testimonials.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            학습자들의 후기
          </h3>
          <div className="space-y-4">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">{testimonial.name}</span>
                      <span className="text-sm text-gray-500">- {testimonial.country}</span>
                      <div className="flex">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{testimonial.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 신뢰 지표 */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">안전하고 신뢰할 수 있는 서비스</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>ISO 27001 정보보안 인증</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>개인정보보호 완벽 준수</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>7일 무료 체험 (카드 등록 불필요)</span>
          </div>
        </div>
      </div>

      {/* 비디오 미리보기 (선택적) */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 mx-auto">
              <Play className="w-8 h-8 text-primary-600 ml-1" />
            </div>
            <p className="text-gray-600 font-medium">SpitKorean 소개 영상 보기</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 인증 페이지 전용 레이아웃 컴포넌트
 */
const AuthLayout = ({
  children,
  title,
  subtitle,
  showBackButton = true,
  showBranding = true,
  showFeatures = true,
  showTestimonials = false,
  showStats = true,
  variant = 'default', // 'default', 'login', 'register'
  className = ''
}) => {

  // variant별 브랜딩 메시지
  const brandingConfig = {
    default: {
      title: 'SpitKorean과 함께',
      subtitle: '한국어 학습의 새로운 경험',
      gradient: 'from-primary-50 via-white to-secondary-50'
    },
    login: {
      title: '다시 만나서 반가워요!',
      subtitle: 'SpitKorean과 함께 한국어 학습을 계속해보세요',
      gradient: 'from-primary-50 via-white to-secondary-50'
    },
    register: {
      title: '한국어 학습의 새로운 시작!',
      subtitle: 'AI 기반 맞춤형 학습으로 더 스마트하게 배우세요',
      gradient: 'from-secondary-50 via-white to-primary-50'
    }
  }

  const config = brandingConfig[variant] || brandingConfig.default

  // 주요 특징
  const features = [
    {
      icon: <MessageCircle className="w-6 h-6 text-blue-600" />,
      title: 'AI 대화 튜터',
      desc: '실시간 맞춤형 대화 학습',
      color: 'blue'
    },
    {
      icon: <Film className="w-6 h-6 text-purple-600" />,
      title: '드라마 학습',
      desc: '실제 K-드라마로 문법 마스터',
      color: 'purple'
    },
    {
      icon: <BookOpen className="w-6 h-6 text-green-600" />,
      title: 'TOPIK 시험 대비',
      desc: '체계적인 시험 준비 시스템',
      color: 'orange' 
    },
    {
      icon: <Map className="w-6 h-6 text-orange-600" />,
      title: '발음 교정',
      desc: '한글부터 정확한 발음까지',
      color: 'green'
    }
  ]

  // 통계 데이터
  const stats = [
    { icon: <Users />, number: '10,000+', label: '활성 학습자' },
    { icon: <Star />, number: '4.9/5', label: '평균 만족도' },
    { icon: <Award />, number: '95%', label: '목표 달성률' },
    { icon: <Globe />, number: '14개', label: '지원 언어' }
  ]

  // 사용자 후기
  const testimonials = [
    {
      name: '사라 존슨',
      country: '미국',
      avatar: 'S',
      content: '6개월 만에 TOPIK 4급 합격! AI 튜터 덕분에 자신감이 생겼어요.',
      rating: 5
    },
    {
      name: '다나카 히로시',
      country: '일본',
      avatar: '田',
      content: '드라마로 배우니까 재미있고 실용적이에요. 회사에서 한국 동료들과 소통이 수월해졌습니다.',
      rating: 5
    }
  ]

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradient} flex flex-col ${className}`}>
      
      {/* 헤더 */}
      <header className="w-full p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* 뒤로가기 버튼 */}
          {showBackButton && (
            <Link 
              to="/"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              홈으로 돌아가기
            </Link>
          )}
          
          {/* 로고 */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">SpitKorean</span>
          </Link>
          
          {/* 도움말/로그인 링크 */}
          <div className="flex items-center space-x-4">
            {variant === 'register' ? (
              <Link 
                to="/login"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                이미 계정이 있나요? <span className="font-medium text-primary-600">로그인</span>
              </Link>
            ) : variant === 'login' ? (
              <Link 
                to="/register"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                계정이 없으신가요? <span className="font-medium text-primary-600">회원가입</span>
              </Link>
            ) : (
              <Link 
                to="/help"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                도움말
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-7xl mx-auto">
          
          {/* 레이아웃에 따른 배치 */}
          {variant === 'register' ? (
            // 회원가입: 폼이 왼쪽, 브랜딩이 오른쪽
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                {children}
              </div>
              {showBranding && (
                <BrandingSection 
                  config={config}
                  features={features}
                  showFeatures={showFeatures}
                  stats={stats}
                  showStats={showStats}
                  testimonials={testimonials}
                  showTestimonials={showTestimonials}
                  className="order-1 lg:order-2"
                />
              )}
            </div>
          ) : (
            // 기본/로그인: 브랜딩이 왼쪽, 폼이 오른쪽
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {showBranding && (
                <BrandingSection 
                  config={config}
                  features={features}
                  showFeatures={showFeatures}
                  stats={stats}
                  showStats={showStats}
                  testimonials={testimonials}
                  showTestimonials={showTestimonials}
                  className="hidden lg:block"
                />
              )}
              <div className="w-full">
                {children}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 푸터 */}
      <footer className="w-full p-4 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <div className="text-sm text-gray-500">
            © 2024 SpitKorean. All rights reserved.
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <Link to="/terms" className="text-gray-500 hover:text-gray-700 transition-colors">
              이용약관
            </Link>
            <Link to="/privacy" className="text-gray-500 hover:text-gray-700 transition-colors">
              개인정보처리방침
            </Link>
            <Link to="/support" className="text-gray-500 hover:text-gray-700 transition-colors">
              고객지원
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default AuthLayout