// src/components/subscription/PlanCard.jsx
import React, { useState } from 'react';
import { 
  Check, 
  Star, 
  Zap,
  Crown,
  Users,
  Clock,
  Target,
  ArrowRight,
  Sparkles,
  Gift
} from 'lucide-react';
import Card from '../common/Card';
import Button, { PrimaryButton, OutlineButton } from '../common/Buttom';
import TranslatableText, { T } from '@/components/common/TranslatableText';
import { numberUtils } from '../../utils/format';
import { SUBSCRIPTION_PLANS } from '../../shared/constants/subscriptions';
import { PRODUCTS } from '../../shared/constants/products';

const PlanCard = ({ 
  plan,
  isSelected = false,
  isPopular = false,
  isBundle = false,
  onSelect,
  onSubscribe,
  discount = 0,
  annualDiscount = 0,
  billingPeriod = 'monthly',
  showComparison = false,
  disabled = false,
  currentSubscriptions = []
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // 요금제 정보 매핑 - 백엔드 API와 일치하도록 수정
  const planDetails = isBundle ? plan : SUBSCRIPTION_PLANS[plan?.id?.toUpperCase()] || PRODUCTS[plan?.id] || plan;
  
  // 기본 요금제 아이콘 매핑
  const planIcons = {
    talk: { icon: Users, color: 'blue', gradient: 'from-blue-500 to-cyan-500' },
    drama: { icon: Star, color: 'purple', gradient: 'from-purple-500 to-pink-500' },
    test: { icon: Target, color: 'green', gradient: 'from-green-500 to-emerald-500' },
    journey: { icon: Zap, color: 'orange', gradient: 'from-orange-500 to-red-500' },
    bundle: { icon: Crown, color: 'yellow', gradient: 'from-yellow-500 to-orange-500' }
  };

  const iconConfig = planIcons[plan?.id] || planIcons[plan?.type] || planIcons.bundle;
  const Icon = iconConfig.icon;

  // 가격 계산 - format.js의 numberUtils.formatPrice 사용
  const basePrice = planDetails?.price || 0;
  const discountAmount = basePrice * (discount / 100);
  const annualDiscountAmount = basePrice * (annualDiscount / 100);
  const finalPrice = billingPeriod === 'annual' 
    ? basePrice - discountAmount - annualDiscountAmount
    : basePrice - discountAmount;

  const yearlyTotal = finalPrice * 12;
  const monthlySavings = billingPeriod === 'annual' ? (basePrice - finalPrice) : 0;

  // 구독 상태 확인
  const isSubscribed = currentSubscriptions?.includes(plan?.id?.toLowerCase().trim());
  const hasPartialSubscription = isBundle && plan?.products?.some(productId =>
  currentSubscriptions?.includes(productId?.toLowerCase().trim())
);

  // 카드 스타일
  const getCardStyle = () => {
    let baseStyle = "relative transition-all duration-300 cursor-pointer";
    
    if (disabled) {
      return `${baseStyle} opacity-60 cursor-not-allowed`;
    }
    
    if (isSelected) {
      return `${baseStyle} border-${iconConfig.color}-500 shadow-lg ring-4 ring-${iconConfig.color}-100`;
    }
    
    if (isPopular) {
      return `${baseStyle} border-${iconConfig.color}-400 shadow-md hover:shadow-lg hover:border-${iconConfig.color}-500`;
    }
    
    return `${baseStyle} hover:shadow-md`;
  };

  // 인기 배지
  const PopularBadge = () => (
    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
      <div className={`bg-gradient-to-r ${iconConfig.gradient} text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1`}>
        <Sparkles className="w-3 h-3" />
        <T>인기</T>
      </div>
    </div>
  );

  // 할인 배지
  const DiscountBadge = () => {
    const totalDiscount = discount + (billingPeriod === 'annual' ? annualDiscount : 0);
    if (totalDiscount <= 0) return null;
    
    return (
      <div className="absolute -top-2 -right-2">
        <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
          <Gift className="w-3 h-3" />
          <span>{totalDiscount}% OFF</span>
        </div>
      </div>
    );
  };

  return (
    <Card
      className={getCardStyle()}
      onClick={() => !disabled && onSelect?.(plan)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      variant={isSelected ? 'primary' : 'default'}
      hover={!disabled}
      clickable={!disabled}
      padding="lg"
    >
      {/* 인기 배지 */}
      {isPopular && <PopularBadge />}
      
      {/* 할인 배지 */}
      <DiscountBadge />

      <div className="space-y-6">
        {/* 헤더 */}
        <div className="text-center space-y-4">
          {/* 아이콘 */}
          <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${iconConfig.gradient} flex items-center justify-center`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          
          {/* 제품명 */}
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              <T>{planDetails?.name || plan?.name}</T>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              <T>{planDetails?.description || plan?.description}</T>
            </p>
          </div>
        </div>

        {/* 가격 */}
        <div className="text-center space-y-2">
          <div className="space-y-1">
            {/* 할인 전 가격 (할인이 있는 경우) */}
            {(discount > 0 || (billingPeriod === 'annual' && annualDiscount > 0)) && (
              <div className="text-sm text-gray-400 line-through">
                {numberUtils.formatPrice(basePrice)}/<T>월</T>
              </div>
            )}
            
            {/* 현재 가격 */}
            <div className="flex items-baseline justify-center space-x-1">
              <span className="text-3xl font-bold text-gray-900">
                {numberUtils.formatPrice(finalPrice)}
              </span>
              <span className="text-gray-600">
                /{billingPeriod === 'annual' ? <T>월</T> : <T>월</T>}
              </span>
            </div>
            
            {/* 연간 구독 정보 */}
            {billingPeriod === 'annual' && (
              <div className="text-sm text-green-600">
                <T>연간 {numberUtils.formatPrice(yearlyTotal)} • 월 {numberUtils.formatPrice(monthlySavings)} 절약</T>
              </div>
            )}
          </div>
          
          {/* 사용량 제한 - 백엔드 API 필드명에 맞춤 */}
          {(planDetails?.dailyLimit || planDetails?.daily_limit) && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <T>일일 {planDetails.dailyLimit || planDetails.daily_limit}회 이용</T>
            </div>
          )}
        </div>

        {/* 기능 목록 */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 text-center">
            <T>포함된 기능</T>
          </h4>
          
          {/* 번들인 경우 */}
          {isBundle && plan?.products ? (
            <div className="space-y-2">
              {plan.products.map((productId) => {
                const product = SUBSCRIPTION_PLANS[productId?.toUpperCase()] || PRODUCTS[productId];
                if (!product) return null;
                
                return (
                  <div key={productId} className="flex items-center space-x-3">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">
                      <T>{product.name}</T>
                    </span>
                    {currentSubscriptions?.includes(productId) && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <T>구독중</T>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* 단일 상품인 경우 */
            <div className="space-y-2">
              {(planDetails?.features || []).map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 flex-1">
                    <T>{feature}</T>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 구독 상태 */}
        {isSubscribed && (
          <Card variant="success" padding="sm">
            <div className="flex items-center justify-center space-x-2 text-green-700">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">
                <T>현재 구독중</T>
              </span>
            </div>
          </Card>
        )}

        {/* 부분 구독 (번들의 경우) */}
        {hasPartialSubscription && !isSubscribed && (
          <Card variant="info" padding="sm">
            <div className="text-center">
              <div className="text-sm text-blue-700 font-medium mb-1">
                <T>일부 상품 구독중</T>
              </div>
              <div className="text-xs text-blue-600">
                <T>업그레이드하면 추가 할인 혜택을 받을 수 있어요</T>
              </div>
            </div>
          </Card>
        )}

        {/* 액션 버튼 */}
        <div className="space-y-3">
          {!isSubscribed ? (
            <PrimaryButton
              onClick={(e) => {
                e.stopPropagation();
                onSubscribe?.(plan);
              }}
              disabled={disabled}
              className={`w-full bg-gradient-to-r ${iconConfig.gradient} hover:opacity-90 text-white font-medium py-3 transition-all duration-200 ${
                isHovered ? 'transform scale-105' : ''
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <T>{hasPartialSubscription ? '업그레이드' : '구독 시작'}</T>
                <ArrowRight className="w-4 h-4" />
              </div>
            </PrimaryButton>
          ) : (
            <OutlineButton
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                // 구독 관리 페이지로 이동
              }}
              textKey="구독 관리"
            />
          )}
          
          {showComparison && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-gray-600 hover:text-gray-900"
              onClick={(e) => {
                e.stopPropagation();
                // 비교 기능
              }}
              textKey="다른 요금제와 비교"
            />
          )}
        </div>

        {/* 추가 정보 */}
        <div className="text-center space-y-2">
          {/* 보장 정책 */}
          <div className="text-xs text-gray-500">
            <T>30일 환불 보장</T>
          </div>
          
          {/* 무료 체험 */}
          {!isSubscribed && (
            <div className="text-xs text-blue-600">
              <T>7일 무료 체험 가능</T>
            </div>
          )}
          
          {/* 취소 정책 */}
          <div className="text-xs text-gray-400">
            <T>언제든지 취소 가능</T>
          </div>
        </div>
      </div>

      {/* 호버 효과 */}
      {isHovered && !disabled && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 transform -skew-x-12 animate-pulse" />
      )}
    </Card>
  );
};

export default PlanCard;