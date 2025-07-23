"use client"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import { BookOpen, AlertCircle, ChevronLeft, Clock, TrendingUp, Play, Target, Calendar, Star } from "lucide-react"

// 컴포넌트
import Button from "../../components/common/Buttom.jsx"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { T } from "../../components/common/TranslatableText"

// 훅
import { useSubscription } from "../../hooks/useSubscription.js"

// Redux actions - clearAuthError agora está disponível
import {
  fetchDramaSentences,
  fetchDramaProgress,
  fetchDramaUsage,
  resetDramaState,
  setLevel,
  clearAuthError,
} from "../../store/slices/dramaSlice"

// 상수
import { getDramaLevel } from "../../shared/constants/levels"

const DramaHome = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user, isAuthenticated, token } = useSelector((state) => state.auth)

  // Redux state
  const {
    sentences,
    loading: dramaLoading,
    error: dramaError,
    usage: dramaUsage,
    progress: dramaProgress,
    level,
  } = useSelector((state) => state.drama)

  // 구독 관련 훅
  const { hasSubscription } = useSubscription()

  // 로컬 상태 관리
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSentenceBuilder, setShowSentenceBuilder] = useState(false)
  const [selectedDrama, setSelectedDrama] = useState(null)
  const [loadingSentences, setLoadingSentences] = useState(false)

  // 사용자 레벨 정보
  const userLevel = user?.profile?.koreanLevel || "beginner"
  const levelConfig = getDramaLevel(userLevel)

  // Drama 구독 상태 확인
  const hasDramaSubscription = hasSubscription("drama")

  // 인기 드라마 데이터 (임시)
  const mockPopularDramas = {
    beginner: [
      { id: 1, title: "뽀로로", category: "어린이", episodes: 52, difficulty: 1, image: "🐧" },
      { id: 2, title: "타요 버스", category: "어린이", episodes: 26, difficulty: 1, image: "🚌" },
      { id: 3, title: "응답하라 1988", category: "가족", episodes: 20, difficulty: 2, image: "📺" },
    ],
    intermediate: [
      { id: 4, title: "사랑의 불시착", category: "로맨스", episodes: 16, difficulty: 3, image: "💕" },
      { id: 5, title: "미생", category: "직장", episodes: 20, difficulty: 3, image: "💼" },
      { id: 6, title: "슬기로운 의사생활", category: "의료", episodes: 24, difficulty: 4, image: "🏥" },
    ],
    advanced: [
      { id: 7, title: "킹덤", category: "사극", episodes: 12, difficulty: 5, image: "👑" },
      { id: 8, title: "이상한 변호사 우영우", category: "법정", episodes: 16, difficulty: 5, image: "⚖️" },
      { id: 9, title: "육룡이 나르샤", category: "사극", episodes: 50, difficulty: 6, image: "🐉" },
    ],
  }

  const [popularDramas] = useState(mockPopularDramas[userLevel] || mockPopularDramas.beginner)

  // 인증 상태 체크 및 리다이렉트
  useEffect(() => {
    if (!isAuthenticated || !token) {
      console.warn("User not authenticated or token missing")
      setError("로그인이 필요합니다.")
      setTimeout(() => navigate("/login"), 2000)
      return
    }
  }, [isAuthenticated, token, navigate])

  // 데이터 로드
  useEffect(() => {
    if (isAuthenticated && token) {
      loadDashboardData()
      // Redux 상태 초기화
      dispatch(resetDramaState())
      // 인증 에러 클리어
      dispatch(clearAuthError())
    }
  }, [isAuthenticated, token, dispatch])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("Loading dashboard data for authenticated user")

      if (hasDramaSubscription) {
        // Redux를 통한 데이터 로드
        const results = await Promise.allSettled([
          dispatch(fetchDramaUsage()).unwrap(),
          dispatch(fetchDramaProgress()).unwrap(),
        ])

        results.forEach((result, index) => {
          if (result.status === "rejected") {
            console.warn(`Data loading failed for ${index === 0 ? "usage" : "progress"}:`, result.reason)

            if (result.reason?.includes("인증") || result.reason?.includes("토큰")) {
              setError("인증이 만료되었습니다. 다시 로그인해주세요.")
              setTimeout(() => navigate("/login"), 2000)
              return
            }
          }
        })
      }
    } catch (err) {
      console.error("Dashboard data load error:", err)

      if (err.message?.includes("401") || err.message?.includes("인증")) {
        setError("인증이 만료되었습니다. 다시 로그인해주세요.")
        setTimeout(() => navigate("/login"), 2000)
        return
      }

      setError("데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 문장 연습 시작
  const startPractice = async () => {
    if (!hasDramaSubscription) {
      navigate("/subscription/plans")
      return
    }

    if (!isAuthenticated || !token) {
      setError("인증이 필요합니다. 다시 로그인해주세요.")
      navigate("/login")
      return
    }

    try {
      setLoadingSentences(true)
      setError(null)

      console.log("Starting practice for level:", userLevel)

      // 레벨 설정
      dispatch(setLevel(userLevel))

      // 문장 로드
      await dispatch(fetchDramaSentences({ level: userLevel })).unwrap()

      console.log("Sentences loaded successfully")
      setShowSentenceBuilder(true)
      setSelectedDrama(null)
    } catch (err) {
      console.error("Error starting practice:", err)

      if (err.includes("인증") || err.includes("토큰")) {
        setError("인증이 만료되었습니다. 다시 로그인해주세요.")
        setTimeout(() => navigate("/login"), 2000)
      } else {
        setError("연습을 시작하는데 실패했습니다. 다시 시도해주세요.")
      }
    } finally {
      setLoadingSentences(false)
    }
  }

  // 드라마 선택
  const selectDrama = async (drama) => {
    if (!hasDramaSubscription) {
      navigate("/subscription/plans")
      return
    }

    if (!isAuthenticated || !token) {
      setError("인증이 필요합니다. 다시 로그인해주세요.")
      navigate("/login")
      return
    }

    try {
      setLoadingSentences(true)
      setError(null)

      console.log("Selecting drama:", drama.title, "for level:", userLevel)

      // 레벨 설정
      dispatch(setLevel(userLevel))

      // 해당 레벨의 문장 로드
      await dispatch(fetchDramaSentences({ level: userLevel })).unwrap()

      console.log("Drama sentences loaded successfully")
      setSelectedDrama(drama)
      setShowSentenceBuilder(true)
    } catch (err) {
      console.error("Error selecting drama:", err)

      if (err.includes("인증") || err.includes("토큰")) {
        setError("인증이 만료되었습니다. 다시 로그인해주세요.")
        setTimeout(() => navigate("/login"), 2000)
      } else {
        setError("드라마를 선택하는데 실패했습니다. 다시 시도해주세요.")
      }
    } finally {
      setLoadingSentences(false)
    }
  }

  // 홈으로 돌아가기
  const goBackHome = () => {
    setShowSentenceBuilder(false)
    setSelectedDrama(null)
    setError(null)
    dispatch(resetDramaState())
    dispatch(clearAuthError())
  }

  // 인증되지 않은 경우 로그인 화면으로 리다이렉트
  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            <T>로그인이 필요합니다</T>
          </h2>
          <p className="text-gray-600 mb-6">
            <T>Drama Builder를 사용하려면 로그인이 필요합니다.</T>
          </p>
          <Button onClick={() => navigate("/login")} className="w-full bg-purple-600 hover:bg-purple-700">
            <T>로그인하기</T>
          </Button>
        </div>
      </div>
    )
  }

  // 구독이 없는 경우
  if (!hasDramaSubscription && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              <T>Drama Builder</T>
            </h1>
            <p className="text-gray-600 mb-6">
              <T fallback="실제 드라마 대사로 한국어 문장 구성을 마스터하세요">
                실제 드라마 대사로 한국어 문장 구성을 마스터하세요
              </T>
            </p>
            <Button
              onClick={() => navigate("/subscription/plans")}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <T>구독하고 시작하기</T>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">
            <T>Drama Builder 데이터를 불러오는 중...</T>
          </p>
        </div>
      </div>
    )
  }

  // 문장 구성 연습 화면
  if (showSentenceBuilder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={goBackHome} className="flex items-center space-x-2 bg-transparent">
              <ChevronLeft className="w-4 h-4" />
              <T>홈으로 돌아가기</T>
            </Button>
          </div>

          {/* 에러 표시 */}
          {(error || dramaError.sentences) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="text-red-800 font-medium">
                    <T>오류가 발생했습니다</T>
                  </h3>
                  <p className="text-red-600 text-sm mt-1">
                    <T fallback={error || dramaError.sentences}>{error || dramaError.sentences}</T>
                  </p>
                </div>
              </div>
              <div className="mt-4 flex space-x-3">
                {error?.includes("인증") || error?.includes("토큰") ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/login")}
                    className="text-red-600 border-red-300 hover:bg-red-50 bg-transparent"
                  >
                    <T>로그인하기</T>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (selectedDrama ? selectDrama(selectedDrama) : startPractice())}
                    className="text-red-600 border-red-300 hover:bg-red-50 bg-transparent"
                  >
                    <T>다시 시도</T>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={goBackHome} className="bg-transparent">
                  <T>홈으로 돌아가기</T>
                </Button>
              </div>
            </div>
          )}

          {/* 로딩 상태 */}
          {(loadingSentences || dramaLoading.sentences) && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center mb-6">
              <LoadingSpinner size="md" />
              <p className="mt-4 text-gray-600">
                <T>문장을 불러오는 중...</T>
              </p>
            </div>
          )}

          {/* 선택된 드라마 정보 */}
          {selectedDrama && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{selectedDrama.image}</div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    <T>{selectedDrama.title}</T>
                  </h2>
                  <p className="text-gray-600">
                    <T>{selectedDrama.category}</T> • {selectedDrama.episodes}화
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 문장 구성 연습 - 문장이 로드된 경우에만 표시 */}
          {sentences && sentences.length > 0 && !loadingSentences && !dramaLoading.sentences && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <T>문장 구성 연습</T>
              </h3>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">
                    <T>진행률</T>
                  </span>
                  <span className="text-sm text-gray-600">1 / {sentences.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(1 / sentences.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  <T>문장 구성 연습 준비 완료</T>
                </h4>
                <p className="text-gray-600 mb-4">
                  <T>{sentences.length}개의 문장이 준비되었습니다. 문장 구성 연습을 시작하세요!</T>
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">
                    <T>첫 번째 문장: {sentences[0]?.content}</T>
                  </p>
                  <p className="text-sm text-gray-500">
                    <T>번역: {sentences[0]?.translation}</T>
                  </p>
                </div>
                <Button
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    // 여기에 실제 문장 구성 로직을 추가하세요
                    console.log("Starting sentence building with:", sentences[0])
                  }}
                >
                  <T>문장 구성 시작</T>
                </Button>
              </div>
            </div>
          )}

          {/* 문장이 없는 경우 */}
          {!loadingSentences &&
            !dramaLoading.sentences &&
            (!sentences || sentences.length === 0) &&
            !error &&
            !dramaError.sentences && (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  <T>문장을 준비 중입니다</T>
                </h3>
                <p className="text-gray-600 mb-4">
                  <T>잠시만 기다려주세요. 곧 연습을 시작할 수 있습니다.</T>
                </p>
                <Button
                  onClick={() => (selectedDrama ? selectDrama(selectedDrama) : startPractice())}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <T>문장 불러오기</T>
                </Button>
              </div>
            )}
        </div>
      </div>
    )
  }

  // Dashboard principal - resto do código permanece igual...
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 에러 표시 - 상단에 우선 표시 */}
        {error && (
          <div
            className={`border rounded-lg p-4 ${
              error.includes("인증") || error.includes("토큰")
                ? "bg-red-50 border-red-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div className="flex items-center space-x-3">
              <AlertCircle
                className={`w-5 h-5 ${
                  error.includes("인증") || error.includes("토큰") ? "text-red-600" : "text-yellow-600"
                }`}
              />
              <div>
                <h3
                  className={`font-medium ${
                    error.includes("인증") || error.includes("토큰") ? "text-red-800" : "text-yellow-800"
                  }`}
                >
                  <T>오류가 발생했습니다</T>
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    error.includes("인증") || error.includes("토큰") ? "text-red-600" : "text-yellow-600"
                  }`}
                >
                  <T fallback={error}>{error}</T>
                </p>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              {error.includes("인증") || error.includes("토큰") ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/login")}
                  className="text-red-600 border-red-300 hover:bg-red-50 bg-transparent"
                >
                  <T>로그인하기</T>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadDashboardData}
                  className="text-yellow-600 border-yellow-300 hover:bg-yellow-50 bg-transparent"
                >
                  <T>다시 시도</T>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Resto do dashboard... */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BookOpen className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  <T>Drama Builder</T>
                </h1>
                <p className="text-gray-600">
                  <T fallback="실제 드라마 대사로 문장 구성 마스터하기">실제 드라마 대사로 문장 구성 마스터하기</T>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                <T fallback="현재 레벨">현재 레벨</T>
              </div>
              <div className="text-lg font-semibold text-purple-600 capitalize">
                <T fallback={levelConfig?.name}>{levelConfig?.name}</T>
              </div>
            </div>
          </div>
        </div>

        {/* 사용량 및 빠른 액션 */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* 오늘의 사용량 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <T fallback="오늘의 학습">오늘의 학습</T>
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
                    {(dramaUsage?.daily_limit || 20) - (dramaUsage?.remaining || 0)} / {dramaUsage?.daily_limit || 20}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        dramaUsage?.daily_limit
                          ? ((dramaUsage.daily_limit - dramaUsage.remaining) / dramaUsage.daily_limit) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-500">
                <T fallback={`${dramaUsage?.remaining || 0}문장 남음`}>{dramaUsage?.remaining || 0}문장 남음</T> •{" "}
                {dramaUsage?.reset_at
                  ? new Date(dramaUsage.reset_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
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
                <T fallback="문장 연습 시작">문장 연습 시작</T>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                <T fallback={levelConfig?.drama?.sentenceLength}>{levelConfig?.drama?.sentenceLength}</T>
              </p>
              <Button
                onClick={startPractice}
                disabled={(dramaUsage?.remaining || 0) <= 0 || loadingSentences}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {loadingSentences ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <T>로딩 중...</T>
                  </div>
                ) : (
                  <T>{(dramaUsage?.remaining || 0) > 0 ? "연습 시작하기" : "사용량 초과"}</T>
                )}
              </Button>
            </div>
          </div>

          {/* 학습 통계 */}
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
                  <T fallback="완료한 문장">완료한 문장</T>
                </span>
                <span className="font-semibold">{dramaProgress?.total_completed || 0}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <T fallback="현재 레벨 진도">현재 레벨 진도</T>
                </span>
                <span className="font-semibold">
                  {dramaProgress?.level_stats?.[userLevel]?.completion_rate?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <T fallback="연속 학습">연속 학습</T>
                </span>
                <span className="font-semibold text-orange-600">5일 🔥</span>
              </div>
            </div>
          </div>
        </div>

        {/* 레벨별 추천 드라마 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              <T fallback={`${levelConfig?.name} 추천 드라마`}>{levelConfig?.name} 추천 드라마</T>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/drama/browse")}
              className="flex items-center space-x-2 bg-transparent"
            >
              <BookOpen className="w-4 h-4" />
              <T>전체 보기</T>
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {popularDramas.map((drama) => (
              <div
                key={drama.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => selectDrama(drama)}
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{drama.image}</div>
                  <h3 className="font-semibold text-gray-900">
                    <T fallback={drama.title}>{drama.title}</T>
                  </h3>
                  <p className="text-sm text-gray-500">
                    <T fallback={drama.category}>{drama.category}</T>
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      <T fallback="에피소드">에피소드</T>
                    </span>
                    <span className="text-gray-900">{drama.episodes}화</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      <T fallback="난이도">난이도</T>
                    </span>
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < drama.difficulty ? "text-yellow-400 fill-current" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-purple-600 hover:bg-purple-700 mt-3"
                    onClick={(e) => {
                      e.stopPropagation()
                      selectDrama(drama)
                    }}
                    disabled={loadingSentences}
                  >
                    {loadingSentences ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <T>로딩 중...</T>
                      </div>
                    ) : (
                      <T>문장 연습하기</T>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 학습 진행률 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            <T fallback="레벨별 진행률">레벨별 진행률</T>
          </h2>
          <div className="space-y-6">
            {Object.entries(dramaProgress?.level_stats || {}).map(([level, stats]) => {
              const levelInfo = getDramaLevel(level)
              if (!levelInfo) return null
              return (
                <div key={level} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full bg-${levelInfo.color}-500`} />
                      <span className="font-medium text-gray-900">
                        <T fallback={levelInfo.name}>{levelInfo.name}</T>
                      </span>
                      {level === userLevel && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          <T fallback="현재 레벨">현재 레벨</T>
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {stats.completed} / {stats.total} <T fallback="문장">문장</T>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full bg-${levelInfo.color}-500 transition-all duration-500`}
                      style={{ width: `${stats.completion_rate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>
                      {stats.completion_rate.toFixed(1)}% <T fallback="완료">완료</T>
                    </span>
                    <span>
                      {stats.total - stats.completed}
                      <T fallback="문장 남음">문장 남음</T>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 레벨 정보 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-4 mb-4">
            <Target className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              <T fallback={`${levelConfig?.name} 레벨 특징`}>{levelConfig?.name} 레벨 특징</T>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  <T fallback="문장 길이">문장 길이</T>
                </div>
                <div className="text-gray-600">
                  <T fallback={levelConfig?.drama?.sentenceLength}>{levelConfig?.drama?.sentenceLength}</T>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  <T fallback="추천 드라마">추천 드라마</T>
                </div>
                <div className="text-gray-600">
                  <T fallback={levelConfig?.drama?.dramaTypes?.join(", ")}>
                    {levelConfig?.drama?.dramaTypes?.join(", ")}
                  </T>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  <T fallback="학습 문법">학습 문법</T>
                </div>
                <div className="text-gray-600">
                  <T fallback={levelConfig?.drama?.grammarFocus?.join(", ")}>
                    {levelConfig?.drama?.grammarFocus?.join(", ")}
                  </T>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  <T fallback="유사 문장">유사 문장</T>
                </div>
                <div className="text-gray-600">
                  {levelConfig?.drama?.similarSentences}개 <T fallback="제공">제공</T>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              <T fallback="최근 활동">최근 활동</T>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/drama/progress")}
              className="flex items-center space-x-2 bg-transparent"
            >
              <Calendar className="w-4 h-4" />
              <T>전체 기록</T>
            </Button>
          </div>
          {/* 임시 최근 활동 데이터 */}
          <div className="space-y-4">
            {[
              { date: "오늘", drama: "사랑의 불시착", sentences: 8, accuracy: 92 },
              { date: "어제", drama: "미생", sentences: 12, accuracy: 88 },
              { date: "2일 전", drama: "슬기로운 의사생활", sentences: 10, accuracy: 95 },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      <T fallback={activity.drama}>{activity.drama}</T>
                    </div>
                    <div className="text-sm text-gray-500">
                      <T fallback={activity.date}>{activity.date}</T>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-900">
                    {activity.sentences}
                    <T fallback="문장 완료">문장 완료</T>
                  </div>
                  <div className="text-sm text-green-600">
                    <T fallback="정확도">정확도</T> {activity.accuracy}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DramaHome
