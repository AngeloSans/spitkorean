import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { getJourneyContent, submitJourneyReading, getJourneyProgress, getJourneyUsage } from "../../api/journey.js"

// Async actions (thunks)
/** * Fetch reading content */
export const fetchJourneyContent = createAsyncThunk(
  "journey/fetchContent",
  async ({ level = "level1", type = "reading" }, { rejectWithValue }) => {
    try {
      const response = await getJourneyContent(level, type)
      console.log("API Response in thunk:", response.data)

      // FIX: Return full structure
      return {
        ...response.data,
        level,
        type,
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to load content.")
    }
  },
)

/** * Submit reading result */
export const submitReading = createAsyncThunk("journey/submitReading", async (formData, { rejectWithValue }) => {
  try {
    const response = await submitJourneyReading(formData)
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to submit result.")
  }
})

/** * Fetch progress */
export const fetchProgress = createAsyncThunk("journey/fetchProgress", async (_, { rejectWithValue }) => {
  try {
    const response = await getJourneyProgress()
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to load progress.")
  }
})

/** * Fetch usage */
export const fetchUsage = createAsyncThunk("journey/fetchUsage", async (_, { rejectWithValue }) => {
  try {
    const response = await getJourneyUsage()
    return response.data
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to load usage information.")
  }
})

// Initial state
const initialState = {
  // Current content
  currentContent: null,
  contentLevel: "level1",
  contentType: "reading",

  // Reading session state
  session: {
    isActive: false,
    currentSentenceIndex: 0,
    completedSentences: [],
    startTime: null,
    totalSentences: 0,
  },

  // Playback controls
  playback: {
    isPlaying: false,
    speed: 1.0,
    volume: 1.0,
    isMuted: false,
    autoAdvance: true,
  },

  // Recording state
  recording: {
    isRecording: false,
    audioBlob: null,
    duration: 0,
  },

  // Pronunciation evaluation
  pronunciation: {
    currentScore: null,
    history: [],
    analysis: null,
    feedback: null,
  },

  // Progress tracking
  progress: {
    history: [],
    level_stats: {},
    date_stats: [],
    total_readings: 0,
    total_sentences: 0,
    avg_pronunciation: 0,
  },

  // Usage data
  usage: {
    has_subscription: false,
    daily_limit: 20,
    remaining: 0,
    reset_at: null,
  },

  // UI state
  ui: {
    showGuide: false,
    showTranslation: false,
    showJamo: false,
    showAdvancedControls: false,
    selectedCharacter: null,
  },

  // Loading & error states
  loading: {
    content: false,
    submit: false,
    progress: false,
    usage: false,
  },
  error: {
    content: null,
    submit: null,
    progress: null,
    usage: null,
  },
}

// Slice creation
const journeySlice = createSlice({
  name: "journey",
  initialState,
  reducers: {
    // Session management
    startSession: (state, action) => {
      const { content } = action.payload
      console.log("Starting session with content:", content)

      state.session = {
        isActive: true,
        currentSentenceIndex: 0,
        completedSentences: [],
        startTime: Date.now(),
        totalSentences: content?.content?.sentences?.length || 0,
      }
      state.pronunciation.currentScore = null
      state.pronunciation.analysis = null
    },

    endSession: (state) => {
      state.session.isActive = false
      state.playback.isPlaying = false
      state.recording.isRecording = false
    },

    // Sentence navigation
    setCurrentSentence: (state, action) => {
      state.session.currentSentenceIndex = action.payload
      state.pronunciation.currentScore = null
      state.pronunciation.analysis = null
    },

    goToNextSentence: (state) => {
      const maxIndex = state.session.totalSentences - 1
      if (state.session.currentSentenceIndex < maxIndex) {
        state.session.currentSentenceIndex += 1
        state.pronunciation.currentScore = null
        state.pronunciation.analysis = null
      }
    },

    goToPreviousSentence: (state) => {
      if (state.session.currentSentenceIndex > 0) {
        state.session.currentSentenceIndex -= 1
        state.pronunciation.currentScore = null
        state.pronunciation.analysis = null
      }
    },

    markSentenceCompleted: (state, action) => {
      const index = action.payload
      if (!state.session.completedSentences.includes(index)) {
        state.session.completedSentences.push(index)
      }
    },

    // Playback controls
    setPlaybackState: (state, action) => {
      state.playback.isPlaying = action.payload
    },

    setPlaybackSpeed: (state, action) => {
      state.playback.speed = action.payload
    },

    setVolume: (state, action) => {
      state.playback.volume = action.payload
      state.playback.isMuted = action.payload === 0
    },

    toggleMute: (state) => {
      state.playback.isMuted = !state.playback.isMuted
    },

    setAutoAdvance: (state, action) => {
      state.playback.autoAdvance = action.payload
    },

    // Recording management
    startRecording: (state) => {
      state.recording = {
        isRecording: true,
        audioBlob: null,
        duration: 0,
      }
    },

    stopRecording: (state, action) => {
      state.recording = {
        isRecording: false,
        audioBlob: action.payload.audioBlob,
        duration: action.payload.duration,
      }
    },

    clearRecording: (state) => {
      state.recording = {
        isRecording: false,
        audioBlob: null,
        duration: 0,
      }
    },

    // Pronunciation evaluation
    setPronunciationScore: (state, action) => {
      const { score, analysis, feedback } = action.payload
      state.pronunciation.currentScore = score
      state.pronunciation.analysis = analysis
      state.pronunciation.feedback = feedback

      state.pronunciation.history.push({
        score,
        timestamp: Date.now(),
        sentenceIndex: state.session.currentSentenceIndex,
      })

      if (state.pronunciation.history.length > 10) {
        state.pronunciation.history.shift()
      }
    },

    clearPronunciationData: (state) => {
      state.pronunciation.currentScore = null
      state.pronunciation.analysis = null
      state.pronunciation.feedback = null
    },

    // UI state management
    toggleGuide: (state) => {
      state.ui.showGuide = !state.ui.showGuide
    },

    toggleTranslation: (state) => {
      state.ui.showTranslation = !state.ui.showTranslation
    },

    toggleJamo: (state) => {
      state.ui.showJamo = !state.ui.showJamo
    },

    toggleAdvancedControls: (state) => {
      state.ui.showAdvancedControls = !state.ui.showAdvancedControls
    },

    setSelectedCharacter: (state, action) => {
      state.ui.selectedCharacter = action.payload
    },

    // Clear errors
    clearContentError: (state) => {
      state.error.content = null
    },

    clearSubmitError: (state) => {
      state.error.submit = null
    },

    clearProgressError: (state) => {
      state.error.progress = null
    },

    clearUsageError: (state) => {
      state.error.usage = null
    },

    // Reset all state
    resetJourneyState: () => initialState,

    // NEW: Manually set content (for testing)
    setContent: (state, action) => {
      console.log("Setting content directly:", action.payload)
      state.currentContent = action.payload
      state.loading.content = false
      state.error.content = null
    },
  },

  extraReducers: (builder) => {
    // Fetch content
    builder
      .addCase(fetchJourneyContent.pending, (state) => {
        state.loading.content = true
        state.error.content = null
      })
      .addCase(fetchJourneyContent.fulfilled, (state, action) => {
        console.log("fetchJourneyContent.fulfilled payload:", action.payload)
        state.loading.content = false

        // MAIN FIX: Properly process structure
        if (action.payload.content) {
          state.currentContent = action.payload.content
        } else {
          state.currentContent = action.payload
        }

        state.contentLevel = action.payload.level
        state.contentType = action.payload.type

        if (action.payload.remaining_usage !== undefined) {
          state.usage.remaining = action.payload.remaining_usage
        }

        console.log("Content set to:", state.currentContent)

        // Apply default settings by level
        const levelConfigs = {
          level1: { speed: 0.5, showJamo: true, autoAdvance: true },
          level2: { speed: 0.8, showJamo: false, autoAdvance: true },
          level3: { speed: 1.0, showJamo: false, autoAdvance: false },
          level4: { speed: 1.2, showJamo: false, autoAdvance: false },
        }

        const config = levelConfigs[action.payload.level] || levelConfigs.level1
        state.playback.speed = config.speed
        state.playback.autoAdvance = config.autoAdvance
        state.ui.showJamo = config.showJamo
      })
      .addCase(fetchJourneyContent.rejected, (state, action) => {
        state.loading.content = false
        state.error.content = action.payload
      })

    builder
      .addCase(submitReading.pending, (state) => {
        state.loading.submit = true
        state.error.submit = null
      })
      .addCase(submitReading.fulfilled, (state, action) => {
        state.loading.submit = false
        state.session.isActive = false
        state.playback.isPlaying = false
        state.recording.isRecording = false
        if (state.usage.remaining > 0) {
          state.usage.remaining -= 1
        }
      })
      .addCase(submitReading.rejected, (state, action) => {
        state.loading.submit = false
        state.error.submit = action.payload
      })

    builder
      .addCase(fetchProgress.pending, (state) => {
        state.loading.progress = true
        state.error.progress = null
      })
      .addCase(fetchProgress.fulfilled, (state, action) => {
        state.loading.progress = false
        state.progress = action.payload
      })
      .addCase(fetchProgress.rejected, (state, action) => {
        state.loading.progress = false
        state.error.progress = action.payload
      })

    builder
      .addCase(fetchUsage.pending, (state) => {
        state.loading.usage = true
        state.error.usage = null
      })
      .addCase(fetchUsage.fulfilled, (state, action) => {
        state.loading.usage = false
        state.usage = action.payload
      })
      .addCase(fetchUsage.rejected, (state, action) => {
        state.loading.usage = false
        state.error.usage = action.payload
      })
  },
})

export const {
  startSession,
  endSession,
  setCurrentSentence,
  goToNextSentence,
  goToPreviousSentence,
  markSentenceCompleted,
  setPlaybackState,
  setPlaybackSpeed,
  setVolume,
  toggleMute,
  setAutoAdvance,
  startRecording,
  stopRecording,
  clearRecording,
  setPronunciationScore,
  clearPronunciationData,
  toggleGuide,
  toggleTranslation,
  toggleJamo,
  toggleAdvancedControls,
  setSelectedCharacter,
  clearContentError,
  clearSubmitError,
  clearProgressError,
  clearUsageError,
  resetJourneyState,
  setContent,
} = journeySlice.actions

// Selectors
export const selectJourneyState = (state) => state.journey
export const selectCurrentContent = (state) => state.journey.currentContent
export const selectSession = (state) => state.journey.session
export const selectPlayback = (state) => state.journey.playback
export const selectRecording = (state) => state.journey.recording
export const selectPronunciation = (state) => state.journey.pronunciation
export const selectProgress = (state) => state.journey.progress
export const selectUsage = (state) => state.journey.usage
export const selectUI = (state) => state.journey.ui
export const selectLoading = (state) => state.journey.loading
export const selectErrors = (state) => state.journey.error

export const selectCurrentSentence = (state) => {
  const content = selectCurrentContent(state)
  const session = selectSession(state)

  console.log("selectCurrentSentence - content:", content)
  console.log("selectCurrentSentence - session:", session)

  const sentence =
    content?.content?.sentences?.[session.currentSentenceIndex] ||
    content?.sentences?.[session.currentSentenceIndex] ||
    null

  console.log("selectCurrentSentence - result:", sentence)
  return sentence
}

export const selectSessionProgress = (state) => {
  const session = selectSession(state)
  if (session.totalSentences === 0) return 0
  return (session.completedSentences.length / session.totalSentences) * 100
}

export const selectCanGoNext = (state) => {
  const session = selectSession(state)
  return session.currentSentenceIndex < session.totalSentences - 1
}

export const selectCanGoPrevious = (state) => {
  const session = selectSession(state)
  return session.currentSentenceIndex > 0
}

export const selectHasRemainingUsage = (state) => {
  const usage = selectUsage(state)
  return usage.remaining > 0
}

export const selectIsSessionComplete = (state) => {
  const session = selectSession(state)
  return session.completedSentences.length === session.totalSentences
}

export const selectAverageScore = (state) => {
  const history = selectPronunciation(state).history
  if (history.length === 0) return 0
  const sum = history.reduce((acc, item) => acc + item.score, 0)
  return Math.round(sum / history.length)
}

// Export reducer
export default journeySlice.reducer
