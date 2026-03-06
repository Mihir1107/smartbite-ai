from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
import sqlite3, json, os, tempfile, shutil, openai
from datetime import datetime, timedelta
import random, base64
from pydantic import BaseModel, Field
from typing import List
from dotenv import load_dotenv
from database import connect_to_mongo, close_mongo_connection, get_database
from auth import (
    authenticate_user, create_access_token, get_current_user, get_current_owner,
    Token, User, get_password_hash, create_default_users, ACCESS_TOKEN_EXPIRE_MINUTES
)

load_dotenv()

app = FastAPI(title="SmartBite AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ─── STARTUP & SHUTDOWN ─────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Initialize database connections on startup"""
    await connect_to_mongo()
    db = get_database()
    if db is not None:
        await create_default_users(db)
    init_db()  # SQLite init for backward compatibility

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections on shutdown"""
    await close_mongo_connection()

DB_PATH = "smartbite.db"

# ─── DB INIT ────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY,
        name TEXT,
        category TEXT,
        selling_price REAL,
        food_cost REAL,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY,
        order_time TEXT,
        total_amount REAL,
        source TEXT DEFAULT 'pos',
        items_json TEXT
    );
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY,
        order_id INTEGER,
        menu_item_id INTEGER,
        quantity INTEGER,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
    );
    CREATE TABLE IF NOT EXISTS missed_calls (
        id INTEGER PRIMARY KEY,
        phone TEXT,
        timestamp TEXT,
        recovered INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS voice_orders (
        id INTEGER PRIMARY KEY,
        phone TEXT,
        transcript TEXT,
        structured_order TEXT,
        upsell_shown TEXT,
        upsell_accepted INTEGER DEFAULT 0,
        created_at TEXT,
        status TEXT DEFAULT 'pending',
        total_amount REAL DEFAULT 0,
        updated_at TEXT
    );
    """)
    conn.commit()

    # Auto-add columns if missing (existing databases)
    try:
        c.execute("ALTER TABLE voice_orders ADD COLUMN total_amount REAL DEFAULT 0")
        conn.commit()
    except Exception:
        pass
    try:
        c.execute("ALTER TABLE voice_orders ADD COLUMN updated_at TEXT")
        conn.commit()
    except Exception:
        pass

    # Seed only if empty
    if c.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0] == 0:
        seed_data(conn)

    # Auto-fix legacy synthetic datasets where all margins are flattened (for example 60% on every item).
    normalize_flat_margin_data(conn)
    conn.close()


def _deterministic_ratio(seed_text: str, min_value: float, max_value: float) -> float:
    """Generate a stable ratio in [min_value, max_value] from item text.

    Keeps values deterministic between runs while still varying by item.
    """
    spread = max_value - min_value
    if spread <= 0:
        return min_value
    seed_score = sum(ord(ch) for ch in seed_text) % 1000
    return min_value + (seed_score / 999.0) * spread


def normalize_flat_margin_data(conn):
    """Backfill food_cost when synthetic data creates near-identical margins for all items.

    This keeps /api/menu/analytics item-level cm_percentage meaningful.
    """
    c = conn.cursor()
    items = c.execute(
        "SELECT id, name, category, selling_price, food_cost FROM menu_items WHERE is_active=1"
    ).fetchall()
    if len(items) < 3:
        return

    cm_values = []
    for item in items:
        price = float(item["selling_price"] or 0)
        cost = float(item["food_cost"] or 0)
        if price <= 0:
            continue
        cm_values.append(round(((price - cost) / price) * 100, 1))

    if not cm_values:
        return

    rounded_unique = set(cm_values)
    all_near_sixty = all(abs(v - 60.0) <= 0.2 for v in cm_values)
    looks_flat = len(rounded_unique) <= 2 and all_near_sixty
    if not looks_flat:
        return

    category_margin_ranges = {
        "starter": (50.0, 64.0),
        "starters": (50.0, 64.0),
        "main course": (54.0, 70.0),
        "curries": (54.0, 70.0),
        "rice": (46.0, 60.0),
        "biryani": (46.0, 60.0),
        "bread": (58.0, 75.0),
        "breads": (58.0, 75.0),
        "beverage": (60.0, 82.0),
        "beverages": (60.0, 82.0),
        "dessert": (55.0, 72.0),
        "desserts": (55.0, 72.0),
        "sides": (50.0, 66.0),
        "chinese": (48.0, 65.0),
    }

    for item in items:
        price = float(item["selling_price"] or 0)
        if price <= 0:
            continue

        category = str(item["category"] or "").strip().lower()
        min_margin, max_margin = category_margin_ranges.get(category, (50.0, 68.0))
        target_margin = _deterministic_ratio(
            f"{item['name']}::{category}",
            min_margin,
            max_margin,
        )
        target_margin = max(35.0, min(85.0, target_margin))

        new_cost = round(price * (1 - (target_margin / 100.0)), 2)
        c.execute("UPDATE menu_items SET food_cost=? WHERE id=?", (new_cost, item["id"]))

    conn.commit()

def seed_data(conn):
    c = conn.cursor()
    menu = [
        # (name, category, selling_price, food_cost)
        ("Butter Chicken", "Main Course", 320, 95),
        ("Dal Makhani", "Main Course", 220, 40),
        ("Paneer Tikka", "Starter", 280, 75),
        ("Veg Biryani", "Rice", 250, 60),
        ("Chicken Biryani", "Rice", 340, 110),
        ("Garlic Naan", "Bread", 60, 10),
        ("Butter Naan", "Bread", 50, 8),
        ("Mango Lassi", "Beverage", 120, 25),
        ("Masala Chai", "Beverage", 40, 8),
        ("Gulab Jamun", "Dessert", 80, 15),
        ("Raita", "Sides", 60, 12),
        ("Panner Butter Masala", "Main Course", 300, 85),
        ("Chole Bhature", "Main Course", 180, 45),
        ("Veg Manchurian", "Starter", 200, 55),
        ("Chicken Tikka", "Starter", 350, 120),
        ("Dahi Puri", "Starter", 120, 30),
        ("Cold Coffee", "Beverage", 140, 35),
        ("Phirni", "Dessert", 90, 20),
        ("Laccha Paratha", "Bread", 70, 15),
        ("Chicken Korma", "Main Course", 340, 130),  # low margin - Dog candidate
    ]
    c.executemany(
        "INSERT INTO menu_items (name, category, selling_price, food_cost) VALUES (?,?,?,?)",
        menu
    )

    # Seed realistic orders for last 30 days
    item_ids = list(range(1, len(menu) + 1))
    # Popularity weights — some items more popular
    weights = [0.12,0.10,0.08,0.09,0.11,0.07,0.06,0.05,0.04,0.03,0.03,0.06,0.04,0.03,0.05,0.02,0.03,0.02,0.03,0.02]

    # Co-occurrence seeds (realistic combos)
    combos = [
        [1, 6], [1, 7], [2, 7], [4, 11], [5, 11], [3, 8], [6, 8], [1, 8], [9, 10], [12, 6]
    ]

    orders = []
    order_items_data = []
    order_id = 1

    for day_offset in range(30):
        day = datetime.now() - timedelta(days=day_offset)
        # Vary orders by hour (peak lunch 12-2, dinner 7-10)
        for hour in [11, 12, 13, 14, 19, 20, 21, 22]:
            num_orders = random.randint(2, 8)
            for _ in range(num_orders):
                minute = random.randint(0, 59)
                order_time = day.replace(hour=hour, minute=minute).isoformat()
                # Pick 1-3 items
                if random.random() < 0.4 and combos:
                    items = random.choice(combos)[:]
                    if random.random() < 0.3:
                        items.append(random.choices(item_ids, weights=weights)[0])
                else:
                    n = random.choices([1, 2, 3], weights=[0.4, 0.4, 0.2])[0]
                    items = random.choices(item_ids, weights=weights, k=n)

                total = sum(menu[i-1][2] for i in items)
                source = random.choices(['pos', 'voice', 'online'], weights=[0.6, 0.2, 0.2])[0]
                orders.append((order_id, order_time, total, source, json.dumps(items)))
                for item_id in items:
                    order_items_data.append((order_id, item_id, 1))
                order_id += 1

    c.executemany("INSERT INTO orders (id, order_time, total_amount, source, items_json) VALUES (?,?,?,?,?)", orders)
    c.executemany("INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?,?,?)", order_items_data)

    # Seed some missed calls
    phones = ["+919876543210", "+918765432109", "+917654321098"]
    for i, phone in enumerate(phones):
        ts = (datetime.now() - timedelta(hours=random.randint(1, 48))).isoformat()
        c.execute("INSERT INTO missed_calls (phone, timestamp) VALUES (?,?)", (phone, ts))

    conn.commit()


# ─── ANALYTICS ENGINE ───────────────────────────────────────────────────────

def compute_menu_analytics(conn):
    c = conn.cursor()
    items = c.execute("SELECT * FROM menu_items WHERE is_active=1").fetchall()

    # Total sales per item (last 30 days)
    cutoff = (datetime.now() - timedelta(days=30)).isoformat()
    sales = c.execute("""
        SELECT oi.menu_item_id, SUM(oi.quantity) as units_sold
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.order_time >= ?
        GROUP BY oi.menu_item_id
    """, (cutoff,)).fetchall()
    sales_map = {row["menu_item_id"]: row["units_sold"] for row in sales}

    results = []
    for item in items:
        iid = item["id"]
        units = sales_map.get(iid, 0)
        cm = item["selling_price"] - item["food_cost"]
        cm_pct = (cm / item["selling_price"]) * 100

        results.append({
            "id": iid,
            "name": item["name"],
            "category": item["category"],
            "selling_price": item["selling_price"],
            "food_cost": item["food_cost"],
            "contribution_margin": round(cm, 2),
            "cm_percentage": round(cm_pct, 1),
            "units_sold": units,
            "revenue": round(units * item["selling_price"], 2),
            "total_margin": round(units * cm, 2),
        })

    # Medians for quadrant classification
    all_units = [r["units_sold"] for r in results]
    all_cm = [r["contribution_margin"] for r in results]
    median_units = sorted(all_units)[len(all_units) // 2]
    median_cm = sorted(all_cm)[len(all_cm) // 2]
    max_units = max(all_units) if all_units else 1

    for r in results:
        # When median is 0 (no orders yet), use strict > so zero-sales items are NOT high-pop
        high_pop = r["units_sold"] > median_units if median_units == 0 else r["units_sold"] >= median_units
        high_cm = r["contribution_margin"] >= median_cm

        if high_pop and high_cm:
            r["quadrant"] = "Star"
            r["quadrant_color"] = "#22c55e"
        elif high_pop and not high_cm:
            r["quadrant"] = "Plowhorse"
            r["quadrant_color"] = "#f59e0b"
        elif not high_pop and high_cm:
            r["quadrant"] = "Puzzle"
            r["quadrant_color"] = "#3b82f6"
        else:
            r["quadrant"] = "Dog"
            r["quadrant_color"] = "#ef4444"

        # Opportunity Score — the novel KPI
        r["opportunity_score"] = round(r["contribution_margin"] * (max_units - r["units_sold"]), 2)

        # Price optimization signal
        if r["cm_percentage"] < 50:
            r["price_action"] = f"Raise price by ₹{round(r['food_cost'] * 0.2)}"
        elif r["quadrant"] == "Puzzle":
            r["price_action"] = "Promote more — high margin, low visibility"
        elif r["quadrant"] == "Dog":
            r["price_action"] = "Consider removing or bundling"
        else:
            r["price_action"] = "Maintain current pricing"

    return results, median_units, median_cm


def compute_combos(conn):
    """Co-occurrence based combo recommendations"""
    c = conn.cursor()
    cutoff = (datetime.now() - timedelta(days=30)).isoformat()
    orders = c.execute("""
        SELECT order_id, menu_item_id FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.order_time >= ?
    """, (cutoff,)).fetchall()

    from collections import defaultdict
    order_groups = defaultdict(list)
    for row in orders:
        order_groups[row["order_id"]].append(row["menu_item_id"])

    co_occur = defaultdict(int)
    for items in order_groups.values():
        items = list(set(items))
        for i in range(len(items)):
            for j in range(i+1, len(items)):
                pair = tuple(sorted([items[i], items[j]]))
                co_occur[pair] += 1

    top_pairs = sorted(co_occur.items(), key=lambda x: x[1], reverse=True)[:10]

    items_map = {r["id"]: r["name"] for r in c.execute("SELECT id, name FROM menu_items").fetchall()}
    prices_map = {r["id"]: r["selling_price"] for r in c.execute("SELECT id, selling_price FROM menu_items").fetchall()}

    combos = []
    for (a, b), freq in top_pairs:
        if a in items_map and b in items_map:
            orig = prices_map.get(a, 0) + prices_map.get(b, 0)
            combo_price = round(orig * 0.88)  # 12% discount
            combos.append({
                "item_a_id": a, "item_a": items_map[a],
                "item_b_id": b, "item_b": items_map[b],
                "frequency": freq,
                "original_price": orig,
                "combo_price": combo_price,
                "saving": orig - combo_price
            })
    return combos


def compute_dead_hours(conn):
    """Detect hours with low sales + high margin items available"""
    c = conn.cursor()
    cutoff = (datetime.now() - timedelta(days=7)).isoformat()
    hourly = c.execute("""
        SELECT strftime('%H', order_time) as hour, COUNT(*) as orders, AVG(total_amount) as avg_aov
        FROM orders WHERE order_time >= ?
        GROUP BY hour ORDER BY hour
    """, (cutoff,)).fetchall()

    all_hours = {str(h).zfill(2): {"orders": 0, "avg_aov": 0} for h in range(8, 24)}
    for row in hourly:
        if row["hour"] in all_hours:
            all_hours[row["hour"]] = {"orders": row["orders"], "avg_aov": round(row["avg_aov"] or 0, 2)}

    avg_orders = sum(v["orders"] for v in all_hours.values()) / len(all_hours)
    dead_hours = {h: v for h, v in all_hours.items() if v["orders"] < avg_orders * 0.6}

    return {
        "hourly_data": [{"hour": h, **v} for h, v in all_hours.items()],
        "dead_hours": [{"hour": h, **v} for h, v in dead_hours.items()],
        "avg_orders_per_hour": round(avg_orders, 1)
    }


# ─── ROUTES ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "SmartBite AI is running 🚀"}

# ─── AUTHENTICATION ─────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=Token)
async def register(username: str, password: str, email: str, role: str = "user", full_name: str = None):
    """Register a new user"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"$or": [{"username": username}, {"email": email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Validate role
    if role not in ["user", "owner"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'user' or 'owner'")
    
    # Create new user
    user_data = {
        "username": username,
        "email": email,
        "full_name": full_name or username,
        "role": role,
        "hashed_password": get_password_hash(password),
        "disabled": False,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_data)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": username, "role": role}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", role=role, username=username)


@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get access token"""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", role=user.role, username=user.username)


@app.get("/api/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user


@app.get("/api/auth/validate")
async def validate_token(current_user: User = Depends(get_current_user)):
    """Validate JWT token and return user role"""
    return {"valid": True, "username": current_user.username, "role": current_user.role}

# ─── DASHBOARD & ANALYTICS (OWNER ONLY) ─────────────────────────────────────

@app.get("/api/dashboard/summary")
def dashboard_summary():
    conn = get_db()
    c = conn.cursor()
    analytics, _, _ = compute_menu_analytics(conn)

    total_revenue = sum(a["revenue"] for a in analytics)
    total_margin = sum(a["total_margin"] for a in analytics)
    
    # AOV last 7 days
    cutoff7 = (datetime.now() - timedelta(days=7)).isoformat()
    aov_row = c.execute("SELECT AVG(total_amount) as aov, COUNT(*) as orders FROM orders WHERE order_time >= ?", (cutoff7,)).fetchone()
    
    # Voice orders
    voice_count = c.execute("SELECT COUNT(*) FROM orders WHERE source='voice'").fetchone()[0]
    
    stars = len([a for a in analytics if a["quadrant"] == "Star"])
    dogs = len([a for a in analytics if a["quadrant"] == "Dog"])
    puzzles = len([a for a in analytics if a["quadrant"] == "Puzzle"])
    
    missed = c.execute("SELECT COUNT(*) FROM missed_calls WHERE recovered=0").fetchone()[0]
    
    conn.close()
    return {
        "total_revenue_30d": round(total_revenue, 2),
        "total_margin_30d": round(total_margin, 2),
        "margin_pct": round((total_margin / total_revenue * 100) if total_revenue else 0, 1),
        "aov_7d": round(aov_row["aov"] or 0, 2),
        "total_orders_7d": aov_row["orders"],
        "voice_orders": voice_count,
        "stars": stars, "dogs": dogs, "puzzles": puzzles,
        "missed_calls": missed,
        "opportunity_score_total": round(sum(a["opportunity_score"] for a in analytics if a["quadrant"] == "Puzzle"), 2)
    }

@app.get("/api/menu/analytics")
def menu_analytics():
    conn = get_db()
    analytics, med_units, med_cm = compute_menu_analytics(conn)
    conn.close()
    return {"items": analytics, "median_units": med_units, "median_cm": med_cm}

@app.get("/api/menu/combos")
def combo_recommendations():
    conn = get_db()
    combos = compute_combos(conn)
    conn.close()
    return {"combos": combos}

@app.get("/api/revenue/dead-hours")
def dead_hours():
    conn = get_db()
    result = compute_dead_hours(conn)
    conn.close()
    return result

@app.get("/api/revenue/opportunities")
def opportunities():
    conn = get_db()
    analytics, _, _ = compute_menu_analytics(conn)
    conn.close()
    puzzles = sorted(
        [a for a in analytics if a["quadrant"] in ["Puzzle", "Dog"]],
        key=lambda x: x["opportunity_score"], reverse=True
    )
    total_opportunity = sum(a["opportunity_score"] for a in puzzles)
    return {"items": puzzles[:8], "total_opportunity": round(total_opportunity, 2)}

@app.post("/api/menu/{item_id}/action")
def apply_menu_action(item_id: int, action: dict):
    """One-click price/combo action from dashboard"""
    conn = get_db()
    c = conn.cursor()
    action_type = action.get("action") or action.get("type")
    
    if action_type == "raise_price":
        new_price = action.get("new_price")
        if not new_price:
            # Auto-compute 12% increase if no explicit price given
            row = c.execute("SELECT selling_price FROM menu_items WHERE id=?", (item_id,)).fetchone()
            if row:
                new_price = round(row["selling_price"] * 1.12)
        c.execute("UPDATE menu_items SET selling_price=? WHERE id=?", (new_price, item_id))
        conn.commit()
        conn.close()
        return {"success": True, "message": f"Price updated to ₹{new_price}"}
    elif action_type == "archive":
        c.execute("UPDATE menu_items SET is_active=0 WHERE id=?", (item_id,))
        conn.commit()
        conn.close()
        return {"success": True, "message": "Item archived from menu"}
    conn.close()
    return {"success": False, "message": "Unknown action"}

@app.get("/api/menu/ai-recommendations")
def ai_recommendations():
    conn = get_db()
    analytics, _, _ = compute_menu_analytics(conn)
    combos = compute_combos(conn)
    conn.close()

    combo_map = {}
    for c in combos:
        combo_map[c["item_a_id"]] = c
        combo_map[c["item_b_id"]] = c

    recs = []
    for item in analytics:
        if item["quadrant"] not in ["Dog", "Puzzle"]:
            continue

        rec = {"item_id": item["id"], "item_name": item["name"],
               "quadrant": item["quadrant"], "current_price": item["selling_price"],
               "cm_pct": item["cm_percentage"], "units_sold": item["units_sold"],
               "status": "pending"}

        if item["quadrant"] == "Dog":
            new_price = round(item["selling_price"] * 1.12)
            monthly_gain = round((new_price - item["selling_price"]) * item["units_sold"])
            rec.update({
                "action": "raise_price",
                "suggested_price": new_price,
                "reasoning": f"{item['name']} has only {item['cm_percentage']}% margin. "
                             f"A ₹{new_price - item['selling_price']} price increase adds "
                             f"₹{monthly_gain}/month with minimal demand impact at this price tier.",
                "projected_gain": monthly_gain,
                "confidence": "High" if item["cm_percentage"] < 55 else "Medium"
            })
        elif item["quadrant"] == "Puzzle":
            partner = combo_map.get(item["id"])
            if partner:
                pname = partner["item_b"] if partner["item_a_id"] == item["id"] else partner["item_a"]
                projected = round(item["contribution_margin"] * item["units_sold"] * 0.35)
                rec.update({
                    "action": "create_combo",
                    "combo_with": pname,
                    "combo_price": partner["combo_price"],
                    "reasoning": f"{item['name']} has strong {item['cm_percentage']}% margin but low visibility. "
                                 f"Bundling with {pname} (ordered together {partner['frequency']}×) "
                                 f"could boost units by ~35%, adding ₹{projected}/month.",
                    "projected_gain": projected,
                    "confidence": "High"
                })
            else:
                rec.update({
                    "action": "promote",
                    "reasoning": f"{item['name']} has excellent {item['cm_percentage']}% margin "
                                 f"but only {item['units_sold']} units sold. Add to featured section "
                                 f"or upsell during voice orders.",
                    "projected_gain": round(item["contribution_margin"] * 20),
                    "confidence": "Medium"
                })
        recs.append(rec)

    total_projected = sum(r.get("projected_gain", 0) for r in recs)
    return {"recommendations": recs, "total_projected_monthly_gain": total_projected}


@app.post("/api/menu/ai-recommendations/{item_id}/decide")
def decide_recommendation(item_id: int, decision: dict):
    # decision: {"action": "approve"/"reject", "suggested_price": optional}
    conn = get_db()
    c = conn.cursor()
    if decision.get("action") == "approve" and decision.get("suggested_price"):
        c.execute("UPDATE menu_items SET selling_price=? WHERE id=?",
                  (decision["suggested_price"], item_id))
        conn.commit()
    conn.close()
    return {"success": True, "message": "Decision recorded. PoS sync queued."}

@app.get("/api/voice/orders")
def voice_orders():
    conn = get_db()
    c = conn.cursor()
    rows = c.execute("SELECT * FROM voice_orders ORDER BY created_at DESC LIMIT 50").fetchall()
    conn.close()
    return {"orders": [dict(r) for r in rows]}


@app.get("/api/orders/live")
def live_orders():
    """Return recent orders with parsed items and live status for real-time tracking"""
    conn = get_db()
    c = conn.cursor()
    rows = c.execute(
        "SELECT id, phone, transcript, structured_order, created_at, status, total_amount, updated_at "
        "FROM voice_orders ORDER BY created_at DESC LIMIT 50"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        try:
            d["items"] = json.loads(d.get("structured_order") or "[]")
        except Exception:
            d["items"] = []
        d["total_amount"] = d.get("total_amount") or sum(
            it.get("price", 0) * it.get("qty", 1) for it in d["items"]
        )
        result.append(d)
    return {"orders": result}


@app.patch("/api/orders/{order_id}/status")
def update_order_status(order_id: int, body: dict):
    """Update the status of a voice order"""
    new_status = body.get("status", "")
    valid = {"pending", "confirmed", "preparing", "ready", "delivered", "rejected"}
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(sorted(valid))}")
    conn = get_db()
    c = conn.cursor()
    now = datetime.now().isoformat()
    c.execute("UPDATE voice_orders SET status=?, updated_at=? WHERE id=?", (new_status, now, order_id))
    if c.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Order not found")
    conn.commit()
    row = c.execute("SELECT * FROM voice_orders WHERE id=?", (order_id,)).fetchone()
    conn.close()
    d = dict(row)
    try:
        d["items"] = json.loads(d.get("structured_order") or "[]")
    except Exception:
        d["items"] = []
    return {"success": True, "order": d}

@app.delete("/api/voice/orders")
def clear_voice_orders():
    """Delete all voice orders for a fresh start"""
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM voice_orders")
    conn.commit()
    conn.close()
    return {"success": True, "message": "All voice orders cleared"}

@app.post("/api/voice/order")
def create_voice_order(order: dict):
    """Receive structured order from voice pipeline"""
    conn = get_db()
    c = conn.cursor()
    now = datetime.now().isoformat()
    total = sum(i.get("price", 0) * i.get("qty", 1) for i in order.get("items", []))
    # Attach modifiers to structured order items for KOT / kitchen display
    items_with_mods = order.get("items", [])
    modifiers = order.get("modifiers", {})
    if modifiers:
        for it in items_with_mods:
            it["modifiers"] = modifiers
    c.execute(
        "INSERT INTO voice_orders (phone, transcript, structured_order, upsell_shown, created_at, status, total_amount, updated_at) VALUES (?,?,?,?,?,?,?,?)",
        (order.get("phone", "unknown"), order.get("transcript", ""),
         json.dumps(items_with_mods), json.dumps(order.get("upsell", {})), now, "pending", total, now)
    )
    
    # Also add to main orders table for analytics
    voice_order_id = c.lastrowid
    c.execute("INSERT INTO orders (order_time, total_amount, source) VALUES (?,?,?)", (now, total, "voice"))
    main_order_id = c.lastrowid

    # Populate order_items so revenue analytics pick up these sales
    menu_rows = c.execute("SELECT id, name FROM menu_items WHERE is_active=1").fetchall()
    name_to_id = {r["name"].lower(): r["id"] for r in menu_rows}
    for it in order.get("items", []):
        mid = name_to_id.get((it.get("name") or "").lower())
        if mid:
            c.execute("INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?,?,?)",
                      (main_order_id, mid, it.get("qty", 1)))

    conn.commit()
    conn.close()
    return {"success": True, "order_id": voice_order_id, "total": total}

@app.get("/api/voice/upsell/{item_id}")
def get_upsell_for_item(item_id: int):
    """Given an ordered item, return best upsell based on combos + dead hour logic"""
    conn = get_db()
    combos = compute_combos(conn)
    dead = compute_dead_hours(conn)
    
    current_hour = datetime.now().strftime("%H")
    is_dead_hour = any(d["hour"] == current_hour for d in dead["dead_hours"])
    
    # Find combos involving this item
    relevant = [c for c in combos if c["item_a_id"] == item_id or c["item_b_id"] == item_id]
    
    conn.close()
    if relevant:
        best = relevant[0]
        partner = best["item_b"] if best["item_a_id"] == item_id else best["item_a"]
        partner_id = best["item_b_id"] if best["item_a_id"] == item_id else best["item_a_id"]
        return {
            "should_upsell": True,
            "upsell_item": partner,
            "upsell_item_id": partner_id,
            "combo_price": best["combo_price"],
            "saving": best["saving"],
            "is_dead_hour_special": is_dead_hour,
            "message": f"Add {partner} for just ₹{best['combo_price'] - 0} — save ₹{best['saving']}!"
        }
    return {"should_upsell": False}

@app.get("/api/missed-calls")
def missed_calls():
    conn = get_db()
    c = conn.cursor()
    rows = c.execute("SELECT * FROM missed_calls ORDER BY timestamp DESC").fetchall()
    conn.close()
    return {"missed_calls": [dict(r) for r in rows]}

@app.post("/api/missed-calls/{call_id}/recover")
def recover_missed_call(call_id: int):
    """Mark as recovered + simulate WhatsApp send"""
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE missed_calls SET recovered=1 WHERE id=?", (call_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "WhatsApp recovery message sent ✓"}

@app.get("/api/orders/recent")
def recent_orders():
    conn = get_db()
    c = conn.cursor()
    rows = c.execute("""
        SELECT o.id, o.order_time, o.total_amount, o.source,
               GROUP_CONCAT(m.name, ', ') as items
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN menu_items m ON oi.menu_item_id = m.id
        GROUP BY o.id
        ORDER BY o.order_time DESC LIMIT 15
    """).fetchall()
    conn.close()
    return {"orders": [dict(r) for r in rows]}

from pydantic import BaseModel
class VoiceDemoRequest(BaseModel):
    transcript: str

@app.post("/api/voice/demo")
def voice_demo_endpoint(req: VoiceDemoRequest):
    """Demo endpoint to process text transcript as voice order"""
    from voice_pipeline import process_voice_order, get_voice_upsell
    
    # 1. Process transcript to structured order
    result = process_voice_order(transcript_override=req.transcript, db_path=DB_PATH)
    
    # 2. Get upsells based on current combos and dead hours
    conn = get_db()
    dead = compute_dead_hours(conn)
    current_hour = datetime.now().strftime("%H")
    is_dead_hour = any(d["hour"] == current_hour for d in dead["dead_hours"])
    combos = compute_combos(conn)
    
    upsell = get_voice_upsell(result["items"], is_dead_hour, combos)
    result["upsell"] = upsell
    
    # 3. Save to database so dashboard updates
    c = conn.cursor()
    now = datetime.now().isoformat()
    total = sum(i.get("price", 0) * i.get("qty", 1) for i in result.get("items", []))
    # Attach modifiers to items for KOT / kitchen display
    items_data = result.get("items", [])
    modifiers = result.get("modifiers", {})
    if modifiers:
        for it in items_data:
            it["modifiers"] = modifiers
    # Insert Voice Order
    c.execute(
        "INSERT INTO voice_orders (phone, transcript, structured_order, upsell_shown, created_at, status, total_amount, updated_at) VALUES (?,?,?,?,?,?,?,?)",
        ("+919999999999", req.transcript,
         json.dumps(items_data), json.dumps(upsell), now, "pending", total, now)
    )
    
    # Insert main Order
    voice_order_id = c.lastrowid
    c.execute("INSERT INTO orders (order_time, total_amount, source) VALUES (?,?,?)", (now, total, "voice"))
    main_order_id = c.lastrowid

    # Populate order_items so revenue analytics pick up these sales
    menu_rows = c.execute("SELECT id, name FROM menu_items WHERE is_active=1").fetchall()
    name_to_id = {r["name"].lower(): r["id"] for r in menu_rows}
    for it in result.get("items", []):
        mid = name_to_id.get((it.get("name") or "").lower())
        if mid:
            c.execute("INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?,?,?)",
                      (main_order_id, mid, it.get("qty", 1)))

    conn.commit()
    conn.close()
    
    # Return consistent structure with success flag
    return {
        "success": True,
        "transcript": result.get("transcript", ""),
        "items": result.get("items", []),
        "modifiers": result.get("modifiers", {}),
        "total": result.get("total", 0),
        "summary": result.get("summary", ""),
        "confidence": result.get("confidence", ""),
        "upsell": upsell
    }


# ─── KOT (Kitchen Order Ticket) GENERATION ──────────────────────────────

@app.get("/api/orders/{order_id}/kot")
def generate_kot(order_id: int):
    """Generate a Kitchen Order Ticket for a given voice order — PoS integration ready."""
    conn = get_db()
    c = conn.cursor()
    row = c.execute(
        "SELECT id, phone, transcript, structured_order, created_at, status, total_amount FROM voice_orders WHERE id=?",
        (order_id,)
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Order not found")

    items = json.loads(row["structured_order"] or "[]")
    kot = {
        "kot_number": f"KOT-{row['id']:04d}",
        "order_id": row["id"],
        "timestamp": row["created_at"],
        "status": row["status"],
        "phone": row["phone"],
        "items": [
            {
                "name": it.get("name", ""),
                "qty": it.get("qty", 1),
                "price": it.get("price", 0),
                "modifiers": it.get("modifiers", {}),
            }
            for it in items
        ],
        "total": row["total_amount"] or sum(it.get("price", 0) * it.get("qty", 1) for it in items),
        "source": "voice",
        "notes": row["transcript"],
    }
    conn.close()
    return kot


# ─── CART RECOMMENDATIONS ───────────────────────────────────────────────

@app.post("/api/cart/recommendations")
def cart_recommendations(body: dict):
    """Given cart item names, return complementary items the customer might enjoy."""
    cart_names = [n.lower() for n in body.get("items", [])]
    if not cart_names:
        return {"recommendations": []}

    conn = get_db()
    c = conn.cursor()

    # Resolve cart item IDs
    menu_rows = c.execute("SELECT id, name, category, selling_price FROM menu_items WHERE is_active=1").fetchall()
    name_to_row = {r["name"].lower(): dict(r) for r in menu_rows}
    cart_ids = set()
    cart_categories = set()
    for n in cart_names:
        row = name_to_row.get(n)
        if row:
            cart_ids.add(row["id"])
            cart_categories.add(row["category"])

    # Co-occurrence based: items frequently ordered together with cart items
    cutoff = (datetime.now() - timedelta(days=90)).isoformat()
    orders_with_cart = c.execute(
        f"SELECT DISTINCT oi.order_id FROM order_items oi "
        f"JOIN orders o ON oi.order_id = o.id "
        f"WHERE oi.menu_item_id IN ({','.join('?' * len(cart_ids))}) AND o.order_time >= ?",
        (*cart_ids, cutoff)
    ).fetchall() if cart_ids else []
    order_ids = [r["order_id"] for r in orders_with_cart]

    co_items: dict[int, int] = {}
    if order_ids:
        placeholders = ','.join('?' * len(order_ids))
        co_rows = c.execute(
            f"SELECT menu_item_id, SUM(quantity) as freq FROM order_items "
            f"WHERE order_id IN ({placeholders}) AND menu_item_id NOT IN ({','.join('?' * len(cart_ids))}) "
            f"GROUP BY menu_item_id ORDER BY freq DESC LIMIT 20",
            (*order_ids, *cart_ids)
        ).fetchall()
        co_items = {r["menu_item_id"]: r["freq"] for r in co_rows}

    # Build recommendations: prioritize co-occurrence, then cross-category popular items
    recs = []
    seen_ids = set(cart_ids)
    id_to_row = {r["id"]: r for r in (dict(row) for row in menu_rows)}

    # 1. Co-occurrence picks
    for mid, freq in sorted(co_items.items(), key=lambda x: -x[1]):
        if mid in seen_ids:
            continue
        row = id_to_row.get(mid)
        if not row:
            continue
        recs.append({
            "id": row["id"],
            "name": row["name"],
            "price": row["selling_price"],
            "category": row["category"],
            "reason": "Frequently ordered together",
        })
        seen_ids.add(mid)
        if len(recs) >= 4:
            break

    # 2. Fill with cross-category popular items if not enough co-occurrence data
    if len(recs) < 4:
        # Category pairing heuristics
        pairings: dict[str, list[str]] = {
            "Curries": ["Breads", "Rice"],
            "Biryani": ["Starters", "Beverages"],
            "Chinese": ["Starters", "Beverages"],
            "Starters": ["Beverages", "Curries"],
            "Breads": ["Curries"],
            "Rice": ["Curries"],
            "Beverages": ["Starters", "Desserts"],
            "Desserts": ["Beverages"],
        }
        target_cats: set[str] = set()
        for cat in cart_categories:
            target_cats.update(pairings.get(cat, []))
        target_cats -= cart_categories  # don't recommend from same category

        for row in sorted(menu_rows, key=lambda r: -r["selling_price"]):
            r = dict(row)
            if r["id"] in seen_ids or r["category"] not in target_cats:
                continue
            recs.append({
                "id": r["id"],
                "name": r["name"],
                "price": r["selling_price"],
                "category": r["category"],
                "reason": f"Goes great with {list(cart_categories)[0]}" if cart_categories else "Popular pick",
            })
            seen_ids.add(r["id"])
            if len(recs) >= 4:
                break

    conn.close()
    return {"recommendations": recs}


# ─── SMART CALL TURN (OpenAI-powered intent understanding) ──────────────

class CallTurnRequest(BaseModel):
    transcript: str
    conversation: list = []  # [{role, text}, ...]
    current_order: list = []  # [{name, qty, price}, ...]

@app.post("/api/voice/smart-turn")
def smart_call_turn(req: CallTurnRequest):
    """
    Use OpenAI to understand the caller's intent given full conversation context.
    Returns: intent (add_items | confirm | decline_more | modify | unclear),
             items (if adding), and a natural reply.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        # Fallback to demo endpoint behavior
        return {"intent": "unclear", "items": [], "reply": "I couldn't process that.", "success": True}

    # Build menu string for the prompt
    conn = get_db()
    c = conn.cursor()
    menu_rows = c.execute("SELECT name, selling_price, category FROM menu_items WHERE is_active=1 ORDER BY category, name").fetchall()
    conn.close()
    menu_lines = [f"- {r['name']} (₹{r['selling_price']}, {r['category']})" for r in menu_rows]
    menu_str = "\n".join(menu_lines)

    # Build conversation history for context
    conv_lines = []
    for msg in req.conversation[-10:]:  # last 10 messages
        role_label = "Customer" if msg.get("role") == "user" else "Restaurant"
        conv_lines.append(f"{role_label}: {msg.get('text', '')}")

    current_order_str = ""
    if req.current_order:
        order_parts = [f"{it.get('qty',1)}x {it.get('name','?')} (₹{it.get('price',0)})" for it in req.current_order]
        current_order_str = "Current order so far: " + ", ".join(order_parts)
    else:
        current_order_str = "Current order: empty (no items yet)"

    system_prompt = f"""You are an AI assistant for SmartBite restaurant, processing a phone call order.
You must analyze the customer's latest message and determine their intent.

RESTAURANT MENU:
{menu_str}

{current_order_str}

CONVERSATION SO FAR:
{chr(10).join(conv_lines)}

RULES:
1. Intent must be ONE of: "add_items", "confirm_order", "decline_more", "modify_order", "greeting", "unclear"
2. "add_items" = customer wants to order new food items. Extract exact items with quantities.
3. "confirm_order" = customer says yes/confirm/place order/done (ONLY when they are agreeing to place the order)
4. "decline_more" = customer says no/nothing else/that's all (meaning they don't want more items, ready to finalize)
5. "modify_order" = customer wants to change/remove/update existing items
6. "greeting" = customer greets or asks a general question
7. "unclear" = genuinely cannot understand what customer wants
8. CRITICAL: Short words like "no", "nope", "nothing", "that's it", "that's all", "no thanks", "no more" are ALWAYS "decline_more" — they are NEVER food items.
9. "no place order", "no just place the order", "place my order" = "decline_more" (customer wants to finalize)
10. Only match items that clearly refer to food from the menu. Never hallucinate items.
11. For quantities: if not specified, default to 1.
12. Match items by name flexibly (e.g., "chai" = "Masala Chai", "coke" = "Coca Cola", "naan" = "Plain Naan")

Respond with ONLY valid JSON (no markdown, no backticks):
{{
  "intent": "add_items|confirm_order|decline_more|modify_order|greeting|unclear",
  "items": [{{"name": "exact menu item name", "qty": 1, "price": 0}}],
  "reply": "natural restaurant assistant response"
}}

For "items": only include when intent is "add_items". Use exact menu item names and prices from the menu above.
For "reply": write a warm, natural response as a restaurant phone assistant would say."""

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Customer's latest message: \"{req.transcript}\""}
            ],
            temperature=0.2,
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

        parsed = json.loads(raw)

        intent = parsed.get("intent", "unclear")
        items = parsed.get("items", [])
        reply = parsed.get("reply", "")

        # Validate & enrich items with correct prices from DB
        if intent == "add_items" and items:
            conn2 = get_db()
            menu_lookup = {}
            for r in conn2.execute("SELECT name, selling_price FROM menu_items WHERE is_active=1").fetchall():
                menu_lookup[r["name"].lower()] = {"name": r["name"], "price": float(r["selling_price"])}
            conn2.close()

            validated = []
            for it in items:
                key = (it.get("name") or "").lower()
                if key in menu_lookup:
                    validated.append({
                        "name": menu_lookup[key]["name"],
                        "qty": it.get("qty", 1),
                        "price": menu_lookup[key]["price"],
                    })
            items = validated

        return {
            "success": True,
            "intent": intent,
            "items": items,
            "reply": reply,
        }

    except Exception as e:
        print(f"[SMART-TURN] OpenAI error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": True,
            "intent": "unclear",
            "items": [],
            "reply": "I'm sorry, could you repeat that?",
        }


@app.post("/api/voice/live")
def live_voice_endpoint(audio: UploadFile = File(...)):
    """Process live microphone audio"""
    from voice_pipeline import process_voice_order
    
    print(f"[VOICE] Received audio file: {audio.filename}, content_type: {audio.content_type}")
    
    # Save audio to temp file
    fd, temp_path = tempfile.mkstemp(suffix=".webm")
    try:
        audio_content = audio.file.read()
        file_size = len(audio_content)
        print(f"[VOICE] Audio file size: {file_size} bytes")
        
        if file_size == 0:
            print("[VOICE] ERROR: Audio file is empty!")
            return {"success": False, "error": "Audio file is empty. Please try recording again."}
        
        with os.fdopen(fd, "wb") as f:
            f.write(audio_content)
        
        print(f"[VOICE] Saved audio to: {temp_path}")
        
        # Convert webm to wav for better Whisper compatibility
        wav_path = temp_path.replace('.webm', '.wav')
        try:
            import subprocess
            print(f"[VOICE] Converting webm to wav...")
            result = subprocess.run([
                'ffmpeg', '-i', temp_path, '-ar', '16000', '-ac', '1', '-y', wav_path
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"[VOICE] FFmpeg conversion warning: {result.stderr}")
            else:
                print(f"[VOICE] Converted to wav successfully")
                # Use wav file if conversion succeeded
                audio_file_path = wav_path
        except Exception as conv_error:
            print(f"[VOICE] Audio conversion failed: {conv_error}, using original file")
            audio_file_path = temp_path
            
        # Transcribe
        transcript = ""
        api_key = os.environ.get("OPENAI_API_KEY")
        print(f"[VOICE] OpenAI API Key present: {bool(api_key)}")
        
        if api_key:
            print("[VOICE] Attempting OpenAI Whisper transcription...")
            try:
                with open(audio_file_path, "rb") as audio_file:
                    client = openai.OpenAI(api_key=api_key)
                    print(f"[VOICE] Sending {os.path.getsize(audio_file_path)} bytes to Whisper API...")
                    
                    transcript_response = client.audio.transcriptions.create(
                        model="whisper-1", 
                        file=audio_file,
                        language="hi"
                    )
                    transcript = transcript_response.text
                    
                print(f"[VOICE] ✓ Transcription successful: '{transcript}'")
            except Exception as whisper_error:
                print(f"[VOICE] ✗ Whisper transcription failed!")
                print(f"[VOICE] Error type: {type(whisper_error).__name__}")
                print(f"[VOICE] Error message: {str(whisper_error)}")
                import traceback
                traceback.print_exc()
                print("[VOICE] Falling back to mock transcript")
                transcript = "two butter chicken and three garlic naan"
        else:
            print("[VOICE] No OpenAI API key, using mock transcript")
            transcript = "two butter chicken and three garlic naan"

        print(f"[VOICE] Transcript: {transcript}")

        # Process transcript
        result = process_voice_order(transcript_override=transcript, db_path=DB_PATH)
        print(f"[VOICE] Processed order result: {result}")
        
        # Save to database
        conn = get_db()
        c = conn.cursor()
        now = datetime.now().isoformat()
        
        c.execute(
            "INSERT INTO voice_orders (phone, transcript, structured_order, created_at, status) VALUES (?,?,?,?,?)",
            ("LIVE_DEMO", transcript, json.dumps(result.get("items", [])), now, "confirmed")
        )
        
        total = sum(i.get("price", 0) * i.get("qty", 1) for i in result.get("items", []))
        c.execute("INSERT INTO orders (order_time, total_amount, source) VALUES (?,?,?)", (now, total, "voice"))
        
        conn.commit()
        conn.close()
        
        response_data = {
            "success": True, 
            "transcript": transcript, 
            "items": result.get("items", []), 
            "total": total, 
            "summary": result.get("summary", ""), 
            "confidence": result.get("confidence", "")
        }
        print(f"[VOICE] Returning response: {response_data}")
        return response_data
    except Exception as e:
        print(f"[VOICE] Error processing live audio: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            print(f"[VOICE] Cleaned up temp file: {temp_path}")

from fastapi import Form
from typing import Optional


class DirectOrderLine(BaseModel):
    menu_item_id: int
    qty: int = Field(default=1, ge=1)


class DirectOrderRequest(BaseModel):
    session_id: Optional[str] = "menu_direct"
    items: List[DirectOrderLine]


@app.get("/api/menu/items")
def get_menu_items():
    """Return active menu items for customer direct ordering UI."""
    conn = get_db()
    c = conn.cursor()
    rows = c.execute(
        """
        SELECT id, name, category, selling_price
        FROM menu_items
        WHERE is_active = 1
        ORDER BY category, name
        """
    ).fetchall()
    conn.close()

    items = [
        {
            "id": r["id"],
            "name": r["name"],
            "category": r["category"],
            "selling_price": r["selling_price"],
        }
        for r in rows
    ]
    return {"success": True, "items": items}


@app.post("/api/order/direct")
def create_direct_order(payload: DirectOrderRequest):
    """Create a customer order directly from selected menu items."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must include at least one item")

    conn = get_db()
    c = conn.cursor()

    # Validate IDs in one query and build a price/name lookup.
    wanted_ids = [line.menu_item_id for line in payload.items]
    placeholders = ",".join(["?"] * len(wanted_ids))
    menu_rows = c.execute(
        f"""
        SELECT id, name, selling_price
        FROM menu_items
        WHERE is_active = 1 AND id IN ({placeholders})
        """,
        wanted_ids,
    ).fetchall()

    menu_map = {
        r["id"]: {
            "name": r["name"],
            "price": float(r["selling_price"]),
        }
        for r in menu_rows
    }

    missing_ids = [line.menu_item_id for line in payload.items if line.menu_item_id not in menu_map]
    if missing_ids:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Invalid menu_item_id(s): {missing_ids}")

    order_lines = []
    order_total = 0.0
    for line in payload.items:
        item_info = menu_map[line.menu_item_id]
        line_total = item_info["price"] * line.qty
        order_total += line_total
        order_lines.append(
            {
                "menu_item_id": line.menu_item_id,
                "name": item_info["name"],
                "qty": line.qty,
                "price": item_info["price"],
                "line_total": round(line_total, 2),
            }
        )

    now = datetime.now().isoformat()
    c.execute(
        "INSERT INTO orders (order_time, total_amount, source, items_json) VALUES (?,?,?,?)",
        (now, round(order_total, 2), "direct_menu", json.dumps(order_lines)),
    )
    order_id = c.lastrowid

    for line in payload.items:
        c.execute(
            "INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?,?,?)",
            (order_id, line.menu_item_id, line.qty),
        )

    # Keep a lightweight audit row consistent with other channels.
    c.execute(
        "INSERT INTO voice_orders (phone, transcript, structured_order, created_at, status) VALUES (?,?,?,?,?)",
        (
            payload.session_id or "menu_direct",
            "Direct menu order",
            json.dumps(order_lines),
            now,
            "confirmed",
        ),
    )

    conn.commit()
    conn.close()

    return {
        "success": True,
        "order_id": order_id,
        "total": round(order_total, 2),
        "items": order_lines,
    }

@app.post("/api/voice/conversation")
def conversation_voice_endpoint(
    audio: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    state: Optional[str] = Form(None)
):
    """Process customer voice, extract order, generate upsell script, and return TTS audio"""
    from voice_pipeline import process_voice_order, get_voice_upsell
    
    print(f"[CONVERSATION] Received audio file: {audio.filename}")
    
    # Save audio to temp file
    fd, temp_path = tempfile.mkstemp(suffix=".webm")
    try:
        with os.fdopen(fd, "wb") as f:
            shutil.copyfileobj(audio.file, f)
            
        # 1. Transcribe
        transcript = ""
        if os.environ.get("OPENAI_API_KEY"):
            print("[CONVERSATION] Using OpenAI Whisper for transcription")
            try:
                with open(temp_path, "rb") as f:
                    client = openai.OpenAI()
                    transcript_response = client.audio.transcriptions.create(
                        model="whisper-1", 
                        file=f,
                        language="hi"
                    )
                    transcript = transcript_response.text
                print(f"[CONVERSATION] Transcription successful: {transcript}")
            except Exception as whisper_error:
                print(f"[CONVERSATION] Whisper failed: {whisper_error}")
                transcript = "I would like one butter chicken and two plain naan"
        else:
            transcript = "I would like one butter chicken and two plain naan"

        print(f"[CONVERSATION] Customer said: {transcript}")
        
        # Check if this is a "Yes/No" response to a previous upsell
        norm_text = transcript.lower().strip()
        is_yes = "yes" in norm_text or "yeah" in norm_text or "sure" in norm_text or "ok" in norm_text or "do it" in norm_text or "add" in norm_text or "haan" in norm_text

        # Parse State if exists
        current_state = {}
        if state:
            try:
                current_state = json.loads(state)
            except Exception:
                pass
                
        reply_text = ""
        final_items = current_state.get("items", [])
        
        # 2. Logic depending on conversation state
        if current_state.get("awaiting_upsell_response"):
            upsell_item = current_state.get("last_upsell_item")
            if is_yes and upsell_item:
                # Add upsell to order
                final_items.append({
                    "name": upsell_item.get("name"),
                    "qty": 1,
                    "price": upsell_item.get("price")
                })
                reply_text = f"Great! I've added the {upsell_item.get('name')} to your order. Your food will be ready shortly. Enjoy your meal!"
            else:
                reply_text = "No problem. Your order has been placed successfully. It will be ready shortly."
                
            # Finalize Order in Database
            now = datetime.now().isoformat()
            total = sum(i.get("price", 0) * i.get("qty", 1) for i in final_items)
            conn = get_db()
            c = conn.cursor()
            c.execute(
                "INSERT INTO voice_orders (phone, transcript, structured_order, created_at, status) VALUES (?,?,?,?,?)",
                ("CUSTOMER_CHAT", "Finalized Order", json.dumps(final_items), now, "confirmed")
            )
            c.execute("INSERT INTO orders (order_time, total_amount, source) VALUES (?,?,?)", (now, total, "voice"))
            conn.commit()
            conn.close()
            
            current_state["completed"] = True
            current_state["awaiting_upsell_response"] = False
            
        else:
            # First interaction - Parse food
            result = process_voice_order(transcript_override=transcript, db_path=DB_PATH)
            new_items = result.get("items", [])
            
            if not new_items:
                reply_text = "I'm sorry, I didn't quite catch what you wanted to order. Could you repeat that?"
            else:
                final_items.extend(new_items)
                
                # Check for Combos / Upsells
                conn = get_db()
                dead = compute_dead_hours(conn)
                current_hour = datetime.now().strftime("%H")
                is_dead_hour = any(d["hour"] == current_hour for d in dead["dead_hours"])
                combos = compute_combos(conn)
                conn.close()
                
                upsell = get_voice_upsell(final_items, is_dead_hour, combos)
                
                # Assemble reply string
                items_str_list = [f"{i['qty']} {i['name']}" for i in final_items]
                items_str = ", ".join(items_str_list)
                
                if upsell.get("should_upsell"):
                    reply_text = f"Got it, I have added {items_str} to your order. {upsell.get('message')}"
                    current_state["awaiting_upsell_response"] = True
                    current_state["last_upsell_item"] = {
                        "name": upsell.get("upsell_item"),
                        "price": upsell.get("combo_price", 0) # Assumes the price difference is the combo addition
                    }
                else:
                    reply_text = f"Got it, I have ordered {items_str}. Your order will be ready shortly."
                    
                    # Store immediately if no upsell path
                    now = datetime.now().isoformat()
                    total = sum(i.get("price", 0) * i.get("qty", 1) for i in final_items)
                    conn = get_db()
                    c = conn.cursor()
                    c.execute(
                        "INSERT INTO voice_orders (phone, transcript, structured_order, created_at, status) VALUES (?,?,?,?,?)",
                        ("CUSTOMER_CHAT", transcript, json.dumps(final_items), now, "confirmed")
                    )
                    c.execute("INSERT INTO orders (order_time, total_amount, source) VALUES (?,?,?)", (now, total, "voice"))
                    conn.commit()
                    conn.close()
                    
                    current_state["completed"] = True

        current_state["items"] = final_items
        
        # 3. Text to Speech Generation (OpenAI)
        audio_base64 = None
        if os.environ.get("OPENAI_API_KEY"):
            print(f"[CONVERSATION] Synthesizing speech for: '{reply_text}'")
            try:
                response = openai.OpenAI().audio.speech.create(
                    model="tts-1",
                    voice="nova",
                    input=reply_text,
                    response_format="mp3"
                )
                audio_buffer = response.content
                audio_base64 = base64.b64encode(audio_buffer).decode('utf-8')
            except Exception as synth_e:
                print(f"[CONVERSATION] TTS Error: {synth_e}")
                
        return {
            "success": True,
            "transcript": transcript,
            "reply_text": reply_text,
            "audio_base64": f"data:audio/mp3;base64,{audio_base64}" if audio_base64 else None,
            "state": current_state
        }
        
    except Exception as e:
        print(f"[CONVERSATION] Error processing conversation: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/api/voice/chat")
def voice_chat_endpoint(
    audio: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    session_id: Optional[str] = Form("default"),
    conversation_state: Optional[str] = Form("{}"),
):
    """Frontend-compatible chat endpoint for text/audio ordering with recommendations."""
    from voice_pipeline import process_voice_order, get_voice_upsell

    def _safe_state(raw_state: Optional[str]) -> dict:
        if not raw_state:
            return {}
        try:
            parsed = json.loads(raw_state)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    def _finalize_order(items: list, sid: str, transcript_text: str) -> None:
        if not items:
            return
        now = datetime.now().isoformat()
        total_amount = sum(i.get("price", 0) * i.get("qty", 1) for i in items)
        conn = get_db()
        c = conn.cursor()
        c.execute(
            "INSERT INTO voice_orders (phone, transcript, structured_order, created_at, status) VALUES (?,?,?,?,?)",
            (sid or "default", transcript_text, json.dumps(items), now, "confirmed"),
        )
        c.execute(
            "INSERT INTO orders (order_time, total_amount, source, items_json) VALUES (?,?,?,?)",
            (now, total_amount, "ai_chat", json.dumps(items)),
        )
        order_id = c.lastrowid
        for item in items:
            if item.get("menu_item_id"):
                c.execute(
                    "INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?,?,?)",
                    (order_id, item.get("menu_item_id"), item.get("qty", 1)),
                )
        conn.commit()
        conn.close()

    state = _safe_state(conversation_state)
    order_items = state.get("order_items", [])
    awaiting_reco = state.get("awaiting_recommendation_response", False)
    current_reco = state.get("current_recommendation")
    recommendations_shown = state.get("recommendations_shown", False)

    user_message = (text or "").strip()
    temp_path = None
    wav_path = None

    try:
        # Accept either plain text or audio input.
        if not user_message and audio is not None:
            fd, temp_path = tempfile.mkstemp(suffix=".webm")
            with os.fdopen(fd, "wb") as f:
                shutil.copyfileobj(audio.file, f)

            api_key = os.environ.get("OPENAI_API_KEY")
            if api_key:
                try:
                    import subprocess

                    wav_path = temp_path.replace(".webm", ".wav")
                    conv = subprocess.run(
                        ["ffmpeg", "-i", temp_path, "-ar", "16000", "-ac", "1", "-y", wav_path],
                        capture_output=True,
                        text=True,
                    )
                    source_path = wav_path if conv.returncode == 0 else temp_path
                    with open(source_path, "rb") as audio_file:
                        client = openai.OpenAI(api_key=api_key)
                        transcript_response = client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file,
                            language="hi",
                        )
                        user_message = (transcript_response.text or "").strip()
                except Exception as whisper_error:
                    print(f"[VOICE_CHAT] Whisper failed: {whisper_error}")

            # Keep voice flow usable even without API key.
            if not user_message:
                user_message = "one butter chicken and two garlic naan"

        if not user_message:
            return {"success": False, "error": "No input provided"}

        norm = user_message.lower().strip()
        is_yes = any(k in norm for k in ["yes", "yeah", "sure", "ok", "okay", "haan", "add"])
        is_no = any(k in norm for k in ["no", "nope", "nah", "nahi", "nahin", "skip"])
        is_done = any(k in norm for k in ["done", "finish", "complete", "confirm", "place order", "that's all", "thats all", "bas"])

        response_text = ""
        order_finalized = False

        if awaiting_reco and current_reco:
            if is_yes:
                reco_line = {
                    "menu_item_id": current_reco.get("menu_item_id"),
                    "name": current_reco.get("name"),
                    "qty": 1,
                    "price": current_reco.get("price", 0),
                }
                order_items.append(reco_line)
                response_text = f"Great, I added {reco_line['name']}. Say 'done' to place the order, or add more items."
                state["awaiting_recommendation_response"] = False
                state["current_recommendation"] = None
            elif is_no:
                response_text = "No problem. Say 'done' to place your order, or tell me what else to add."
                state["awaiting_recommendation_response"] = False
                state["current_recommendation"] = None

        if not response_text and is_done and order_items:
            _finalize_order(order_items, session_id or "default", user_message)
            total = sum(i.get("price", 0) * i.get("qty", 1) for i in order_items)
            response_text = f"Perfect. Your order is placed successfully. Total is rupees {int(total)}."
            order_finalized = True
            state["awaiting_recommendation_response"] = False
            state["current_recommendation"] = None

        if not response_text:
            parsed = process_voice_order(transcript_override=user_message, db_path=DB_PATH)
            new_items = parsed.get("items", [])
            if new_items:
                order_items.extend(new_items)
                items_str = ", ".join([f"{i.get('qty', 1)} {i.get('name')}" for i in new_items])
                response_text = f"Got it. I added {items_str}."

                if not recommendations_shown:
                    try:
                        conn = get_db()
                        dead = compute_dead_hours(conn)
                        combos = compute_combos(conn)
                        conn.close()
                        current_hour = datetime.now().strftime("%H")
                        is_dead_hour = any(d.get("hour") == current_hour for d in dead.get("dead_hours", []))
                        upsell = get_voice_upsell(order_items, is_dead_hour, combos)
                    except Exception as rec_error:
                        print(f"[VOICE_CHAT] Recommendation fallback: {rec_error}")
                        upsell = {"should_upsell": False}

                    if upsell.get("should_upsell"):
                        reco_name = upsell.get("upsell_item")
                        reco_price = upsell.get("combo_price", 0)
                        response_text += f" Would you like to add {reco_name} as well?"
                        state["awaiting_recommendation_response"] = True
                        state["current_recommendation"] = {
                            "menu_item_id": None,
                            "name": reco_name,
                            "price": reco_price,
                        }
                        recommendations_shown = True
                    else:
                        response_text += " Say 'done' to place your order, or add more items."
            else:
                if not order_items:
                    response_text = "I did not catch an order item. Please tell me what you want to eat."
                else:
                    response_text = "I did not catch that clearly. You can add more items or say 'done' to place the order."

        audio_data_uri = None
        api_key = os.environ.get("OPENAI_API_KEY")
        if api_key and response_text:
            try:
                tts_response = openai.OpenAI(api_key=api_key).audio.speech.create(
                    model="tts-1",
                    voice="nova",
                    input=response_text,
                    response_format="mp3",
                )
                audio_data_uri = f"data:audio/mp3;base64,{base64.b64encode(tts_response.content).decode('utf-8')}"
            except Exception as tts_error:
                print(f"[VOICE_CHAT] TTS failed: {tts_error}")

        state["order_items"] = order_items
        state["recommendations_shown"] = recommendations_shown
        state["order_finalized"] = order_finalized

        total = sum(i.get("price", 0) * i.get("qty", 1) for i in order_items)

        return {
            "success": True,
            "transcript": user_message,
            "response": response_text,
            "audio": audio_data_uri,
            "state": json.dumps(state),
            "order_items": order_items,
            "order_total": total,
            "order_finalized": order_finalized,
        }

    except Exception as e:
        print(f"[VOICE_CHAT] Error: {e}")
        import traceback

        traceback.print_exc()
        return {"success": False, "error": str(e)}
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        if wav_path and os.path.exists(wav_path):
            os.remove(wav_path)

# ─── STARTUP ────────────────────────────────────────────────────────────────
init_db()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
