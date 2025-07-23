"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { MessageCircle, Clock, TrendingUp, Play, History, Info, ChevronRight } from "lucide-react"
import Button from "../../components/common/Buttom.jsx"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { T } from "@/components/common/TranslatableText"
import ChatInterface from "../../components/talk/ChatInterface.jsx"
import { useSubscription } from "../../hooks/useSubscription.js"
import { getTalkUsage, getTalkSessions } from "../../api/talk"
import { PRODUCTS } from "../../shared/constants/products"
import { CONVERSATION_LEVELS } from "../../shared/constants/levels"

const TalkHome = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useSelector((state) => state.auth)

  // 구독 훅 사용
  const { getUsageInfo, isSubscribed, paymentLoading } = useSubscription()

  // 상태 관리
  const [usage, setUsage] = useState(null)
  const [recentSessions, setRecentSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showQuickChat, setShowQuickChat] = useState(false)

  // 사용자 레벨 정보
  const userLevel = user?.profile?.koreanLevel || "beginner"
  const levelConfig = CONVERSATION_LEVELS[userLevel.toUpperCase()]
  const productInfo = PRODUCTS.talk
  // 구독 및 사용량 정보
  const hasTalkSubscription = isSubscribed("talk")
  const talkUsageInfo = getUsageInfo("talk")

  // 데이터 로드
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData()
    }
  }, [isAuthenticated])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // 사용량 정보 조회 (백엔드 API 구조대로)
      const usageResponse = await getTalkUsage()
      setUsage(usageResponse.data)

      // 최근 세션 조회 (백엔드 API 구조대로)
      const sessionsResponse = await getTalkSessions()
      setRecentSessions(sessionsResponse.data.sessions.slice(0, 3)) // 최근 3개만
    } catch (err) {
      console.error("Dashboard data load error:", err)
      setError("데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 새 대화 시작
  const startNewChat = () => {
    if (showQuickChat) {
      setShowQuickChat(false)
      setTimeout(() => navigate("/talk/chat"), 100)
    } else {
      navigate("/talk/chat")
    }
  }

  // 빠른 대화 모드 토글
  const toggleQuickChat = () => {
    setShowQuickChat(!showQuickChat)
  }

  // 세션 기록 보기
  const viewHistory = () => {
    navigate("/talk/history")
  }

  // 구독이 없는 경우
  if (!hasTalkSubscription && !paymentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <MessageCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Talk Like You Mean It</h1>
            <p className="text-gray-600 mb-6">
              <T fallback="AI 튜터와 자연스러운 한국어 대화를 시작해보세요">
                AI 튜터와 자연스러운 한국어 대화를 시작해보세요
              </T>
            </p>
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">
                <T fallback="Talk Like You Mean It 특징">Talk Like You Mean It 특징</T>
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>실시간 AI 대화</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>감정 분석 피드백</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>레벨별 맞춤 대화</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>모국어 해설 지원</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate("/subscription/plans")}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
              textKey="구독하고 시작하기"
            >
              구독하고 시작하기
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading || paymentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // 빠른 대화 모드
  if (showQuickChat) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-screen flex flex-col">
          {/* 빠른 대화 헤더 */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-6 h-6" />
                <div>
                  <h2 className="font-semibold">빠른 대화</h2>
                  <p className="text-blue-100 text-sm">{levelConfig?.name} 레벨</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={toggleQuickChat} className="text-white hover:bg-blue-700">
                  대시보드로
                </Button>
                <Button variant="ghost" size="sm" onClick={startNewChat} className="text-white hover:bg-blue-700">
                  전체 화면
                </Button>
              </div>
            </div>
          </div>

          {/* 채팅 인터페이스 */}
          <div className="flex-1">
            <ChatInterface
              onSessionChange={(session) => {
                // 세션 변경 시 필요한 로직
                console.log("Session changed:", session)
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageCircle className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Talk Like You Mean It</h1>
                <p className="text-gray-600">
                  <T fallback="AI 튜터와 자연스러운 한국어 대화">AI 튜터와 자연스러운 한국어 대화</T>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                <T fallback="현재 레벨">현재 레벨</T>
              </div>
              <div className="text-lg font-semibold text-blue-600 capitalize">
                <T fallback={levelConfig?.name}>{levelConfig?.name}</T>
              </div>
            </div>
          </div>
        </div>

        {/* 빠른 액션 바 */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={startNewChat}
                disabled={talkUsageInfo.remaining <= 0}
                className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
                textKey="새 대화 시작"
              >
                <Play className="w-4 h-4" />
                <span>새 대화 시작</span>
              </Button>

              <Button
                onClick={toggleQuickChat}
                disabled={talkUsageInfo.remaining <= 0}
                variant="outline"
                className="flex items-center space-x-2 bg-transparent"
                textKey="빠른 대화"
              >
                <MessageCircle className="w-4 h-4" />
                <span>빠른 대화</span>
              </Button>

              <Button
                onClick={viewHistory}
                variant="outline"
                className="flex items-center space-x-2 bg-transparent"
                textKey="대화 기록"
              >
                <History className="w-4 h-4" />
                <span>대화 기록</span>
              </Button>
            </div>

            <div className="text-sm text-gray-500">
              <T fallback={`${talkUsageInfo.remaining}회 남음`}>{talkUsageInfo.remaining}회 남음</T>
            </div>
          </div>
        </div>

        {/* 사용량 및 통계 */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* 오늘의 사용량 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <T fallback="오늘의 대화">오늘의 대화</T>
              </h3>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">
                    <T fallback="사용량">사용량</T>
                  </span>
                  <span className="text-gray-900">
                    {talkUsageInfo.used} / {talkUsageInfo.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${talkUsageInfo.percentage}%` }}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-500">
                <T fallback={`${talkUsageInfo.remaining}회 남음`}>{talkUsageInfo.remaining}회 남음</T> •{" "}
                {usage?.reset_at
                  ? new Date(usage.reset_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                  : "24:00"}{" "}
                <T fallback="초기화">초기화</T>
              </div>
            </div>
          </div>

          {/* 빠른 시작 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center">
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Play className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                <T fallback="새 대화 시작">새 대화 시작</T>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                <T fallback={levelConfig?.description}>{levelConfig?.description}</T>
              </p>
              <div className="space-y-2">
                <Button
                  onClick={startNewChat}
                  disabled={talkUsageInfo.remaining <= 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                  textKey={talkUsageInfo.remaining > 0 ? "전체 화면 대화" : "사용량 초과"}
                >
                  {talkUsageInfo.remaining > 0 ? "전체 화면 대화" : "사용량 초과"}
                </Button>
                <Button
                  onClick={toggleQuickChat}
                  disabled={talkUsageInfo.remaining <= 0}
                  variant="outline"
                  className="w-full bg-transparent"
                  textKey="빠른 대화"
                >
                  빠른 대화
                </Button>
              </div>
            </div>
          </div>

          {/* 통계 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <T fallback="학습 통계">학습 통계</T>
              </h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <T fallback="총 대화 수">총 대화 수</T>
                </span>
                <span className="font-semibold">{recentSessions.length}회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <T fallback="이번 주">이번 주</T>
                </span>
                <span className="font-semibold">
                  {
                    recentSessions.filter((session) => {
                      const sessionDate = new Date(session.date)
                      const weekAgo = new Date()
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      return sessionDate > weekAgo
                    }).length
                  }
                  회
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <T fallback="연속 학습">연속 학습</T>
                </span>
                <span className="font-semibold text-orange-600">3일 🔥</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <T fallback="사용률">사용률</T>
                </span>
                <span className="font-semibold text-blue-600">{Math.round(talkUsageInfo.percentage)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 대화 세션 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              <T fallback="최근 대화">최근 대화</T>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={viewHistory}
              className="flex items-center space-x-2 bg-transparent"
              textKey="전체 보기"
            >
              <History className="w-4 h-4" />
              <span>전체 보기</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {recentSessions.length > 0 ? (
            <div className="space-y-4">
              {recentSessions.map((session, index) => (
                <div
                  key={session.sessionId ?? index}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/talk/session/${session.sessionId}`)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        <T fallback="대화 세션">대화 세션</T>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(session.date).toLocaleDateString("ko-KR", {
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-400">
                      {new Date(session.updated_at).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                <T fallback="아직 대화가 없습니다">아직 대화가 없습니다</T>
              </h3>
              <p className="text-gray-500 mb-4">
                <T fallback="첫 번째 대화를 시작해보세요!">첫 번째 대화를 시작해보세요!</T>
              </p>
              <div className="flex justify-center space-x-3">
                <Button onClick={startNewChat} disabled={talkUsageInfo.remaining <= 0} textKey="대화 시작하기">
                  대화 시작하기
                </Button>
                <Button
                  onClick={toggleQuickChat}
                  disabled={talkUsageInfo.remaining <= 0}
                  variant="outline"
                  textKey="빠른 대화"
                >
                  빠른 대화
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 레벨 정보 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-4 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              <T fallback={`${levelConfig?.name} 레벨 특징`}>{levelConfig?.name} 레벨 특징</T>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  <T fallback="대화 주제">대화 주제</T>
                </div>
                <div className="text-gray-600">
                  <T fallback={levelConfig?.topics}>{levelConfig?.topics}</T>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  <T fallback="말하기 속도">말하기 속도</T>
                </div>
                <div className="text-gray-600">
                  <T fallback={levelConfig?.speed}>{levelConfig?.speed}</T>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  <T fallback="언어 비율">언어 비율</T>
                </div>
                <div className="text-gray-600">
                  <T fallback={levelConfig?.languageRatio}>{levelConfig?.languageRatio}</T>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  <T fallback="학습 목표">학습 목표</T>
                </div>
                <div className="text-gray-600">
                  <T fallback={levelConfig?.goals}>{levelConfig?.goals}</T>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              <T fallback={error}>{error}</T>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboardData}
              className="mt-2 bg-transparent"
              textKey="다시 시도"
            >
              다시 시도
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TalkHome
