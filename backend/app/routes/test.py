from quart import Blueprint, request, jsonify, current_app, g
from bson.objectid import ObjectId
import uuid
from datetime import datetime, timedelta
from app.models.test import Test
from app.models.user import User
from app.utils.response import api_response, error_response
from app.services.gpt_service import GPTService
from app.core.auth import require_auth

test_routes = Blueprint('test', __name__, url_prefix='/api/v1/test')

# GPT 서비스 초기화
gpt_service = GPTService()

@test_routes.route('/questions', methods=['GET'])
@require_auth  # For production with auth
async def get_questions():
    """TOPIK 문제 조회 API"""
    user_id = g.user_id
    
    # 파라미터 확인
    level = request.args.get('level', '1')
    count = int(request.args.get('count', '10'))
    test_type = request.args.get('type')
    
    # 레벨 검증
    try:
        level = int(level)
        if level < 1 or level > 6:
            return error_response("레벨은 1부터 6까지의 정수여야 합니다.", 400)
    except ValueError:
        return error_response("레벨은 정수여야 합니다.", 400)
    
    # 문제 개수 제한
    if count > 20:
        count = 20
    
    # 구독 상태 확인
    db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    has_subscription = await User.has_active_subscription(db_users, user_id, "test")
    
    if not has_subscription:
        return error_response("Test & Study 서비스 구독이 필요합니다.", 403)
    
    # 사용 제한 확인
    can_use = await current_app.usage_limiter.check_limit(
        user_id, 
        "test", 
        current_app.config.get("TEST_DAILY_LIMIT", 20)
    )
    
    if not can_use:
        return error_response("오늘의 사용량을 초과했습니다.", 429)
    
    # 테스트 문제 조회
    db_test = current_app.mongo_client[current_app.config.get("MONGO_DB_TEST")]
    test_content = await Test.find_by_level_and_type(db_test, level, test_type, limit=1)
    
    if not test_content:
        # 테스트 데이터가 없는 경우, GPT로 생성
        # 실제 구현에서는 미리 생성된 데이터를 사용하는 것이 좋음
        
        # 레벨별 문제 생성 프롬프트
        level_descriptions = {
            1: "TOPIK I - 1급 (초급) 수준의 한국어 문제",
            2: "TOPIK I - 2급 (초급) 수준의 한국어 문제",
            3: "TOPIK II - 3급 (중급) 수준의 한국어 문제",
            4: "TOPIK II - 4급 (중급) 수준의 한국어 문제",
            5: "TOPIK II - 5급 (고급) 수준의 한국어 문제",
            6: "TOPIK II - 6급 (고급) 수준의 한국어 문제"
        }
        
        type_descriptions = {
            "vocabulary": "어휘",
            "grammar": "문법",
            "reading": "읽기",
            "listening": "듣기",
            "writing": "쓰기"
        }
        
        type_str = type_descriptions.get(test_type, "종합")
        prompt = f"{level_descriptions[level]}의 {type_str} 문제 {count}개를 생성해주세요. 각 문제는 질문, 4개의 선택지, 정답, 해설을 포함해야 합니다."
        
        # GPT를 사용하여 문제 생성
        generated_questions = await gpt_service.generate_test_questions(prompt, count)
        
        # 생성된 문제를 DB에 저장
        test_data = {
            "title": f"TOPIK {level}급 {type_str} 문제",
            "description": f"TOPIK {level}급 {type_str} 테스트",
            "level": level,
            "test_type": test_type,
            "questions": generated_questions
        }
        
        await Test.create(db_test, test_data)
        test_content = await Test.find_by_level_and_type(db_test, level, test_type, limit=1)
    
    # 응답 데이터 가공
    if test_content:
        test = test_content[0]
        questions = test.get('questions', [])
        
        # 문제 수 제한
        if len(questions) > count:
            questions = questions[:count]
        
        # 정답 정보 제외
        for question in questions:
            if 'answer' in question:
                del question['answer']
            if 'explanation' in question:
                del question['explanation']
        
        test_data = {
            "test_id": str(test.get('_id')),
            "title": test.get('title'),
            "level": test.get('level'),
            "test_type": test.get('test_type'),
            "questions": questions,
            "total_questions": len(questions)
        }
    else:
        # 생성에 실패한 경우
        return error_response("문제 생성에 실패했습니다.", 500)
    
    # 남은 사용량
    remaining = await current_app.usage_limiter.get_remaining(
        user_id, 
        "test", 
        current_app.config.get("TEST_DAILY_LIMIT", 20)
    )
    
    return api_response({
        "test": test_data,
        "remaining_usage": remaining
    }, "TOPIK 문제를 성공적으로 조회했습니다.")

@test_routes.route('/submit', methods=['POST'])
@require_auth  # For production with auth
async def submit_answers():
    """테스트 답안 제출 API"""
    user_id = g.user_id
    data = await request.json
    
    if not data or not data.get('test_id') or not data.get('answers'):
        return error_response("테스트 ID와 답안이 필요합니다.", 400)
    
    # 구독 상태 확인
    db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    has_subscription = await User.has_active_subscription(db_users, user_id, "test")
    
    if not has_subscription:
        return error_response("Test & Study 서비스 구독이 필요합니다.", 403)
    
    # 테스트 정보 조회
    db_test = current_app.mongo_client[current_app.config.get("MONGO_DB_TEST")]
    test_id = data.get('test_id')
    test = await Test.find_by_id(db_test, test_id)
    
    if not test:
        return error_response("테스트를 찾을 수 없습니다.", 404)
    
    # 답안 채점
    answers = data.get('answers')
    questions = test.get('questions', [])
    
    # 채점 결과 생성
    graded_questions = []
    correct_count = 0
    
    for answer in answers:
        question_id = answer.get('question_id')
        user_answer = answer.get('answer')
        
        # 문제 찾기
        question = None
        for q in questions:
            if q.get('id') == question_id:
                question = q
                break
        
        if not question:
            continue
        
        # 정답 확인
        correct_answer = question.get('answer')
        is_correct = user_answer == correct_answer
        
        if is_correct:
            correct_count += 1
        
        graded_questions.append({
            "question": question.get('question'),
            "user_answer": user_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "explanation": question.get('explanation', '')
        })
    
    # 총점 계산
    total_questions = len(graded_questions)
    score = (correct_count / total_questions) * 100 if total_questions > 0 else 0
    
    # 취약점 분석
    wrong_questions = [q for q in graded_questions if not q.get('is_correct')]
    
    # GPT를 사용하여 취약점 분석
    weaknesses = []
    if wrong_questions:
        wrong_texts = [f"문제: {q.get('question')}, 정답: {q.get('correct_answer')}, 사용자 답변: {q.get('user_answer')}" 
                      for q in wrong_questions]
        weaknesses = await gpt_service.analyze_test_weaknesses("\n".join(wrong_texts))
    
    # 결과 저장
    result_id = await Test.save_results(
        db_test,
        user_id,
        test_id,
        score,
        graded_questions,
        weaknesses
    )
    
    # 게임화 데이터 업데이트
    from app.models.common import Common
    
    # XP 추가
    xp_amount = int(score / 10)  # 점수에 따라 XP 부여
    
    await Common.add_xp(db_users, user_id, xp_amount, "test_complete")
    
    # 이벤트 발행
    await current_app.event_bus.emit_user_activity(
        user_id, 
        "test_complete", 
        "test", 
        {
            "test_id": test_id,
            "score": score,
            "level": test.get('level'),
            "test_type": test.get('test_type')
        }
    )
    
    return api_response({
        "result_id": result_id,
        "score": round(score, 2),
        "correct_count": correct_count,
        "total_questions": total_questions,
        "graded_questions": graded_questions,
        "weaknesses": weaknesses,
        "xp_earned": xp_amount
    }, "테스트 답안이 성공적으로 제출되었습니다.")

@test_routes.route('/results', methods=['GET'])
@require_auth  # For production with auth
async def get_results():
    """테스트 결과 조회 API"""
    user_id = g.user_id
    
    # 구독 상태 확인
    db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    has_subscription = await User.has_active_subscription(db_users, user_id, "test")
    
    if not has_subscription:
        return error_response("Test & Study 서비스 구독이 필요합니다.", 403)
    
    # 결과 조회
    db_test = current_app.mongo_client[current_app.config.get("MONGO_DB_TEST")]
    results = await Test.get_user_results(db_test, user_id)
    
    # 통계 조회
    stats = await Test.get_user_stats(db_test, user_id)
    
    # 응답 데이터 가공
    formatted_results = []
    for result in results:
        formatted_results.append({
            "result_id": str(result.get('_id')),
            "test_type": result.get('testType'),
            "level": result.get('level'),
            "score": result.get('score'),
            "date": result.get('date').isoformat() if 'date' in result else None,
            "questions_count": len(result.get('questions', [])),
            "weaknesses": result.get('weaknesses', [])
        })
    
    # 레벨별 통계 가공
    level_stats = []
    for stat in stats.get('level_stats', []):
        level_stats.append({
            "level": stat.get('_id'),
            "average_score": round(stat.get('average_score', 0), 2),
            "tests_taken": stat.get('count', 0)
        })
    
    # 유형별 통계 가공
    type_stats = []
    for stat in stats.get('type_stats', []):
        type_stats.append({
            "type": stat.get('_id'),
            "average_score": round(stat.get('average_score', 0), 2),
            "tests_taken": stat.get('count', 0)
        })
    
    # 취약점 통계 가공
    weakness_stats = []
    for stat in stats.get('weaknesses', []):
        weakness_stats.append({
            "weakness": stat.get('_id'),
            "count": stat.get('count', 0)
        })
    
    return api_response({
        "results": formatted_results,
        "stats": {
            "level_stats": level_stats,
            "type_stats": type_stats,
            "weaknesses": weakness_stats,
            "total_tests": sum(stat.get('count', 0) for stat in stats.get('level_stats', [])),
            "average_score": round(sum(stat.get('average_score', 0) * stat.get('count', 0) 
                                   for stat in stats.get('level_stats', [])) / 
                            max(1, sum(stat.get('count', 0) for stat in stats.get('level_stats', []))), 2)
        }
    }, "테스트 결과를 성공적으로 조회했습니다.")

@test_routes.route('/usage', methods=['GET'])
@require_auth  # For production with auth
async def get_usage():
    """사용량 조회 API"""
    user_id = g.user_id
    
    # 구독 상태 확인
    db_users = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    has_subscription = await User.has_active_subscription(db_users, user_id, "test")
    
    # 남은 사용량 확인
    remaining = await current_app.usage_limiter.get_remaining(
        user_id, 
        "test", 
        current_app.config.get("TEST_DAILY_LIMIT", 20)
    )
    
    return api_response({
        "product": "test",
        "has_subscription": has_subscription,
        "daily_limit": current_app.config.get("TEST_DAILY_LIMIT", 20),
        "remaining": remaining,
        "reset_at": (datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
    }, "사용량 정보를 성공적으로 조회했습니다.")
