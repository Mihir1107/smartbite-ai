"""Authentication utilities"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import os

# Secret key for JWT - should be in environment variable in production
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production-12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class User(BaseModel):
    username: str
    email: str
    role: str  # 'owner' or 'user'
    full_name: Optional[str] = None
    phone: Optional[str] = None
    disabled: bool = False


class UserInDB(User):
    hashed_password: str


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Hash a password"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception
    
    # In a real app, fetch user from database
    # For now, return user from token data
    user = User(
        username=token_data.username,
        email=f"{token_data.username}@example.com",
        role=token_data.role or "user"
    )
    
    if user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


async def get_current_owner(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is an owner"""
    if current_user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Owner access required."
        )
    return current_user


async def get_user_from_db(database, username: str) -> Optional[UserInDB]:
    """Fetch user from database"""
    if database is None:
        return None
    
    user_data = await database.users.find_one({"username": username})
    if user_data:
        return UserInDB(**user_data)
    return None


async def authenticate_user(database, username: str, password: str) -> Optional[UserInDB]:
    """Authenticate a user"""
    user = await get_user_from_db(database, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def create_default_users(database):
    """Create default owner and user accounts if they don't exist"""
    if database is None:
        return
    
    try:
        # Check if owner exists
        owner_exists = await database.users.find_one({"username": "owner"})
        if not owner_exists:
            owner_user = {
                "username": "owner",
                "email": "owner@smartbite.com",
                "full_name": "Restaurant Owner",
                "role": "owner",
                "hashed_password": get_password_hash("owner123"),
                "disabled": False,
                "created_at": datetime.utcnow()
            }
            await database.users.insert_one(owner_user)
            print("✅ Default owner account created (username: owner, password: owner123)")
        
        # Check if demo user exists
        user_exists = await database.users.find_one({"username": "customer"})
        if not user_exists:
            demo_user = {
                "username": "customer",
                "email": "customer@example.com",
                "full_name": "Demo Customer",
                "role": "user",
                "phone": "+1234567890",
                "hashed_password": get_password_hash("customer123"),
                "disabled": False,
                "created_at": datetime.utcnow()
            }
            await database.users.insert_one(demo_user)
            print("✅ Default customer account created (username: customer, password: customer123)")
            
    except Exception as e:
        print(f"⚠️  Could not create default users: {e}")
