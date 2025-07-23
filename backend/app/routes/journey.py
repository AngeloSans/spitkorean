from quart import Blueprint, request, jsonify, current_app, g
from bson.objectid import ObjectId
import uuid
from datetime import datetime, timedelta

from app.models.journey import Journey
from app.models.user import User
from app.utils.response import api_response, error_response
from app.services.whisper_service import WhisperService
from app.core.auth import require_auth

journey_routes = Blueprint('journey', __name__, url_prefix='/api/v1/journey')

# GPT service is accessed via current_app.gpt_service
whisper_service = WhisperService()

@journey_routes.route('/content', methods=['GET'])
@require_auth  # For production with auth
async def get_content():
    """리딩 콘텐츠 조회 API"""
    user_id = g.user_id
    
    level = request.args.get('level', 'level1')
    content_type = request.args.get('type', 'reading')
    
    if level not in ['level1', 'level2', 'level3', 'level4']:
        return error_response("유효하지 않은 레벨입니다. level1, level2, level3, level4 중 하나를 선택하세요.", 400)
    
    db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    has_subscription = await User.has_active_subscription(db_users, user_id, "journey")
    
    if not has_subscription:
        return error_response("Korean Journey 서비스 구독이 필요합니다.", 403)
    
    can_use = await current_app.usage_limiter.check_limit(
        user_id, 
        "journey",
        current_app.config.get("JOURNEY_DAILY_LIMIT", 20)
    )
    
    if not can_use:
        return error_response("오늘의 사용량을 초과했습니다.", 429)
    
    try:
        db_journey = current_app.mongo_client[current_app.config.get("MONGO_DB_JOURNEY")]
        content_list = await Journey.find_by_level(db_journey, level, content_type, limit=1)
        
        if not content_list:
            current_app.logger.info(f"No existing journey content found for level {level}, type {content_type}, attempting to generate with GPT")
            
            level_descriptions = {
                "level1": "한글 마스터 (완전 초급) 수준의 간단한 한국어 텍스트",
                "level2": "기초 리더 (초급) 수준의 한국어 텍스트",
                "level3": "중급 리더 (중급) 수준의 한국어 텍스트",
                "level4": "고급 리더 (고급) 수준의 한국어 텍스트"
            }
            
            type_descriptions = {
                "hangul": "한글 자음과 모음 학습",
                "reading": "읽기 연습용 텍스트",
                "pronunciation": "발음 연습용 텍스트",
                "dialogue": "대화 형식의 텍스트"
            }
            
            type_str = type_descriptions.get(content_type, "읽기 연습용 텍스트")
            prompt = f"{level_descriptions[level]}를 생성해주세요. 이 텍스트는 {type_str}로 사용됩니다."
            
            # Always attempt to use GPT service
            if not current_app.config.get('USE_OPENAI', True) or not current_app.gpt_service.openai_client:
                current_app.logger.error("OpenAI is disabled or client not initialized. Cannot generate content.")
                return error_response("콘텐츠를 불러오는데 실패했습니다. (OpenAI indisponível)", 500)

            current_app.logger.info(f"Attempting to generate content with GPT for level {level}, type {content_type}")
            generated_content = await current_app.gpt_service.generate_reading_content(prompt, level)
            
            level_settings = {
                "level1": {
                    "title": "한글 기초 학습",
                    "description": "한글 자음과 모음, 기초 단어를 학습합니다.",
                    "recommended_speed": 0.5
                },
                "level2": {
                    "title": "일상 한국어 읽기",
                    "description": "간단한 일상 대화와 문장을 읽습니다.",
                    "recommended_speed": 0.8
                },
                "level3": {
                    "title": "중급 한국어 텍스트",
                    "description": "뉴스, 블로그 글 등의 중급 텍스트를 읽습니다.",
                    "recommended_speed": 1.0
                },
                "level4": {
                    "title": "고급 한국어 콘텐츠",
                    "description": "문학 작품, 전문적인 글 등의 고급 텍스트를 읽습니다.",
                    "recommended_speed": 1.2
                }
            }
            
            guide = await current_app.gpt_service.generate_reading_guide(generated_content, level)
            
            content_data = {
                "title": level_settings[level]["title"],
                "description": level_settings[level]["description"],
                "level": level,
                "content_type": content_type,
                "content": {
                    "text": generated_content,
                    "sentences": [{"id": str(uuid.uuid4()), "text": sentence.strip()}
                                  for sentence in generated_content.split(".") if sentence.strip()],
                    "recommended_speed": level_settings[level]["recommended_speed"]
                },
                "guide": guide
            }
            
            await Journey.create(db_journey, content_data)
            content_list = await Journey.find_by_level(db_journey, level, content_type, limit=1)
            current_app.logger.info(f"Successfully generated and saved content for level {level}")
            
        # 응답 데이터 가공
        content = content_list[0]
        content_data = {
            "content_id": str(content.get('_id')),
            "title": content.get('title'),
            "description": content.get('description'),
            "level": content.get('level'),
            "content_type": content.get('content_type'),
            "content": content.get('content', {}),
            "guide": content.get('guide', {})
        }
        
        remaining = await current_app.usage_limiter.get_remaining(
            user_id, 
            "journey",
            current_app.config.get("JOURNEY_DAILY_LIMIT", 20)
        )
        
        return api_response({
            "content": content_data,
            "remaining_usage": remaining,
            "source": "database"
        }, "리딩 콘텐츠를 성공적으로 조회했습니다.")
        
    except Exception as e:
        current_app.logger.error(f"Unexpected error in get_content: {str(e)}")
        # If any error occurs, return a generic error response, no mock fallback
        return error_response("콘텐츠를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.", 500)

@journey_routes.route('/submit', methods=['POST'])
@require_auth  # For production with auth
async def submit_reading():
    """리딩 결과 제출 API"""
    user_id = g.user_id
    
    form = await request.form
    
    content_id = form.get('content_id')
    reading_speed = float(form.get('reading_speed', 1.0))
    completed_sentences = int(form.get('completed_sentences', 0))
    
    if not content_id:
        return error_response("콘텐츠 ID가 필요합니다.", 400)
    
    db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    has_subscription = await User.has_active_subscription(db_users, user_id, "journey")
    
    if not has_subscription:
        return error_response("Korean Journey 서비스 구독이 필요합니다.", 403)
    
    try:
        db_journey = current_app.mongo_client[current_app.config.get("MONGO_DB_JOURNEY")]
        
        content = await Journey.find_by_id(db_journey, content_id)
            
        if not content:
            return error_response("콘텐츠를 찾을 수 없습니다.", 404)
        
        audio_file = form.get('audio')
        pronunciation_score = 0
        
        if audio_file:
            try:
                audio_data = await audio_file.read()
                recognition_result = await whisper_service.transcribe_audio(audio_data)
                
                original_text = content.get('content', {}).get('text', '')
                pronunciation_score = await whisper_service.evaluate_pronunciation(
                    recognition_result.get('text', ''),
                    original_text
                )
            except Exception as audio_error:
                current_app.logger.warning(f"Audio processing failed: {str(audio_error)}")
                pronunciation_score = 0
        
        history_id = None
        try:
            history_id = await Journey.record_reading(
                db_journey,
                user_id,
                content_id,
                reading_speed,
                pronunciation_score,
                completed_sentences
            )
        except Exception as record_error:
            current_app.logger.warning(f"Failed to record reading: {str(record_error)}")
            # If recording fails, still return a response but log the warning
            history_id = "failed_to_record" # Indicate failure without using "mock"
        
        from app.models.common import Common
        
        level = content.get('level', 'level1')
        level_multiplier = {
            'level1': 1,
            'level2': 1.5,
            'level3': 2,
            'level4': 3
        }.get(level, 1)
        
        xp_amount = int(completed_sentences * level_multiplier)
        
        if pronunciation_score > 80:
            xp_amount += 10
        elif pronunciation_score > 60:
            xp_amount += 5
        
        try:
            await Common.add_xp(db_users, user_id, xp_amount, "journey_complete")
        except Exception as xp_error:
            current_app.logger.warning(f"Failed to add XP: {str(xp_error)}")
        
        try:
            await current_app.event_bus.emit_user_activity(
                user_id, 
                "reading_complete", 
                "journey", 
                {
                    "content_id": content_id,
                    "level": level,
                    "reading_speed": reading_speed,
                    "pronunciation_score": pronunciation_score,
                    "completed_sentences": completed_sentences
                }
            )
        except Exception as event_error:
            current_app.logger.warning(f"Failed to emit event: {str(event_error)}")
        
        return api_response({
            "history_id": history_id,
            "pronunciation_score": pronunciation_score,
            "reading_speed": reading_speed,
            "completed_sentences": completed_sentences,
            "xp_earned": xp_amount
        }, "리딩 결과가 성공적으로 제출되었습니다.")
        
    except Exception as e:
        current_app.logger.error(f"Error in submit_reading: {str(e)}")
        return error_response("리딩 결과 제출 중 오류가 발생했습니다.", 500)

@journey_routes.route('/progress', methods=['GET'])
@require_auth  # For production with auth
async def get_progress():
    """진행 상황 조회 API"""
    user_id = g.user_id
    
    db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    has_subscription = await User.has_active_subscription(db_users, user_id, "journey")
    
    if not has_subscription:
        return error_response("Korean Journey 서비스 구독이 필요합니다.", 403)
    
    try:
        db_journey = current_app.mongo_client[current_app.config.get("MONGO_DB_JOURNEY")]
        history_list = await Journey.get_user_history(db_journey, user_id)
        
        # REMOVED: Filtering for mock_content_id
        content_ids = [ObjectId(item.get('contentId')) for item in history_list]
        contents = {}
        
        for content_id in content_ids:
            content = await Journey.find_by_id(db_journey, content_id)
            if content:
                contents[str(content_id)] = {
                    "title": content.get('title'),
                    "level": content.get('level'),
                    "content_type": content.get('content_type')
                }
        
        history_data = []
        for item in history_list:
            content_id = str(item.get('contentId'))
            
            if content_id in contents:
                history_data.append({
                    "history_id": str(item.get('_id')),
                    "content_id": content_id,
                    "content_title": contents[content_id].get('title'),
                    "level": contents[content_id].get('level'),
                    "content_type": contents[content_id].get('content_type'),
                    "reading_speed": item.get('readingSpeed'),
                    "pronunciation_score": item.get('pronunciationScore'),
                    "completed_sentences": item.get('completedSentences'),
                    "date": item.get('date').isoformat() if 'date' in item else None
                })
        
        level_stats = {}
        for item in history_data:
            level = item.get('level')
            
            if level not in level_stats:
                level_stats[level] = {
                    "count": 0,
                    "total_pronunciation": 0,
                    "total_sentences": 0
                }
            
            level_stats[level]["count"] += 1
            level_stats[level]["total_pronunciation"] += item.get('pronunciation_score', 0)
            level_stats[level]["total_sentences"] += item.get('completed_sentences', 0)
        
        for level, stats in level_stats.items():
            if stats["count"] > 0:
                stats["avg_pronunciation"] = round(stats["total_pronunciation"] / stats["count"], 2)
                stats["avg_sentences"] = round(stats["total_sentences"] / stats["count"], 2)
            else:
                stats["avg_pronunciation"] = 0
                stats["avg_sentences"] = 0
        
        date_stats = {}
        for item in history_data:
            date = item.get('date').split('T')[0] if item.get('date') else None
            
            if date and date not in date_stats:
                date_stats[date] = {
                    "count": 0,
                    "total_sentences": 0
                }
            
            if date:
                date_stats[date]["count"] += 1
                date_stats[date]["total_sentences"] += item.get('completed_sentences', 0)
        
        date_stats_list = [
            {
                "date": date,
                "count": stats["count"],
                "total_sentences": stats["total_sentences"]
            }
            for date, stats in date_stats.items()
        ]
        
        date_stats_list.sort(key=lambda x: x["date"], reverse=True)
        
        return api_response({
            "history": history_data,
            "level_stats": level_stats,
            "date_stats": date_stats_list,
            "total_readings": len(history_data),
            "total_sentences": sum(item.get('completed_sentences', 0) for item in history_data),
            "avg_pronunciation": round(
                sum(item.get('pronunciation_score', 0) for item in history_data) / 
                max(1, len(history_data)),
                2
            )
        }, "진행 상황을 성공적으로 조회했습니다.")
        
    except Exception as e:
        current_app.logger.error(f"Error in get_progress: {str(e)}")
        return error_response("진행 상황 조회 중 오류가 발생했습니다.", 500)

@journey_routes.route('/usage', methods=['GET'])
@require_auth  # For production with auth
async def get_usage():
    """사용량 조회 API"""
    user_id = g.user_id
    
    try:
        db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
        has_subscription = await User.has_active_subscription(db_users, user_id, "journey")
        
        remaining = await current_app.usage_limiter.get_remaining(
            user_id, 
            "journey",
            current_app.config.get("JOURNEY_DAILY_LIMIT", 20)
        )
        
        return api_response({
            "product": "journey",
            "has_subscription": has_subscription,
            "daily_limit": current_app.config.get("JOURNEY_DAILY_LIMIT", 20),
            "remaining": remaining,
            "reset_at": (datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
        }, "사용량 정보를 성공적으로 조회했습니다.")
        
    except Exception as e:
        current_app.logger.error(f"Error in get_usage: {str(e)}")
        return error_response("사용량 조회 중 오류가 발생했습니다.", 500)
