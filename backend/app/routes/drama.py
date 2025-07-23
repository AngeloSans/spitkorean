from quart import Blueprint, request, jsonify, current_app, g
from bson.objectid import ObjectId
import uuid
from datetime import datetime, timedelta 

from app.models.drama import Drama
from app.models.user import User
from app.utils.response import api_response, error_response
# from app.services.gpt_service import GPTService # REMOVED: No longer imported directly
# from app.data.mock_drama_sentences import get_mock_drama_data, get_mock_sentences # No longer used for fallback
from app.core.auth import require_auth

drama_routes = Blueprint('drama', __name__, url_prefix='/api/v1/drama')

# GPT service is accessed via current_app.gpt_service

@drama_routes.route('/sentences', methods=['GET'])
@require_auth  # For production with auth
async def get_sentences():
    """드라마 문장 목록 조회 API"""
    user_id = g.user_id
    
    level = request.args.get('level', 'beginner')
    if level not in ['beginner', 'intermediate', 'advanced']:
        return error_response("유효하지 않은 레벨입니다. beginner, intermediate, advanced 중 하나를 선택하세요.", 400)
    
    db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    has_subscription = await User.has_active_subscription(db_users, user_id, "drama")
    
    if not has_subscription:
        return error_response("Drama Builder 서비스 구독이 필요합니다.", 403)
    
    can_use = await current_app.usage_limiter.check_limit(
        user_id, 
        "drama",
        current_app.config.get("DRAMA_DAILY_LIMIT", 20)
    )
    
    if not can_use:
        return error_response("오늘의 사용량을 초과했습니다.", 429)
    
    try:
        db_drama = current_app.mongo_client[current_app.config.get("MONGO_DB_DRAMA")]
        dramas = await Drama.find_by_level(db_drama, level, limit=5)
        
        if not dramas:
            current_app.logger.info(f"No existing drama data found for level {level}, attempting to generate with GPT")
            
            prompts = {
                "beginner": "한국어 초급 레벨(3-5단어)의 간단한 한국 드라마 대화 문장 5개를 생성해주세요. 일상 대화 위주로 만들어주세요.",
                "intermediate": "한국어 중급 레벨(7-10단어)의 한국 드라마 대화 문장 5개를 생성해주세요. 감정 표현과 연결어미를 포함해주세요.",
                "advanced": "한국어 고급 레벨(12단어 이상)의 복잡한 한국 드라마 대화 문장 5개를 생성해주세요. 관형절과 고급 표현을 포함해주세요."
            }
            
            # Always attempt to use GPT service
            if not current_app.config.get('USE_OPENAI', True) or not current_app.gpt_service.openai_client:
                current_app.logger.error("OpenAI is disabled or client not initialized. Cannot generate sentences.")
                return error_response("문장을 불러오는데 실패했습니다. (OpenAI indisponível)", 500)

            current_app.logger.info(f"Attempting to generate sentences with GPT for level {level}")
            generated_sentences = await current_app.gpt_service.generate_drama_sentences(prompts[level])
            
            drama_data = {
                "title": f"{level.capitalize()} 드라마 대화",
                "description": f"{level} 레벨에 적합한 드라마 대화 문장",
                "level": level,
                "sentences": [
                    {
                        "id": str(uuid.uuid4()),
                        "content": sentence,
                        "translation": "",
                        "grammar_points": []
                    }
                    for sentence in generated_sentences
                ],
                "genre": "daily",
                "source": "AI 생성"
            }
            
            await Drama.create(db_drama, drama_data)
            dramas = await Drama.find_by_level(db_drama, level, limit=5)
            current_app.logger.info(f"Successfully generated and saved {len(generated_sentences)} sentences")
            
        # 응답 데이터 가공
        sentences = []
        for drama in dramas:
            for sentence in drama.get('sentences', []):
                sentences.append({
                    "id": sentence.get('id'),
                    "content": sentence.get('content'),
                    "translation": sentence.get('translation', ''),
                    "grammar_points": sentence.get('grammar_points', []),
                    "drama_title": drama.get('title'),
                    "drama_id": str(drama.get('_id'))
                })
        
        remaining = await current_app.usage_limiter.get_remaining(
            user_id, 
            "drama",
            current_app.config.get("DRAMA_DAILY_LIMIT", 20)
        )
        
        return api_response({
            "sentences": sentences,
            "level": level,
            "total": len(sentences),
            "remaining_usage": remaining,
            "source": "database"
        }, "드라마 문장을 성공적으로 조회했습니다.")
        
    except Exception as e:
        current_app.logger.error(f"Unexpected error in get_sentences: {str(e)}")
        # If any error occurs, return a generic error response, no mock fallback
        return error_response("문장을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.", 500)

@drama_routes.route('/check', methods=['POST'])
@require_auth  # For production with auth
async def check_sentence():
    """문장 구성 확인 API"""
    user_id = g.user_id
    data = await request.json
    
    if not data or not data.get('sentence_id') or not data.get('user_answer'):
        return error_response("문장 ID와 사용자 응답이 필요합니다.", 400)
    
    db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    has_subscription = await User.has_active_subscription(db_users, user_id, "drama")
    
    if not has_subscription:
        return error_response("Drama Builder 서비스 구독이 필요합니다.", 403)
    
    level = data.get('level', 'beginner')
    
    try:
        db_drama = current_app.mongo_client[current_app.config.get("MONGO_DB_DRAMA")]
        sentence_id = data.get('sentence_id')
        drama_id = data.get('drama_id')
        
        # Always assume real DB data
        drama = await Drama.find_by_id(db_drama, drama_id)
        
        if not drama:
            return error_response("드라마를 찾을 수 없습니다.", 404)
        
        correct_sentence = None
        for sentence in drama.get('sentences', []):
            if sentence.get('id') == sentence_id:
                correct_sentence = sentence
                break
        
        if not correct_sentence:
            return error_response("문장을 찾을 수 없습니다.", 404)
        
        user_answer = data.get('user_answer')
        correct_content = correct_sentence.get('content')
        
        is_correct = user_answer.strip() == correct_content.strip()
        
        # Always attempt to use GPT service for similar sentences and grammar points
        if not current_app.config.get('USE_OPENAI', True) or not current_app.gpt_service.openai_client:
            current_app.logger.error("OpenAI is disabled or client not initialized. Cannot generate similar sentences or grammar points.")
            return error_response("문장 분석에 실패했습니다. (OpenAI indisponível)", 500)

        similar_sentences = await current_app.gpt_service.generate_similar_sentences(correct_content, level)
        grammar_points = await current_app.gpt_service.extract_grammar_points(correct_content, level)
        
        # Progress update (always for real data)
        try:
            await Drama.update_progress(db_drama, user_id, drama_id, sentence_id, is_correct, level)
        except Exception as progress_error:
            current_app.logger.warning(f"Failed to update progress: {str(progress_error)}")
        
        from app.models.common import Common
        db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
        
        xp_amount = 0
        if is_correct:
            xp_amount = 10
            
            if level == "intermediate":
                xp_amount += 5
            elif level == "advanced":
                xp_amount += 10
            
            try:
                await Common.add_xp(db_users, user_id, xp_amount, "drama_complete")
            except Exception as xp_error:
                current_app.logger.warning(f"Failed to add XP: {str(xp_error)}")
        
        try:
            await current_app.event_bus.emit_user_activity(
                user_id, 
                "drama_check", 
                "drama", 
                {
                    "drama_id": drama_id,
                    "sentence_id": sentence_id,
                    "is_correct": is_correct,
                    "level": level
                }
            )
        except Exception as event_error:
            current_app.logger.warning(f"Failed to emit event: {str(event_error)}")
        
        return api_response({
            "is_correct": is_correct,
            "correct_sentence": correct_content,
            "similar_sentences": similar_sentences,
            "grammar_points": grammar_points,
            "xp_earned": xp_amount if is_correct else 0
        }, "문장 확인이 완료되었습니다.")
        
    except Exception as e:
        current_app.logger.error(f"Error in check_sentence: {str(e)}")
        # If any error occurs, return a generic error response, no mock fallback
        return error_response("문장 확인 중 오류가 발생했습니다.", 500)

@drama_routes.route('/progress', methods=['GET'])
@require_auth  # For production with auth
async def get_progress():
    """진행 상황 조회 API"""
    user_id = g.user_id
    
    db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    has_subscription = await User.has_active_subscription(db_users, user_id, "drama")
    
    if not has_subscription:
        return error_response("Drama Builder 서비스 구독이 필요합니다.", 403)
    
    try:
        db_drama = current_app.mongo_client[current_app.config.get("MONGO_DB_DRAMA")]
        progress_list = await Drama.get_user_progress(db_drama, user_id)
        
        # REMOVED: Filtering for mock_drama_id
        drama_ids = [ObjectId(item.get('dramaId')) for item in progress_list]
        dramas = {}
        
        for drama_id in drama_ids:
            drama = await Drama.find_by_id(db_drama, drama_id)
            if drama:
                dramas[str(drama_id)] = {
                    "title": drama.get('title'),
                    "level": drama.get('level'),
                    "total_sentences": len(drama.get('sentences', []))
                }
        
        progress_data = []
        for item in progress_list:
            drama_id = str(item.get('dramaId'))
            completed_sentences = item.get('completedSentences', [])
            
            if drama_id in dramas:
                total_sentences = dramas[drama_id].get('total_sentences', 0)
                completion_rate = (len(completed_sentences) / total_sentences) * 100 if total_sentences > 0 else 0
                
                progress_data.append({
                    "drama_id": drama_id,
                    "drama_title": dramas[drama_id].get('title'),
                    "level": dramas[drama_id].get('level'),
                    "completed_sentences": len(completed_sentences),
                    "total_sentences": total_sentences,
                    "completion_rate": round(completion_rate, 2),
                    "last_updated": item.get('updated_at').isoformat() if 'updated_at' in item else None
                })
        
        level_stats = {
            "beginner": {"completed": 0, "total": 0},
            "intermediate": {"completed": 0, "total": 0},
            "advanced": {"completed": 0, "total": 0}
        }
        
        for item in progress_data:
            level = item.get('level')
            if level in level_stats:
                level_stats[level]["completed"] += item.get('completed_sentences', 0)
                level_stats[level]["total"] += item.get('total_sentences', 0)
        
        for level, stats in level_stats.items():
            if stats["total"] > 0:
                stats["completion_rate"] = round((stats["completed"] / stats["total"]) * 100, 2)
            else:
                stats["completion_rate"] = 0
        
        return api_response({
            "progress": progress_data,
            "level_stats": level_stats,
            "total_completed": sum(item.get('completed_sentences', 0) for item in progress_data)
        }, "진행 상황을 성공적으로 조회했습니다.")
        
    except Exception as e:
        current_app.logger.error(f"Error in get_progress: {str(e)}")
        return error_response("진행 상황 조회 중 오류가 발생했습니다.", 500)

@drama_routes.route('/usage', methods=['GET'])
@require_auth  # For production with auth
async def get_usage():
    """사용량 조회 API"""
    user_id = g.user_id
    
    try:
        db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
        has_subscription = await User.has_active_subscription(db_users, user_id, "drama")
        
        remaining = await current_app.usage_limiter.get_remaining(
            user_id, 
            "drama",
            current_app.config.get("DRAMA_DAILY_LIMIT", 20)
        )
        
        return api_response({
            "product": "drama",
            "has_subscription": has_subscription,
            "daily_limit": current_app.config.get("DRAMA_DAILY_LIMIT", 20),
            "remaining": remaining,
            "reset_at": (datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
        }, "사용량 정보를 성공적으로 조회했습니다.")
        
    except Exception as e:
        current_app.logger.error(f"Error in get_usage: {str(e)}")
        return error_response("사용량 조회 중 오류가 발생했습니다.", 500)
