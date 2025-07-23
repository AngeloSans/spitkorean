from datetime import datetime
from bson.objectid import ObjectId

class Subscription:
    """구독 모델"""
    
    collection_name = "subscriptions"
    
    PRODUCTS = {
        "talk": {"name": "Talk Like You Mean It", "price": 30.00, "daily_limit": 60},
        "drama": {"name": "Drama Builder", "price": 20.00, "daily_limit": 20},
        "test": {"name": "Test & Study", "price": 20.00, "daily_limit": 20},
        "journey": {"name": "Korean Journey", "price": 30.00, "daily_limit": 20}
    }
    
    BUNDLE_DISCOUNTS = {
        2: 0.10,  # 2개 선택: 10% 할인
        3: 0.20,  # 3개 선택: 20% 할인
        4: 0.25   # 전체 구독: 25% 할인
    }
    
    def __init__(self, user_id, product, payment_id=None, status="active", 
                 start_date=None, end_date=None, price=None):
        """
        Args:
            user_id: 사용자 ID
            product: 상품 코드 (talk, drama, test, journey)
            payment_id: 결제 ID (선택적)
            status: 구독 상태 (active, cancelled, expired)
            start_date: 시작 날짜
            end_date: 종료 날짜 (선택적)
            price: 가격 (선택적)
        """
        self.user_id = user_id
        self.product = product
        self.payment_id = payment_id
        self.status = status
        self.start_date = start_date or datetime.utcnow()
        self.end_date = end_date
        self.price = price or self.PRODUCTS.get(product, {}).get("price", 0)
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    @classmethod
    async def create(cls, db, subscription_data):
        """새 구독 생성
        
        Args:
            db: 데이터베이스 연결
            subscription_data: 구독 데이터
            
        Returns:
            str: 생성된 구독 ID
        """
        subscription_data["created_at"] = datetime.utcnow()
        subscription_data["updated_at"] = datetime.utcnow()
        result = await db[cls.collection_name].insert_one(subscription_data)
        return str(result.inserted_id)
    
    @classmethod
    async def find_active_by_user(cls, db, user_id):
        """Busca as assinaturas ativas embutidas no usuário"""
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)

        user = await db["users"].find_one({"_id": user_id}, {"subscriptions": 1})
        if not user or "subscriptions" not in user:
            return []

        active_subscriptions = []
        for s in user["subscriptions"]:
            if isinstance(s, dict):
                if s.get("status") == "active":
                    active_subscriptions.append(s)
            else:
                print(f"Subscription with unexpected type: {type(s)} - value: {s}")

        return active_subscriptions

    
    @classmethod
    async def cancel(cls, db, subscription_id):
        """구독 취소
        
        Args:
            db: 데이터베이스 연결
            subscription_id: 구독 ID
            
        Returns:
            bool: 취소 성공 여부
        """
        if isinstance(subscription_id, str):
            subscription_id = ObjectId(subscription_id)
        
        result = await db[cls.collection_name].update_one(
            {"_id": subscription_id},
            {
                "$set": {
                    "status": "cancelled",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0
    
    @classmethod
    async def is_active(cls, db, user_id, product):
        """구독 활성 여부 확인
        
        Args:
            db: 데이터베이스 연결
            user_id: 사용자 ID
            product: 상품 코드
            
        Returns:
            bool: 활성 여부
        """
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        
        subscription = await db[cls.collection_name].find_one({
            "user_id": user_id,
            "product": product,
            "status": "active"
        })
        return subscription is not None
    
    @classmethod
    def calculate_bundle_price(cls, products):
        """번들 가격 계산
        
        Args:
            products: 상품 코드 목록
            
        Returns:
            float: 번들 가격
        """
        if not products:
            return 0
        
        total_price = sum(cls.PRODUCTS.get(p, {}).get("price", 0) for p in products)
        discount = cls.BUNDLE_DISCOUNTS.get(len(products), 0)
        
        return total_price * (1 - discount)
