"""
Synthetic Dataset Generator for SmartBite
Generates realistic menu items, order history, and customer data
"""
import sqlite3
import json
from datetime import datetime, timedelta
import random

# Enhanced Menu Dataset
MENU_ITEMS = [
    # Starters
    {"name": "Paneer Tikka", "category": "Starters", "price": 220, "description": "Grilled cottage cheese with spices"},
    {"name": "Chicken Tikka", "category": "Starters", "price": 280, "description": "Tandoori marinated chicken"},
    {"name": "Veg Spring Rolls", "category": "Starters", "price": 180, "description": "Crispy vegetable rolls"},
    {"name": "Chilli Chicken", "category": "Starters", "price": 260, "description": "Indo-Chinese spicy chicken"},
    {"name": "Crispy Corn", "category": "Starters", "price": 190, "description": "American corn kernels fried"},
    {"name": "Mushroom Tikka", "category": "Starters", "price": 210, "description": "Grilled mushrooms with herbs"},
    {"name": "Fish Tikka", "category": "Starters", "price": 320, "description": "Tandoori fish fillet"},
    {"name": "Hara Bhara Kabab", "category": "Starters", "price": 170, "description": "Spinach and peas patties"},
    
    # Curries
    {"name": "Butter Chicken", "category": "Curries", "price": 320, "description": "Creamy tomato chicken curry"},
    {"name": "Paneer Butter Masala", "category": "Curries", "price": 280, "description": "Cottage cheese in buttery gravy"},
    {"name": "Dal Makhani", "category": "Curries", "price": 240, "description": "Black lentils in cream"},
    {"name": "Chicken Curry", "category": "Curries", "price": 290, "description": "Traditional chicken curry"},
    {"name": "Kadai Paneer", "category": "Curries", "price": 270, "description": "Paneer with bell peppers"},
    {"name": "Rogan Josh", "category": "Curries", "price": 340, "description": "Kashmiri mutton curry"},
    {"name": "Palak Paneer", "category": "Curries", "price": 260, "description": "Spinach with cottage cheese"},
    {"name": "Malai Kofta", "category": "Curries", "price": 250, "description": "Fried veggie balls in gravy"},
    {"name": "Chicken Tikka Masala", "category": "Curries", "price": 330, "description": "Tikka in spiced gravy"},
    {"name": "Mutton Korma", "category": "Curries", "price": 380, "description": "Mild mutton curry"},
    
    # Breads
    {"name": "Garlic Naan", "category": "Breads", "price": 60, "description": "Naan bread with garlic"},
    {"name": "Plain Naan", "category": "Breads", "price": 45, "description": "Traditional Indian bread"},
    {"name": "Butter Naan", "category": "Breads", "price": 50, "description": "Naan with butter"},
    {"name": "Cheese Naan", "category": "Breads", "price": 80, "description": "Naan stuffed with cheese"},
    {"name": "Roti", "category": "Breads", "price": 35, "description": "Whole wheat flatbread"},
    {"name": "Lachha Paratha", "category": "Breads", "price": 55, "description": "Layered flatbread"},
    {"name": "Kulcha", "category": "Breads", "price": 50, "description": "Leavened bread"},
    {"name": "Aloo Paratha", "category": "Breads", "price": 70, "description": "Potato stuffed paratha"},
    
    # Rice & Biryani
    {"name": "Chicken Biryani", "category": "Biryani", "price": 280, "description": "Aromatic rice with chicken"},
    {"name": "Veg Biryani", "category": "Biryani", "price": 240, "description": "Mixed vegetables biryani"},
    {"name": "Mutton Biryani", "category": "Biryani", "price": 350, "description": "Fragrant rice with mutton"},
    {"name": "Egg Biryani", "category": "Biryani", "price": 220, "description": "Biryani with boiled eggs"},
    {"name": "Steamed Rice", "category": "Rice", "price": 120, "description": "Plain basmati rice"},
    {"name": "Jeera Rice", "category": "Rice", "price": 150, "description": "Cumin flavored rice"},
    {"name": "Veg Pulao", "category": "Rice", "price": 180, "description": "Vegetable fried rice"},
    {"name": "Fried Rice", "category": "Rice", "price": 180, "description": "Chinese style fried rice"},
    
    # Beverages
    {"name": "Mango Lassi", "category": "Beverages", "price": 90, "description": "Sweet yogurt mango drink"},
    {"name": "Sweet Lassi", "category": "Beverages", "price": 70, "description": "Traditional yogurt drink"},
    {"name": "Salted Lassi", "category": "Beverages", "price": 70, "description": "Savory yogurt drink"},
    {"name": "Fresh Lime Soda", "category": "Beverages", "price": 60, "description": "Fizzy lemonade"},
    {"name": "Masala Chai", "category": "Beverages", "price": 40, "description": "Indian spiced tea"},
    {"name": "Cold Coffee", "category": "Beverages", "price": 100, "description": "Chilled coffee shake"},
    {"name": "Coca Cola", "category": "Beverages", "price": 50, "description": "Soft drink"},
    {"name": "Mineral Water", "category": "Beverages", "price": 30, "description": "Packaged water"},
    {"name": "Buttermilk", "category": "Beverages", "price": 60, "description": "Spiced yogurt drink"},
    
    # Chinese
    {"name": "Veg Manchurian", "category": "Chinese", "price": 200, "description": "Veggie balls in sauce"},
    {"name": "Chicken Manchurian", "category": "Chinese", "price": 240, "description": "Chicken in tangy sauce"},
    {"name": "Hakka Noodles", "category": "Chinese", "price": 180, "description": "Stir fried noodles"},
    {"name": "Chowmein", "category": "Chinese", "price": 180, "description": "Indian style noodles"},
    {"name": "Paneer Chilli", "category": "Chinese", "price": 230, "description": "Spicy paneer Indo-Chinese"},
    {"name": "Gobi Manchurian", "category": "Chinese", "price": 190, "description": "Cauliflower in sauce"},
    
    # Desserts
    {"name": "Gulab Jamun", "category": "Desserts", "price": 80, "description": "Sweet milk balls in syrup"},
    {"name": "Rasgulla", "category": "Desserts", "price": 70, "description": "Soft cottage cheese balls"},
    {"name": "Ice Cream", "category": "Desserts", "price": 100, "description": "Assorted flavors"},
    {"name": "Kulfi", "category": "Desserts", "price": 90, "description": "Indian ice cream"},
    {"name": "Gajar Halwa", "category": "Desserts", "price": 110, "description": "Carrot pudding"},
    {"name": "Rasmalai", "category": "Desserts", "price": 120, "description": "Cottage cheese in milk"},
]

# Realistic order combinations
ORDER_PATTERNS = [
    # Family orders
    {"items": ["Butter Chicken", "Paneer Butter Masala", "Garlic Naan", "Plain Naan", "Mango Lassi"], "qty": [2, 1, 4, 2, 3]},
    {"items": ["Chicken Biryani", "Gulab Jamun", "Sweet Lassi"], "qty": [3, 4, 2]},
    {"items": ["Paneer Tikka", "Dal Makhani", "Butter Naan", "Sweet Lassi"], "qty": [1, 2, 4, 2]},
    
    # Single person orders
    {"items": ["Chicken Curry", "Plain Naan", "Salted Lassi"], "qty": [1, 2, 1]},
    {"items": ["Veg Biryani", "Fresh Lime Soda"], "qty": [1, 1]},
    {"items": ["Butter Chicken", "Garlic Naan"], "qty": [1, 2]},
    
    # Lunch combos
    {"items": ["Dal Makhani", "Jeera Rice", "Roti"], "qty": [1, 1, 2]},
    {"items": ["Chicken Tikka", "Butter Chicken", "Butter Naan", "Steamed Rice"], "qty": [1, 1, 2, 1]},
    
    # Chinese lovers
    {"items": ["Chilli Chicken", "Hakka Noodles", "Fried Rice"], "qty": [1, 1, 1]},
    {"items": ["Veg Manchurian", "Chowmein", "Cold Coffee"], "qty": [1, 1, 2]},
]


def _deterministic_ratio(seed_text: str, min_value: float, max_value: float) -> float:
    spread = max_value - min_value
    if spread <= 0:
        return min_value
    seed_score = sum(ord(ch) for ch in seed_text) % 1000
    return min_value + (seed_score / 999.0) * spread


def estimate_food_cost(name: str, category: str, selling_price: float) -> float:
    """Estimate per-item food cost with stable variation by category and item."""
    category_ranges = {
        "starters": (50.0, 64.0),
        "curries": (54.0, 70.0),
        "breads": (58.0, 75.0),
        "biryani": (46.0, 60.0),
        "rice": (46.0, 60.0),
        "beverages": (60.0, 82.0),
        "chinese": (48.0, 65.0),
        "desserts": (55.0, 72.0),
    }
    min_margin, max_margin = category_ranges.get(category.lower(), (50.0, 68.0))
    margin_pct = _deterministic_ratio(f"{name}::{category}", min_margin, max_margin)
    margin_pct = max(35.0, min(85.0, margin_pct))
    return round(selling_price * (1 - margin_pct / 100.0), 2)

def create_database(db_path="smartbite.db"):
    """Initialize database with synthetic data"""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Create tables if not exist
    c.execute("""CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        category TEXT,
        selling_price REAL,
        cost_price REAL,
        description TEXT,
        is_active INTEGER DEFAULT 1
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS voice_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT,
        transcript TEXT,
        structured_order TEXT,
        created_at TEXT,
        status TEXT
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_time TEXT,
        total_amount REAL,
        source TEXT
    )""")
    
    # Clear existing data
    c.execute("DELETE FROM menu_items")
    c.execute("DELETE FROM voice_orders")
    c.execute("DELETE FROM orders")
    
    # Inspect existing schema so inserts remain compatible with legacy DBs
    col_rows = c.execute("PRAGMA table_info(menu_items)").fetchall()
    menu_cols = {row[1] for row in col_rows}

    # Insert menu items
    print("Inserting menu items...")
    for item in MENU_ITEMS:
        food_cost = estimate_food_cost(item["name"], item["category"], item["price"])
        cost_price = food_cost

        insert_cols = ["name", "category", "selling_price"]
        insert_vals = [item["name"], item["category"], item["price"]]

        # Handle either cost_price or food_cost depending on schema
        if "cost_price" in menu_cols:
            insert_cols.append("cost_price")
            insert_vals.append(cost_price)
        elif "food_cost" in menu_cols:
            insert_cols.append("food_cost")
            insert_vals.append(food_cost)

        if "description" in menu_cols:
            insert_cols.append("description")
            insert_vals.append(item["description"])

        if "is_active" in menu_cols:
            insert_cols.append("is_active")
            insert_vals.append(1)

        placeholders = ", ".join(["?"] * len(insert_cols))
        c.execute(
            f"INSERT INTO menu_items ({', '.join(insert_cols)}) VALUES ({placeholders})",
            tuple(insert_vals),
        )
    
    print(f"✓ Inserted {len(MENU_ITEMS)} menu items")
    
    # Generate order history (last 30 days)
    print("Generating order history...")
    base_date = datetime.now() - timedelta(days=30)
    order_count = 0
    
    for day in range(30):
        date = base_date + timedelta(days=day)
        # Generate 20-40 orders per day
        daily_orders = random.randint(20, 40)
        
        for _ in range(daily_orders):
            # Random time during the day
            hour = random.choices([11, 12, 13, 14, 19, 20, 21, 22], weights=[1, 2, 3, 2, 2, 3, 3, 2])[0]
            minute = random.randint(0, 59)
            order_time = date.replace(hour=hour, minute=minute)
            
            # Select a pattern or create random order
            if random.random() < 0.7:  # 70% follow patterns
                pattern = random.choice(ORDER_PATTERNS)
                items = []
                total = 0
                transcript_parts = []
                
                for item_name, qty in zip(pattern["items"], pattern["qty"]):
                    # Find item in menu
                    result = c.execute("SELECT id, selling_price FROM menu_items WHERE name=?", (item_name,)).fetchone()
                    if result:
                        item_id, price = result
                        items.append({
                            "menu_item_id": item_id,
                            "name": item_name,
                            "qty": qty,
                            "price": price
                        })
                        total += price * qty
                        
                        # Generate natural transcript
                        qty_word = ["one", "two", "three", "four", "five"][min(qty-1, 4)]
                        transcript_parts.append(f"{qty_word} {item_name.lower()}")
                
                transcript = f"I want {', '.join(transcript_parts[:-1])} and {transcript_parts[-1]}" if len(transcript_parts) > 1 else f"I want {transcript_parts[0]}"
                
            else:  # 30% random orders
                num_items = random.randint(1, 4)
                selected = random.sample(MENU_ITEMS, num_items)
                items = []
                total = 0
                transcript_parts = []
                
                for item in selected:
                    result = c.execute("SELECT id, selling_price FROM menu_items WHERE name=?", (item["name"],)).fetchone()
                    if result:
                        item_id, price = result
                        qty = random.randint(1, 3)
                        items.append({
                            "menu_item_id": item_id,
                            "name": item["name"],
                            "qty": qty,
                            "price": price
                        })
                        total += price * qty
                        
                        qty_word = ["one", "two", "three"][min(qty-1, 2)]
                        transcript_parts.append(f"{qty_word} {item['name'].lower()}")
                
                transcript = f"{' and '.join(transcript_parts)}"
            
            # Insert order
            if items:
                c.execute("""INSERT INTO voice_orders (phone, transcript, structured_order, created_at, status)
                             VALUES (?, ?, ?, ?, ?)""",
                          ("9876543210", transcript, json.dumps(items), order_time.isoformat(), "confirmed"))
                
                c.execute("""INSERT INTO orders (order_time, total_amount, source)
                             VALUES (?, ?, ?)""",
                          (order_time.isoformat(), total, random.choice(["voice", "web", "phone"])))
                order_count += 1
    
    conn.commit()
    print(f"✓ Generated {order_count} orders over 30 days")
    
    # Print statistics
    print("\n=== Database Statistics ===")
    print(f"Total Menu Items: {len(MENU_ITEMS)}")
    print(f"Categories: {len(set(item['category'] for item in MENU_ITEMS))}")
    print(f"Total Orders: {order_count}")
    print(f"Average Orders/Day: {order_count/30:.1f}")
    
    # Print top selling items
    print("\n=== Top 5 Selling Items ===")
    top_items = c.execute("""
        SELECT m.name, COUNT(*) as order_count
        FROM voice_orders vo
        JOIN menu_items m ON json_extract(vo.structured_order, '$') LIKE '%' || m.name || '%'
        GROUP BY m.name
        ORDER BY order_count DESC
        LIMIT 5
    """).fetchall()
    
    for idx, (name, count) in enumerate(top_items, 1):
        print(f"{idx}. {name}: {count} orders")
    
    conn.close()
    print("\n✓ Synthetic dataset generation complete!")

if __name__ == "__main__":
    create_database()
