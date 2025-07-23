// src/components/journey/SpeedControl.jsx
import React, { useState, useEffect } from 'react';
import { 
  Gauge, 
  RotateCcw, 
  Zap,
  Turtle,
  Rabbit,
  Settings,
  Target,
  TrendingUp
} from 'lucide-react';
import Button from '../common/Buttom';

const SpeedControl = ({ 
  speed = 1.0, 
  onSpeedChange, 
  level = 'level1',
  showPresets = true,
  showAdvanced = false,
  disabled = false,
  className = '' 
}) => {
  // 상태 관리
  const [currentSpeed, setCurrentSpeed] = useState(speed);
  const [showAdvancedControls, setShowAdvancedControls] = useState(showAdvanced);
  const [customSpeed, setCustomSpeed] = useState(speed);

  // 레벨별 권장 속도 설정
  const levelSettings = {
    level1: {
      name: '한글 마스터',
      recommended: 0.5,
      min: 0.3,
      max: 0.8,
      presets: [
        { speed: 0.3, label: '매우 천천히', icon: Turtle, description: '자음/모음 하나씩' },
        { speed: 0.5, label: '천천히', icon: Turtle, description: '권장 속도' },
        { speed: 0.7, label: '조금 빠르게', icon: Rabbit, description: '익숙해지면' }
      ]
    },
    level2: {
      name: '기초 리더',
      recommended: 0.8,
      min: 0.5,
      max: 1.2,
      presets: [
        { speed: 0.5, label: '천천히', icon: Turtle, description: '처음 학습할 때' },
        { speed: 0.8, label: '보통', icon: Gauge, description: '권장 속도' },
        { speed: 1.0, label: '정상', icon: Rabbit, description: '자연스럽게' },
        { speed: 1.2, label: '빠르게', icon: Zap, description: '도전해보기' }
      ]
    },
    level3: {
      name: '중급 리더',
      recommended: 1.0,
      min: 0.7,
      max: 1.5,
      presets: [
        { speed: 0.7, label: '천천히', icon: Turtle, description: '어려운 내용' },
        { speed: 1.0, label: '정상', icon: Gauge, description: '권장 속도' },
        { speed: 1.2, label: '빠르게', icon: Rabbit, description: '익숙한 내용' },
        { speed: 1.5, label: '매우 빠르게', icon: Zap, description: '숙련자용' }
      ]
    },
    level4: {
      name: '고급 리더',
      recommended: 1.2,
      min: 0.8,
      max: 2.0,
      presets: [
        { speed: 0.8, label: '천천히', icon: Turtle, description: '복잡한 내용' },
        { speed: 1.0, label: '정상', icon: Gauge, description: '일반 속도' },
        { speed: 1.2, label: '빠르게', icon: Rabbit, description: '권장 속도' },
        { speed: 1.5, label: '매우 빠르게', icon: Zap, description: '실전 속도' },
        { speed: 2.0, label: '초고속', icon: TrendingUp, description: '마스터 도전' }
      ]
    }
  };

  const settings = levelSettings[level] || levelSettings.level1;

  // 속도 변경 처리
  const handleSpeedChange = (newSpeed) => {
    // 범위 제한
    const clampedSpeed = Math.max(settings.min, Math.min(settings.max, newSpeed));
    
    setCurrentSpeed(clampedSpeed);
    setCustomSpeed(clampedSpeed);
    
    if (onSpeedChange) {
      onSpeedChange(clampedSpeed);
    }
  };

  // 권장 속도로 리셋
  const resetToRecommended = () => {
    handleSpeedChange(settings.recommended);
  };

  // 속도 단계별 조절
  const adjustSpeed = (direction) => {
    const step = 0.1;
    const newSpeed = direction === 'up' 
      ? currentSpeed + step 
      : currentSpeed - step;
    
    handleSpeedChange(newSpeed);
  };

  // 현재 속도에 맞는 프리셋 찾기
  const getCurrentPreset = () => {
    return settings.presets.find(preset => 
      Math.abs(preset.speed - currentSpeed) < 0.05
    );
  };

  // 속도 색상 계산
  const getSpeedColor = () => {
    const ratio = (currentSpeed - settings.min) / (settings.max - settings.min);
    
    if (ratio < 0.3) return 'blue';
    if (ratio < 0.6) return 'green';
    if (ratio < 0.8) return 'yellow';
    return 'red';
  };

  // 속도 상태 텍스트
  const getSpeedStatus = () => {
    const preset = getCurrentPreset();
    if (preset) return preset.label;
    
    if (currentSpeed < settings.recommended * 0.8) return '천천히';
    if (currentSpeed > settings.recommended * 1.2) return '빠르게';
    return '보통';
  };

  // 컴포넌트 마운트 시 초기값 설정
  useEffect(() => {
    setCurrentSpeed(speed);
    setCustomSpeed(speed);
  }, [speed]);

  const speedColor = getSpeedColor();
  const currentPreset = getCurrentPreset();

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* 현재 속도 표시 */}
      <div className="text-center">
        <div className={`inline-flex items-center space-x-3 px-4 py-2 bg-${speedColor}-50 border border-${speedColor}-200 rounded-full`}>
          <Gauge className={`w-5 h-5 text-${speedColor}-600`} />
          <div>
            <div className={`text-lg font-bold text-${speedColor}-700`}>
              {currentSpeed.toFixed(1)}x
            </div>
            <div className={`text-xs text-${speedColor}-600`}>
              {getSpeedStatus()}
            </div>
          </div>
        </div>
      </div>

      {/* 프리셋 버튼 */}
      {showPresets && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700 text-center">
            {settings.name} 권장 속도
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {settings.presets.map((preset, index) => {
              const Icon = preset.icon;
              const isActive = Math.abs(preset.speed - currentSpeed) < 0.05;
              const isRecommended = preset.speed === settings.recommended;
              
              return (
                <button
                  key={index}
                  onClick={() => !disabled && handleSpeedChange(preset.speed)}
                  disabled={disabled}
                  className={`relative p-3 rounded-lg border text-left transition-all ${
                    disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">
                      {preset.speed.toFixed(1)}x
                    </span>
                    {isRecommended && (
                      <span className="text-xs bg-green-100 text-green-700 px-1 rounded">
                        권장
                      </span>
                    )}
                  </div>
                  <div className={`text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                    {preset.label}
                  </div>
                  <div className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 세밀한 조절 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            세밀한 조절
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedControls(!showAdvancedControls)}
            className="flex items-center space-x-1"
          >
            <Settings className="w-4 h-4" />
            <span>{showAdvancedControls ? '간단히' : '고급'}</span>
          </Button>
        </div>
        
        {/* 슬라이더 */}
        <div className="px-2">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500 w-8">
              {settings.min.toFixed(1)}x
            </span>
            
            <div className="flex-1 relative">
              <input
                type="range"
                min={settings.min}
                max={settings.max}
                step={0.1}
                value={currentSpeed}
                onChange={(e) => !disabled && handleSpeedChange(parseFloat(e.target.value))}
                disabled={disabled}
                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider slider-${speedColor}`}
              />
              
              {/* 권장 속도 마커 */}
              <div 
                className="absolute top-0 w-1 h-2 bg-green-500 rounded-full transform -translate-x-1/2"
                style={{ 
                  left: `${((settings.recommended - settings.min) / (settings.max - settings.min)) * 100}%`
                }}
              />
            </div>
            
            <span className="text-xs text-gray-500 w-8">
              {settings.max.toFixed(1)}x
            </span>
          </div>
          
          {/* 권장 속도 표시 */}
          <div className="text-center mt-2">
            <span className="text-xs text-green-600">
              ↑ 권장: {settings.recommended.toFixed(1)}x
            </span>
          </div>
        </div>
      </div>

      {/* 고급 컨트롤 */}
      {showAdvancedControls && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          
          {/* 정밀 조절 버튼 */}
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustSpeed('down')}
              disabled={disabled || currentSpeed <= settings.min}
              className="px-3 py-1"
            >
              -0.1
            </Button>
            
            <div className="px-3 py-1 bg-white border rounded text-sm font-mono">
              {currentSpeed.toFixed(1)}x
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustSpeed('up')}
              disabled={disabled || currentSpeed >= settings.max}
              className="px-3 py-1"
            >
              +0.1
            </Button>
          </div>

          {/* 직접 입력 */}
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-600">직접 입력:</label>
            <input
              type="number"
              min={settings.min}
              max={settings.max}
              step={0.1}
              value={customSpeed}
              onChange={(e) => setCustomSpeed(parseFloat(e.target.value) || settings.min)}
              onBlur={() => handleSpeedChange(customSpeed)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSpeedChange(customSpeed);
                }
              }}
              disabled={disabled}
              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center"
            />
            <span className="text-xs text-gray-500">x</span>
          </div>

          {/* 리셋 버튼 */}
          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToRecommended}
              disabled={disabled}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>권장 속도로 리셋</span>
            </Button>
          </div>
        </div>
      )}

      {/* 현재 프리셋 정보 */}
      {currentPreset && (
        <div className={`text-center p-3 bg-${speedColor}-50 border border-${speedColor}-200 rounded-lg`}>
          <div className={`text-sm font-medium text-${speedColor}-700 mb-1`}>
            {currentPreset.label} 모드
          </div>
          <div className={`text-xs text-${speedColor}-600`}>
            {currentPreset.description}
          </div>
        </div>
      )}

      {/* 속도 가이드 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center space-x-2 text-blue-800 mb-2">
          <Target className="w-4 h-4" />
          <span className="text-sm font-medium">속도 선택 가이드</span>
        </div>
        
        <div className="text-xs text-blue-700 space-y-1">
          {level === 'level1' && (
            <>
              <div>• 처음에는 0.3-0.5x로 천천히 시작하세요</div>
              <div>• 자음과 모음을 정확히 구분할 수 있을 때 속도를 높이세요</div>
            </>
          )}
          {level === 'level2' && (
            <>
              <div>• 기본 발음 규칙을 익힐 때는 0.8x가 적당해요</div>
              <div>• 익숙해지면 1.0x 자연스러운 속도에 도전해보세요</div>
            </>
          )}
          {level === 'level3' && (
            <>
              <div>• 복잡한 문장은 0.7-1.0x로 시작하세요</div>
              <div>• 감정과 억양을 살리려면 1.0-1.2x가 좋아요</div>
            </>
          )}
          {level === 'level4' && (
            <>
              <div>• 전문 텍스트는 1.0x부터 시작하세요</div>
              <div>• 실전 연습을 위해 1.5x 이상에 도전해보세요</div>
            </>
          )}
        </div>
      </div>

      {/* 스타일 추가 */}
      <style >{`
        .slider {
          -webkit-appearance: none;
          appearance: none;
        }
        
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider-blue::-webkit-slider-thumb {
          background: #3B82F6;
        }
        
        .slider-green::-webkit-slider-thumb {
          background: #10B981;
        }
        
        .slider-yellow::-webkit-slider-thumb {
          background: #F59E0B;
        }
        
        .slider-red::-webkit-slider-thumb {
          background: #EF4444;
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default SpeedControl;