import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { gamificationAPI, gamificationEvents } from "@api/gamification"
import toast from "react-hot-toast"

// Level configuration (duplicated here to ensure slice has access)
const LEVEL_CONFIG = {
  levelRequirements: [
    0, // Level 0
    100, // Level 1
    250, // Level 2
    450, // Level 3
    700, // Level 4
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
    10450, // Level 19
    11500, // Level 20
  ],
  calculateHighLevelXP: (level) => {
    if (level <= 20) return LEVEL_CONFIG.levelRequirements[level] || 0
    const baseXP = 11500
    const multiplier = Math.pow(1.2, level - 20)
    return Math.floor(baseXP * multiplier)
  },
}

// Level calculation function (for internal slice use)
const calculateLevelFromXP = (xp) => {
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
}

// Async actions
export const updateXP = createAsyncThunk(
  "gamification/updateXP",
  async ({ activity, amount, metadata }, { rejectWithValue, getState }) => {
    try {
      const response = await gamificationAPI.updateXP({ activity, amount, metadata })

      if (response.status === "success") {
        gamificationEvents.emitXPGain(response.data)

        // Show XP gain toast
        if (amount > 0) {
          toast.success(`🎉 Gained ${amount} XP!`, {
            icon: "⭐",
            duration: 2000,
            style: {
              background: "#FEF3C7",
              color: "#92400E",
            },
          })
        }

        return response.data
      }

      return rejectWithValue(response.message || "Failed to update XP.")
    } catch (error) {
      return rejectWithValue(error.message || "Error occurred while updating XP.")
    }
  },
)

export const updateStreak = createAsyncThunk("gamification/updateStreak", async (_, { rejectWithValue }) => {
  try {
    const response = await gamificationAPI.updateStreak()

    if (response.status === "success") {
      const { streak_days, is_milestone } = response.data

      gamificationEvents.emitStreakUpdate(response.data)

      // Streak toast notifications
      if (streak_days === 1) {
        toast.success("🔥 Streak started!", { duration: 2000 })
      } else if (is_milestone) {
        toast.success(`🏆 Achieved ${streak_days} days streak!`, {
          icon: "🔥",
          duration: 3000,
          style: {
            background: "#FEE2E2",
            color: "#991B1B",
          },
        })
      } else {
        toast.success(`🔥 ${streak_days} days streak!`, { duration: 1500 })
      }

      return response.data
    }

    return rejectWithValue(response.message || "Failed to update streak.")
  } catch (error) {
    return rejectWithValue(error.message || "Error occurred while updating streak.")
  }
})

export const fetchLeaderboard = createAsyncThunk(
  "gamification/fetchLeaderboard",
  async ({ league, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await gamificationAPI.getLeaderboard({ league, limit })

      if (response.status === "success") {
        return response.data
      }

      return rejectWithValue(response.message || "Failed to fetch leaderboard.")
    } catch (error) {
      return rejectWithValue(error.message || "Error occurred while fetching leaderboard.")
    }
  },
)

export const fetchUserStats = createAsyncThunk("gamification/fetchUserStats", async (_, { rejectWithValue }) => {
  try {
    const response = await gamificationAPI.getUserStats()

    if (response.status === "success") {
      return response.data
    }

    return rejectWithValue(response.message || "Failed to fetch user stats.")
  } catch (error) {
    return rejectWithValue(error.message || "Error occurred while fetching user stats.")
  }
})

export const unlockAchievement = createAsyncThunk(
  "gamification/unlockAchievement",
  async ({ achievementId }, { rejectWithValue }) => {
    try {
      const response = await gamificationAPI.unlockAchievement({ achievementId })

      if (response.status === "success") {
        const achievement = response.data.achievement

        gamificationEvents.emitAchievementUnlock(achievement)

        // Achievement unlocked toast
        toast.success(`🏅 New badge: ${achievement.name}`, {
          icon: "🎖️",
          duration: 4000,
          style: {
            background: "#D1FAE5",
            color: "#065F46",
          },
        })

        return response.data
      }

      return rejectWithValue(response.message || "Failed to unlock achievement.")
    } catch (error) {
      return rejectWithValue(error.message || "Error occurred while unlocking achievement.")
    }
  },
)

export const checkLevelUp = createAsyncThunk("gamification/checkLevelUp", async (_, { rejectWithValue, getState }) => {
  try {
    const state = getState()
    const currentXP = state.gamification.totalXP

    const response = await gamificationAPI.checkLevelUp({ currentXP })

    if (response.status === "success" && response.data.leveled_up) {
      const { new_level, new_league } = response.data

      gamificationEvents.emitLevelUp(response.data)

      // Level up toast
      toast.success(`🎊 Level ${new_level} reached!`, {
        icon: "🌟",
        duration: 5000,
        style: {
          background: "#EDE9FE",
          color: "#5B21B6",
        },
      })

      // League promotion toast
      if (new_league) {
        toast.success(`👑 Promoted to ${new_league} league!`, {
          icon: "🏆",
          duration: 5000,
          style: {
            background: "#FEF3C7",
            color: "#92400E",
          },
        })
      }

      return response.data
    }

    return { leveled_up: false }
  } catch (error) {
    return rejectWithValue(error.message || "Error occurred while checking level up.")
  }
})

// Initial state
const initialState = {
  // User gamification data
  totalXP: 0,
  weeklyXP: 0,
  currentLevel: 1,
  currentLeague: "bronze",
  streakDays: 0,
  longestStreak: 0,

  // Badges and achievements
  achievements: [],
  unlockedAchievements: [],

  // Leaderboard
  leaderboard: [],
  userRank: null,

  // Statistics
  stats: {
    totalActivities: 0,
    totalStudyTime: 0,
    averageScore: 0,
    completedLessons: 0,
  },

  // Loading states
  isLoading: false,
  isXPUpdateLoading: false,
  isStreakUpdateLoading: false,
  isLeaderboardLoading: false,
  isStatsLoading: false,
  isAchievementLoading: false,
  isLevelCheckLoading: false,

  // Error states
  error: null,
  xpError: null,
  streakError: null,
  leaderboardError: null,
  statsError: null,
  achievementError: null,

  // Success states
  recentXPGain: null,
  recentAchievement: null,
  recentLevelUp: null,

  // Other
  lastActivityTime: null,
  dailyGoalProgress: 0,
  weeklyGoalProgress: 0,

  // UI states
  showXPAnimation: false,
  showLevelUpModal: false,
  showAchievementModal: false,
}

// Redux Slice
const gamificationSlice = createSlice({
  name: "gamification",
  initialState,
  reducers: {
    // Action to set backend data
    setFromBackend: (state, action) => {
      const { totalXP, currentLevel, streakDays, currentLeague, achievements, weeklyXP, lastActivityDate } =
        action.payload

      if (totalXP !== undefined) state.totalXP = totalXP
      if (currentLevel !== undefined) state.currentLevel = currentLevel
      if (streakDays !== undefined) state.streakDays = streakDays
      if (currentLeague !== undefined) state.currentLeague = currentLeague
      if (achievements !== undefined) state.achievements = achievements
      if (weeklyXP !== undefined) state.weeklyXP = weeklyXP
      if (lastActivityDate !== undefined) state.lastActivityDate = lastActivityDate

      state.error = null
    },

    // Clear errors
    clearErrors: (state) => {
      state.error = null
      state.xpError = null
      state.streakError = null
      state.leaderboardError = null
      state.statsError = null
      state.achievementError = null
    },

    // Reset success states
    resetSuccessStates: (state) => {
      state.recentXPGain = null
      state.recentAchievement = null
      state.recentLevelUp = null
    },

    // Update UI states
    setShowXPAnimation: (state, action) => {
      state.showXPAnimation = action.payload
    },

    setShowLevelUpModal: (state, action) => {
      state.showLevelUpModal = action.payload
    },

    setShowAchievementModal: (state, action) => {
      state.showAchievementModal = action.payload
    },

    // Update real-time data
    updateUserRank: (state, action) => {
      state.userRank = action.payload
    },

    updateDailyProgress: (state, action) => {
      state.dailyGoalProgress = action.payload
    },

    updateWeeklyProgress: (state, action) => {
      state.weeklyGoalProgress = action.payload
    },

    // Update last activity time
    setLastActivityTime: (state) => {
      state.lastActivityDate = new Date().toISOString()
    },

    // Temporary XP display (for animation)
    setTempXPGain: (state, action) => {
      state.recentXPGain = action.payload
      state.showXPAnimation = true
    },
  },

  extraReducers: (builder) => {
    // XP update
    builder
      .addCase(updateXP.pending, (state) => {
        state.isXPUpdateLoading = true
        state.xpError = null
      })
      .addCase(updateXP.fulfilled, (state, action) => {
        state.isXPUpdateLoading = false
        const data = action.payload

        state.totalXP = data.total_xp || data.totalXP
        state.weeklyXP = data.weekly_xp || data.weeklyXP
        // Calculate currentLevel based on received totalXP
        state.currentLevel = calculateLevelFromXP(state.totalXP)
        state.currentLeague = data.current_league || data.currentLeague
        state.recentXPGain = data.xp_gained || data.xpGained
        state.lastActivityTime = new Date().toISOString()
        state.xpError = null
      })
      .addCase(updateXP.rejected, (state, action) => {
        state.isXPUpdateLoading = false
        state.xpError = action.payload
      })

    // Streak update
    builder
      .addCase(updateStreak.pending, (state) => {
        state.isStreakUpdateLoading = true
        state.streakError = null
      })
      .addCase(updateStreak.fulfilled, (state, action) => {
        state.isStreakUpdateLoading = false
        const data = action.payload
        state.streakDays = data.streak_days || data.streakDays
        state.longestStreak = data.longest_streak || data.longestStreak
        state.lastActivityTime = new Date().toISOString()
        state.streakError = null
      })
      .addCase(updateStreak.rejected, (state, action) => {
        state.isStreakUpdateLoading = false
        state.streakError = action.payload
      })

    // Leaderboard fetch
    builder
      .addCase(fetchLeaderboard.pending, (state) => {
        state.isLeaderboardLoading = true
        state.leaderboardError = null
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.isLeaderboardLoading = false
        state.leaderboard = action.payload.leaderboard
        state.userRank = action.payload.user_rank
        state.leaderboardError = null
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.isLeaderboardLoading = false
        state.leaderboardError = action.payload
      })

    // User stats fetch
    builder
      .addCase(fetchUserStats.pending, (state) => {
        state.isStatsLoading = true
        state.statsError = null
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.isStatsLoading = false
        const data = action.payload

        state.totalXP = data.total_xp || data.totalXP
        state.weeklyXP = data.weekly_xp || data.weeklyXP
        // Calculate currentLevel based on received totalXP
        state.currentLevel = calculateLevelFromXP(state.totalXP)
        state.currentLeague = data.current_league || data.currentLeague
        state.streakDays = data.streak_days || data.streakDays
        state.longestStreak = data.longest_streak || data.longestStreak
        state.achievements = data.achievements || []
        state.unlockedAchievements = data.unlocked_achievements || data.unlockedAchievements || []
        state.stats = data.stats
        state.dailyGoalProgress = data.daily_progress
        state.weeklyGoalProgress = data.weekly_progress
        state.lastActivityTime = data.last_activity_date || data.lastActivityDate
        state.statsError = null
      })
      .addCase(fetchUserStats.rejected, (state, action) => {
        state.isStatsLoading = false
        state.statsError = action.payload
      })

    // Unlock achievement
    builder
      .addCase(unlockAchievement.pending, (state) => {
        state.isAchievementLoading = true
        state.achievementError = null
      })
      .addCase(unlockAchievement.fulfilled, (state, action) => {
        state.isAchievementLoading = false
        const data = action.payload
        state.unlockedAchievements.push(data.achievement)
        state.recentAchievement = data.achievement
        state.showAchievementModal = true
        state.achievementError = null
      })
      .addCase(unlockAchievement.rejected, (state, action) => {
        state.isAchievementLoading = false
        state.achievementError = action.payload
      })

    // Level check
    builder
      .addCase(checkLevelUp.pending, (state) => {
        state.isLevelCheckLoading = true
      })
      .addCase(checkLevelUp.fulfilled, (state, action) => {
        state.isLevelCheckLoading = false
        if (action.payload.leveled_up) {
          state.currentLevel = action.payload.new_level
          state.currentLeague = action.payload.new_league || state.currentLeague
          state.recentLevelUp = action.payload
          state.showLevelUpModal = true
        }
      })
      .addCase(checkLevelUp.rejected, (state, action) => {
        state.isLevelCheckLoading = false
      })
  },
})

// Export actions
export const {
  clearErrors,
  resetSuccessStates,
  setShowXPAnimation,
  setShowLevelUpModal,
  setShowAchievementModal,
  updateUserRank,
  updateDailyProgress,
  updateWeeklyProgress,
  setLastActivityTime,
  setTempXPGain,
} = gamificationSlice.actions

// Selectors
export const selectGamification = (state) => state.gamification
export const selectTotalXP = (state) => state.gamification.totalXP
export const selectCurrentLevel = (state) => state.gamification.currentLevel
export const selectCurrentLeague = (state) => state.gamification.currentLeague
export const selectStreakDays = (state) => state.gamification.streakDays
export const selectAchievements = (state) => state.gamification.unlockedAchievements
export const selectLeaderboard = (state) => state.gamification.leaderboard
export const selectUserRank = (state) => state.gamification.userRank
export const selectIsLoading = (state) => state.gamification.isLoading

// Export reducer
export default gamificationSlice.reducer
