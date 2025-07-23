from quart import Blueprint, Quart, jsonify
from motor.motor_asyncio import AsyncIOMotorClient
from redis.asyncio import Redis
import os
from dotenv import load_dotenv
from datetime import datetime

from app.core.auth import AuthManager
from app.core.rate_limiter import UsageLimiter
from app.core.cache_manager import CacheManager
from app.core.event_bus import EventBus

from app.routes.auth import auth_routes
from app.routes.talk import talk_routes
from app.routes.drama import drama_routes
from app.routes.test import test_routes
from app.routes.journey import journey_routes
from app.routes.common import common_routes
from app.routes.translation import translation_routes
from app.routes.webhook import webhooks
from app.config import settings

load_dotenv()

app = Quart(__name__)

# 환경 변수 설정
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "your-secret-key")
app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017")
app.config["REDIS_URL"] = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
app.config["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "")

# Pydantic settings를 Flask config에 추가
app.config.update(
    MONGO_DB_USERS=settings.MONGO_DB_USERS,
    MONGO_DB_TALK=settings.MONGO_DB_TALK,
    MONGO_DB_DRAMA=settings.MONGO_DB_DRAMA,
    MONGO_DB_TEST=settings.MONGO_DB_TEST,
    MONGO_DB_JOURNEY=settings.MONGO_DB_JOURNEY,
    MONGO_DB_GAMIFICATION=settings.MONGO_DB_GAMIFICATION,
    JWT_SECRET_KEY=settings.JWT_SECRET_KEY,
    JWT_ALGORITHM=settings.JWT_ALGORITHM,
    JWT_ACCESS_TOKEN_EXPIRE_HOURS=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS,
)

# 데이터베이스 및 캐시 클라이언트 설정
@app.before_serving
async def setup_clients():
    """애플리케이션 시작 시 클라이언트 초기화"""
    try:
        # MongoDB 클라이언트 초기화
        app.mongo_client = AsyncIOMotorClient(app.config["MONGO_URI"])
        
        # Redis 클라이언트 초기화 (선택적)
        redis_url = app.config.get("REDIS_URL")
        if redis_url:
            try:
                app.redis_client = Redis.from_url(redis_url)
                # Redis 연결 테스트
                await app.redis_client.ping()
                print("✅ Redis connected successfully")
            except Exception as e:
                print(f"⚠️ Redis connection failed: {e}")
                app.redis_client = None
        else:
            print("⚠️ Redis URL not configured, using fallback cache")
            app.redis_client = None
        
        # 핵심 서비스 객체 초기화
        app.auth_manager = AuthManager()
        app.usage_limiter = UsageLimiter(app.redis_client)
        app.cache_manager = CacheManager(app.redis_client)
        app.event_bus = EventBus(app.redis_client)
        
        # 데이터베이스 연결 테스트
        try:
            await app.mongo_client.admin.command('ping')
            print("✅ MongoDB connected successfully")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            raise
        
        # 이벤트 버스 백그라운드 리스너 시작
        if app.redis_client:
            app.add_background_task(app.event_bus.start_listener)
            print("✅ Event bus listener started")
        else:
            print("⚠️ Event bus listener not started (Redis not available)")
        
        print("🚀 SpitKorean application initialized successfully!")
        
    except Exception as e:
        print(f"❌ Application initialization failed: {e}")
        raise

@app.after_serving
async def cleanup_clients():
    """애플리케이션 종료 시 클라이언트 정리"""
    try:
        if hasattr(app, 'event_bus'):
            await app.event_bus.stop_listener()
            print("✅ Event bus listener stopped")
        
        if hasattr(app, 'redis_client') and app.redis_client:
            await app.redis_client.close()
            print("✅ Redis connection closed")
        
        if hasattr(app, 'mongo_client'):
            app.mongo_client.close()
            print("✅ MongoDB connection closed")
        
        print("🔄 SpitKorean application cleanup completed!")
        
    except Exception as e:
        print(f"⚠️ Cleanup error: {e}")

# 에러 핸들러
@app.errorhandler(500)
async def internal_error(error):
    return {
        "status": "error",
        "message": "서버 내부 오류가 발생했습니다",
        "error_type": "internal_server_error"
    }, 500

@app.errorhandler(404)
async def not_found(error):
    return {
        "status": "error", 
        "message": "요청한 리소스를 찾을 수 없습니다",
        "error_type": "not_found"
    }, 404

@app.errorhandler(401)
async def unauthorized(error):
    return {
        "status": "error",
        "message": "인증이 필요합니다",
        "error_type": "unauthorized"
    }, 401

# CORS 설정
@app.after_request
async def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Max-Age"] = "86400"
    return response

# OPTIONS 요청 처리
@app.route("/<path:path>", methods=["OPTIONS"])
async def handle_options(path):
    return "", 204

# 라우트 등록 - URL 프리픽스 추가
app.register_blueprint(auth_routes, url_prefix='/api/v1/auth')
app.register_blueprint(talk_routes, url_prefix='/api/v1/talk')
app.register_blueprint(drama_routes, url_prefix='/api/v1/drama')
app.register_blueprint(test_routes, url_prefix='/api/v1/test')
app.register_blueprint(journey_routes, url_prefix='/api/v1/journey')
app.register_blueprint(common_routes, url_prefix='/api/v1/common')
app.register_blueprint(translation_routes, url_prefix='/api/v1/translation')
app.register_blueprint(webhooks, url_prefix='/api/v1/webhook')

# 기본 라우트
@app.route("/")
async def index():
    return jsonify({"message": "Welcome to SpitKorean API"})

# 헬스체크 라우트
@app.route("/health")
async def health():
    return jsonify({"status": "healthy"})

# 디버그용 라우트 목록 확인
@app.route("/routes")
async def list_routes():
    """등록된 라우트 목록 확인용"""
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'rule': rule.rule
        })
    return jsonify({"routes": routes})

if __name__ == "__main__":
    app.run(
        debug=os.getenv("FLASK_ENV") == "development", 
        host="0.0.0.0", 
        port=int(os.getenv("PORT", 5000))
    )
