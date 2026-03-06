"""
SmartBite AI — Voice Ordering Pipeline
Flow: Audio → Whisper STT → spaCy NLP → Fuzzy Match → Structured Order JSON → Upsell injection
"""
import os, json, re
from rapidfuzz import process, fuzz
import sqlite3

# ─── MENU LOADER ────────────────────────────────────────────────────────────

def load_menu(db_path="smartbite.db"):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT id, name, category, selling_price FROM menu_items WHERE is_active=1").fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─── WHISPER STT ─────────────────────────────────────────────────────────────

def transcribe_audio(audio_file_path: str) -> str:
    """
    Transcribe audio using OpenAI Whisper API.
    Falls back to a mock for testing without API key.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        # Mock for demo/testing
        return "I want one butter chicken and two garlic naan and one mango lassi"

    import openai
    client = openai.OpenAI(api_key=api_key)
    with open(audio_file_path, "rb") as f:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language="hi",  # handles English, Hindi, Hinglish
            response_format="text"
        )
    return transcript


# ─── NLP INTENT PARSER ──────────────────────────────────────────────────────

# Quantity word map (Hindi + English)
QUANTITY_WORDS = {
    "ek": 1, "one": 1, "1": 1,
    "do": 2, "two": 2, "2": 2,
    "teen": 3, "three": 3, "3": 3,
    "char": 4, "four": 4, "4": 4,
    "paanch": 5, "five": 5, "5": 5,
    "half": 0.5, "adha": 0.5
}

# Common food aliases / Hinglish mappings
ALIASES = {
    "murg": "chicken", "murgh": "chicken", "murgi": "chicken",
    "panir": "paneer", "paneer tikka": "paneer tikka",
    "biriyani": "biryani", "biriani": "biryani",
    "naan": "naan", "nan": "naan",
    "lassi": "lassi", "mango shake": "mango lassi",
    "chai": "masala chai", "tea": "masala chai",
    "gulab jamun": "gulab jamun", "gulabjamun": "gulab jamun",
    "btr chicken": "butter chicken", "bttr chicken": "butter chicken",
    "dal": "dal makhani", "daal": "dal makhani",
}

def normalize_text(text: str) -> str:
    text = text.lower().strip()
    for alias, replacement in ALIASES.items():
        text = text.replace(alias, replacement)
    return text


def extract_order_items(transcript: str, menu: list) -> list:
    """
    Extract items + quantities from transcript using regex + fuzzy matching.
    Returns list of {menu_item_id, name, qty, price}
    """
    normalized = normalize_text(transcript)
    menu_names = [item["name"].lower() for item in menu]
    
    extracted = []
    
    # Split by conjunctions to handle "X and Y and Z"
    parts = re.split(r'\band\b|\baur\b|\btatha\b|,', normalized)
    
    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Detect quantity
        qty = 1
        for word, val in QUANTITY_WORDS.items():
            pattern = r'\b' + re.escape(word) + r'\b'
            if re.search(pattern, part):
                qty = val
                part = re.sub(pattern, '', part).strip()
                break

        # Fuzzy match to menu
        if not part:
            continue
        
        match_result = process.extractOne(
            part, menu_names,
            scorer=fuzz.partial_ratio,
            score_cutoff=80
        )
        
        if match_result:
            matched_name, score, idx = match_result
            item = menu[idx]
            extracted.append({
                "menu_item_id": item["id"],
                "name": item["name"],
                "qty": int(qty),
                "price": item["selling_price"],
                "match_score": score
            })

    # Deduplicate (merge same items)
    merged = {}
    for item in extracted:
        mid = item["menu_item_id"]
        if mid in merged:
            merged[mid]["qty"] += item["qty"]
        else:
            merged[mid] = item
    
    return list(merged.values())


# ─── MODIFIER HANDLER ───────────────────────────────────────────────────────

MODIFIERS = {
    "spice": ["mild", "medium", "spicy", "extra spicy", "teekha", "kam teekha"],
    "size": ["small", "large", "half", "full"],
    "special": ["no onion", "no garlic", "extra cheese", "without onion"]
}

def extract_modifiers(transcript: str) -> dict:
    mods = {}
    normalized = transcript.lower()
    for mod_type, options in MODIFIERS.items():
        for opt in options:
            if opt in normalized:
                mods[mod_type] = opt
                break
    return mods


# ─── CLARIFICATION LOGIC ────────────────────────────────────────────────────

def needs_clarification(items: list) -> list:
    """Return clarification questions if any item has low confidence"""
    questions = []
    for item in items:
        if item.get("match_score", 100) < 70:
            questions.append(f"Did you mean {item['name']}?")
    return questions


# ─── FULL PIPELINE ──────────────────────────────────────────────────────────

def process_voice_order(audio_path: str = None, transcript_override: str = None, db_path: str = "smartbite.db") -> dict:
    """
    Full pipeline: audio file or raw transcript → structured order JSON
    """
    menu = load_menu(db_path)
    
    # Step 1: Transcribe
    if transcript_override:
        transcript = transcript_override
    else:
        transcript = transcribe_audio(audio_path)
    
    # Step 2: Extract items
    items = extract_order_items(transcript, menu)
    
    # Step 3: Extract modifiers
    modifiers = extract_modifiers(transcript)
    
    # Step 4: Clarification check
    clarifications = needs_clarification(items)
    
    # Step 5: Calculate total
    total = sum(i["price"] * i["qty"] for i in items)
    
    # Step 6: Generate order summary text
    if items:
        summary_parts = [f"{i['qty']}x {i['name']}" for i in items]
        summary = "Your order: " + ", ".join(summary_parts) + f". Total: ₹{total}. Shall I confirm?"
    else:
        summary = "Sorry, I couldn't understand your order. Could you please repeat?"
    
    return {
        "transcript": transcript,
        "items": items,
        "modifiers": modifiers,
        "total": total,
        "summary": summary,
        "needs_clarification": len(clarifications) > 0,
        "clarification_questions": clarifications,
        "confidence": "high" if all(i.get("match_score", 100) >= 70 for i in items) else "low"
    }


# ─── UPSELL INJECTOR ────────────────────────────────────────────────────────

def get_voice_upsell(items: list, dead_hour_active: bool, combos: list) -> dict:
    """
    Given confirmed order items, find best upsell to inject into voice flow.
    Prioritizes dead-hour specials.
    """
    if not items or not combos:
        return {"should_upsell": False}
    
    ordered_ids = {i["menu_item_id"] for i in items}
    
    for combo in combos:
        a_id, b_id = combo["item_a_id"], combo["item_b_id"]
        if a_id in ordered_ids and b_id not in ordered_ids:
            partner = combo["item_b"]
            saving = combo["saving"]
            prefix = "🔥 Special deal right now! " if dead_hour_active else ""
            return {
                "should_upsell": True,
                "upsell_item": partner,
                "combo_price": combo["combo_price"],
                "saving": saving,
                "message": f"{prefix}Would you like to add {partner} for just ₹{saving} more? You save ₹{saving}!"
            }
        elif b_id in ordered_ids and a_id not in ordered_ids:
            partner = combo["item_a"]
            saving = combo["saving"]
            prefix = "🔥 Special deal right now! " if dead_hour_active else ""
            return {
                "should_upsell": True,
                "upsell_item": partner,
                "combo_price": combo["combo_price"],
                "saving": saving,
                "message": f"{prefix}Would you like to add {partner} for just ₹{saving} more? You save ₹{saving}!"
            }
    
    return {"should_upsell": False}


# ─── INTELLIGENT RECOMMENDATION SYSTEM ──────────────────────────────────────

def get_smart_recommendations(items: list, menu: list, db_path: str = "smartbite.db") -> dict:
    """
    Advanced recommendation engine based on:
    1. Category analysis (curries need bread/rice)
    2. Popular item pairings from order history
    3. Meal completeness (missing drinks, sides, desserts)
    4. Price-based upselling (suggest premium alternatives)
    """
    if not items:
        return {"has_recommendations": False, "recommendations": []}
    
    ordered_names = {item["name"].lower() for item in items}
    ordered_categories = set()
    
    # Analyze what's already ordered
    conn = sqlite3.connect(db_path)
    for item in items:
        category_row = conn.execute(
            "SELECT category FROM menu_items WHERE id=?", 
            (item["menu_item_id"],)
        ).fetchone()
        if category_row:
            ordered_categories.add(category_row[0].lower())
    
    recommendations = []
    
    # Rule 1: Complementary Categories
    category_pairs = {
        "curries": ["breads", "rice", "beverages"],
        "biryani": ["raita", "beverages", "starters"],
        "breads": ["curries", "starters"],
        "starters": ["main course", "beverages"],
        "chinese": ["beverages", "starters"]
    }
    
    for ordered_cat in ordered_categories:
        if ordered_cat in category_pairs:
            for suggested_cat in category_pairs[ordered_cat]:
                if suggested_cat not in ordered_categories:
                    # Find popular item from this category
                    popular_item = conn.execute("""
                        SELECT m.id, m.name, m.selling_price, m.category
                        FROM menu_items m
                        WHERE LOWER(m.category) = ? AND m.is_active = 1
                        ORDER BY m.selling_price ASC
                        LIMIT 1
                    """, (suggested_cat.lower(),)).fetchone()
                    
                    if popular_item:
                        recommendations.append({
                            "menu_item_id": popular_item[0],
                            "name": popular_item[1],
                            "price": popular_item[2],
                            "category": popular_item[3],
                            "reason": f"Pairs perfectly with your {ordered_cat}",
                            "priority": 1
                        })
    
    # Rule 2: Missing Drink (high priority)
    has_beverage = any("beverage" in cat or "drink" in cat for cat in ordered_categories)
    if not has_beverage:
        drink = conn.execute("""
            SELECT m.id, m.name, m.selling_price, m.category
            FROM menu_items m
            WHERE LOWER(m.category) LIKE '%beverage%' AND m.is_active = 1
            ORDER BY m.selling_price ASC
            LIMIT 1
        """).fetchone()
        
        if drink:
            recommendations.append({
                "menu_item_id": drink[0],
                "name": drink[1],
                "price": drink[2],
                "category": drink[3],
                "reason": "Refresh yourself with a drink!",
                "priority": 2
            })
    
    # Rule 3: Popular Pairings from Order History
    for item in items:
        # Find items frequently ordered together
        paired_items = conn.execute("""
            SELECT m.id, m.name, m.selling_price, m.category, COUNT(*) as frequency
            FROM voice_orders vo
            JOIN menu_items m ON json_extract(vo.structured_order, '$') LIKE '%' || m.name || '%'
            WHERE vo.structured_order LIKE ?
            AND m.name NOT IN ({})
            AND m.is_active = 1
            GROUP BY m.id
            ORDER BY frequency DESC
            LIMIT 2
        """.format(','.join('?' * len(ordered_names))), 
        (f'%{item["name"]}%', *ordered_names)).fetchall()
        
        for paired in paired_items:
            if not any(r["menu_item_id"] == paired[0] for r in recommendations):
                recommendations.append({
                    "menu_item_id": paired[0],
                    "name": paired[1],
                    "price": paired[2],
                    "category": paired[3],
                    "reason": f"Often ordered with {item['name']}",
                    "priority": 3
                })
    
    # Rule 4: Dessert Suggestion (low priority)
    has_dessert = any("dessert" in cat or "sweet" in cat for cat in ordered_categories)
    if not has_dessert and len(items) >= 2:  # Only suggest dessert if ordering multiple items
        dessert = conn.execute("""
            SELECT m.id, m.name, m.selling_price, m.category
            FROM menu_items m
            WHERE LOWER(m.category) LIKE '%dessert%' AND m.is_active = 1
            ORDER BY m.selling_price ASC
            LIMIT 1
        """).fetchone()
        
        if dessert:
            recommendations.append({
                "menu_item_id": dessert[0],
                "name": dessert[1],
                "price": dessert[2],
                "category": dessert[3],
                "reason": "Complete your meal with something sweet!",
                "priority": 4
            })
    
    conn.close()
    
    # Sort by priority and limit to top 3
    recommendations.sort(key=lambda x: x["priority"])
    recommendations = recommendations[:3]
    
    return {
        "has_recommendations": len(recommendations) > 0,
        "recommendations": recommendations,
        "count": len(recommendations)
    }


# ─── CONVERSATIONAL AI AGENT ────────────────────────────────────────────────

def generate_conversation_response(
    user_message: str,
    conversation_history: list,
    current_order: list,
    recommendations: list = None
) -> str:
    """
    Use OpenAI GPT to generate natural, context-aware responses.
    Handles: greetings, order taking, clarifications, recommendations
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return "I'm here to take your order! What would you like to eat today?"
    
    import openai
    client = openai.OpenAI(api_key=api_key)
    
    # Build system prompt
    system_prompt = """You are SmartBite AI, a friendly restaurant ordering assistant. 
Your role is to:
1. Take food orders naturally and conversationally
2. Confirm orders clearly
3. Suggest relevant recommendations when appropriate
4. Be warm, helpful, and concise

Current order: {}
Available recommendations: {}

Keep responses under 40 words. Use a friendly, casual Indian English tone.""".format(
        ", ".join([f"{item['qty']}x {item['name']}" for item in current_order]) if current_order else "Nothing ordered yet",
        ", ".join([r['name'] for r in recommendations]) if recommendations else "None"
    )
    
    # Build messages
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": user_message})
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=100,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[AI] GPT Error: {e}")
        return "I'm having trouble understanding. Could you please repeat your order?"


# ─── TEST ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_transcripts = [
        "Ek butter chicken aur do garlic naan chahiye",
        "I want one chicken biryani and one mango lassi please",
        "Teen paneer tikka aur ek dal makhani",
        "do veg biryani medium spicy without onion",
    ]

    for t in test_transcripts:
        print(f"\n📞 Transcript: {t}")
        result = process_voice_order(transcript_override=t)
        print(f"   Items: {[(i['name'], i['qty']) for i in result['items']]}")
        print(f"   Total: ₹{result['total']}")
        print(f"   Summary: {result['summary']}")
        print(f"   Confidence: {result['confidence']}")
