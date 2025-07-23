"""
SpitKorean 공통 데이터 모델
이 모듈은 다른 모델에서 재사용되는 기본 클래스와 공통 스키마를 제공합니다.
"""
from datetime import datetime
from typing import Dict, Any, Optional, List, Union
from bson import ObjectId
from enum import Enum


class XPAction(Enum):
    """XP 획득 가능한 액션들을 정의하는 Enum"""
    
    # 기본 학습 활동 (gamification_service.py에서 사용되는 것들)
    DAILY_LOGIN = "daily_login"              # 일일 로그인
    COMPLETE_LESSON = "complete_lesson"       # 단일 레슨 완료
    PERFECT_SCORE = "perfect_score"          # 만점 획득
    STREAK_MILESTONE = "streak_milestone"     # 연속 학습 마일스톤 (7일, 30일, 100일)
    LEVEL_UP = "level_up"                    # 레벨 업
    CHALLENGE_COMPLETE = "challenge_complete" # 챌린지 완료
    GRAMMAR_MASTERY = "grammar_mastery"      # 문법 마스터
    PRONUNCIATION_PERFECT = "pronunciation_perfect" # 발음 완벽
    SHARE_PROGRESS = "share_progress"        # 진행 상황 공유
    INVITE_FRIEND = "invite_friend"          # 친구 초대
    
    # 상품별 특별 활동 (각 라우트에서 사용)
    TALK_CHAT_COMPLETE = "talk_chat_complete"         # Talk: 대화 완료
    DRAMA_SENTENCE_CORRECT = "drama_sentence_correct" # Drama: 문장 정답
    TEST_QUIZ_COMPLETE = "test_quiz_complete"         # Test: 퀴즈 완료
    JOURNEY_READING_COMPLETE = "journey_reading_complete" # Journey: 리딩 완료
    
    # 추가 성취 (향후 확장용)
    WEEKLY_GOAL_ACHIEVED = "weekly_goal_achieved"     # 주간 목표 달성
    MONTHLY_CHAMPION = "monthly_champion"             # 월간 챔피언
    FIRST_PERFECT_WEEK = "first_perfect_week"         # 첫 완벽한 주
    COMEBACK_HERO = "comeback_hero"                   # 복귀 영웅
class ActivityType(Enum):
    """사용자 활동 유형 Enum"""
    TALK_CHAT = "talk_chat"
    # Aqui você pode adicionar mais atividades no futuro



class PyObjectId(ObjectId):
    """ObjectId를 Pydantic 모델에서 사용하기 위한 커스텀 타입"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("잘못된 ObjectId 형식입니다")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


class Timestamps:
    """
    문서의 생성 및 수정 시간을 관리하는 믹스인 클래스
    """
    created_at: datetime = None
    updated_at: datetime = None

    def set_timestamps(self, is_new=False):
        """
        타임스탬프 설정
        
        Args:
            is_new (bool): 새 문서인 경우 True
        """
        now = datetime.utcnow()
        if is_new or not self.created_at:
            self.created_at = now
        self.updated_at = now


class BaseModel:
    """
    모든 데이터 모델의 기본 클래스
    """
    id: PyObjectId = None
    
    def __init__(self, **data):
        """
        모델 초기화
        
        Args:
            **data: 모델 필드 데이터
        """
        for key, value in data.items():
            setattr(self, key, value)
        
        # 새 모델인 경우 타임스탬프 설정
        if hasattr(self, 'set_timestamps'):
            self.set_timestamps(is_new=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        모델을 딕셔너리로 변환
        
        Returns:
            Dict[str, Any]: 모델 데이터 딕셔너리
        """
        result = {}
        for key, value in self.__dict__.items():
            if key.startswith('_'):
                continue
                
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif hasattr(value, 'to_dict'):
                result[key] = value.to_dict()
            elif isinstance(value, list):
                result[key] = [
                    item.to_dict() if hasattr(item, 'to_dict') else item
                    for item in value
                ]
            else:
                result[key] = value
                
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BaseModel':
        """
        딕셔너리에서 모델 생성
        
        Args:
            data (Dict[str, Any]): 모델 데이터 딕셔너리
            
        Returns:
            BaseModel: 생성된 모델 인스턴스
        """
        if '_id' in data and 'id' not in data:
            data['id'] = data.pop('_id')
            
        return cls(**data)


class ValidationError(Exception):
    """
    데이터 검증 오류 예외
    """
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")


class Field:
    """
    모델 필드 정의 및 검증 헬퍼
    """
    @staticmethod
    def validate_string(value: str, min_length: int = None, max_length: int = None, field_name: str = "field"):
        """문자열 필드 검증"""
        if not isinstance(value, str):
            raise ValidationError(field_name, "문자열이어야 합니다")
            
        if min_length is not None and len(value) < min_length:
            raise ValidationError(field_name, f"최소 {min_length}자 이상이어야 합니다")
            
        if max_length is not None and len(value) > max_length:
            raise ValidationError(field_name, f"최대 {max_length}자 이하여야 합니다")
            
        return value
        
    @staticmethod
    def validate_email(email: str) -> str:
        """이메일 형식 검증"""
        import re
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            raise ValidationError("email", "유효한 이메일 형식이 아닙니다")
        return email
        
    @staticmethod
    def validate_level(level: str, valid_levels: List[str]) -> str:
        """레벨 값 검증"""
        if level not in valid_levels:
            raise ValidationError("level", f"유효한 레벨이 아닙니다. 가능한 값: {', '.join(valid_levels)}")
        return level


class Common:
    """게임화 관련 공통 기능"""
    
    gamification_collection = "gamification"
    
    @classmethod
    async def get_user_gamification(cls, db, user_id):
        """사용자 게임화 정보 조회"""
        from bson.objectid import ObjectId
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        
        gamification_db = db[cls.gamification_collection]
        return await gamification_db.find_one({"userId": user_id})
    
    @classmethod
    async def create_gamification(cls, db, user_id):
        """새 사용자 게임화 정보 생성"""
        from bson.objectid import ObjectId
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        
        gamification_data = {
            "userId": user_id,
            "streakDays": 0,
            "totalXP": 0,
            "weeklyXP": 0,
            "currentLeague": "bronze",
            "achievements": [],
            "weeklyProgress": {"xp": 0},
            "longestStreak": 0,
            "lastActivityDate": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        gamification_db = db[cls.gamification_collection]
        result = await gamification_db.insert_one(gamification_data)
        return str(result.inserted_id)
    
    @classmethod
    async def add_xp(cls, db, user_id, xp_amount, reason):
        """XP 추가"""
        from bson.objectid import ObjectId
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        
        gamification_db = db[cls.gamification_collection]
        await gamification_db.update_one(
            {"userId": user_id},
            {
                "$inc": {
                    "totalXP": xp_amount,
                    "weeklyProgress.xp": xp_amount,
                    "weeklyXP": xp_amount
                },
                "$set": {"updated_at": datetime.utcnow()}
            },
            upsert=True
        )
    
    @classmethod
    async def get_user_league(cls, db, user_id):
        """사용자 리그 정보 조회
        
        Args:
            db: 데이터베이스 연결
            user_id: 사용자 ID
            
        Returns:
            str: 사용자 리그 (bronze, silver, gold, diamond)
        """
        gamification = await cls.get_user_gamification(db, user_id)
        if not gamification:
            return "bronze"
        
        total_xp = gamification.get("totalXP", 0)
        
        # 리그 기준
        if total_xp >= 3000:
            return "diamond"
        elif total_xp >= 1500:
            return "gold"
        elif total_xp >= 500:
            return "silver"
        else:
            return "bronze"
    
    @classmethod
    async def add_achievement(cls, db, user_id, achievement_id):
        """업적 추가
        
        Args:
            db: 데이터베이스 연결
            user_id: 사용자 ID
            achievement_id: 업적 ID
            
        Returns:
            bool: 추가 성공 여부 (이미 있으면 False)
        """
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        
        gamification = await cls.get_user_gamification(db, user_id)
        if not gamification:
            await cls.create_gamification(db, user_id)
            gamification = await cls.get_user_gamification(db, user_id)
        
        achievements = gamification.get("achievements", [])
        if achievement_id in achievements:
            return False  # 이미 보유한 업적
        
        # 업적 추가
        gamification_db = db[cls.gamification_collection]
        await gamification_db.update_one(
            {"userId": user_id},
            {
                "$push": {"achievements": achievement_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return True
    
    @classmethod
    async def reset_weekly_progress(cls, db):
        """주간 진행 상황 초기화 (일요일 자정 실행)
        
        Args:
            db: 데이터베이스 연결
        """
        gamification_db = db[cls.gamification_collection]
        await gamification_db.update_many(
            {},
            {
                "$set": {
                    "weeklyXP": 0,
                    "weeklyProgress.xp": 0,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    @classmethod
    async def update_streak(cls, db, user_id):
        """Updates user streak based on last activity"""
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)

        gamification_db = db[cls.gamification_collection]
        now = datetime.utcnow()
        today = now.date()

        user_data = await gamification_db.find_one({"userId": user_id})

        if not user_data:
            # Create new document if not exists
            await cls.create_gamification(db, user_id)
            user_data = await gamification_db.find_one({"userId": user_id})

        last_date = user_data.get("lastActivityDate")
        current_streak = user_data.get("streakDays", 0)

        # Calculate the difference in days
        if last_date:
            days_diff = (today - last_date.date()).days
        else:
            days_diff = None

        if days_diff == 0:
            # Already updated today, does nothing
            return {"streak_days": current_streak, "last_updated": last_date}
        elif days_diff == 1:
            # Continue streak
            new_streak = current_streak + 1
        else:
            # Reset streak
            new_streak = 1

        await gamification_db.update_one(
            {"userId": user_id},
            {
                "$set": {
                    "streakDays": new_streak,
                    "lastActivityDate": now,
                    "updated_at": now
                }
            }
        )

        return {"streak_days": new_streak, "last_updated": now}
       
    @classmethod 
    async def get_leaderboard(cls, db, league="bronze", limit=10):
        """리더보드 조회
        
        Args:
            db: 데이터베이스 연결
            league: 리그명
            limit: 조회할 사용자 수
            
        Returns:
            list: 리더보드 목록
        """
        gamification_db = db[cls.gamification_collection]
        
        # 리그별 XP 기준
        league_filters = {
            "bronze": {"totalXP": {"$lt": 500}},
            "silver": {"totalXP": {"$gte": 500, "$lt": 1500}},
            "gold": {"totalXP": {"$gte": 1500, "$lt": 3000}},
            "diamond": {"totalXP": {"$gte": 3000}}
        }
        
        filter_query = league_filters.get(league, {})
        
        cursor = gamification_db.find(filter_query).sort("weeklyXP", -1).limit(limit)
        leaderboard = await cursor.to_list(length=None)
        
        return leaderboard
    @classmethod
    async def log_activity(cls, db, user_id, activity_type, source, metadata=None):
        """사용자 활동 로그 저장"""
        from bson.objectid import ObjectId
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)

        activity_logs_collection = db["activity_logs"]  # nome da collection de logs
        log_data = {
            "userId": user_id,
            "activityType": activity_type,
            "source": source,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow()
        }
        await activity_logs_collection.insert_one(log_data)
