"use client"

import { useSelector, useDispatch } from "react-redux"
import { useEffect, useCallback, useRef, useMemo, useState } from "react"
import {
  updateXP,
  updateStreak,
  fetchLeaderboard,
  fetchUserStats,
  unlockAchievement,
  clearErrors,
  resetSuccessStates,
  setShowLevelUpModal,
  setShowAchievementModal,
  selectGamification,
} from "@store/slices/gamificationSlice"
import { XP_ACTIVITIES } from "@api/gamification"
// We no longer need to import gamificationAPI directly here as the thunks handle it.

// Level configuration (consistent and predictable)
const LEVEL_CONFIG = {
  // XP required for each level
  levelRequirements: [
    0,    // Level 0
    100,  // Level 1
    250,  // Level 2
    450,  // Level 3
    700,  // Level 4
    1000, // Level 5
    1350, // Level 6
    1750, // Level 7
    2200, // Level 8
    2700, // Level 9
    3250, // Level 10
    3850, // Level 11
    4500, // Level 12
    5200, // Level 13
    5950, // Level 14
    6750, // Level 15
    7600, // Level 16
    8500, // Level 17
    9450, // Level 18
    10450,// Level 19
    11500 // Level 20
  ],

  // Function to calculate XP for levels beyond 20
  calculateHighLevelXP: (level) => {
    if (level <= 20) return LEVEL_CONFIG.levelRequirements[level] || 0
    // For levels above 20, use exponential progression
    const baseXP = 11500
    const multiplier = Math.pow(1.2, level - 20)
    return Math.floor(baseXP * multiplier)
  },
}

/**
 * Custom hook providing gamification system features (Backend integration)
 */
export const useGamification = () => {
  const dispatch = useDispatch()
  const animationTimeoutRef = useRef(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Select Redux state directly
  const gamificationState = useSelector(selectGamification)
  const totalXP = gamificationState.totalXP || 0
  const currentLevel = gamificationState.currentLevel || 0
  const currentLeague = gamificationState.currentLeague
  const streakDays = gamificationState.streakDays || 0
  const achievements = gamificationState.unlockedAchievements || [] // Use unlockedAchievements
  const leaderboard = gamificationState.leaderboard || []
  const userRank = gamificationState.userRank
  const isLoading = gamificationState.isLoading || gamificationState.isStatsLoading // Use slice's isLoading
  const syncError = gamificationState.error || gamificationState.statsError // Use slice's error

  // Safe level calculation
  const calculateLevel = useCallback((xp) => {
    const safeXP = Math.max(0, Number(xp) || 0)
    for (let i = LEVEL_CONFIG.levelRequirements.length - 1; i >= 0; i--) {
      if (safeXP >= LEVEL_CONFIG.levelRequirements[i]) {
        return i
      }
    }
    let level = 20
    while (safeXP >= LEVEL_CONFIG.calculateHighLevelXP(level + 1)) {
      level++
      if (level > 100) break
    }
    return level
  }, [])

  // XP needed for next level
  const getXPToNextLevel = useCallback(
    (xp = totalXP) => {
      const safeXPValue = Math.max(0, Number(xp) || 0)
      const level = calculateLevel(safeXPValue)
      if (level >= 100) return 0
      const nextLevelXP =
        level < 20 ? LEVEL_CONFIG.levelRequirements[level + 1] : LEVEL_CONFIG.calculateHighLevelXP(level + 1)
      return Math.max(0, nextLevelXP - safeXPValue)
    },
    [totalXP, calculateLevel],
  )

  // Current level progress percentage
  const getCurrentLevelProgress = useCallback(
    (xp = totalXP) => {
      const safeXPValue = Math.max(0, Number(xp) || 0)
      const level = calculateLevel(safeXPValue)
      if (level >= 100) return 100
      const currentLevelXP =
        level < 20 ? LEVEL_CONFIG.levelRequirements[level] : LEVEL_CONFIG.calculateHighLevelXP(level)
      const nextLevelXP =
        level < 20 ? LEVEL_CONFIG.levelRequirements[level + 1] : LEVEL_CONFIG.calculateHighLevelXP(level + 1)
      const progressXP = safeXPValue - currentLevelXP
      const totalNeededXP = nextLevelXP - currentLevelXP
      if (totalNeededXP <= 0) return 100
      const progress = (progressXP / totalNeededXP) * 100
      return Math.min(Math.max(progress, 0), 100)
    },
    [totalXP, calculateLevel],
  )

  // Memoized calculated values
  const calculatedLevel = useMemo(() => calculateLevel(totalXP), [totalXP, calculateLevel])
  const xpToNextLevelValue = useMemo(() => getXPToNextLevel(totalXP), [totalXP, getXPToNextLevel])
  const levelProgressValue = useMemo(() => getCurrentLevelProgress(totalXP), [totalXP, getCurrentLevelProgress])

  // Function to fetch backend data (now dispatches thunk)
  const fetchBackendData = useCallback(async () => {
    try {
      console.log("🔄 Fetching gamification data from backend via Redux thunk...")
      const result = await dispatch(fetchUserStats()).unwrap()
      console.log("✅ Backend data fetched and synced to Redux:", result)
      return { success: true, data: result }
    } catch (error) {
      console.error("❌ Error fetching backend data via Redux thunk:", error)
      return { success: false, error: error.message }
    }
  }, [dispatch])

  // Initialization - fetch backend data
  useEffect(() => {
    if (!isInitialized) {
      console.log("🚀 Initializing gamification hook...")
      fetchBackendData().then(() => {
        setIsInitialized(true)
        console.log("✅ Gamification hook initialized")
      })
    }
  }, [isInitialized, fetchBackendData])

  // Function to add XP (dispatches thunk)
  const addXP = useCallback(
    async (activity, amount = 10, metadata = {}) => {
      try {
        const safeAmount = Math.max(0, Number(amount) || 0)
        if (safeAmount === 0) {
          console.warn("Invalid XP amount:", amount)
          return { success: false, error: "Invalid XP amount" }
        }

        console.log(`🎯 Adding ${safeAmount} XP for activity: ${activity} via Redux thunk...`)
        const result = await dispatch(updateXP({ activity, amount: safeAmount, metadata })).unwrap()

        // Level up check and XP animation are handled in the slice's extraReducers and gamificationEvents listener,
        // so no need to duplicate the logic here.

        return {
          success: true,
          data: result,
          xpGained: safeAmount,
          leveledUp: result.leveled_up || false, // Assuming API response may have this
          newLevel: result.new_level || null,
        }
      } catch (error) {
        console.error("❌ Error adding XP via Redux thunk:", error)
        return { success: false, error: error.message }
      }
    },
    [dispatch],
  )

  // Function to update streak (dispatches thunk)
  const updateStreakDays = useCallback(async () => {
    try {
      console.log("🔥 Updating streak via Redux thunk...")
      const result = await dispatch(updateStreak()).unwrap()
      // Milestone XP logic handled in slice extraReducers
      return { success: true, data: result }
    } catch (error) {
      console.error("❌ Error updating streak via Redux thunk:", error)
      return { success: false, error: error.message }
    }
  }, [dispatch])

  // Function to fully refresh stats (dispatches thunk)
  const refreshStats = useCallback(async () => {
    return fetchBackendData()
  }, [fetchBackendData])

  // Function to refresh leaderboard (dispatches thunk)
  const refreshLeaderboard = useCallback(
    async (league = null, limit = 10) => {
      try {
        console.log("🏆 Refreshing leaderboard via Redux thunk...")
        const result = await dispatch(fetchLeaderboard({ league, limit })).unwrap()
        return { success: true, data: result }
      } catch (error) {
        console.error("❌ Error refreshing leaderboard via Redux thunk:", error)
        return { success: false, error: error.message }
      }
    },
    [dispatch],
  )

  // Function to unlock achievement (dispatches thunk)
  const unlockBadge = useCallback(
    async (achievementId, metadata = {}) => {
      try {
        console.log(`🏅 Unlocking achievement: ${achievementId} via Redux thunk...`)
        const result = await dispatch(unlockAchievement({ achievementId, metadata })).unwrap()
        // Bonus XP and modal handled in slice extraReducers and event listener
        return { success: true, data: result }
      } catch (error) {
        console.error("❌ Error unlocking achievement via Redux thunk:", error)
        return { success: false, error: error.message }
      }
    },
    [dispatch],
  )

  // League info
  const getLeagueInfo = useCallback(() => {
    const level = currentLevel // Use currentLevel from Redux
    if (level >= 20) return { name: "Diamond", color: "text-purple-500" }
    if (level >= 15) return { name: "Platinum", color: "text-blue-500" }
    if (level >= 10) return { name: "Gold", color: "text-yellow-500" }
    if (level >= 5) return { name: "Silver", color: "text-gray-500" }
    return { name: "Bronze", color: "text-orange-600" }
  }, [currentLevel])

  // Check if user has achievement
  const hasAchievement = useCallback(
    (achievementId) => {
      return achievements.some(
        (achievement) => achievement.id === achievementId || achievement.achievement_id === achievementId,
      )
    },
    [achievements],
  )

  // Streak bonus multiplier
  const getStreakBonus = useCallback(() => {
    const days = streakDays // Use streakDays from Redux
    if (days >= 100) return 3.0
    if (days >= 60) return 2.5
    if (days >= 30) return 2.0
    if (days >= 14) return 1.5
    if (days >= 7) return 1.2
    return 1.0
  }, [streakDays])

  // Check if user is currently on a streak
  const isOnStreak = useCallback(() => {
    return streakDays > 0
  }, [streakDays])

  // Days until next streak milestone
  const getDaysUntilStreakMilestone = useCallback(() => {
    const days = streakDays // Use streakDays from Redux
    const milestones = [7, 14, 30, 60, 100, 200, 365]
    const nextMilestone = milestones.find((milestone) => milestone > days)
    return nextMilestone || null
  }, [streakDays])

  // UI control functions (dispatch slice actions)
  const showLevelUpModal = useCallback(() => dispatch(setShowLevelUpModal(true)), [dispatch])
  const hideLevelUpModal = useCallback(() => dispatch(setShowLevelUpModal(false)), [dispatch])
  const showAchievementModal = useCallback(() => dispatch(setShowAchievementModal(true)), [dispatch])
  const hideAchievementModal = useCallback(() => dispatch(setShowAchievementModal(false)), [dispatch])

  // Product-specific functions (use addXP)
  const addTalkXP = useCallback(
    (amount = 10, metadata = {}) => addXP(XP_ACTIVITIES.TALK_CHAT, amount, metadata),
    [addXP],
  )
  const addDramaXP = useCallback(
    (amount = 15, metadata = {}) => addXP(XP_ACTIVITIES.DRAMA_SENTENCE_COMPLETE, amount, metadata),
    [addXP],
  )
  const addTestXP = useCallback(
    (amount = 20, metadata = {}) => addXP(XP_ACTIVITIES.TEST_QUIZ_COMPLETE, amount, metadata),
    [addXP],
  )
  const addJourneyXP = useCallback(
    (amount = 12, metadata = {}) => addXP(XP_ACTIVITIES.JOURNEY_READING_COMPLETE, amount, metadata),
    [addXP],
  )
  const addDailyLoginXP = useCallback(() => addXP(XP_ACTIVITIES.DAILY_LOGIN, 5), [addXP])

  // Auto-refresh every 30 seconds if the page is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && isInitialized) {
        refreshStats()
        refreshLeaderboard(currentLeague) // Also update leaderboard
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [isInitialized, refreshStats, refreshLeaderboard, currentLeague])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Main states (read directly from Redux)
    totalXP,
    currentLevel,
    streakDays,
    currentLeague,
    achievements,
    leaderboard,
    userRank,

    // Control states
    isLoading,
    isInitialized,
    syncError,
    // backendData no longer needed as local state since Redux is the source of truth
    // lastFetch no longer needed as local state

    // Calculated values
    xpToNextLevel: xpToNextLevelValue,
    levelProgress: levelProgressValue,

    // Main functions
    addXP,
    updateStreakDays,
    unlockBadge,
    refreshStats,
    refreshLeaderboard,
    fetchBackendData, // Still useful to force initial fetch or debug

    // Product-specific functions
    addTalkXP,
    addDramaXP,
    addTestXP,
    addJourneyXP,
    addDailyLoginXP,

    // UI functions
    showLevelUpModal,
    hideLevelUpModal,
    showAchievementModal,
    hideAchievementModal,

    // Utilities
    getXPToNextLevel,
    getCurrentLevelProgress,
    getLeagueInfo,
    hasAchievement,
    getStreakBonus,
    isOnStreak,
    getDaysUntilStreakMilestone,
    calculateLevel,

    // Cleanup functions
    clearGamificationErrors: () => dispatch(clearErrors()),
    resetGamificationStates: () => dispatch(resetSuccessStates()),
  }
}

export default useGamification
