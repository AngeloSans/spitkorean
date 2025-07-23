import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Square,
  Volume2,
  AlertCircle,
  CheckCircle,
  Settings,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

// 훅 import
import  useVoice from '../../hooks/useVoice';

// 컴포넌트 import
import Button from '../common/Buttom';

const VoiceRecorder = ({ 
  onVoiceMessage, 
  onRecordingChange, 
  disabled = false,
  isRecording: externalIsRecording = null, // 외부에서 제어하는 녹음 상태
  audioLevel: externalAudioLevel = null,   // 외부에서 전달받는 오디오 레벨
  showSettings = false,                    // 설정 버튼 표시 여부
  showPlayback = false,                    // 재생 버튼 표시 여부
  compact = false,                         // 컴팩트 모드
  className = '' 
}) => {
  // useVoice 훅 사용
  const {
    // 상태
    isRecording: hookIsRecording,
    isProcessing,
    audioLevel: hookAudioLevel,
    recordingDuration,
    isSupported,
    errorMessage,
    voiceSettings,
    
    // 액션들
    startRecording,
    stopRecording,
    requestMicrophonePermission,
    testMicrophone,
    updateVoiceSettings,
    
    // 계산된 값들
    recordingProgress,
    formattedDuration,
    canRecord,
    audioLevelPercent
  } = useVoice();

  // 로컬 상태
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [lastRecordingBlob, setLastRecordingBlob] = useState(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);

  // 녹음 상태 결정 (외부 제어가 있으면 우선, 없으면 훅 상태 사용)
  const currentIsRecording = externalIsRecording !== null ? externalIsRecording : hookIsRecording;
  
  // 오디오 레벨 결정 (외부 전달이 있으면 우선, 없으면 훅 상태 사용)
  const currentAudioLevel = externalAudioLevel !== null ? externalAudioLevel : hookAudioLevel;
  const currentAudioLevelPercent = externalAudioLevel !== null 
    ? Math.round(externalAudioLevel * 100) 
    : audioLevelPercent;

  // 녹음 상태 변경 알림
  useEffect(() => {
    if (onRecordingChange) {
      onRecordingChange(currentIsRecording);
    }
  }, [currentIsRecording, onRecordingChange]);

  // 녹음 시작 처리
  const handleStartRecording = useCallback(async () => {
    if (!isSupported) {
      toast.error('브라우저에서 음성 녹음을 지원하지 않습니다.');
      return;
    }

    if (!canRecord) {
      toast.error('현재 녹음할 수 없습니다.');
      return;
    }

    try {
      const success = await startRecording();
      if (success) {
        setLastRecordingBlob(null); // 이전 녹음 제거
      }
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      toast.error('녹음을 시작할 수 없습니다.');
    }
  }, [isSupported, canRecord, startRecording]);

  // 녹음 중지 처리
  const handleStopRecording = useCallback(async () => {
    try {
      const audioBlob = await stopRecording();
      
      if (audioBlob) {
        setLastRecordingBlob(audioBlob);
        
        // 부모 컴포넌트로 음성 데이터 전달
        if (onVoiceMessage) {
          await onVoiceMessage(audioBlob);
        }
      }
    } catch (error) {
      console.error('녹음 중지 실패:', error);
      toast.error('녹음 처리에 실패했습니다.');
    }
  }, [stopRecording, onVoiceMessage]);

  // 녹음 토글
  const toggleRecording = useCallback(() => {
    if (currentIsRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  }, [currentIsRecording, handleStartRecording, handleStopRecording]);

  // 마이크 권한 요청
  const handleRequestPermission = useCallback(async () => {
    const granted = await requestMicrophonePermission();
    if (granted) {
      toast.success('마이크 권한이 허용되었습니다.');
    }
  }, [requestMicrophonePermission]);

  // 마이크 테스트
  const handleTestMicrophone = useCallback(() => {
    testMicrophone();
  }, [testMicrophone]);

  // 재생 처리 (마지막 녹음)
  const handlePlayback = useCallback(() => {
    if (!lastRecordingBlob) {
      toast.error('재생할 녹음이 없습니다.');
      return;
    }

    try {
      setIsPlayingBack(true);
      
      const audioUrl = URL.createObjectURL(lastRecordingBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlayingBack(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlayingBack(false);
        URL.revokeObjectURL(audioUrl);
        toast.error('재생에 실패했습니다.');
      };
      
      audio.play();
    } catch (error) {
      setIsPlayingBack(false);
      toast.error('재생에 실패했습니다.');
    }
  }, [lastRecordingBlob]);

  // 음성 설정 업데이트
  const handleSettingsChange = useCallback((newSettings) => {
    updateVoiceSettings(newSettings);
    toast.success('설정이 업데이트되었습니다.');
  }, [updateVoiceSettings]);

  // 지원되지 않는 브라우저
  if (!isSupported) {
    return (
      <div className={`flex flex-col items-center p-2 ${className}`}>
        <Button
          variant="outline"
          size="sm"
          disabled
          className="p-3 text-gray-400 border-gray-300 cursor-not-allowed"
          title="브라우저에서 음성 녹음을 지원하지 않습니다"
        >
          <MicOff className="w-5 h-5" />
        </Button>
        <div className="text-xs text-red-500 mt-1 text-center">
          지원 안됨
        </div>
      </div>
    );
  }

  // 컴팩트 모드
  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Button
          variant={currentIsRecording ? "solid" : "outline"}
          size="sm"
          onClick={toggleRecording}
          disabled={disabled || isProcessing}
          className={`p-2 transition-all duration-200 ${
            currentIsRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white border-red-500 scale-110' 
              : 'border-gray-300 hover:border-blue-500 text-gray-600 hover:text-blue-600'
          }`}
          title={currentIsRecording ? '녹음 중지' : '음성 녹음 시작'}
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : currentIsRecording ? (
            <Square className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </Button>

        {/* 컴팩트 모드 상태 표시 */}
        {currentIsRecording && (
          <div className="text-xs text-red-600 font-mono">
            {formattedDuration}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      
      {/* 메인 녹음 버튼 */}
      <div className="relative">
        <Button
          variant={currentIsRecording ? "solid" : "outline"}
          size="sm"
          onClick={toggleRecording}
          disabled={disabled || isProcessing || !canRecord}
          className={`p-3 transition-all duration-200 ${
            currentIsRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white border-red-500 scale-110' 
              : disabled || !canRecord
              ? 'border-gray-300 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 hover:border-blue-500 text-gray-600 hover:text-blue-600'
          }`}
          title={
            !canRecord ? '녹음할 수 없습니다' :
            currentIsRecording ? '녹음 중지' : '음성 녹음 시작'
          }
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : currentIsRecording ? (
            <Square className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>

        {/* 볼륨/레벨 인디케이터 */}
        {currentIsRecording && currentAudioLevel > 0 && (
          <div 
            className="absolute inset-0 rounded-lg border-2 border-red-400 animate-ping" 
            style={{ 
              opacity: Math.min(currentAudioLevel, 0.8),
              animationDuration: `${Math.max(0.5, 2 - currentAudioLevel)}s`
            }} 
          />
        )}
      </div>

      {/* 부가 기능 버튼들 */}
      <div className="flex items-center space-x-2">
        {/* 재생 버튼 */}
        {showPlayback && lastRecordingBlob && !currentIsRecording && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayback}
            disabled={isPlayingBack}
            className="p-2 text-gray-500 hover:text-blue-600"
            title="마지막 녹음 재생"
          >
            {isPlayingBack ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        )}

        {/* 마이크 테스트 버튼 */}
        {!currentIsRecording && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTestMicrophone}
            className="p-2 text-gray-500 hover:text-green-600"
            title="마이크 테스트"
          >
            <Volume2 className="w-4 h-4" />
          </Button>
        )}

        {/* 설정 버튼 */}
        {showSettings && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className="p-2 text-gray-500 hover:text-blue-600"
            title="음성 설정"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}

        {/* 권한 요청 버튼 */}
        {!canRecord && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRequestPermission}
            className="p-2 text-gray-500 hover:text-orange-600"
            title="마이크 권한 요청"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 녹음 상태 표시 */}
      {currentIsRecording && (
        <div className="text-center space-y-2">
          {/* 시간 및 진행률 */}
          <div className="flex items-center space-x-2 text-xs text-red-600">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-mono">{formattedDuration}</span>
            <span>/</span>
            <span className="text-gray-500">
              {Math.floor(voiceSettings.maxRecordingTime / 1000)}초
            </span>
          </div>
          
          {/* 진행률 바 */}
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-200"
              style={{ width: `${recordingProgress}%` }}
            />
          </div>

          {/* 볼륨 레벨 */}
          <div className="space-y-1">
            <div className="text-xs text-gray-500">음성 레벨</div>
            <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-100"
                style={{ width: `${currentAudioLevelPercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 font-mono">
              {currentAudioLevelPercent}%
            </div>
          </div>
        </div>
      )}

      {/* 처리 중 상태 */}
      {isProcessing && !currentIsRecording && (
        <div className="text-xs text-blue-600 flex items-center space-x-1">
          <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>처리 중...</span>
        </div>
      )}

      {/* 에러 메시지 */}
      {errorMessage && (
        <div className="text-xs text-red-500 flex items-center space-x-1 max-w-32 text-center">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}

      {/* 성공 메시지 */}
      {!currentIsRecording && !isProcessing && !errorMessage && lastRecordingBlob && (
        <div className="text-xs text-green-600 flex items-center space-x-1">
          <CheckCircle className="w-3 h-3" />
          <span>전송됨</span>
        </div>
      )}

      {/* 음성 설정 패널 */}
      {showVoiceSettings && (
        <div className="bg-white border rounded-lg p-3 shadow-lg min-w-64 space-y-3">
          <div className="text-sm font-medium text-gray-700">음성 설정</div>
          
          {/* 녹음 형식 */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">녹음 형식</label>
            <select
              value={voiceSettings.recordingFormat}
              onChange={(e) => handleSettingsChange({ recordingFormat: e.target.value })}
              className="w-full px-2 py-1 border rounded text-xs"
            >
              <option value="webm">WebM (권장)</option>
              <option value="mp4">MP4</option>
              <option value="wav">WAV</option>
            </select>
          </div>

          {/* 최대 녹음 시간 */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              최대 녹음 시간: {Math.floor(voiceSettings.maxRecordingTime / 1000)}초
            </label>
            <input
              type="range"
              min="10000"
              max="300000"
              step="5000"
              value={voiceSettings.maxRecordingTime}
              onChange={(e) => handleSettingsChange({ maxRecordingTime: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* 발음 임계값 */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              발음 임계값: {voiceSettings.pronunciationThreshold}점
            </label>
            <input
              type="range"
              min="50"
              max="90"
              step="5"
              value={voiceSettings.pronunciationThreshold}
              onChange={(e) => handleSettingsChange({ pronunciationThreshold: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* 노이즈 억제 */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">노이즈 억제</label>
            <input
              type="checkbox"
              checked={voiceSettings.noiseSuppression}
              onChange={(e) => handleSettingsChange({ noiseSuppression: e.target.checked })}
              className="rounded"
            />
          </div>

          {/* 에코 제거 */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">에코 제거</label>
            <input
              type="checkbox"
              checked={voiceSettings.echoCancellation}
              onChange={(e) => handleSettingsChange({ echoCancellation: e.target.checked })}
              className="rounded"
            />
          </div>
        </div>
      )}

      {/* 도움말 텍스트 */}
      {!currentIsRecording && !isProcessing && (
        <div className="text-xs text-gray-400 text-center max-w-24">
          {!canRecord ? '권한 필요' : '클릭하여 녹음'}
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;