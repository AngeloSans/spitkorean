// src/store/slices/testSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getTestQuestions, submitTestAnswers, getTestResults, getTestUsage } from '../../api/test';

/**
 * TOPIK 문제 조회 비동기 액션
 */
export const fetchTestQuestions = createAsyncThunk(
  'test/fetchQuestions',
  async ({ level = 3, count = 10, type = 'mixed' }, { rejectWithValue }) => {
    try {
      const response = await getTestQuestions(level, count, type);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '문제를 불러오는데 실패했습니다.');
    }
  }
);

/**
 * 테스트 답안 제출 비동기 액션
 */
export const submitTest = createAsyncThunk(
  'test/submitTest',
  async ({ test_id, answers, timeSpent }, { rejectWithValue }) => {
    try {
      const response = await submitTestAnswers({ test_id, answers });
      // 응답에 소요 시간 추가
      return { ...response.data, timeSpent };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '답안 제출에 실패했습니다.');
    }
  }
);

/**
 * 테스트 결과 조회 비동기 액션
 */
export const fetchTestResults = createAsyncThunk(
  'test/fetchResults',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getTestResults();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '결과를 불러오는데 실패했습니다.');
    }
  }
);

/**
 * 사용량 조회 비동기 액션
 */
export const fetchTestUsage = createAsyncThunk(
  'test/fetchUsage',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getTestUsage();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '사용량 정보를 불러오는데 실패했습니다.');
    }
  }
);

const initialState = {
  // 현재 세션 상태
  currentSession: {
    testId: null,
    questions: [],
    currentQuestionIndex: 0,
    answers: {}, // { questionId: selectedOptionIndex }
    bookmarkedQuestions: [],
    timeRemaining: null,
    isActive: false,
    level: 3,
    type: 'mixed',
    count: 10
  },
  
  // 퀴즈 설정
  settings: {
    selectedLevel: 3,
    selectedType: 'mixed',
    questionCount: 10,
    timeLimit: 1800, // 30분 (초)
    autoSubmit: true,
    showExplanations: true
  },
  
  // 제출 관련
  submission: {
    isSubmitting: false,
    lastResult: null,
    error: null
  },
  
  // 결과 및 통계
  results: {
    list: [],
    stats: null,
    loading: false,
    error: null
  },
  
  // 사용량 정보
  usage: {
    hasSubscription: false,
    dailyLimit: 0,
    remaining: 0,
    resetAt: null,
    loading: false,
    error: null
  },
  
  // 진행률 추적
  progress: {
    totalQuestionsAnswered: 0,
    streakDays: 0,
    averageScore: 0,
    bestScore: 0,
    completionRate: 0,
    weeklyProgress: 0,
    levelProgress: {}, // { level: { count, avgScore } }
    typeProgress: {}, // { type: { count, avgScore } }
    weaknesses: []
  },
  
  // UI 상태
  ui: {
    loading: false,
    error: null,
    showResults: false,
    expandedExplanations: {},
    sidebarOpen: true,
    currentView: 'home' // 'home', 'quiz', 'results', 'statistics'
  }
};

const testSlice = createSlice({
  name: 'test',
  initialState,
  reducers: {
    // 세션 관리
    startSession: (state, action) => {
      const { level, type, count, timeLimit } = action.payload;
      state.currentSession = {
        ...initialState.currentSession,
        level,
        type,
        count,
        timeRemaining: timeLimit || state.settings.timeLimit,
        isActive: true
      };
      state.ui.currentView = 'quiz';
    },
    
    endSession: (state) => {
      state.currentSession = initialState.currentSession;
      state.ui.currentView = 'home';
    },
    
    // 문제 네비게이션
    setCurrentQuestion: (state, action) => {
      const index = action.payload;
      if (index >= 0 && index < state.currentSession.questions.length) {
        state.currentSession.currentQuestionIndex = index;
      }
    },
    
    goToNextQuestion: (state) => {
      const currentIndex = state.currentSession.currentQuestionIndex;
      const maxIndex = state.currentSession.questions.length - 1;
      if (currentIndex < maxIndex) {
        state.currentSession.currentQuestionIndex = currentIndex + 1;
      }
    },
    
    goToPreviousQuestion: (state) => {
      const currentIndex = state.currentSession.currentQuestionIndex;
      if (currentIndex > 0) {
        state.currentSession.currentQuestionIndex = currentIndex - 1;
      }
    },
    
    // 답안 관리
    selectAnswer: (state, action) => {
      const { questionId, optionIndex } = action.payload;
      state.currentSession.answers[questionId] = optionIndex;
      
      // 자동으로 다음 문제로 이동 (설정에 따라)
      if (state.settings.autoAdvance) {
        const currentIndex = state.currentSession.currentQuestionIndex;
        const maxIndex = state.currentSession.questions.length - 1;
        if (currentIndex < maxIndex) {
          state.currentSession.currentQuestionIndex = currentIndex + 1;
        }
      }
    },
    
    clearAnswer: (state, action) => {
      const questionId = action.payload;
      delete state.currentSession.answers[questionId];
    },
    
    clearAllAnswers: (state) => {
      state.currentSession.answers = {};
    },
    
    // 북마크 관리
    toggleBookmark: (state, action) => {
      const questionId = action.payload;
      const bookmarks = state.currentSession.bookmarkedQuestions.indexOf(questionId);
      
      if (index != 1) {
        state.currentSession.bookmarkedQuestions.splice(index, 1);
      } else {
        state.currentSession.bookmarkedQuestions.push(questionId);
      }
    },
    
    clearBookmarks: (state) => {
      state.currentSession.bookmarkedQuestions = [];
    },
    
    // 타이머 관리
    updateTimer: (state, action) => {
      const timeRemaining = action.payload;
      state.currentSession.timeRemaining = Math.max(0, timeRemaining);
      
      // 시간 종료 시 자동 제출
      if (timeRemaining <= 0 && state.settings.autoSubmit) {
        state.currentSession.isActive = false;
      }
    },
    
    pauseTimer: (state) => {
      state.currentSession.timerPaused = true;
    },
    
    resumeTimer: (state) => {
      state.currentSession.timerPaused = false;
    },
    
    // 설정 변경
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    setSelectedLevel: (state, action) => {
      state.settings.selectedLevel = action.payload;
    },
    
    setSelectedType: (state, action) => {
      state.settings.selectedType = action.payload;
    },
    
    setQuestionCount: (state, action) => {
      state.settings.questionCount = action.payload;
    },
    
    // UI 상태 관리
    setCurrentView: (state, action) => {
      state.ui.currentView = action.payload;
    },
    
    toggleSidebar: (state) => {
      state.ui.sidebarOpen = !state.ui.sidebarOpen;
    },
    
    toggleExplanation: (state, action) => {
      const questionId = action.payload;
      state.ui.expandedExplanations[questionId] = !state.ui.expandedExplanations[questionId];
    },
    
    setError: (state, action) => {
      state.ui.error = action.payload;
    },
    
    clearError: (state) => {
      state.ui.error = null;
    },
    
    // 결과 관리
    showResults: (state) => {
      state.ui.showResults = true;
      state.ui.currentView = 'results';
    },
    
    hideResults: (state) => {
      state.ui.showResults = false;
    },
    
    // 진행률 업데이트
    updateProgress: (state, action) => {
      const { 
        totalAnswered, 
        averageScore, 
        bestScore, 
        completionRate, 
        levelProgress, 
        typeProgress,
        weaknesses 
      } = action.payload;
      
      state.progress = {
        ...state.progress,
        totalQuestionsAnswered: totalAnswered || state.progress.totalQuestionsAnswered,
        averageScore: averageScore || state.progress.averageScore,
        bestScore: Math.max(bestScore || 0, state.progress.bestScore),
        completionRate: completionRate || state.progress.completionRate,
        levelProgress: levelProgress || state.progress.levelProgress,
        typeProgress: typeProgress || state.progress.typeProgress,
        weaknesses: weaknesses || state.progress.weaknesses
      };
    },
    
    // 통계 초기화 (개발/테스트용)
    resetProgress: (state) => {
      state.progress = initialState.progress;
    },
    
    resetState: (state) => {
      return initialState;
    }
  },
  
  extraReducers: (builder) => {
    // 문제 조회
    builder
      .addCase(fetchTestQuestions.pending, (state) => {
        state.ui.loading = true;
        state.ui.error = null;
      })
      .addCase(fetchTestQuestions.fulfilled, (state, action) => {
        state.ui.loading = false;
        const { test, remaining_usage } = action.payload;
        
        // 문제 목록 설정
        state.currentSession.testId = test.test_id;
        state.currentSession.questions = test.questions;
        state.currentSession.level = test.level;
        state.currentSession.type = test.test_type;
        
        // 답안 초기화
        const answers = {};
        test.questions.forEach(q => {
          answers[q.id] = null;
        });
        state.currentSession.answers = answers;
        
        // 사용량 업데이트
        state.usage.remaining = remaining_usage;
      })
      .addCase(fetchTestQuestions.rejected, (state, action) => {
        state.ui.loading = false;
        state.ui.error = action.payload;
      });
    
    // 답안 제출
    builder
      .addCase(submitTest.pending, (state) => {
        state.submission.isSubmitting = true;
        state.submission.error = null;
      })
      .addCase(submitTest.fulfilled, (state, action) => {
        state.submission.isSubmitting = false;
        state.submission.lastResult = action.payload;
        state.currentSession.isActive = false;
        
        // 진행률 업데이트
        const result = action.payload;
        state.progress.totalQuestionsAnswered += result.total_questions;
        state.progress.bestScore = Math.max(result.score, state.progress.bestScore);
        
        // 사용량 감소
        state.usage.remaining = Math.max(0, state.usage.remaining - 1);
        
        // 결과 표시
        state.ui.showResults = true;
        state.ui.currentView = 'results';
      })
      .addCase(submitTest.rejected, (state, action) => {
        state.submission.isSubmitting = false;
        state.submission.error = action.payload;
      });
    
    // 테스트 결과 조회
    builder
      .addCase(fetchTestResults.pending, (state) => {
        state.results.loading = true;
        state.results.error = null;
      })
      .addCase(fetchTestResults.fulfilled, (state, action) => {
        state.results.loading = false;
        const { results, stats } = action.payload;
        
        state.results.list = results;
        state.results.stats = stats;
        
        // 진행률 통계 업데이트
        if (stats) {
          state.progress.averageScore = stats.average_score || 0;
          state.progress.weaknesses = stats.weaknesses || [];
          
          // 레벨별 통계
          if (stats.level_stats) {
            const levelProgress = {};
            stats.level_stats.forEach(stat => {
              levelProgress[stat.level] = {
                count: stat.tests_taken,
                avgScore: stat.average_score
              };
            });
            state.progress.levelProgress = levelProgress;
          }
          
          // 유형별 통계
          if (stats.type_stats) {
            const typeProgress = {};
            stats.type_stats.forEach(stat => {
              typeProgress[stat.type] = {
                count: stat.tests_taken,
                avgScore: stat.average_score
              };
            });
            state.progress.typeProgress = typeProgress;
          }
        }
      })
      .addCase(fetchTestResults.rejected, (state, action) => {
        state.results.loading = false;
        state.results.error = action.payload;
      });
    
    // 사용량 조회
    builder
      .addCase(fetchTestUsage.pending, (state) => {
        state.usage.loading = true;
        state.usage.error = null;
      })
      .addCase(fetchTestUsage.fulfilled, (state, action) => {
        state.usage.loading = false;
        const { has_subscription, daily_limit, remaining, reset_at } = action.payload;
        
        state.usage.hasSubscription = has_subscription;
        state.usage.dailyLimit = daily_limit;
        state.usage.remaining = remaining;
        state.usage.resetAt = reset_at;
      })
      .addCase(fetchTestUsage.rejected, (state, action) => {
        state.usage.loading = false;
        state.usage.error = action.payload;
      });
  }
});

// 액션 내보내기
export const {
  startSession,
  endSession,
  setCurrentQuestion,
  goToNextQuestion,
  goToPreviousQuestion,
  selectAnswer,
  clearAnswer,
  clearAllAnswers,
  toggleBookmark,
  clearBookmarks,
  updateTimer,
  pauseTimer,
  resumeTimer,
  updateSettings,
  setSelectedLevel,
  setSelectedType,
  setQuestionCount,
  setCurrentView,
  toggleSidebar,
  toggleExplanation,
  setError,
  clearError,
  showResults,
  hideResults,
  updateProgress,
  resetProgress,
  resetState
} = testSlice.actions;

// 셀렉터
export const selectCurrentQuestion = (state) => {
  const { questions, currentQuestionIndex } = state.test.currentSession;
  return questions[currentQuestionIndex] || null;
};

export const selectAnsweredQuestions = (state) => {
  const answers = state.test.currentSession.answers;
  return Object.values(answers).filter(answer => answer !== null).length;
};

export const selectUnansweredQuestions = (state) => {
  const { questions, answers } = state.test.currentSession;
  return questions.length - Object.values(answers).filter(answer => answer !== null).length;
};

export const selectProgressPercentage = (state) => {
  const { questions, answers } = state.test.currentSession;
  if (questions.length === 0) return 0;
  const answeredCount = Object.values(answers).filter(answer => answer !== null).length;
  return (answeredCount / questions.length) * 100;
};

export const selectCurrentAnswer = (state) => {
  const currentQuestion = selectCurrentQuestion(state);
  if (!currentQuestion) return null;
  return state.test.currentSession.answers[currentQuestion.id] || null;
};

export const selectIsBookmarked = (state, questionId) => {
  return state.test.currentSession.bookmarkedQuestions.has(questionId);
};

export const selectCanSubmit = (state) => {
  const { questions, answers, isActive } = state.test.currentSession;
  return isActive && questions.length > 0 && Object.keys(answers).length > 0;
};

export const selectRemainingUsage = (state) => {
  return state.test.usage.remaining;
};

export const selectHasSubscription = (state) => {
  return state.test.usage.hasSubscription;
};

export const selectSessionActive = (state) => {
  return state.test.currentSession.isActive;
};

export const selectTestStats = (state) => {
  return state.test.results.stats;
};

export const selectRecentResults = (state, limit = 5) => {
  return state.test.results.list.slice(0, limit);
};

export const selectWeaknesses = (state) => {
  return state.test.progress.weaknesses;
};
export const selectUsage = (state) => state.test.usage
// 리듀서 기본 내보내기
export default testSlice.reducer;