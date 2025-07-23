from quart import Blueprint, request, jsonify, current_app, g
from bson.objectid import ObjectId
import bcrypt
from datetime import datetime
from app.services.gpt_service import GPTService

from app.models.user import User
from app.models.subscription import Subscription
from app.utils.response import api_response, error_response
from app.core.auth import require_auth
from app.services import tts_service

gpt_service = GPTService()

common_routes = Blueprint('common', __name__, url_prefix='/api/v1/common')

@common_routes.route('/tts', methods=['POST'])
async def generate_tts():
    data = await request.json

    if not data or not data.get('text'):
        return error_response("Text input is required", 400)

    text = data['text']
    voice = data.get('voice', 'default')  # Example: choose voice
    speed = data.get('speed', 1.0)        # Speech speed

    # You can include usage limits, permission checks, etc., if you want

    try:
        # Generate audio (base64, URL, or file path)
        audio_data = await tts_service.generate_audio(
            text=text,
            voice=voice,
            speed=speed,
        )
    except Exception as e:
        current_app.logger.error(f"TTS generation failed: {e}")
        return error_response("An error occurred during TTS generation", 500)

    # Return the generated audio (can be base64, URL, etc.)
    return api_response({
        "audio": audio_data,
        "message": "Audio successfully generated"
    })


@common_routes.route('/streak', methods=['GET'])
@require_auth
async def get_streak():
    """
    Continuous learning streak information API (GET)
    """
    user_id = g.user_id

    try:
        db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
        streak_data = await db["streaks"].find_one({"user_id": ObjectId(user_id)})

        if not streak_data:
            return api_response({
                "streak_days": 0,
                "last_updated": None
            }, "No continuous learning information found")

        response_data = {
            "streak_days": streak_data.get("days", 0),
            "last_updated": streak_data.get("last_updated")
        }

        return api_response(response_data, "Continuous learning information retrieved successfully")

    except Exception as e:
        print(f"❌ Error fetching streak: {str(e)}")
        return error_response("Error occurred while fetching continuous learning information", 500)

@common_routes.route('/streak', methods=['POST'])
@require_auth
async def update_streak():
    """Continuous learning streak update API"""
    user_id = g.user_id
    
    # Update continuous learning days in gamification database
    from app.models.common import Common
    db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    
    result = await Common.update_streak(db, user_id)
    
    # Publish event
    if result.get("streak_days") > 0:
        await current_app.event_bus.emit_streak_update(user_id, result.get("streak_days"))
    
    return api_response(result, "Continuous learning information updated successfully")

##new routes
# New routes created because the frontend was calling a route that did not exist

##endpoint for production
@common_routes.route('/translate', methods=['POST'])
async def translate():
    try:
        data = await request.json
        text = data.get('text', '')
        target_language = data.get('target_language') or data.get('target', 'ko')
        source_language = data.get('source_language') or data.get('source', 'ko')

        print(f"🔍 Translate request: {text[:50]}... -> {target_language}")

        if not text:
            return api_response(None, "Missing 'text' parameter", status=400)

        # Simple translation simulation for testing
        if target_language == 'ko':
            translated_text = f"[KO] {text}"
        elif target_language == 'en':
            translated_text = f"[EN] {text}"
        else:
            translated_text = f"[{target_language.upper()}] {text}"

        return api_response({
            "original_text": text,
            "translated_text": translated_text,
            "target_language": target_language,
            "source_language": source_language
        }, "Translation completed successfully")
        
    except Exception as e:
        print(f"❌ Translation error: {str(e)}")
        import traceback
        traceback.print_exc()

        return api_response({
            "original_text": text if 'text' in locals() else "",
            "translated_text": text if 'text' in locals() else "",
            "target_language": target_language if 'target_language' in locals() else "ko",
            "source_language": source_language if 'source_language' in locals() else "ko"
        }, "Translation failed, returning original text")


@common_routes.route('/translate-ui', methods=['POST'])
#@require_auth  
async def translate_ui():
    """UI elements translation API"""
    data = await request.json
    ui_elements = data.get('elements', [])
    target_language = data.get('target_language', 'ko')

    if not isinstance(ui_elements, list):
        return api_response(None, "Parameter 'elements' must be a list", status=400)

    translated_elements = []
    for element in ui_elements:
        try:
            if target_language == 'ko':
                prompt = f"Translate this UI text to Korean: {element}"
            elif target_language == 'en':
                prompt = f"Translate this UI text to English: {element}"
            else:
                prompt = f"Translate this UI text to {target_language}: {element}"

            translated = await gpt_service.generate_response([
                {"role": "user", "content": prompt}
            ], "beginner", "en")
            
            translated_elements.append(translated)
        except Exception as e:
            translated_elements.append(element)  # Fallback to original text

    return api_response({
        "original_elements": ui_elements,
        "translated_elements": translated_elements,
        "target_language": target_language
    }, "UI translation completed successfully")


@common_routes.route('/gamification', methods=['GET'])
@require_auth 
async def get_gamification():
    """Gamification data retrieval API"""
    user_id = g.user_id
    
    # Get user information from gamification database
    from app.models.common import Common
    db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    
    gamification = await Common.get_user_gamification(db, user_id)
    
    if not gamification:
        # Create gamification data if it doesn't exist
        await Common.create_gamification(db, user_id)
        gamification = await Common.get_user_gamification(db, user_id)
    
    # Extract only necessary fields for response
    response_data = {
        "streak_days": gamification.get("streakDays", 0),
        "total_xp": gamification.get("totalXP", 0),
        "current_league": gamification.get("currentLeague", "bronze"),
        "achievements": gamification.get("achievements", []),
        "weekly_progress": gamification.get("weeklyProgress", {"xp": 0})
    }
    
    return api_response(response_data, "Gamification information retrieved successfully")

@common_routes.route('/league-ranking', methods=['GET'])
@require_auth 
async def get_league_ranking():
    """League ranking retrieval API"""
    user_id = g.user_id
    
    # Check user's league
    from app.models.common import Common
    db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    
    gamification = await Common.get_user_gamification(db, user_id)
    
    if not gamification:
        return error_response("Gamification information not found", 404)
    
    current_league = gamification.get("currentLeague", "bronze")
    
    # Get top users in the same league
    pipeline = [
        {"$match": {"currentLeague": current_league}},
        {"$sort": {"weeklyProgress.xp": -1}},
        {"$limit": 100},
        {"$lookup": {
            "from": "users",
            "localField": "userId",
            "foreignField": "_id",
            "as": "user"
        }},
        {"$unwind": "$user"},
        {"$project": {
            "_id": 1,
            "userId": 1,
            "weeklyProgress": 1,
            "userName": "$user.profile.name",
            "userEmail": "$user.email"
        }}
    ]
    
    ranking = await db[Common.gamification_collection].aggregate(pipeline).to_list(length=None)
    
    # Calculate user's own rank
    user_rank = None
    for i, rank in enumerate(ranking):
        if str(rank.get("userId")) == user_id:
            user_rank = i + 1
            break
    
    # Return only top 10
    top_ranking = ranking[:10]
    
    # Format response data
    response_data = {
        "league": current_league,
        "user_rank": user_rank,
        "user_weekly_xp": gamification.get("weeklyProgress", {}).get("xp", 0),
        "total_users": len(ranking),
        "top_ranking": [
            {
                "rank": i + 1,
                "name": item.get("userName", "User"),
                "weekly_xp": item.get("weeklyProgress", {}).get("xp", 0),
                "is_current_user": str(item.get("userId")) == user_id
            } for i, item in enumerate(top_ranking)
        ]
    }
    
    return api_response(response_data, "League ranking retrieved successfully")

@common_routes.route('/subscription/plans', methods=['GET'])
async def get_subscription_plans():
    """Subscription product information API"""
    
    # Product information
    plans = [
        {
            "id": "talk",
            "name": "Talk Like You Mean It",
            "description": "Plan focused on natural conversation learning. Provides real-life conversations and voice responses.",
            "price": 30.00,
            "daily_limit": 60,
            "features": [
                "Real-time conversation with AI tutor",
                "Emotion recognition and feedback",
                "Native language explanation support",
                "Level-based customized conversations"
            ]
        },
        {
            "id": "drama",
            "name": "Drama Builder",
            "description": "Plan focused on drama-based sentence construction learning. Learn grammar and expressions with actual drama lines.",
            "price": 20.00,
            "daily_limit": 20,
            "features": [
                "Learning actual drama lines",
                "Grammar feedback",
                "Similar sentence suggestions",
                "Pronunciation evaluation"
            ]
        },
        {
            "id": "test",
            "name": "Test & Study",
            "description": "Plan focused on TOPIK test preparation. Improve skills through problem solving and systematic learning.",
            "price": 20.00,
            "daily_limit": 20,
            "features": [
                "TOPIK practice tests",
                "Automatic problem generation",
                "Weakness analysis",
                "Real test simulation"
            ]
        },
        {
            "id": "journey",
            "name": "Korean Journey",
            "description": "Systematic learning plan starting from Hangul. Focuses on pronunciation and reading to build strong foundation.",
            "price": 30.00,
            "daily_limit": 20,
            "features": [
                "From Hangul basics to advanced reading",
                "Pronunciation accuracy analysis",
                "Speed control practice",
                "Step-by-step reading content"
            ]
        }
    ]
    
    # Bundle packages
    bundles = [
        {
            "id": "bundle_2",
            "name": "2 Product Bundle",
            "description": "Choose 2 products you want with 10% discount.",
            "discount": 0.10,
            "min_products": 2,
            "max_products": 2
        },
        {
            "id": "bundle_3",
            "name": "3 Product Bundle",
            "description": "Choose 3 products you want with 20% discount.",
            "discount": 0.20,
            "min_products": 3,
            "max_products": 3
        },
        {
            "id": "bundle_all",
            "name": "All-in-One Package",
            "description": "Get all products with 25% discount.",
            "discount": 0.25,
            "min_products": 4,
            "max_products": 4,
            "price": 75.00
        }
    ]
    
    response_data = {
        "plans": plans,
        "bundles": bundles
    }
    
    return api_response(response_data, "Subscription product information retrieved successfully")

def get_product_price(product_id):
    """Get price by product ID"""
    prices = {
        "talk": 30.00,
        "drama": 20.00,
        "test": 20.00,
        "journey": 30.00
    }
    return prices.get(product_id, 0.0)

def get_bundle_discount(product_count):
    """Get bundle discount rate"""
    discounts = {
        2: 0.10,  # 10% discount
        3: 0.20,  # 20% discount
        4: 0.25   # 25% discount
    }
    return discounts.get(product_count, 0.0)

def calculate_bundle_price(products):
    """Calculate bundle price"""
    total_price = sum(get_product_price(product) for product in products)
    discount = get_bundle_discount(len(products))
    return total_price * (1 - discount)

@common_routes.route('/subscription/subscribe', methods=['POST'])
@require_auth  
async def subscribe():
    """Subscription application API"""
    user_id = g.user_id
    data = await request.json
    
    if not data or not data.get('plan_id'):
        return error_response("Subscription product ID required", 400)
    
    plan_id = data.get('plan_id')
    
    # For bundle subscription
    if plan_id.startswith('bundle_'):
        if not data.get('products') or not isinstance(data.get('products'), list):
            return error_response("Bundle subscription requires product list", 400)
        
        products = data.get('products')
        bundle_type = plan_id.split('_')[1]
        
        # Validate product count based on bundle type
        if bundle_type == "2" and len(products) != 2:
            return error_response("2 Product Bundle requires exactly 2 products", 400)
        elif bundle_type == "3" and len(products) != 3:
            return error_response("3 Product Bundle requires exactly 3 products", 400)
        elif bundle_type == "all" and len(products) != 4:
            return error_response("All-in-One Package requires all products", 400)
        
        # Payment processing (example)
        # In reality, this would integrate with payment service
        payment_id = "payment_" + datetime.utcnow().strftime("%Y%m%d%H%M%S")
        bundle_price = calculate_bundle_price(products)
        
        # Update user's subscription information
        db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
        
        # Create subscription information in Subscription model for each product
        subscription_ids = []
        for product in products:
            subscription_data = {
                "user_id": user_id,
                "product": product,
                "plan_type": "bundle",
                "bundle_id": plan_id,
                "payment_id": payment_id,
                "status": "active",
                "start_date": datetime.utcnow(),
                "end_date": None,  # None for monthly subscription
                "price": bundle_price / len(products),  # Divide bundle price by product count
                "discount_applied": get_bundle_discount(len(products))
            }
            
            subscription_id = await Subscription.create(db, subscription_data)
            subscription_ids.append(subscription_id)
            
            # Also store simple information in User model
            await User.add_subscription(db, user_id, product)
        
        # Publish event
        await current_app.event_bus.publish("subscription_created", {
            "user_id": user_id,
            "subscription_ids": subscription_ids,
            "plan_id": plan_id,
            "products": products,
            "payment_id": payment_id,
            "total_price": bundle_price,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return api_response({
            "plan_id": plan_id,
            "products": products,
            "payment_id": payment_id,
            "subscription_ids": subscription_ids,
            "total_price": bundle_price,
            "discount_applied": get_bundle_discount(len(products))
        }, "Bundle subscription processed successfully", 201)
    
    # For single product subscription
    else:
        # Payment processing (example)
        # In reality, this would integrate with payment service
        payment_id = "payment_" + datetime.utcnow().strftime("%Y%m%d%H%M%S")
        product_price = get_product_price(plan_id)
        
        # Update user's subscription information
        db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
        
        # Store detailed information in Subscription model
        subscription_data = {
            "user_id": user_id,
            "product": plan_id,
            "plan_type": "individual",
            "bundle_id": None,
            "payment_id": payment_id,
            "status": "active",
            "start_date": datetime.utcnow(),
            "end_date": None,
            "price": product_price,
            "discount_applied": 0.0
        }
        
        subscription_id = await Subscription.create(db, subscription_data)
        
        # Also store simple information in User model
        await User.add_subscription(db, user_id, plan_id)
        
        # Publish event
        await current_app.event_bus.publish("subscription_created", {
            "user_id": user_id,
            "subscription_id": subscription_id,
            "plan_id": plan_id,
            "payment_id": payment_id,
            "price": product_price,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return api_response({
            "plan_id": plan_id,
            "payment_id": payment_id,
            "subscription_id": subscription_id,
            "price": product_price
        }, "Subscription processed successfully", 201)

@common_routes.route('/subscription/status', methods=['GET'])
@require_auth  
async def get_subscription_status():
    """User subscription status API"""
    user_id = g.user_id
    
    db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    subscriptions = await Subscription.find_active_by_user(db, user_id)
    
    # Format subscription information
    formatted_subscriptions = []
    for sub in subscriptions:
        formatted_subscriptions.append({
            "subscription_id": str(sub.get("_id")),
            "product": sub.get("product"),
            "plan_type": sub.get("plan_type"),
            "bundle_id": sub.get("bundle_id"),
            "status": sub.get("status"),
            "start_date": sub.get("start_date").isoformat() if sub.get("start_date") else None,
            "end_date": sub.get("end_date").isoformat() if sub.get("end_date") else None,
            "price": sub.get("price"),
            "discount_applied": sub.get("discount_applied", 0.0)
        })
    
    return api_response({
        "subscriptions": formatted_subscriptions,
        "total_subscriptions": len(formatted_subscriptions)
    }, "Subscription status retrieved successfully")

@common_routes.route('/subscription/cancel', methods=['POST'])
@require_auth  
async def cancel_subscription():
    """Subscription cancellation API"""
    user_id = g.user_id
    data = await request.json
    
    subscription_id = data.get('subscription_id')
    if not subscription_id:
        return error_response("Subscription ID required", 400)
    
    db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    
    # Verify subscription ownership
    subscription = await Subscription.find_by_id(db, subscription_id)
    if not subscription:
        return error_response("Subscription not found", 404)
    
    if str(subscription.get("user_id")) != user_id:
        return error_response("No permission to cancel subscription", 403)
    
    # Process subscription cancellation
    success = await Subscription.cancel(db, subscription_id)
    
    if success:
        # Publish event
        await current_app.event_bus.publish("subscription_cancelled", {
            "user_id": user_id,
            "subscription_id": subscription_id,
            "product": subscription.get("product"),
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return api_response({
            "subscription_id": subscription_id,
            "cancelled": True,
            "cancelled_at": datetime.utcnow().isoformat()
        }, "Subscription cancelled successfully")
    else:
        return error_response("Subscription cancellation failed", 500)

@common_routes.route('/subscription/history', methods=['GET'])
@require_auth  
async def get_subscription_history():
    """Subscription history API"""
    user_id = g.user_id
    
    db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    
    # Get all subscription history (active/inactive included)
    from bson.objectid import ObjectId
    pipeline = [
        {"$match": {"user_id": ObjectId(user_id)}},
        {"$sort": {"start_date": -1}},
        {"$limit": 50}  # Limit to recent 50
    ]
    
    subscriptions = await db[Subscription.collection_name].aggregate(pipeline).to_list(length=None)
    
    # Format subscription history
    formatted_history = []
    for sub in subscriptions:
        formatted_history.append({
            "subscription_id": str(sub.get("_id")),
            "product": sub.get("product"),
            "plan_type": sub.get("plan_type"),
            "bundle_id": sub.get("bundle_id"),
            "status": sub.get("status"),
            "start_date": sub.get("start_date").isoformat() if sub.get("start_date") else None,
            "end_date": sub.get("end_date").isoformat() if sub.get("end_date") else None,
            "price": sub.get("price"),
            "discount_applied": sub.get("discount_applied", 0.0),
            "payment_id": sub.get("payment_id")
        })
    
    return api_response({
        "history": formatted_history,
        "total_records": len(formatted_history)
    }, "Subscription history retrieved successfully")


@common_routes.route('/subscription/my-subscriptions', methods=['GET'])
@require_auth
async def get_my_subscriptions():
    """My subscriptions list API"""
    user_id = g.user_id
    db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    
    subscriptions = await Subscription.find_active_by_user(db, user_id)
    formatted_subscriptions = []

    for sub in subscriptions:
        formatted_subscriptions.append({
            "subscription_id": str(sub.get("_id")),
            "product": sub.get("product"),
            "status": sub.get("status"),
            "plan_type": sub.get("plan_type"),
            "bundle_id": sub.get("bundle_id"),
            "amount": sub.get("price"),
            "started_date": sub.get("start_date").isoformat() if sub.get("start_date") else None,
            "end_date": sub.get("end_date").isoformat() if sub.get("end_date") else None,
            "payment_method": "****1234",  # Simulated, adjust if you have this data
            "auto_renewal": True           # Adjust if you have this logic in your model
        })

    return api_response({
        "subscriptions": formatted_subscriptions,
        "total_subscriptions": len(formatted_subscriptions)
    }, "Subscription information retrieved successfully.")

@common_routes.route('/subscription/usage-stats', methods=['GET'])
@require_auth
async def get_usage_stats():
    print("🔍 Usage stats endpoint called")
    """API to return user usage data"""
    user_id = g.user_id

    db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]

    usage = await db['usage_stats'].find_one({"user_id": ObjectId(user_id)})

    if not usage:
        usage = {
            "daily_minutes": 0,
            "total_minutes": 0,
            "daily_requests": 0,
            "total_requests": 0,
            "last_updated": datetime.utcnow().isoformat()
        }

    return api_response({
        "usage": {
            "daily_minutes": usage.get("daily_minutes", 0),
            "total_minutes": usage.get("total_minutes", 0),
            "daily_requests": usage.get("daily_requests", 0),
            "total_requests": usage.get("total_requests", 0),
            "last_updated": usage.get("last_updated", datetime.utcnow().isoformat())
        }
    }, "User usage statistics retrieved successfully")


##new routes
@common_routes.route('/level-check', methods=['POST'])
@require_auth
async def check_level_up():
    """
    Level up check API
    """
    user_id = g.user_id
    
    try:
        data = await request.json
        current_xp = data.get('current_xp', 0)
        gained_xp = data.get('gained_xp', 0)
        
        db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
        
        # Get user's current gamification information
        gamification = await db["gamification"].find_one({"userId": ObjectId(user_id)})
        
        if not gamification:
            # Create gamification data if it doesn't exist
            gamification_data = {
                "userId": ObjectId(user_id),
                "totalXP": gained_xp,
                "currentLevel": 1,
                "currentLeague": "bronze",
                "streakDays": 0,
                "achievements": [],
                "weeklyProgress": {"xp": gained_xp},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db["gamification"].insert_one(gamification_data)
            
            return api_response({
                "level_up": True,
                "new_level": 1,
                "current_xp": gained_xp,
                "xp_to_next_level": 100,
                "achievements_unlocked": []
            }, "Level up check completed")
        
        # Calculate current level and XP
        old_level = gamification.get("currentLevel", 1)
        total_xp = gamification.get("totalXP", 0) + gained_xp
        
        # Level calculation logic (example: level up every 100 XP)
        new_level = max(1, total_xp // 100 + 1)
        level_up = new_level > old_level
        
        # XP needed for next level
        xp_to_next_level = (new_level * 100) - total_xp
        
        # Achievement check
        achievements_unlocked = []
        current_achievements = gamification.get("achievements", [])
        
        # Level-based achievements
        if new_level >= 5 and "level_5" not in current_achievements:
            achievements_unlocked.append("level_5")
            current_achievements.append("level_5")
        
        if new_level >= 10 and "level_10" not in current_achievements:
            achievements_unlocked.append("level_10")
            current_achievements.append("level_10")
        
        # Update gamification information
        update_data = {
            "totalXP": total_xp,
            "currentLevel": new_level,
            "achievements": current_achievements,
            "weeklyProgress.xp": gamification.get("weeklyProgress", {}).get("xp", 0) + gained_xp,
            "updated_at": datetime.utcnow()
        }
        
        await db["gamification"].update_one(
            {"userId": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        # Publish event (when level up)
        if level_up:
            await current_app.event_bus.emit_level_up(user_id, new_level, old_level)
        
        return api_response({
            "level_up": level_up,
            "old_level": old_level,
            "new_level": new_level,
            "current_xp": total_xp,
            "gained_xp": gained_xp,
            "xp_to_next_level": xp_to_next_level,
            "achievements_unlocked": achievements_unlocked
        }, "Level up check completed")
        
    except Exception as e:
        print(f"❌ Error in level check: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response("Error occurred during level check", 500)

@common_routes.route('/level-check', methods=['GET'])
@require_auth
async def get_level_info():
    """
    Current level information API
    """
    user_id = g.user_id
    
    try:
        db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
        gamification = await db["gamification"].find_one({"userId": ObjectId(user_id)})
        
        if not gamification:
            return api_response({
                "current_level": 1,
                "current_xp": 0,
                "xp_to_next_level": 100,
                "total_xp": 0
            }, "Level information retrieved")
        
        current_level = gamification.get("currentLevel", 1)
        total_xp = gamification.get("totalXP", 0)
        xp_to_next_level = (current_level * 100) - total_xp
        
        return api_response({
            "current_level": current_level,
            "current_xp": total_xp,
            "xp_to_next_level": max(0, xp_to_next_level),
            "total_xp": total_xp,
            "achievements": gamification.get("achievements", [])
        }, "Level information retrieved successfully")
        
    except Exception as e:
        print(f"❌ Error fetching level info: {str(e)}")
        return error_response("Error occurred while fetching level information", 500)
    
@common_routes.route('/subscription/debug', methods=['GET'])
@require_auth
async def debug_subscriptions():
    """Debug endpoint to view all subscriptions"""
    user_id = g.user_id
    db = current_app.mongo_client[current_app.config.get("MONGO_DB_USERS")]
    
    # Get ALL user subscriptions
    from bson.objectid import ObjectId
    all_subs = await db["subscriptions"].find({
        "user_id": ObjectId(user_id)
    }).to_list(length=None)
    
    return api_response({
        "user_id": user_id,
        "total_subscriptions": len(all_subs),
        "all_subscriptions": [
            {
                "product": sub.get("product"),
                "status": sub.get("status"),
                "start_date": sub.get("start_date"),
                "end_date": sub.get("end_date")
            } for sub in all_subs
        ]
    }, "Debug info")