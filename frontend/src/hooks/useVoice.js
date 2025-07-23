// frontend/src/hooks/useVoice.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';

// Redux actions
import { setRecording, setMuted } from '@store/slices/talkSlice';
import { analyzePronunciation } from '@store/slices/feedbackSlice';

// User info
import { selectUser } from '@store/slices/authSlice';

/**
 * Unified voice processing hook
 * Manages WebRTC recording, Whisper recognition, TTS playback, and pronunciation analysis
 * Shared across Talk Like You Mean It, Korean Journey, etc.
 */
const useVoice = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  // Local states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [supportedFormats, setSupportedFormats] = useState([]);
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Settings
  const [voiceSettings, setVoiceSettings] = useState({
    sampleRate: 44100,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    ttsVoiceGender: 'female', // female, male
    ttsSpeed: 1.0, // 0.5 ~ 2.0
    ttsPitch: 0.0, // -20.0 ~ 20.0
    autoPlayTTS: false,
    recordingFormat: 'webm', // webm, mp4, wav
    maxRecordingTime: 60000, // 60 seconds
    minRecordingTime: 1000,  // 1 second
    pronunciationThreshold: 70 // pronunciation score threshold
  });

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const levelCheckIntervalRef = useRef(null);

  // Check browser support
  const checkBrowserSupport = useCallback(() => {
    const supported = {
      mediaRecorder: typeof MediaRecorder !== 'undefined',
      getUserMedia: navigator.mediaDevices && navigator.mediaDevices.getUserMedia,
      audioContext: typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined',
      speechSynthesis: 'speechSynthesis' in window
    };

    const isFullySupported = Object.values(supported).every(Boolean);
    setIsSupported(isFullySupported);

    if (!isFullySupported) {
      const missing = Object.entries(supported)
        .filter(([_, supported]) => !supported)
        .map(([feature]) => feature);
      
      setErrorMessage(`Browser does not support the following features: ${missing.join(', ')}`);
    }

    // Check supported MIME types
    const formats = ['webm', 'mp4', 'wav'].filter(format => {
      const mimeTypes = {
        webm: ['audio/webm', 'audio/webm;codecs=opus'],
        mp4: ['audio/mp4', 'audio/mp4;codecs=mp4a.40.2'],
        wav: ['audio/wav', 'audio/wave']
      };
      
      return mimeTypes[format].some(mimeType => 
        MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mimeType)
      );
    });

    setSupportedFormats(formats);
    
    return isFullySupported;
  }, []);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: voiceSettings.sampleRate,
          channelCount: voiceSettings.channelCount,
          echoCancellation: voiceSettings.echoCancellation,
          noiseSuppression: voiceSettings.noiseSuppression,
          autoGainControl: voiceSettings.autoGainControl
        }
      });

      // Immediately stop tracks after permission granted
      stream.getTracks().forEach(track => track.stop());
      
      toast.success('Microphone permission granted.');
      return true;
    } catch (error) {
      console.error('Microphone permission request failed:', error);
      
      let errorMsg = 'Please allow microphone access.';
      if (error.name === 'NotFoundError') {
        errorMsg = 'No microphone found.';
      } else if (error.name === 'NotAllowedError') {
        errorMsg = 'Microphone access denied.';
      } else if (error.name === 'NotReadableError') {
        errorMsg = 'Microphone is currently in use.';
      }
      
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      return false;
    }
  }, [voiceSettings]);

  // Start monitoring audio level
  const startAudioLevelMonitoring = useCallback((stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const checkLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const normalizedLevel = Math.min(average / 128, 1);
          
          setAudioLevel(normalizedLevel);
          
          levelCheckIntervalRef.current = requestAnimationFrame(checkLevel);
        }
      };
      
      checkLevel();
    } catch (error) {
      console.error('Failed to start audio level monitoring:', error);
    }
  }, [isRecording]);

  // Stop monitoring audio level
  const stopAudioLevelMonitoring = useCallback(() => {
    if (levelCheckIntervalRef.current) {
      cancelAnimationFrame(levelCheckIntervalRef.current);
      levelCheckIntervalRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setAudioLevel(0);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      toast.error('Voice recording is not supported by this browser.');
      return false;
    }

    if (isRecording) {
      toast.warn('Recording is already in progress.');
      return false;
    }

    try {
      setErrorMessage(null);
      setIsRecording(true);
      dispatch(setRecording(true));

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: voiceSettings.sampleRate,
          channelCount: voiceSettings.channelCount,
          echoCancellation: voiceSettings.echoCancellation,
          noiseSuppression: voiceSettings.noiseSuppression,
          autoGainControl: voiceSettings.autoGainControl
        }
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // Determine MIME type
      const format = voiceSettings.recordingFormat;
      const mimeTypes = {
        webm: ['audio/webm;codecs=opus', 'audio/webm'],
        mp4: ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'],
        wav: ['audio/wav', 'audio/wave']
      };

      let selectedMimeType = null;
      for (const mimeType of mimeTypes[format] || []) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error(`${format} format is not supported.`);
      }

      // Setup MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000
      });

      // Event listeners
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        setIsRecording(false);
        dispatch(setRecording(false));
        
        // Cleanup stream
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
        
        stopAudioLevelMonitoring();
        
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        setRecordingDuration(0);
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        toast.error('An error occurred during recording.');
        stopRecording();
      };

      // Start recording
      mediaRecorderRef.current.start(100); // collect data every 100ms

      // Start audio level monitoring
      startAudioLevelMonitoring(stream);

      // Recording duration timer
      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        const duration = Date.now() - startTime;
        setRecordingDuration(duration);
        
        // Check max recording time
        if (duration >= voiceSettings.maxRecordingTime) {
          stopRecording();
          toast.warn(`Reached max recording time (${voiceSettings.maxRecordingTime / 1000} seconds).`);
        }
      }, 100);

      toast.success('Recording started.');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      dispatch(setRecording(false));
      
      let errorMsg = 'Cannot start recording.';
      if (error.name === 'NotAllowedError') {
        errorMsg = 'Please allow microphone access.';
      } else if (error.name === 'NotFoundError') {
        errorMsg = 'No microphone found.';
      }
      
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      return false;
    }
  }, [isSupported, isRecording, voiceSettings, dispatch, startAudioLevelMonitoring, stopAudioLevelMonitoring]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!isRecording || !mediaRecorderRef.current) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const originalOnStop = mediaRecorderRef.current.onstop;
      
      mediaRecorderRef.current.onstop = async (event) => {
        // Call original onstop handler
        if (originalOnStop) {
          originalOnStop(event);
        }

        try {
          // Check minimum recording time
          if (recordingDuration < voiceSettings.minRecordingTime) {
            toast.warn(`Please record at least ${voiceSettings.minRecordingTime / 1000} seconds.`);
            resolve(null);
            return;
          }

          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current.mimeType
          });

          if (audioBlob.size === 0) {
            throw new Error('No recorded data available.');
          }

          toast.success(`Recording complete (${Math.round(recordingDuration / 1000)} seconds)`);
          resolve(audioBlob);
        } catch (error) {
          console.error('Failed to process recording:', error);
          toast.error('Failed to process recording.');
          reject(error);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording, recordingDuration, voiceSettings.minRecordingTime]);

  // Play TTS audio
  const playTTS = useCallback(async (text, options = {}) => {
    if (!text || !text.trim()) {
      toast.error('No text to play.');
      return false;
    }

    if (isPlayingTTS) {
      toast.warn('TTS is already playing.');
      return false;
    }

    try {
      setIsPlayingTTS(true);

      console.log('Sending token for TTS:', localStorage.getItem('auth_token'));

      // Call backend TTS API (tts_service.py)
      const response = await fetch('/api/v1/common/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token || localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          text: text.trim(),
          voice_gender: options.voiceGender || voiceSettings.ttsVoiceGender,
          speed: options.speed || voiceSettings.ttsSpeed,
          pitch: options.pitch || voiceSettings.ttsPitch,
          language: 'ko-KR'
        })
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const audioArrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        URL.revokeObjectURL(ttsAudioRef.current.src);
      }

      ttsAudioRef.current = new Audio(audioUrl);
      
      ttsAudioRef.current.onended = () => {
        setIsPlayingTTS(false);
        URL.revokeObjectURL(audioUrl);
      };

      ttsAudioRef.current.onerror = (error) => {
        console.error('TTS playback error:', error);
        setIsPlayingTTS(false);
        URL.revokeObjectURL(audioUrl);
        toast.error('Failed to play audio.');
      };

      await ttsAudioRef.current.play();
      return true;
    } catch (error) {
      console.error('Failed to play TTS:', error);
      setIsPlayingTTS(false);
      toast.error('Failed to play audio.');
      return false;
    }
  }, [isPlayingTTS, voiceSettings]);

  // Stop TTS playback
  const stopTTS = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
      setIsPlayingTTS(false);
    }
  }, []);

  // Pronunciation analysis (used in Korean Journey, Talk)
  const analyzePronunciationAudio = useCallback(async (audioBlob, originalText, level = 'beginner') => {
    if (!audioBlob || !originalText) {
      toast.error('No data to analyze.');
      return null;
    }

    try {
      setIsProcessing(true);

      // Call backend pronunciation analysis API (whisper_service.py)
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('original_text', originalText);
      formData.append('level', level);

      const response = await fetch('/api/v1/journey/pronunciation-analysis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Pronunciation analysis API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        const analysisData = result.data;

        // Save analysis to Redux
        await dispatch(analyzePronunciation({
          originalText,
          transcribedText: analysisData.transcribed_text,
          pronunciationScore: analysisData.pronunciation_score,
          level,
          nativeLanguage: user?.profile?.nativeLanguage || 'en'
        })).unwrap();

        // Feedback based on score
        if (analysisData.pronunciation_score >= voiceSettings.pronunciationThreshold) {
          toast.success(`Great pronunciation! (${analysisData.pronunciation_score} points)`);
        } else {
          toast(`Try improving your pronunciation. (${analysisData.pronunciation_score} points)`, {
            icon: '💪',
            duration: 3000
          });
        }

        return {
          score: analysisData.pronunciation_score,
          transcribedText: analysisData.transcribed_text,
          analysis: analysisData.detailed_analysis,
          improvements: analysisData.improvement_suggestions
        };
      } else {
        throw new Error(result.message || 'Pronunciation analysis failed.');
      }
    } catch (error) {
      console.error('Pronunciation analysis failed:', error);
      toast.error('Pronunciation analysis failed.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch, user, voiceSettings.pronunciationThreshold]);

  // Update voice settings
  const updateVoiceSettings = useCallback((newSettings) => {
    setVoiceSettings(prev => ({ ...prev, ...newSettings }));
    
    if (newSettings.ttsVoiceGender) {
      toast.success(`Voice gender changed to ${newSettings.ttsVoiceGender === 'female' ? 'female' : 'male'}.`);
    }
  }, []);

  // Reset voice settings
  const resetVoiceSettings = useCallback(() => {
    setVoiceSettings({
      sampleRate: 44100,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ttsVoiceGender: 'female',
      ttsSpeed: 1.0,
      ttsPitch: 0.0,
      autoPlayTTS: false,
      recordingFormat: 'webm',
      maxRecordingTime: 60000,
      minRecordingTime: 1000,
      pronunciationThreshold: 70
    });
    
    toast.success('Voice settings have been reset.');
  }, []);

  // Microphone test
  const testMicrophone = useCallback(async () => {
    try {
      toast.loading('Testing microphone...');
      
      const success = await startRecording();
      if (success) {
        // Auto stop after 3 seconds
        setTimeout(async () => {
          const audioBlob = await stopRecording();
          if (audioBlob) {
            toast.success('Microphone is working properly!');
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Microphone test failed:', error);
      toast.error('Microphone test failed.');
    }
  }, [startRecording, stopRecording]);

  // Cleanup and initialization
  useEffect(() => {
    checkBrowserSupport();

    return () => {
      // Cleanup
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        if (ttsAudioRef.current.src) {
          URL.revokeObjectURL(ttsAudioRef.current.src);
        }
      }
      
      stopAudioLevelMonitoring();
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      setIsRecording(false);
      dispatch(setRecording(false));
    };
  }, [checkBrowserSupport, isRecording, dispatch, stopAudioLevelMonitoring]);

  return {
    // States
    isRecording,
    isProcessing,
    isPlayingTTS,
    audioLevel,
    recordingDuration,
    supportedFormats,
    isSupported,
    errorMessage,
    voiceSettings,
    
    // Recording controls
    startRecording,
    stopRecording,
    requestMicrophonePermission,
    testMicrophone,
    
    // TTS controls
    playTTS,
    stopTTS,
    
    // Pronunciation analysis
    analyzePronunciationAudio,
    
    // Settings management
    updateVoiceSettings,
    resetVoiceSettings,
    
    // Utilities
    checkBrowserSupport,
    
    // Calculated values
    recordingProgress: Math.min((recordingDuration / voiceSettings.maxRecordingTime) * 100, 100),
    formattedDuration: `${Math.floor(recordingDuration / 1000)}:${String(Math.floor((recordingDuration % 1000) / 10)).padStart(2, '0')}`,
    canRecord: isSupported && !isRecording && !isProcessing,
    canPlayTTS: isSupported && !isPlayingTTS,
    audioLevelPercent: Math.round(audioLevel * 100)
  };
};

export default useVoice;
