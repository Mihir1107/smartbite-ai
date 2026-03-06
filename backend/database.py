"""MongoDB Database Configuration"""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection string - can be customized via environment variable
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "smartbite_db"

# Global MongoDB client
client: AsyncIOMotorClient = None
database = None


async def connect_to_mongo():
    """Connect to MongoDB"""
    global client, database
    try:
        client = AsyncIOMotorClient(
            MONGODB_URL,
            server_api=ServerApi('1'),
            serverSelectionTimeoutMS=5000
        )
        # Test the connection
        await client.admin.command('ping')
        database = client[DATABASE_NAME]
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}")
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        print(f"❌ Could not connect to MongoDB: {e}")
        print("⚠️  Running in local mode without MongoDB")
        # Don't raise - allow app to run without MongoDB
        database = None


async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")


async def create_indexes():
    """Create database indexes for better performance"""
    if database is None:
        return
    
    try:
        # Users collection indexes
        await database.users.create_index("username", unique=True)
        await database.users.create_index("email", unique=True)
        
        # Menu items indexes
        await database.menu_items.create_index("item_id", unique=True)
        await database.menu_items.create_index("category")
        
        # Orders indexes
        await database.orders.create_index("order_id")
        await database.orders.create_index("created_at")
        await database.orders.create_index("user_id")
        
        # Voice orders indexes
        await database.voice_orders.create_index("phone")
        await database.voice_orders.create_index("created_at")
        
        # Missed calls indexes
        await database.missed_calls.create_index("phone")
        await database.missed_calls.create_index("timestamp")
        
        print("📋 Database indexes created successfully")
    except Exception as e:
        print(f"⚠️  Could not create indexes: {e}")


def get_database():
    """Get database instance"""
    return database
