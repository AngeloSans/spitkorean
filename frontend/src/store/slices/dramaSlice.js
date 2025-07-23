import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { getDramaSentences, checkSentence, getDramaProgress, getDramaUsage } from "../../api/drama"

export const fetchDramaSentences = createAsyncThunk(
  "drama/fetchSentences",
  async ({ level = "beginner" }, { rejectWithValue, getState }) => {
    try {
      // Verificar se o usuário está autenticado
      const { auth } = getState()
      if (!auth.isAuthenticated || !auth.token) {
        return rejectWithValue("사용자 인증이 필요합니다. 다시 로그인해주세요.")
      }

      console.log("Fetching sentences for level:", level)

      const response = await getDramaSentences(level)

      console.log("Sentences fetched successfully:", response)

      return response
    } catch (error) {
      console.error("fetchDramaSentences error:", error)

      if (error.message.includes("인증")) {
        return rejectWithValue("인증 토큰이 만료되었습니다. 다시 로그인해주세요.")
      }

      if (error.message.includes("구독")) {
        return rejectWithValue("Drama Builder 구독이 필요합니다.")
      }

      if (error.message.includes("사용량")) {
        return rejectWithValue("오늘의 사용량을 초과했습니다.")
      }

      return rejectWithValue(error.message || "문장을 불러오는데 실패했습니다.")
    }
  },
)

export const submitSentenceAnswer = createAsyncThunk(
  "drama/checkSentence",
  async ({ sentence_id, drama_id, user_answer, level }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState()
      if (!auth.isAuthenticated || !auth.token) {
        return rejectWithValue("사용자 인증이 필요합니다. 다시 로그인해주세요.")
      }

      console.log("Submitting sentence answer:", { sentence_id, drama_id, user_answer, level })

      const response = await checkSentence({
        sentence_id,
        drama_id,
        user_answer,
        level,
      })

      console.log("Sentence answer submitted successfully:", response)

      return response
    } catch (error) {
      console.error("submitSentenceAnswer error:", error)

      if (error.message.includes("인증")) {
        return rejectWithValue("인증 토큰이 만료되었습니다. 다시 로그인해주세요.")
      }

      return rejectWithValue(error.message || "답안 확인에 실패했습니다.")
    }
  },
)

export const fetchDramaProgress = createAsyncThunk("drama/fetchProgress", async (_, { rejectWithValue, getState }) => {
  try {
    const { auth } = getState()
    if (!auth.isAuthenticated || !auth.token) {
      return rejectWithValue("사용자 인증이 필요합니다. 다시 로그인해주세요.")
    }

    console.log("Fetching drama progress")

    const response = await getDramaProgress()

    console.log("Drama progress fetched successfully:", response)

    return response
  } catch (error) {
    console.error("fetchDramaProgress error:", error)

    if (error.message.includes("인증")) {
      return rejectWithValue("인증 토큰이 만료되었습니다. 다시 로그인해주세요.")
    }

    return rejectWithValue(error.message || "진행 상황을 불러오는데 실패했습니다.")
  }
})

export const fetchDramaUsage = createAsyncThunk("drama/fetchUsage", async (_, { rejectWithValue, getState }) => {
  try {
    const { auth } = getState()
    if (!auth.isAuthenticated || !auth.token) {
      return rejectWithValue("사용자 인증이 필요합니다. 다시 로그인해주세요.")
    }

    console.log("Fetching drama usage")

    const response = await getDramaUsage()

    console.log("Drama usage fetched successfully:", response)

    return response
  } catch (error) {
    console.error("fetchDramaUsage error:", error)

    if (error.message.includes("인증")) {
      return rejectWithValue("인증 토큰이 만료되었습니다. 다시 로그인해주세요.")
    }

    return rejectWithValue(error.message || "사용량 정보를 불러오는데 실패했습니다.")
  }
})

// 초기 상태
const initialState = {
  // 문장 관련
  sentences: [],
  currentSentence: null,
  currentSentenceIndex: 0,
  // 문장 구성 상태 (SentenceBuilder)
  shuffledWords: [],
  userAnswer: [],
  isCorrect: null,
  showResult: false,
  showHint: false,
  // 답안 확인 결과
  similarSentences: [],
  grammarPoints: [],
  xpEarned: 0,
  // 세션 상태
  sessionActive: false,
  sessionScore: {
    correct: 0,
    total: 0,
    accuracy: 0,
  },
  // 진행 상황
  progress: {
    total_completed: 0,
    level_stats: {},
    daily_activity: [],
  },
  // 사용량 정보
  usage: {
    has_subscription: false,
    daily_limit: 20,
    remaining: 0,
    reset_at: null,
    source: "api",
  },
  // UI 상태
  loading: {
    sentences: false,
    checking: false,
    progress: false,
    usage: false,
  },
  error: {
    sentences: null,
    checking: null,
    progress: null,
    usage: null,
  },
  // 설정
  settings: {
    level: "beginner",
    autoPlay: true,
    showTranslation: true,
    hintEnabled: true,
  },
}

// 슬라이스 정의
const dramaSlice = createSlice({
  name: "drama",
  initialState,
  reducers: {
    // 문장 구성 관련 액션들
    setCurrentSentence: (state, action) => {
      const sentenceIndex = action.payload
      state.currentSentenceIndex = sentenceIndex
      if (state.sentences[sentenceIndex]) {
        state.currentSentence = state.sentences[sentenceIndex]
        // 문장 변경 시 구성 상태 초기화 - 직접 호출
        const sentence = state.currentSentence
        if (sentence?.content) {
          // 단어 분리 및 섞기
          const words = sentence.content
            .split(" ")
            .map((word, index) => ({
              id: index,
              text: word.trim(),
              originalIndex: index,
            }))
            .filter((word) => word.text.length > 0)
          // Fisher-Yates 셔플 알고리즘
          const shuffled = [...words]
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
          }
          state.shuffledWords = shuffled
          state.userAnswer = []
          state.isCorrect = null
          state.showResult = false
          state.showHint = false
          state.similarSentences = []
          state.grammarPoints = []
        }
      }
    },

    initializeSentenceBuilder: (state, action) => {
      // 🔧 FIX: action이 undefined일 수 있으므로 안전하게 처리
      const sentence = (action && action.payload) || state.currentSentence
      if (!sentence?.content) {
        console.warn("initializeSentenceBuilder: No sentence content available")
        return
      }
      // 단어 분리 및 섞기
      const words = sentence.content
        .split(" ")
        .map((word, index) => ({
          id: index,
          text: word.trim(),
          originalIndex: index,
        }))
        .filter((word) => word.text.length > 0)
      // Fisher-Yates 셔플 알고리즘
      const shuffled = [...words]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      state.shuffledWords = shuffled
      state.userAnswer = []
      state.isCorrect = null
      state.showResult = false
      state.showHint = false
    },

    resetSentenceBuilder: (state) => {
      if (!state.currentSentence?.content) {
        console.warn("resetSentenceBuilder: No current sentence available")
        return
      }
      const words = state.currentSentence.content
        .split(" ")
        .map((word, index) => ({
          id: index,
          text: word.trim(),
          originalIndex: index,
        }))
        .filter((word) => word.text.length > 0)
      state.shuffledWords = words
      state.userAnswer = []
      state.isCorrect = null
      state.showResult = false
      state.showHint = false
    },

    addWordToAnswer: (state, action) => {
      const word = action.payload
      state.userAnswer.push(word)
      state.shuffledWords = state.shuffledWords.filter((w) => w.id !== word.id)
    },

    removeWordFromAnswer: (state, action) => {
      const index = action.payload
      const word = state.userAnswer[index]
      if (word) {
        state.shuffledWords.push(word)
        state.userAnswer = state.userAnswer.filter((_, i) => i !== index)
      }
    },

    toggleHint: (state) => {
      state.showHint = !state.showHint
    },

    // 세션 관리
    startSession: (state) => {
      state.sessionActive = true
      state.sessionScore = { correct: 0, total: 0, accuracy: 0 }
      state.currentSentenceIndex = 0
    },

    endSession: (state) => {
      state.sessionActive = false
      // 최종 정확도 계산
      if (state.sessionScore.total > 0) {
        state.sessionScore.accuracy = Math.round((state.sessionScore.correct / state.sessionScore.total) * 100)
      }
    },

    updateSessionScore: (state, action) => {
      const { isCorrect } = action.payload
      state.sessionScore.total += 1
      if (isCorrect) {
        state.sessionScore.correct += 1
      }
      // 실시간 정확도 업데이트
      state.sessionScore.accuracy = Math.round((state.sessionScore.correct / state.sessionScore.total) * 100)
    },

    nextSentence: (state) => {
      if (state.currentSentenceIndex < state.sentences.length - 1) {
        state.currentSentenceIndex += 1
        // 직접 문장 설정 및 초기화
        if (state.sentences[state.currentSentenceIndex]) {
          state.currentSentence = state.sentences[state.currentSentenceIndex]
          // 문장 구성 초기화
          const sentence = state.currentSentence
          if (sentence?.content) {
            const words = sentence.content
              .split(" ")
              .map((word, index) => ({
                id: index,
                text: word.trim(),
                originalIndex: index,
              }))
              .filter((word) => word.text.length > 0)
            const shuffled = [...words]
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            state.shuffledWords = shuffled
            state.userAnswer = []
            state.isCorrect = null
            state.showResult = false
            state.showHint = false
            state.similarSentences = []
            state.grammarPoints = []
          }
        }
      }
    },

    previousSentence: (state) => {
      if (state.currentSentenceIndex > 0) {
        state.currentSentenceIndex -= 1
        // 직접 문장 설정 및 초기화
        if (state.sentences[state.currentSentenceIndex]) {
          state.currentSentence = state.sentences[state.currentSentenceIndex]
          // 문장 구성 초기화
          const sentence = state.currentSentence
          if (sentence?.content) {
            const words = sentence.content
              .split(" ")
              .map((word, index) => ({
                id: index,
                text: word.trim(),
                originalIndex: index,
              }))
              .filter((word) => word.text.length > 0)
            const shuffled = [...words]
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            state.shuffledWords = shuffled
            state.userAnswer = []
            state.isCorrect = null
            state.showResult = false
            state.showHint = false
            state.similarSentences = []
            state.grammarPoints = []
          }
        }
      }
    },

    // 설정 관리
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload }
    },

    setLevel: (state, action) => {
      state.settings.level = action.payload
      state.usage.source = "api"
    },

    // 에러 관리
    clearError: (state, action) => {
      const errorType = action.payload || "sentences"
      state.error[errorType] = null
    },

    clearAllErrors: (state) => {
      state.error = {
        sentences: null,
        checking: null,
        progress: null,
        usage: null,
      }
    },

    // 인증 에러 관리 - 새로 추가
    clearAuthError: (state) => {
      Object.keys(state.error).forEach((key) => {
        if (state.error[key]?.includes("인증") || state.error[key]?.includes("토큰")) {
          state.error[key] = null
        }
      })
    },

    setAuthError: (state, action) => {
      const errorMessage = action.payload
      Object.keys(state.error).forEach((key) => {
        state.error[key] = errorMessage
      })
    },

    // 상태 초기화
    resetDramaState: (state) => {
      // 로딩과 구독 상태는 유지하고 나머지만 초기화
      const { loading, usage } = state
      Object.assign(state, {
        ...initialState,
        loading,
        usage,
      })
    },
  },

  extraReducers: (builder) => {
    // 문장 목록 조회
    builder
      .addCase(fetchDramaSentences.pending, (state) => {
        state.loading.sentences = true
        state.error.sentences = null
      })
      .addCase(fetchDramaSentences.fulfilled, (state, action) => {
        state.loading.sentences = false
        state.sentences = action.payload.sentences || []
        state.currentSentenceIndex = 0
        // 첫 번째 문장 설정
        if (state.sentences.length > 0) {
          state.currentSentence = state.sentences[0]
          // 직접 초기화 (caseReducers 호출 대신)
          const sentence = state.currentSentence
          if (sentence?.content) {
            const words = sentence.content
              .split(" ")
              .map((word, index) => ({
                id: index,
                text: word.trim(),
                originalIndex: index,
              }))
              .filter((word) => word.text.length > 0)
            const shuffled = [...words]
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            state.shuffledWords = shuffled
            state.userAnswer = []
            state.isCorrect = null
            state.showResult = false
            state.showHint = false
            state.similarSentences = []
            state.grammarPoints = []
          }
        }
        // 사용량 정보 업데이트
        if (action.payload.remaining_usage !== undefined) {
          state.usage.remaining = action.payload.remaining_usage
        }
      })
      .addCase(fetchDramaSentences.rejected, (state, action) => {
        state.loading.sentences = false
        state.error.sentences = action.payload
        state.sentences = [] // Clear sentences on error
        state.usage.source = "error" // Indicate error source
      })

    // 답안 확인
    builder
      .addCase(submitSentenceAnswer.pending, (state) => {
        state.loading.checking = true
        state.error.checking = null
      })
      .addCase(submitSentenceAnswer.fulfilled, (state, action) => {
        state.loading.checking = false
        state.isCorrect = action.payload.is_correct
        state.similarSentences = action.payload.similar_sentences || []
        state.grammarPoints = action.payload.grammar_points || []
        state.xpEarned = action.payload.xp_earned || 0
        state.showResult = true
        // 세션 점수 업데이트
        if (state.sessionActive) {
          state.sessionScore.total += 1
          if (action.payload.is_correct) {
            state.sessionScore.correct += 1
          }
          state.sessionScore.accuracy = Math.round((state.sessionScore.correct / state.sessionScore.total) * 100)
        }
      })
      .addCase(submitSentenceAnswer.rejected, (state, action) => {
        state.loading.checking = false
        state.error.checking = action.payload
      })

    // 진행 상황 조회
    builder
      .addCase(fetchDramaProgress.pending, (state) => {
        state.loading.progress = true
        state.error.progress = null
      })
      .addCase(fetchDramaProgress.fulfilled, (state, action) => {
        state.loading.progress = false
        state.progress = action.payload
      })
      .addCase(fetchDramaProgress.rejected, (state, action) => {
        state.loading.progress = false
        state.error.progress = action.payload
      })

    // 사용량 조회
    builder
      .addCase(fetchDramaUsage.pending, (state) => {
        state.loading.usage = true
        state.error.usage = null
      })
      .addCase(fetchDramaUsage.fulfilled, (state, action) => {
        state.loading.usage = false
        state.usage = action.payload
      })
      .addCase(fetchDramaUsage.rejected, (state, action) => {
        state.loading.usage = false
        state.error.usage = action.payload
      })
  },
})

// 액션 내보내기 - clearAuthError와 setAuthError 추가
export const {
  setCurrentSentence,
  initializeSentenceBuilder,
  resetSentenceBuilder,
  addWordToAnswer,
  removeWordFromAnswer,
  toggleHint,
  startSession,
  endSession,
  updateSessionScore,
  nextSentence,
  previousSentence,
  updateSettings,
  setLevel,
  clearError,
  clearAllErrors,
  clearAuthError, // 새로 추가
  setAuthError, // 새로 추가
  resetDramaState,
} = dramaSlice.actions

// 셀렉터들
export const selectSentences = (state) => state.drama.sentences
export const selectCurrentSentence = (state) => state.drama.currentSentence
export const selectCurrentSentenceIndex = (state) => state.drama.currentSentenceIndex
export const selectShuffledWords = (state) => state.drama.shuffledWords
export const selectUserAnswer = (state) => state.drama.userAnswer
export const selectIsCorrect = (state) => state.drama.isCorrect
export const selectShowResult = (state) => state.drama.showResult
export const selectShowHint = (state) => state.drama.showHint
export const selectSimilarSentences = (state) => state.drama.similarSentences
export const selectGrammarPoints = (state) => state.drama.grammarPoints
export const selectXpEarned = (state) => state.drama.xpEarned
export const selectSessionActive = (state) => state.drama.sessionActive
export const selectSessionScore = (state) => state.drama.sessionScore
export const selectProgress = (state) => state.drama.progress
export const selectUsage = (state) => state.drama.usage
export const selectDramaLoading = (state) => state.drama.loading
export const selectDramaError = (state) => state.drama.error
export const selectDramaSettings = (state) => state.drama.settings

// 복합 셀렉터들
export const selectCanSubmitAnswer = (state) => {
  return state.drama.userAnswer.length > 0 && !state.drama.loading.checking && !state.drama.showResult
}

export const selectHasNextSentence = (state) => {
  return state.drama.currentSentenceIndex < state.drama.sentences.length - 1
}

export const selectHasPreviousSentence = (state) => {
  return state.drama.currentSentenceIndex > 0
}

export const selectSessionProgress = (state) => {
  const total = state.drama.sentences.length
  const current = state.drama.currentSentenceIndex + 1
  const progress = total > 0 ? (current / total) * 100 : 0
  return {
    current,
    total,
    progress: Math.round(progress),
  }
}

export const selectUsageInfo = (state) => {
  const usage = state.drama.usage
  const used = usage.daily_limit - usage.remaining
  const percentage = usage.daily_limit > 0 ? (used / usage.daily_limit) * 100 : 0
  return {
    used,
    remaining: usage.remaining,
    total: usage.daily_limit,
    percentage: Math.round(percentage),
    hasSubscription: usage.has_subscription,
    resetAt: usage.reset_at,
  }
}

// 리듀서 내보내기
export default dramaSlice.reducer
