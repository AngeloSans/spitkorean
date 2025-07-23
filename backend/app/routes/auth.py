from quart import Blueprint, request, jsonify, current_app
from bson.objectid import ObjectId
import bcrypt
from datetime import datetime
from app.utils.response import api_response, error_response

auth_routes = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

@auth_routes.route('/register', methods=['POST'])
async def register():
    data = await request.json
    print("DEBUG - register data:", data)

    if not data or not data.get('email') or not data.get('password'):
        print("Error: Missing email or password")
        return error_response("이메일과 비밀번호가 필요합니다", 400)
    
    if data.get('password') != data.get('confirmPassword'):
        print("Error: Password and confirmation do not match")
        return error_response("비밀번호가 일치하지 않습니다", 400)

    users_collection = current_app.mongo_client[current_app.config["MONGO_DB_USERS"]].users
    existing_user = await users_collection.find_one({"email": data["email"]})
    
    if existing_user:
        print("Error: User already exists")
        return error_response("이미 등록된 이메일입니다", 400)

    hashed_password = bcrypt.hashpw(data["password"].encode('utf-8'), bcrypt.gensalt())
    
    new_user = {
        "email": data["email"],
        "password": hashed_password.decode('utf-8'),
        "profile": {
            "name": data.get("name", ""),
            "nativeLanguage": data.get("nativeLanguage", "en"),
            "koreanLevel": data.get("koreanLevel", "beginner"),
            "interests": data.get("interests", [])
        },
        "subscriptions": [],
        "preferences": {
            "studyGoals": data.get("studyGoals", []),
            "dailyStudyTime": data.get("dailyStudyTime", 15)
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await users_collection.insert_one(new_user)
    user_id = result.inserted_id
    print(f"User created with id: {user_id}")

    try:
        token = current_app.auth_manager.generate_token(user_id)
    except Exception as e:
        print(f"Error generating token: {e}")
        return error_response("토큰 생성 오류", 500)

    response = api_response({
        "token": token,
        "user": {
            "id": str(user_id),
            "email": new_user["email"],
            "profile": new_user["profile"]
        }
    }, "회원가입이 완료되었습니다", 201)
    print("Returning successful response")
    return response


# 2. login 함수에서도 동일하게 수정
@auth_routes.route('/login', methods=['POST'])
async def login():
    data = await request.json
    
    if not data or not data.get('email') or not data.get('password'):
        return error_response("이메일과 비밀번호가 필요합니다", 400)
    
    # 사용자 조회
    users_collection = current_app.mongo_client[current_app.config["MONGO_DB_USERS"]].users
    user = await users_collection.find_one({"email": data["email"]})
    
    if not user:
        return error_response("등록되지 않은 이메일입니다", 404)
    
    # 비밀번호 검증
    if not bcrypt.checkpw(data["password"].encode('utf-8'), user["password"].encode('utf-8')):
        return error_response("비밀번호가 일치하지 않습니다", 401)
    
    # JWT 토큰 생성 (AuthManager 사용)
    token = current_app.auth_manager.generate_token(user["_id"])
    
    return api_response({
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "profile": user["profile"]
        }
    }, "로그인이 완료되었습니다")

# 3. 나머지 라우트들도 데코레이터를 올바르게 사용하도록 수정
@auth_routes.route('/me', methods=['GET'])
async def get_current_user():
    # 헤더에서 토큰 추출 및 검증
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return error_response("인증 토큰이 필요합니다", 401)
    
    token = auth_header.replace('Bearer ', '').replace('bearer ', '')
    user_id = current_app.auth_manager.verify_token(token)
    
    if not user_id:
        return error_response("유효하지 않은 토큰입니다", 401)
    
    # 사용자 조회
    users_collection = current_app.mongo_client[current_app.config["MONGO_DB_USERS"]].users
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        return error_response("사용자를 찾을 수 없습니다", 404)
    
    # 구독 상태 조회
    subscriptions = []
    for sub in user.get("subscriptions", []):
        if isinstance(sub, dict) and sub.get("status") == "active":
            subscriptions.append(sub.get("product"))
    
    return api_response({
        "id": str(user["_id"]),
        "email": user["email"],
        "profile": user["profile"],
        "subscriptions": subscriptions,
        "preferences": user.get("preferences", {})
    }, "사용자 정보를 성공적으로 조회했습니다")

@auth_routes.route('/update-profile', methods=['PUT'])
async def update_profile():
    # 헤더에서 토큰 추출 및 검증
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return error_response("인증 토큰이 필요합니다", 401)
    
    token = auth_header.replace('Bearer ', '').replace('bearer ', '')
    user_id = current_app.auth_manager.verify_token(token)
    
    if not user_id:
        return error_response("유효하지 않은 토큰입니다", 401)
    
    data = await request.json
    
    if not data:
        return error_response("업데이트할 데이터가 필요합니다", 400)
    
    # 업데이트할 프로필 필드
    update_data = {}
    
    # 프로필 필드 업데이트
    if "profile" in data:
        for field in ["name", "nativeLanguage", "koreanLevel", "interests"]:
            if field in data["profile"]:
                update_data[f"profile.{field}"] = data["profile"][field]
    
    # 사용자 기본 설정 업데이트
    if "preferences" in data:
        for field in ["studyGoals", "dailyStudyTime"]:
            if field in data["preferences"]:
                update_data[f"preferences.{field}"] = data["preferences"][field]
    
    # 업데이트 시간 추가
    update_data["updated_at"] = datetime.utcnow()
    
    # 사용자 업데이트
    users_collection = current_app.mongo_client[current_app.config["MONGO_DB_USERS"]].users
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    return api_response({
        "updated_fields": list(update_data.keys())
    }, "프로필이 성공적으로 업데이트되었습니다")


@auth_routes.route('/logout', methods=['POST'])
async def logout():

    return api_response({}, "로그아웃되었습니다", 200)