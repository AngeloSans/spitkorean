from quart import Blueprint, request, jsonify, current_app, g
from bson.objectid import ObjectId
import uuid
import logging  # ✅ 추가
from datetime import datetime, timedelta  # ✅ timedelta도 추가
from app.utils.response import api_response, error_response
from app.services.gpt_service import GPTService
from app.services.emotion_service import EmotionService
from app.models.common import XPAction, Common, ActivityType
from app.core.auth import require_auth
from app.models.common import XPAction, Common



# ✅ Logger 설정 추가
logger = logging.getLogger(__name__)
talk_routes = Blueprint('talk', __name__, url_prefix='/api/v1/talk')

# GPT 서비스 초기화
gpt_service = GPTService()
emotion_service = EmotionService()

@talk_routes.route('/chat', methods=['POST'])
@require_auth  # For production with auth
async def chat():
    user_id = g.user_id
    data = await request.json
    
    if not data or not data.get('message'):
        return error_response("메시지 내용이 필요합니다", 400)
    
    # 사용 제한 확인
    can_use = await current_app.usage_limiter.check_limit(
        user_id, 
        "talk", 
        current_app.config.get("TALK_DAILY_LIMIT", 60)
    )
    
    if not can_use:
        return error_response("오늘의 사용량을 초과했습니다", 429)
    
    # 세션 ID 처리
    session_id = data.get('session_id', str(uuid.uuid4()))
    
    # 사용자 레벨 획득
    users_collection = current_app.mongo_client[current_app.config["MONGO_DB_USERS"]].users
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    user_level = user.get("profile", {}).get("koreanLevel", "beginner")
    native_language = user.get("profile", {}).get("nativeLanguage", "en")
    
    # 이전 대화 기록 가져오기
    chat_logs_collection = current_app.mongo_client[current_app.config["MONGO_DB_TALK"]].chat_logs
    chat_history = []
    
    if data.get('session_id'):
        # 기존 세션이면 기록 불러오기
        chat_log = await chat_logs_collection.find_one({"sessionId": session_id, "userId": ObjectId(user_id)})
        if chat_log:
            chat_history = chat_log.get("messages", [])
    
    # 사용자 메시지 감정 분석
    emotion_data = await emotion_service.analyze_emotion(data['message'])
    
    # 사용자 메시지 저장
    user_message = {
        "role": "user",
        "content": data['message'],
        "timestamp": datetime.utcnow(),
        "emotion": emotion_data
    }
    
    # 대화 기록에 사용자 메시지 추가
    chat_history.append(user_message)
    
    # ✅ GPT 응답 생성 (빠진 부분 추가)
    try:
        gpt_response = await gpt_service.generate_response(
            chat_history, 
            user_level,
            native_language,
            session_id
        )
    except Exception as e:
        logger.error(f"GPT response generation failed: {e}")
        return error_response("대화 생성 중 오류가 발생했습니다", 500)
    
    # 응답 메시지 저장
    assistant_message = {
        "role": "assistant",
        "content": gpt_response,
        "timestamp": datetime.utcnow(),
        "emotion": None  # AI는 감정 데이터 없음
    }
    
    # 대화 기록에 AI 응답 추가
    chat_history.append(assistant_message)
    
    # 채팅 로그 업데이트 또는 생성
    if data.get('session_id'):
        # 기존 세션 업데이트
        await chat_logs_collection.update_one(
            {"sessionId": session_id, "userId": ObjectId(user_id)},
            {"$set": {"messages": chat_history, "updated_at": datetime.utcnow()}}
        )
    else:
        # 새 세션 생성
        await chat_logs_collection.insert_one({
            "userId": ObjectId(user_id),
            "sessionId": session_id,
            "messages": chat_history,
            "level": user_level,
            "date": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
    
    # ✅ 게임화 시스템 추가
    db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    
    # XP 추가
    await Common.add_xp(db, user_id, 8, XPAction.TALK_CHAT_COMPLETE.value)
    
    # 활동 로깅
    await Common.log_activity(db, user_id, ActivityType.TALK_CHAT.value, "talk", {
        "session_id": session_id,
        "message_length": len(data['message']),
        "user_level": user_level
    })
    
    # 스트릭 업데이트
    streak_result = await Common.update_streak(db, user_id)
    
    # 사용량 증가
    await current_app.usage_limiter.increment_usage(user_id, "talk")
    
    # ✅ 이벤트 발행 (수정됨)
    await current_app.event_bus.publish("user_activity", {
        "user_id": user_id,
        "activity": "talk_chat",
        "session_id": session_id,
        "xp_earned": 8,
        "streak_days": streak_result.get("streak_days"),
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return api_response({
        "response": gpt_response,
        "session_id": session_id,
        "emotion": emotion_data,
        "xp_earned": 8,
        "streak_days": streak_result.get("streak_days"),
        "remaining_usage": await current_app.usage_limiter.get_remaining(
            user_id, "talk", current_app.config.get("TALK_DAILY_LIMIT", 60)
        )
    }, "대화 응답이 생성되었습니다")

@talk_routes.route('/sessions', methods=['GET'])
@require_auth  # For production with auth
async def get_sessions():
    user_id = g.user_id
    
    # 채팅 세션 목록 가져오기
    chat_logs_collection = current_app.mongo_client[current_app.config["MONGO_DB_TALK"]].chat_logs
    cursor = chat_logs_collection.find(
        {"userId": ObjectId(user_id)},
        {"_id": 1, "sessionId": 1, "date": 1, "updated_at": 1}
    ).sort("updated_at", -1)
    
    sessions = []
    async for session in cursor:
        sessions.append({
            "id": str(session["_id"]),
            "sessionId": session["sessionId"],
            "date": session["date"].isoformat() if "date" in session else None,
            "updated_at": session["updated_at"].isoformat() if "updated_at" in session else None
        })
    
    return api_response({
        "sessions": sessions
    }, "세션 목록을 성공적으로 조회했습니다")

@talk_routes.route('/session/<session_id>', methods=['GET'])
@require_auth  # For production with auth
async def get_session(session_id):
    user_id = g.user_id
    
    # 특정 채팅 세션 가져오기
    chat_logs_collection = current_app.mongo_client[current_app.config["MONGO_DB_TALK"]].chat_logs
    session = await chat_logs_collection.find_one(
        {"sessionId": session_id, "userId": ObjectId(user_id)}
    )
    
    if not session:
        return error_response("세션을 찾을 수 없습니다", 404)
    
    # 메시지 포맷팅
    messages = []
    for msg in session.get("messages", []):
        formatted_msg = {
            "role": msg["role"],
            "content": msg["content"],
            "timestamp": msg["timestamp"].isoformat() if "timestamp" in msg else None,
            "emotion": msg.get("emotion")
        }
        messages.append(formatted_msg)
    
    return api_response({
        "session_id": session_id,
        "messages": messages,
        "level": session.get("level", "beginner"),
        "created_at": session.get("created_at").isoformat() if "created_at" in session else None,
        "updated_at": session.get("updated_at").isoformat() if "updated_at" in session else None
    }, "세션 정보를 성공적으로 조회했습니다")

@talk_routes.route('/usage', methods=['GET'])
@require_auth  # For production with auth
async def get_usage():
    user_id = g.user_id
    
    # 남은 사용량 확인
    remaining = await current_app.usage_limiter.get_remaining(
        user_id, 
        "talk", 
        current_app.config.get("TALK_DAILY_LIMIT", 60)
    )
    
    return api_response({
        "product": "talk",
        "daily_limit": current_app.config.get("TALK_DAILY_LIMIT", 60),
        "remaining": remaining,
        "reset_at": (datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
    }, "사용량 정보를 성공적으로 조회했습니다")