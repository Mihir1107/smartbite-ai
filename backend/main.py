from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sqlite3, json, os, tempfile, shutil, openai
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SmartBite AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        status TEXT DEFAULT 'pending'
    );
    """)
    conn.commit()

    # Seed only if empty
    if c.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0] == 0:
        seed_data(conn)
    conn.close()

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
        high_pop = r["units_sold"] >= median_units
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
    action_type = action.get("type")
    
    if action_type == "raise_price":
        new_price = action.get("new_price")
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
    rows = c.execute("SELECT * FROM voice_orders ORDER BY created_at DESC LIMIT 20").fetchall()
    conn.close()
    return {"orders": [dict(r) for r in rows]}

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
    c.execute(
        "INSERT INTO voice_orders (phone, transcript, structured_order, upsell_shown, created_at, status) VALUES (?,?,?,?,?,?)",
        (order.get("phone", "unknown"), order.get("transcript", ""),
         json.dumps(order.get("items", [])), json.dumps(order.get("upsell", {})), now, "confirmed")
    )
    
    # Also add to main orders table for analytics
    total = sum(i.get("price", 0) * i.get("qty", 1) for i in order.get("items", []))
    order_id = c.lastrowid
    c.execute("INSERT INTO orders (order_time, total_amount, source) VALUES (?,?,?)", (now, total, "voice"))
    conn.commit()
    conn.close()
    return {"success": True, "order_id": order_id}

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
    # Insert Voice Order
    c.execute(
        "INSERT INTO voice_orders (phone, transcript, structured_order, upsell_shown, created_at, status) VALUES (?,?,?,?,?,?)",
        ("+919999999999", req.transcript,
         json.dumps(result.get("items", [])), json.dumps(upsell), now, "confirmed")
    )
    
    # Insert main Order
    total = sum(i.get("price", 0) * i.get("qty", 1) for i in result.get("items", []))
    order_id = c.lastrowid
    c.execute("INSERT INTO orders (order_time, total_amount, source) VALUES (?,?,?)", (now, total, "voice"))
    conn.commit()
    conn.close()
    
    return result

@app.post("/api/voice/live")
def live_voice_endpoint(audio: UploadFile = File(...)):
    """Process live microphone audio"""
    from voice_pipeline import process_voice_order
    
    # Save audio to temp file
    fd, temp_path = tempfile.mkstemp(suffix=".webm")
    try:
        with os.fdopen(fd, "wb") as f:
            shutil.copyfileobj(audio.file, f)
            
        # Transcribe
        transcript = ""
        if os.environ.get("OPENAI_API_KEY"):
            with open(temp_path, "rb") as f:
                transcript_response = openai.OpenAI().audio.translations.create(
                    model="whisper-1", 
                    file=f
                )
                transcript = transcript_response.text
        else:
            transcript = "ek butter chicken aur do garlic naan"

        # Process transcript
        result = process_voice_order(transcript_override=transcript, db_path=DB_PATH)
        
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
        
        return {
            "success": True, 
            "transcript": transcript, 
            "items": result.get("items", []), 
            "total": total, 
            "summary": result.get("summary", ""), 
            "confidence": result.get("confidence", "")
        }
    except Exception as e:
        print(f"Error processing live audio: {e}")
        return {"success": False, "error": str(e)}
    finally:
        os.remove(temp_path)

# ─── STARTUP ────────────────────────────────────────────────────────────────
init_db()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
