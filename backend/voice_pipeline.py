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
