import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  ArrowLeft, 
  RotateCcw, 
  Check, 
  X, 
  Lightbulb, 
  Volume2,
  Star,
  Trophy,
  Target,
  RefreshCw,
  BookOpen,
  Zap,
  ChevronLeft
} from 'lucide-react';

// 컴포넌트
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TranslatableText, { T } from '../../components/common/TranslatableText';
import SentenceBuilder from '../../components/drama/SentenceBuilder.jsx';
import GrammarTips from '../../components/drama/GrammarTips.jsx';

// Redux 액션
import { 
  fetchDramaSentences,
  startSession,
  endSession,
  nextSentence,
  previousSentence,
  resetDramaState,
  clearAllErrors,
  selectSentences,
  selectCurrentSentence,
  selectCurrentSentenceIndex,
  selectSessionActive,
  selectSessionScore,
  selectDramaLoading,
  selectDramaError,
  selectSessionProgress,
  selectHasNextSentence,
  selectHasPreviousSentence,
  selectGrammarPoints,
  selectIsCorrect,
  selectShowResult
} from '../../store/slices/dramaSlice.js';

// 상수
import { getDramaLevel } from '../../shared/constants/levels';

const SentencePractice = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { user } = useSelector(state => state.auth);
  
  // URL 파라미터
  const dramaId = searchParams.get('drama');
  const userLevel = user?.profile?.koreanLevel || 'beginner';
  const levelConfig = getDramaLevel(userLevel);
  
  // Redux 상태
  const sentences = useSelector(selectSentences);
  const currentSentence = useSelector(selectCurrentSentence);
  const currentSentenceIndex = useSelector(selectCurrentSentenceIndex);
  const sessionActive = useSelector(selectSessionActive);
  const sessionScore = useSelector(selectSessionScore);
  const loading = useSelector(selectDramaLoading);
  const error = useSelector(selectDramaError);
  const sessionProgress = useSelector(selectSessionProgress);
  const hasNextSentence = useSelector(selectHasNextSentence);
  const hasPreviousSentence = useSelector(selectHasPreviousSentence);
  const grammarPoints = useSelector(selectGrammarPoints);
  const isCorrect = useSelector(selectIsCorrect);
  const showResult = useSelector(selectShowResult);
  
  // 로컬 상태
  const [showGrammarTips, setShowGrammarTips] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    initializePracticeSession();
    
    // 컴포넌트 언마운트 시 세션 정리
    return () => {
      if (sessionActive) {
        dispatch(endSession());
      }
      dispatch(clearAllErrors());
    };
  }, []);

  // 문장 로드 후 세션 시작
  useEffect(() => {
    if (sentences.length > 0 && !sessionActive && !sessionCompleted) {
      dispatch(startSession());
    }
  }, [sentences, sessionActive, sessionCompleted, dispatch]);

  // 세션 완료 체크
  useEffect(() => {
    if (sessionActive && currentSentenceIndex >= sentences.length - 1 && showResult) {
      handleSessionComplete();
    }
  }, [sessionActive, currentSentenceIndex, sentences.length, showResult]);

  // 초기화 함수
  const initializePracticeSession = async () => {
    try {
      // 기존 상태 초기화
      dispatch(resetDramaState());
      
      // 문장 데이터 로드
      await dispatch(fetchDramaSentences({ level: userLevel })).unwrap();
      console.log("Resultado da busca de frases:", result);
    } catch (err) {
      console.error('Failed to initialize practice session:', err);
    }
  };

  // 세션 완료 처리
  const handleSessionComplete = () => {
    if (sessionCompleted) return;
    
    setSessionCompleted(true);
    dispatch(endSession());
    
    // 완료 후 잠시 대기 후 결과 페이지로 이동
    setTimeout(() => {
      navigate('/drama/progress', { 
        state: { 
          completedSession: {
            sentences: sentences.length,
            correct: sessionScore.correct,
            total: sessionScore.total,
            accuracy: sessionScore.accuracy,
            level: userLevel,
            drama_id: dramaId
          }
        }
      });
    }, 2000);
  };

  // 문장 연습 완료 핸들러
  const handlePracticeComplete = (userSentence, userAnswer) => {
    // 문법 팁 표시
    if (grammarPoints.length > 0) {
      setShowGrammarTips(true);
    }
    
    // 자동으로 다음 문장으로 이동 (3초 후)
    if (!sessionCompleted && hasNextSentence) {
      setTimeout(() => {
        handleNextSentence();
      }, 3000);
    }
  };

  // 다음 문장으로 이동
  const handleNextSentence = () => {
    if (hasNextSentence) {
      dispatch(nextSentence());
      setShowGrammarTips(false);
    } else {
      handleSessionComplete();
    }
  };

  // 이전 문장으로 이동
  const handlePreviousSentence = () => {
    if (hasPreviousSentence) {
      dispatch(previousSentence());
      setShowGrammarTips(false);
    }
  };

  // 세션 재시작
  const handleRestartSession = () => {
    setSessionCompleted(false);
    setShowGrammarTips(false);
    initializePracticeSession();
  };

  // 홈으로 돌아가기
  const handleGoHome = () => {
    if (sessionActive) {
      dispatch(endSession());
    }
    navigate('/drama');
  };

  // TTS 재생
  const speakSentence = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = userLevel === 'beginner' ? 0.7 : userLevel === 'intermediate' ? 0.9 : 1.0;
      speechSynthesis.speak(utterance);
    }
  };

  // 로딩 상태
  if (loading.sentences) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">
            <T>문장을 불러오는 중</T>...
          </p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error.sentences) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              <T>문제가 발생했습니다</T>
            </h3>
            <p className="text-gray-500 mb-4">
              <T>{error.sentences}</T>
            </p>
            <div className="space-y-2">
              <Button onClick={initializePracticeSession} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                <T>다시 시도</T>
              </Button>
              <Button variant="outline" onClick={handleGoHome} className="w-full">
                <T>Drama 홈으로</T>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 문장이 없는 경우
  if (sentences.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              <T>연습할 문장이 없습니다</T>
            </h3>
            <p className="text-gray-500 mb-4">
              <T>{levelConfig?.name}</T> <T>레벨에 맞는 문장을 준비 중입니다</T>.
            </p>
            <div className="space-y-2">
              <Button onClick={initializePracticeSession} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                <T>새로고침</T>
              </Button>
              <Button variant="outline" onClick={handleGoHome} className="w-full">
                <T>Drama 홈으로 돌아가기</T>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 세션 완료 화면
  if (sessionCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              <T>연습 완료</T>!
            </h3>
            <div className="space-y-2 mb-6">
              <p className="text-gray-600">
                <T>정확도</T>: <span className="font-bold text-green-600">{sessionScore.accuracy}%</span>
              </p>
              <p className="text-gray-600">
                <T>완료한 문장</T>: <span className="font-bold">{sessionScore.correct}/{sessionScore.total}</span>
              </p>
              {sessionScore.accuracy >= 80 && (
                <div className="flex items-center justify-center space-x-2 text-yellow-600 mt-4">
                  <Zap className="w-5 h-5" />
                  <span className="font-medium">
                    <T>우수한 성과입니다</T>! 🎉
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Button onClick={handleRestartSession} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                <T>다시 연습하기</T>
              </Button>
              <Button variant="outline" onClick={handleGoHome} className="w-full">
                <T>Drama 홈으로</T>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoHome}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <T>Drama 홈</T>
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  <T>문장 구성 연습</T>
                </h1>
                <p className="text-sm text-gray-600">
                  {currentSentence?.drama_title && (
                    <>
                      <T>{currentSentence.drama_title}</T> • 
                    </>
                  )}
                  <T>{levelConfig?.name}</T> <T>레벨</T>
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {sessionProgress.current} / {sessionProgress.total}
              </div>
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  {sessionScore.correct} / {sessionScore.total}
                </span>
                {sessionScore.total > 0 && (
                  <span className="text-sm text-gray-500">
                    ({sessionScore.accuracy}%)
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* 진행률 바 */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${sessionProgress.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 드라마 정보 (있는 경우) */}
        {currentSentence?.drama_title && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📺</div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    <T>{currentSentence.drama_title}</T>
                  </h3>
                  {currentSentence.translation && (
                    <p className="text-sm text-gray-600">
                      "<T>{currentSentence.translation}</T>"
                    </p>
                  )}
                </div>
              </div>
              
              {currentSentence.content && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => speakSentence(currentSentence.content)}
                  className="p-2"
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 메인 문장 구성 영역 */}
        <SentenceBuilder
          level={userLevel}
          onComplete={handlePracticeComplete}
          showActions={true}
        />

        {/* 네비게이션 */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePreviousSentence}
              disabled={!hasPreviousSentence}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <T>이전 문장</T>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleRestartSession}
                className="flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <T>처음부터</T>
              </Button>
              
              {showResult && (
                <Button
                  onClick={() => setShowGrammarTips(!showGrammarTips)}
                  variant={showGrammarTips ? "solid" : "outline"}
                  className="flex items-center space-x-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <T>{showGrammarTips ? '문법 숨기기' : '문법 보기'}</T>
                </Button>
              )}
            </div>
            
            <Button
              onClick={handleNextSentence}
              disabled={!hasNextSentence || !showResult}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
            >
              <T>{hasNextSentence ? '다음 문장' : '완료하기'}</T>
              {hasNextSentence ? (
                <ArrowLeft className="w-4 h-4 rotate-180" />
              ) : (
                <Trophy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 문법 가이드 */}
        {showGrammarTips && showResult && grammarPoints.length > 0 && (
          <GrammarTips
            grammarPoints={grammarPoints}
            level={userLevel}
            sentence={currentSentence?.content}
            userAnswer={""} // SentenceBuilder에서 제공되는 userAnswer 사용
            isCorrect={isCorrect}
            compact={false}
          />
        )}

        {/* 세션 통계 */}
        {sessionActive && sessionScore.total > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                <T>현재 세션</T>
              </h3>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span><T>정답</T>: {sessionScore.correct}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span><T>오답</T>: {sessionScore.total - sessionScore.correct}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span><T>정확도</T>: {sessionScore.accuracy}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 에러 표시 */}
        {error.checking && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              <T>{error.checking}</T>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentencePractice;