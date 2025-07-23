"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import { BookOpen, Mic, TrendingUp, Clock, Play, Volume2, Target, Zap, Calendar } from "lucide-react"
import Button, { PrimaryButton, OutlineButton } from "../../components/common/Buttom.jsx"
import { T } from "@/components/common/TranslatableText"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import ReadingPanel from "../../components/journey/ReadingPanel.jsx"
import { useSubscription } from "../../hooks/useSubscription.js"
// Importe as ações e seletores do seu journeySlice existente
import {
  fetchUsage,
  fetchProgress,
  selectUsage,
  selectProgress,
  selectLoading,
  selectErrors,
} from "../../store/slices/journeySlice.js" // Caminho corrigido para journeySlice

const JourneyHome = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user, isAuthenticated } = useSelector((state) => state.auth)

  // Obtenha os dados de uso e progresso do Redux store
  const usage = useSelector(selectUsage)
  const progress = useSelector(selectProgress)
  const journeyLoading = useSelector(selectLoading)
  const journeyErrors = useSelector(selectErrors)

  // Estado local para recentReadings e UI
  const [recentReadings, setRecentReadings] = useState([])
  const [selectedLevel, setSelectedLevel] = useState("level1")
  const [showReadingPanel, setShowReadingPanel] = useState(false)
  const [readingConfig, setReadingConfig] = useState({ level: "level1", type: "reading" })

  // Assumindo que o loading geral é a combinação dos loadings de usage e progress
  const loading = journeyLoading.usage || journeyLoading.progress
  const error = journeyErrors.usage || journeyErrors.progress

  // 구독 상태 관리 훅
  const { hasSubscription, getUsageInfo, isSubscribed, getSubscriptionStatus } = useSubscription()

  // Korean Journey 레벨 정보
  const hasJourneySubscription = isSubscribed("journey")
  const subscriptionStatus = getSubscriptionStatus("journey")
  const journeyLevels = [
    {
      id: "level1",
      name: "한글 마스터",
      color: "emerald",
      difficulty: "완전 초급",
      description: "한글 자음/모음부터",
      speed: "0.5x",
      focus: "한글 학습",
    },
    {
      id: "level2",
      name: "기초 리더",
      color: "blue",
      difficulty: "초급",
      description: "일상 대화와 표현",
      speed: "0.8x-1.0x",
      focus: "발음 규칙",
    },
    {
      id: "level3",
      name: "중급 리더",
      color: "purple",
      difficulty: "중급",
      description: "뉴스와 문학 작품",
      speed: "1.0x-1.2x",
      focus: "감정 표현",
    },
    {
      id: "level4",
      name: "고급 리더",
      color: "red",
      difficulty: "고급",
      description: "전문 텍스트",
      speed: "1.5x+",
      focus: "프레젠테이션",
    },
  ]
  // 콘텐츠 유형
  const contentTypes = [
    { id: "hangul", name: "한글 학습", icon: BookOpen, description: "자음/모음 마스터" },
    { id: "reading", name: "읽기 연습", icon: BookOpen, description: "텍스트 리딩" },
    { id: "pronunciation", name: "발음 연습", icon: Mic, description: "정확한 발음" },
    { id: "dialogue", name: "대화 연습", icon: Volume2, description: "실전 대화" },
  ]

  // Data Load
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData()
    }
  }, [isAuthenticated])

  const loadDashboardData = async () => {
    // Dispatch as thunks para buscar os dados e atualizar o Redux store
    dispatch(fetchUsage())
    dispatch(fetchProgress())
  }

  // 리딩 세션 시작
  const startReading = (level = selectedLevel, type = "reading") => {
    if (!hasJourneySubscription) {
      navigate("/subscription/plans")
      return
    }
    if (usage?.remaining <= 0) {
      alert("오늘의 학습량을 모두 사용했습니다. 내일 다시 시도해주세요!")
      return
    }

    setReadingConfig({ level, type })
    setShowReadingPanel(true)
  }

  // 리딩 완료 처리
  const handleReadingComplete = (data) => {
    setShowReadingPanel(false)
    // Após completar, recarregue os dados para atualizar o Redux store
    loadDashboardData()
  }

  // 리딩 진행 상황 처리
  const handleReadingProgress = (progressData) => {
    console.log("Reading progress:", progressData)
  }

  // 리딩 패널 종료
  const closeReadingPanel = () => {
    setShowReadingPanel(false)
  }

  // Atualiza recentReadings quando progress muda
  useEffect(() => {
    if (progress?.history) {
      setRecentReadings(progress.history.slice(0, 3))
    }
  }, [progress])

  // 구독이 없는 경우
  if (!hasJourneySubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              <T>Korean Journey</T>
            </h1>
            <p className="text-gray-600 mb-6">
              <T>한글부터 시작하는 체계적인 한국어 읽기와 발음 학습</T>
            </p>
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">구독 상태</div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                구독 필요
              </div>
            </div>
            <PrimaryButton
              onClick={() => navigate("/subscription/plans")}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
              textKey="구독하고 시작하기"
            />
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">
            <T>Korean Journey 데이터를 불러오는 중...</T>
          </p>
        </div>
      </div>
    )
  }

  // 리딩 패널이 열려있을 때
  if (showReadingPanel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={closeReadingPanel}
              className="flex items-center space-x-2 bg-transparent"
            >
              <BookOpen className="w-4 h-4" />
              <span>홈으로 돌아가기</span>
            </Button>
          </div>

          <ReadingPanel
            level={readingConfig.level}
            onComplete={handleReadingComplete}
            onProgress={handleReadingProgress}
            className="w-full"
          />
        </div>
      </div>
    )
  }

  const selectedLevelInfo = journeyLevels.find((l) => l.id === selectedLevel)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  <T>Korean Journey</T>
                </h1>
                <p className="text-gray-600">
                  <T>한글부터 시작하는 체계적인 읽기와 발음 학습</T>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                <T>구독 상태</T>
              </div>
              <div
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                  subscriptionStatus === "active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {subscriptionStatus === "active" ? "활성" : subscriptionStatus}
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
                <T>오늘의 학습</T>
              </h3>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">
                    <T>사용량</T>
                  </span>
                  <span className="text-gray-900">
                    {(usage?.daily_limit || 20) - (usage?.remaining || 0)} / {usage?.daily_limit || 20}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(((usage?.daily_limit || 20) - (usage?.remaining || 0)) / (usage?.daily_limit || 20)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-500">
                <T>
                  {usage?.remaining || 0}문장 남음 •{" "}
                  {usage?.reset_at
                    ? new Date(usage.reset_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                    : "24:00"}{" "}
                  초기화
                </T>
              </div>
            </div>
          </div>

          {/* 빠른 시작 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center">
              <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Play className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                <T>읽기 시작</T>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                <T>{selectedLevelInfo?.description}</T>
              </p>
              <Button
                onClick={() => startReading()}
                disabled={(usage?.remaining || 0) <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
                textKey={(usage?.remaining || 0) > 0 ? "읽기 시작하기" : "사용량 초과"}
              />
            </div>
          </div>

          {/* 학습 통계 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <T>학습 통계</T>
              </h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <T>총 읽기 수</T>
                </span>
                <span className="font-semibold">{progress?.total_readings || 0}회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <T>완료한 문장</T>
                </span>
                <span className="font-semibold">{progress?.total_sentences || 0}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  <T>평균 발음 점수</T>
                </span>
                <span className="font-semibold text-green-600">{progress?.avg_pronunciation?.toFixed(1) || 0}점</span>
              </div>
            </div>
          </div>
        </div>

        {/* 레벨 선택 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            <T>학습 레벨 선택</T>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {journeyLevels.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedLevel(level.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedLevel === level.id
                    ? `border-${level.color}-500 bg-${level.color}-50 text-${level.color}-700`
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    <T>{level.name}</T>
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full bg-${level.color}-100 text-${level.color}-700`}>
                    <T>{level.difficulty}</T>
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  <T>{level.description}</T>
                </div>
                <div className="text-xs text-gray-500">
                  <T>
                    속도: {level.speed} • {level.focus}
                  </T>
                </div>
              </button>
            ))}
          </div>

          {/* 콘텐츠 유형 선택 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {contentTypes.map((type) => {
              const Icon = type.icon
              return (
                <Button
                  key={type.id}
                  onClick={() => startReading(selectedLevel, type.id)}
                  disabled={(usage?.remaining || 0) <= 0}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <Icon className="w-6 h-6" />
                  <div className="text-center">
                    <div className="font-medium">
                      <T>{type.name}</T>
                    </div>
                    <div className="text-xs text-gray-500">
                      <T>{type.description}</T>
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        {/* 선택된 레벨 정보 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              <T>{selectedLevelInfo?.name} 레벨 정보</T>
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium bg-${selectedLevelInfo?.color}-100 text-${selectedLevelInfo?.color}-700`}
            >
              <T>{selectedLevelInfo?.difficulty}</T>
            </span>
          </div>

          <p className="text-gray-600 mb-4">
            <T>{selectedLevelInfo?.description}을 중심으로 학습합니다.</T>
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className={`text-center p-3 bg-${selectedLevelInfo?.color}-50 rounded-lg`}>
              <div className={`text-lg font-bold text-${selectedLevelInfo?.color}-600`}>{selectedLevelInfo?.speed}</div>
              <div className={`text-xs text-${selectedLevelInfo?.color}-600`}>
                <T>읽기 속도</T>
              </div>
            </div>
            <div className={`text-center p-3 bg-${selectedLevelInfo?.color}-50 rounded-lg`}>
              <div className={`text-lg font-bold text-${selectedLevelInfo?.color}-600`}>
                <T>{selectedLevelInfo?.focus}</T>
              </div>
              <div className={`text-xs text-${selectedLevelInfo?.color}-600`}>
                <T>학습 초점</T>
              </div>
            </div>
            <div className={`text-center p-3 bg-${selectedLevelInfo?.color}-50 rounded-lg`}>
              <div className={`text-lg font-bold text-${selectedLevelInfo?.color}-600`}>
                {progress?.level_stats?.[selectedLevel]?.count || 0}회
              </div>
              <div className={`text-xs text-${selectedLevelInfo?.color}-600`}>
                <T>완료 횟수</T>
              </div>
            </div>
          </div>
        </div>

        {/* 레벨별 진행률 및 최근 활동 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 레벨별 진행률 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                <T>레벨별 진행률</T>
              </h2>
              <Target className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              {journeyLevels.map((level) => {
                const stats = progress?.level_stats?.[level.id]
                if (!stats) return null

                return (
                  <div key={level.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full bg-${level.color}-500`} />
                        <span className="font-medium text-gray-900">
                          <T>{level.name}</T>
                        </span>
                        {level.id === selectedLevel && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            <T>선택됨</T>
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <T>{stats.count}회 완료</T>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        <T>평균 발음: {stats.average_pronunciation?.toFixed(1) || 0}점</T>
                      </span>
                      <span>
                        <T>평균 문장: {stats.average_sentences?.toFixed(1) || 0}개</T>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 최근 읽기 활동 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                <T>최근 읽기 활동</T>
              </h2>
              <OutlineButton
                size="sm"
                onClick={() => navigate("/journey/progress")}
                className="flex items-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <T>전체 기록</T>
              </OutlineButton>
            </div>
            {recentReadings.length > 0 ? (
              <div className="space-y-4">
                {recentReadings.map((reading) => {
                  const levelInfo = journeyLevels.find((l) => l.id === reading.level)
                  const typeInfo = contentTypes.find((t) => t.id === reading.content_type)

                  return (
                    <div
                      key={reading.history_id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 bg-${levelInfo?.color}-100 rounded-lg`}>
                          <BookOpen className={`w-5 h-5 text-${levelInfo?.color}-600`} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            <T>{reading.content_title}</T>
                          </div>
                          <div className="text-sm text-gray-500">
                            <T>
                              {levelInfo?.name} • {typeInfo?.name}
                            </T>{" "}
                            • {new Date(reading.date).toLocaleDateString("ko-KR")}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-medium ${
                            reading.pronunciation_score >= 90
                              ? "text-green-600"
                              : reading.pronunciation_score >= 70
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          <T>발음 {reading.pronunciation_score}점</T>
                        </div>
                        <div className="text-xs text-gray-500">
                          <T>{reading.completed_sentences}문장 완료</T>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  <T>아직 읽기 기록이 없습니다</T>
                </h3>
                <p className="text-gray-500 mb-4">
                  <T>첫 번째 읽기 학습을 시작해보세요!</T>
                </p>
                <Button
                  onClick={() => startReading()}
                  disabled={(usage?.remaining || 0) <= 0}
                  textKey="읽기 시작하기"
                />
              </div>
            )}
          </div>
        </div>

        {/* 일일 학습 현황 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              <T>일일 학습 현황</T>
            </h2>
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>

          <div className="grid md:grid-cols-7 gap-2">
            {progress?.date_stats?.slice(0, 7).map((dayStat, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">
                  {new Date(dayStat.date).toLocaleDateString("ko-KR", { weekday: "short" })}
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1">{dayStat.count}회</div>
                <div className="text-xs text-gray-500">
                  <T>{dayStat.total_sentences}문장</T>
                </div>
              </div>
            )) || (
              <div className="col-span-7 text-center text-gray-500">
                <T>학습 기록이 없습니다</T>
              </div>
            )}
          </div>

          {progress?.date_stats?.length > 0 && (
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-600">
                <T>🔥 꾸준한 학습을 이어가고 있어요!</T>
              </div>
            </div>
          )}
        </div>

        {/* 에ror 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-red-800">
                <T>{error}</T>
              </div>
              <OutlineButton
                size="sm"
                onClick={loadDashboardData}
                className="text-red-600 border-red-300 hover:bg-red-100"
                textKey="다시 시도"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default JourneyHome
