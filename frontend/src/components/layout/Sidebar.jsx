"use client"
import { useState, useRef, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux" // Combined import
import {
  Home,
  MessageCircle,
  Film,
  BookOpen,
  Map,
  Crown,
  Star,
  TrendingUp,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target,
  Lock,
  Clock,
  BarChart3,
} from "lucide-react"
import Button from "@/components/common/Buttom"
import { T } from "@/components/common/TranslatableText"
import { PRODUCT_LIST } from "@/shared/constants/products"
import { ROUTES } from "../../shared/constants/routes.js"
import {
  selectUsage as selectJourneyUsage,
  selectLoading as selectJourneyLoading,
  fetchUsage as fetchJourneyUsage,
} from "../../store/slices/journeySlice"
import {
  selectUsage as selectTalkUsage,
  selectTalkLoading, // Use o nome correto da exportação
  loadUsage as fetchTalkUsage,
} from "../../store/slices/talkSlice"
import { selectUsage as selectDramaUsage, fetchDramaUsage } from "../../store/slices/dramaSlice"
import { selectUsage as selectTestUsage, fetchTestUsage } from "../../store/slices/testSlice" // Import testSlice

const Sidebar = ({ collapsed = false, onToggle }) => {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(fetchJourneyUsage())
    dispatch(fetchTalkUsage())
    dispatch(fetchDramaUsage())
    dispatch(fetchTestUsage()) // Fetch test usage data
  }, [dispatch])
  const location = useLocation()
  const fullState = useSelector((s) => s) // Obtenha o estado completo para inspeção
  console.log("Sidebar - Redux State (Full):", fullState)
  console.log("Sidebar - state.gamification:", fullState.gamification)
  console.log("Sidebar - state.talkUsage:", fullState.talkUsage)
  console.log("Sidebar - state.journey:", fullState.journey)
  console.log("Sidebar - state.journey.usage (direct):", fullState.journey?.usage) // Acesso seguro
  console.log("Sidebar - state.journey.loading (direct):", fullState.journey?.loading) // Acesso seguro
  const [userSubscriptions] = useState(["talk", "drama", "journey", "test"]) // 임시 데이터
  const [hoveredItem, setHoveredItem] = useState(null)
  const sidebarRef = useRef(null)
  // Obtenha os dados do Redux store com acesso seguro
  const gamificationData = useSelector((state) => state.gamification?.data)
  const dramaUsageData = useSelector(selectDramaUsage) || {}
  const talkUsageData = useSelector(selectTalkUsage) || {} // Dados do Talk
  const talkLoading = useSelector(selectTalkLoading) || {}
  const journeyUsageData = useSelector(selectJourneyUsage) || {} // Garante que journeyUsageData é um objeto
  const journeyLoading = useSelector(selectJourneyLoading) || {} // Garante que journeyLoading é um objeto
  const testUsageData = useSelector(selectTestUsage) || {} // Get test usage data
  console.log("Sidebar - gamificationData (selected):", gamificationData)
  console.log("Sidebar - talkUsageData (selected):", talkUsageData)
  console.log("Sidebar - journeyUsageData (selected):", journeyUsageData)
  console.log("Sidebar - journeyLoading (selected):", journeyLoading)
  console.log("Sidebar - testUsageData (selected):", testUsageData) // Log test usage data
  const loadingStats = useSelector(
    (state) => state.gamification?.loading || state.talkUsage?.loading || state.journey?.loading?.usage,
  )
  const hasActiveSubscription = (productId) => {
    return userSubscriptions.includes(productId)
  }
  const getSubscriptionStatus = () => {
    return userSubscriptions
  }
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && !collapsed) {
        if (window.innerWidth < 1024 && onToggle) {
          onToggle()
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [collapsed, onToggle])
  const isCurrentPath = (path) => location.pathname === path
  const isProductPath = (path) => location.pathname.startsWith(path)
  const renderProductIcon = (iconName, className = "w-5 h-5") => {
    const icons = {
      MessageCircle: <MessageCircle className={className} />,
      Film: <Film className={className} />,
      BookOpen: <BookOpen className={className} />,
      Map: <Map className={className} />,
    }
    return icons[iconName] || <MessageCircle className={className} />
  }
  const getMenuItemClasses = (isActive, hasSubscription = true) => {
    const baseClasses =
      "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group relative"
    if (!hasSubscription) {
      return `${baseClasses} text-gray-400 cursor-not-allowed opacity-60`
    }
    if (isActive) {
      return `${baseClasses} text-blue-600 bg-blue-50 border-r-2 border-blue-600`
    }
    return `${baseClasses} text-gray-600 hover:text-gray-900 hover:bg-gray-50`
  }
  const getSectionTitleClasses = () => {
    if (collapsed) {
      return "hidden"
    }
    return "px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
  }
  // Modified ProgressBar to accept a label prop
  const ProgressBar = ({ progress, color = "blue", label }) => {
    if (collapsed) return null
    return (
      <div className="mt-2 px-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>
            <T>{label}</T>
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`bg-${color}-600 h-1.5 rounded-full transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }
  const SubscriptionBadge = ({ productId }) => {
    if (collapsed) return null
    if (hasActiveSubscription(productId)) {
      return (
        <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
          <T>구독중</T>
        </span>
      )
    }
    return <Lock className="ml-auto w-4 h-4 text-gray-400" />
  }
  const StatCard = ({ icon, value, labelKey, color = "gray" }) => {
    if (collapsed) return null
    return (
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={`p-2 bg-${color}-100 rounded-lg`}>{icon}</div>
          <div>
            <div className="text-lg font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">
              <T>{labelKey}</T>
            </div>
          </div>
        </div>
      </div>
    )
  }
  const getColorClasses = (colorName) => {
    const colorMap = {
      primary: "blue",
      secondary: "purple",
      success: "green",
      warning: "orange",
      emerald: "emerald",
      red: "red",
    }
    return colorMap[colorName] || "gray"
  }
  const activeSubscriptions = getSubscriptionStatus()
  // Dados para a barra de uso diário do Talk
  const dailyTalkLimit = talkUsageData?.dailyLimit || talkUsageData?.daily_limit || 60
  const dailyTalkRemaining = talkUsageData?.remaining || 0
  const dailyTalkUsed = dailyTalkLimit - dailyTalkRemaining
  const dailyTalkPercentage = Math.min(100, Math.max(0, (dailyTalkUsed / dailyTalkLimit) * 100))
  // Dados para a barra de uso diário do Journey (agora do journeySlice)
  const dailyJourneyLimit = journeyUsageData?.daily_limit || 20
  const dailyJourneyRemaining = journeyUsageData?.remaining || 0
  const dailyJourneyUsed = dailyJourneyLimit - dailyJourneyRemaining
  const dailyJourneyPercentage = Math.min(100, Math.max(0, (dailyJourneyUsed / dailyJourneyLimit) * 100))
  const journeyResetTime = journeyUsageData?.reset_at
    ? new Date(journeyUsageData.reset_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : "24:00"
  ///drama
  const dailyDramaLimit = dramaUsageData?.daily_limit || 20
  const dailyDramaRemaining = dramaUsageData?.remaining || 20 // Inicie com o limite máximo
  const dailyDramaUsed = dailyDramaLimit - dailyDramaRemaining
  const dailyDramaPercentage = Math.min(100, Math.max(0, (dailyDramaUsed / dailyDramaLimit) * 100))
  const dramaResetTime =
    dramaUsageData?.reset_at || dramaUsageData?.resetAt
      ? new Date(dramaUsageData.reset_at || dramaUsageData.resetAt).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "24:00"

  // Dados para a barra de uso diário do Test
  const dailyTestLimit = testUsageData?.dailyLimit || 10 // Assuming a default limit for test
  const dailyTestRemaining = testUsageData?.remaining || 0
  const dailyTestUsed = dailyTestLimit - dailyTestRemaining
  const dailyTestPercentage = Math.min(100, Math.max(0, (dailyTestUsed / dailyTestLimit) * 100))

  return (
    <div
      ref={sidebarRef}
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
        collapsed ? "w-16" : "w-64"
      } lg:relative lg:top-0 lg:h-screen`}
    >
      {onToggle && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shadow-sm"
          aria-label={collapsed ? "사이드바 열기" : "사이드바 닫기"}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}
      <div className="h-full flex flex-col">
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <Link to={ROUTES.DASHBOARD} className={getMenuItemClasses(isCurrentPath(ROUTES.DASHBOARD))}>
            <Home className="w-5 h-5 mr-3 flex-shrink-0" />
            {!collapsed && (
              <span>
                <T>대시보드</T>
              </span>
            )}
            {collapsed && hoveredItem === "dashboard" && (
              <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-50">
                <T>대시보드</T>
              </div>
            )}
          </Link>
          <div className="pt-4">
            <div className={getSectionTitleClasses()}>
              <T>학습 코스</T>
            </div>
            <div className="space-y-1">
              {PRODUCT_LIST.map((product) => {
                const isActive = isProductPath(product.route)
                const hasSubscription = hasActiveSubscription(product.id)
                const colorClass = getColorClasses(product.color)

                let progressToDisplay = 0
                let progressLabelKey = "이번 주 진도" // Default label key

                if (product.id === "drama") {
                  progressToDisplay = dailyDramaPercentage
                  progressLabelKey = "오늘의 학습"
                } else if (product.id === "talk") {
                  progressToDisplay = dailyTalkPercentage
                  progressLabelKey = "오늘의 대화"
                } else if (product.id === "test") {
                  progressToDisplay = dailyTestPercentage
                  progressLabelKey = "오늘의 문제"
                } else if (product.id === "journey") {
                  progressToDisplay = dailyJourneyPercentage
                  progressLabelKey = "이번 주 진도" // Journey still uses "이번 주 진도"
                }

                return (
                  <div key={product.id}>
                    <Link
                      to={hasSubscription ? product.route : ROUTES.SUBSCRIPTION.PLANS}
                      className={getMenuItemClasses(isActive, hasSubscription)}
                      onMouseEnter={() => setHoveredItem(product.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      aria-label={`${product.nameKr} ${hasSubscription ? "이동" : "구독 필요"}`}
                    >
                      <div className={`p-2 rounded-lg mr-3 flex-shrink-0 bg-${colorClass}-100`}>
                        {renderProductIcon(product.icon, `text-${colorClass}-600 w-4 h-4`)}
                      </div>
                      {!collapsed && (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              <T>{product.nameKr}</T>
                            </div>
                            {hasSubscription && (
                              <div className="text-xs text-gray-500 truncate">
                                <T>{product.tag}</T>
                              </div>
                            )}
                          </div>
                          <SubscriptionBadge productId={product.id} />
                        </>
                      )}
                      {collapsed && hoveredItem === product.id && (
                        <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-50">
                          <T>{product.nameKr}</T>
                          {hasSubscription && <span className="ml-1 text-green-400">✓</span>}
                          {!hasSubscription && <span className="ml-1 text-red-400">🔒</span>}
                        </div>
                      )}
                    </Link>
                    {hasSubscription && isActive && !collapsed && (
                      <ProgressBar progress={progressToDisplay} color={colorClass} label={progressLabelKey} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="pt-4">
            <div className={getSectionTitleClasses()}>
              <T>구독 & 관리</T>
            </div>
            <div className="space-y-1">
              <Link
                to={ROUTES.SUBSCRIPTION.PLANS}
                className={getMenuItemClasses(isCurrentPath(ROUTES.SUBSCRIPTION.PLANS))}
                onMouseEnter={() => setHoveredItem("plans")}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Crown className="w-5 h-5 mr-3 flex-shrink-0" />
                {!collapsed && (
                  <span>
                    <T>구독 관리</T>
                  </span>
                )}
                {collapsed && hoveredItem === "plans" && (
                  <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-50">
                    <T>구독 관리</T>
                  </div>
                )}
              </Link>
              <Link
                to={ROUTES.COMMON.LEADERBOARD}
                className={getMenuItemClasses(isCurrentPath(ROUTES.COMMON.LEADERBOARD))}
                onMouseEnter={() => setHoveredItem("leaderboard")}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Star className="w-5 h-5 mr-3 flex-shrink-0" />
                {!collapsed && (
                  <span>
                    <T>리더보드</T>
                  </span>
                )}
                {collapsed && hoveredItem === "leaderboard" && (
                  <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-50">
                    <T>리더보드</T>
                  </div>
                )}
              </Link>
              <Link
                to="/progress"
                className={getMenuItemClasses(isCurrentPath("/progress"))}
                onMouseEnter={() => setHoveredItem("progress")}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <BarChart3 className="w-5 h-5 mr-3 flex-shrink-0" />
                {!collapsed && (
                  <span>
                    <T>학습 분석</T>
                  </span>
                )}
                {collapsed && hoveredItem === "progress" && (
                  <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-50">
                    <T>학습 분석</T>
                  </div>
                )}
              </Link>
            </div>
          </div>
          <div className="pt-4">
            <div className={getSectionTitleClasses()}>
              <T>설정 & 도움말</T>
            </div>
            <div className="space-y-1">
              <Link
                to={ROUTES.PROFILE.SETTINGS}
                className={getMenuItemClasses(isCurrentPath(ROUTES.PROFILE.SETTINGS))}
                onMouseEnter={() => setHoveredItem("settings")}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Settings className="w-5 h-5 mr-3 flex-shrink-0" />
                {!collapsed && (
                  <span>
                    <T>설정</T>
                  </span>
                )}
                {collapsed && hoveredItem === "settings" && (
                  <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-50">
                    <T>설정</T>
                  </div>
                )}
              </Link>
              <Link
                to={ROUTES.SUPPORT.HELP}
                className={getMenuItemClasses(isCurrentPath(ROUTES.SUPPORT.HELP))}
                onMouseEnter={() => setHoveredItem("help")}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <HelpCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                {!collapsed && (
                  <span>
                    <T>도움말</T>
                  </span>
                )}
                {collapsed && hoveredItem === "help" && (
                  <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-50">
                    <T>도움말</T>
                  </div>
                )}
              </Link>
            </div>
          </div>
        </nav>
        {!collapsed && (
          <div className="p-3 border-t border-gray-200 space-y-3">
            <div className="space-y-2">
              <StatCard
                icon={<Flame className="w-4 h-4 text-orange-600" />}
                value={`${gamificationData?.streak_days || 0}일`}
                labelKey="연속 학습"
                color="orange"
              />
              <StatCard
                icon={<Target className="w-4 h-4 text-blue-600" />}
                value={`${gamificationData?.total_xp || 0} XP`}
                labelKey="총 경험치"
                color="blue"
              />
            </div>
            {/* 오늘의 드라마 (Daily Drama Usage) */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  <T fallback="오늘의 드라마">오늘의 드라마</T>
                </span>
                <Film className="w-4 h-4 text-gray-400" />
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>
                      <T fallback="사용량">사용량</T>
                    </span>
                    <span>
                      {dailyDramaUsed} / {dailyDramaLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`bg-purple-600 h-1.5 rounded-full transition-all duration-300`}
                      style={{ width: `${dailyDramaPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  <T fallback={`${dailyDramaRemaining}문장 남음`}>{dailyDramaRemaining}문장 남음</T> • {dramaResetTime}{" "}
                  <T fallback="초기화">초기화</T>
                </div>
              </div>
            </div>
            {/* 오늘의 학습 (Daily Journey Usage) - Agora usando journeySlice */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  <T fallback="오늘의 학습">오늘의 학습</T>
                </span>
                <BookOpen className="w-4 h-4 text-gray-400" />
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>
                      <T fallback="사용량">사용량</T>
                    </span>
                    <span>
                      {dailyJourneyUsed} / {dailyJourneyLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${dailyJourneyPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  <T fallback={`${dailyJourneyRemaining}문장 남음`}>{dailyJourneyRemaining}문장 남음</T> •{" "}
                  {journeyResetTime} <T fallback="초기화">초기화</T>
                </div>
              </div>
            </div>
            {activeSubscriptions.length < PRODUCT_LIST.length && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  🚀 <T>더 많은 학습 기회</T>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  <T>{PRODUCT_LIST.length - activeSubscriptions.length}개의 추가 코스로 학습을 확장하세요</T>
                </p>
                <Link to={ROUTES.SUBSCRIPTION.PLANS}>
                  <Button variant="primary" size="sm" fullWidth textKey="코스 추가하기" />
                </Link>
              </div>
            )}
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>
                  <T>최근 활동: 2시간 전</T>
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>
                  <T>이번 주 3회 학습</T>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default Sidebar
