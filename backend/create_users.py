"""Script to manually create default users"""
import asyncio
from database import connect_to_mongo, get_database, close_mongo_connection
from auth import get_password_hash
from datetime import datetime

async def create_users():
    """Create owner and customer users"""
    await connect_to_mongo()
    db = get_database()
    
    if db is None:
        print("❌ Failed to connect to MongoDB")
        return
    
    try:
        # Delete existing users first
        await db.users.delete_many({"username": {"$in": ["owner", "customer"]}})
        print("🗑️  Cleared existing users")
        
        # Create owner
        owner = {
            "username": "owner",
            "email": "owner@smartbite.com",
            "full_name": "Restaurant Owner",
            "role": "owner",
            "hashed_password": get_password_hash("owner123"),
            "disabled": False,
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(owner)
        print("✅ Created owner (username: owner, password: owner123)")
        
        # Create customer
        customer = {
            "username": "customer",
            "email": "customer@example.com",
            "full_name": "Demo Customer",
            "role": "user",
            "phone": "+1234567890",
            "hashed_password": get_password_hash("customer123"),
            "disabled": False,
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(customer)
        print("✅ Created customer (username: customer, password: customer123)")
        
        # Verify
        owner_check = await db.users.find_one({"username": "owner"})
        customer_check = await db.users.find_one({"username": "customer"})
        
        print(f"\n📊 Verification:")
        print(f"  Owner exists: {owner_check is not None}")
        print(f"  Customer exists: {customer_check is not None}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(create_users())
