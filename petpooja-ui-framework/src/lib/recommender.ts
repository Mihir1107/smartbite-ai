export interface RecommenderItem {
  name: string;
  category: string;
  price: number;
}

// Rule 1: Direct item pairings — these items go well together
const ITEM_PAIRINGS: Record<string, string[]> = {
  "Butter Chicken": [
    "Garlic Naan",
    "Butter Naan",
    "Steamed Rice",
    "Jeera Rice",
  ],
  "Dal Makhani": ["Butter Naan", "Roti", "Steamed Rice", "Jeera Rice"],
  "Kadai Paneer": ["Garlic Naan", "Roti", "Jeera Rice"],
  "Paneer Butter Masala": ["Butter Naan", "Garlic Naan", "Steamed Rice"],
  "Chicken Tikka Masala": ["Garlic Naan", "Butter Naan", "Jeera Rice"],
  "Palak Paneer": ["Roti", "Butter Naan", "Steamed Rice"],
  "Malai Kofta": ["Butter Naan", "Garlic Naan", "Jeera Rice"],
  "Mutton Korma": ["Garlic Naan", "Steamed Rice", "Roti"],
  "Rogan Josh": ["Garlic Naan", "Steamed Rice", "Roti"],
  "Chicken Curry": ["Steamed Rice", "Roti", "Butter Naan"],
  "Chicken Biryani": [
    "Mango Lassi",
    "Salted Lassi",
    "Buttermilk",
    "Chicken Tikka",
  ],
  "Mutton Biryani": ["Salted Lassi", "Buttermilk", "Mango Lassi"],
  "Veg Biryani": ["Mango Lassi", "Buttermilk", "Paneer Tikka"],
  "Egg Biryani": ["Salted Lassi", "Buttermilk", "Veg Spring Rolls"],
  "Chicken Tikka": [
    "Butter Chicken",
    "Garlic Naan",
    "Mango Lassi",
    "Mint Chutney",
  ],
  "Paneer Tikka": ["Kadai Paneer", "Butter Naan", "Mango Lassi"],
  "Chilli Chicken": ["Fried Rice", "Hakka Noodles", "Coca Cola"],
  "Veg Spring Rolls": ["Hakka Noodles", "Veg Manchurian", "Coca Cola"],
  "Fish Tikka": ["Steamed Rice", "Garlic Naan", "Fresh Lime Soda"],
  "Hara Bhara Kabab": ["Dal Makhani", "Butter Naan", "Mango Lassi"],
  "Mushroom Tikka": ["Palak Paneer", "Roti", "Masala Chai"],
  "Crispy Corn": ["Coca Cola", "Fresh Lime Soda", "Hakka Noodles"],
  Chowmein: [
    "Chilli Chicken",
    "Veg Manchurian",
    "Coca Cola",
    "Fresh Lime Soda",
  ],
  "Hakka Noodles": ["Chilli Chicken", "Gobi Manchurian", "Coca Cola"],
  "Veg Manchurian": ["Fried Rice", "Hakka Noodles", "Fresh Lime Soda"],
  "Chicken Manchurian": ["Fried Rice", "Chowmein", "Coca Cola"],
  "Gobi Manchurian": ["Fried Rice", "Hakka Noodles", "Fresh Lime Soda"],
  "Paneer Chilli": ["Fried Rice", "Hakka Noodles", "Mango Lassi"],
  "Garlic Naan": ["Butter Chicken", "Dal Makhani", "Kadai Paneer"],
  "Butter Naan": ["Paneer Butter Masala", "Malai Kofta", "Dal Makhani"],
  Roti: ["Dal Makhani", "Palak Paneer", "Chicken Curry"],
  "Aloo Paratha": ["Buttermilk", "Masala Chai", "Salted Lassi"],
  "Lachha Paratha": ["Dal Makhani", "Kadai Paneer", "Masala Chai"],
  "Steamed Rice": ["Butter Chicken", "Dal Makhani", "Chicken Curry"],
  "Jeera Rice": ["Kadai Paneer", "Butter Chicken", "Palak Paneer"],
  "Fried Rice": ["Chilli Chicken", "Veg Manchurian", "Chicken Manchurian"],
  "Veg Pulao": ["Dal Makhani", "Kadai Paneer", "Buttermilk"],
  "Gulab Jamun": ["Butter Chicken", "Dal Makhani", "Masala Chai"],
  Rasmalai: ["Chicken Biryani", "Mutton Biryani", "Masala Chai"],
  Kulfi: ["Chicken Biryani", "Butter Chicken", "Masala Chai"],
  "Gajar Halwa": ["Masala Chai", "Roti", "Dal Makhani"],
  "Ice Cream": ["Gulab Jamun", "Coca Cola"],
  Rasgulla: ["Masala Chai", "Chicken Biryani"],
  "Mango Lassi": ["Chicken Biryani", "Butter Chicken", "Paneer Tikka"],
  "Masala Chai": ["Aloo Paratha", "Gulab Jamun", "Gajar Halwa"],
  "Cold Coffee": ["Gulab Jamun", "Ice Cream", "Kulfi"],
  Buttermilk: ["Chicken Biryani", "Veg Biryani", "Aloo Paratha"],
  "Salted Lassi": ["Chicken Biryani", "Mutton Biryani", "Butter Chicken"],
  "Sweet Lassi": ["Chicken Biryani", "Aloo Paratha", "Roti"],
  "Fresh Lime Soda": ["Chilli Chicken", "Fish Tikka", "Crispy Corn"],
  "Coca Cola": ["Chilli Chicken", "Veg Spring Rolls", "Crispy Corn"],
  "Mineral Water": ["Chicken Biryani", "Butter Chicken"],
};

// Rule 2: Category completion rules
const CATEGORY_COMPLETION: Record<string, string[]> = {
  Curries: ["Breads", "Rice", "Beverages"],
  Biryani: ["Beverages", "Starters", "Desserts"],
  Starters: ["Curries", "Beverages", "Breads"],
  Chinese: ["Beverages", "Rice"],
  Breads: ["Curries", "Beverages"],
  Rice: ["Curries", "Beverages"],
  Beverages: [],
  Desserts: ["Beverages"],
};

// Rule 3: Meal stage checks
const MEAL_STAGES = {
  hasStarter: (cart: RecommenderItem[]) =>
    cart.some((i) => i.category === "Starters"),
  hasMain: (cart: RecommenderItem[]) =>
    cart.some((i) =>
      ["Curries", "Biryani", "Chinese", "Rice"].includes(i.category),
    ),
  hasBread: (cart: RecommenderItem[]) =>
    cart.some((i) => i.category === "Breads"),
  hasDrink: (cart: RecommenderItem[]) =>
    cart.some((i) => i.category === "Beverages"),
  hasDessert: (cart: RecommenderItem[]) =>
    cart.some((i) => i.category === "Desserts"),
};

export function getRecommendations(
  cart: RecommenderItem[],
  allItems: RecommenderItem[],
  maxResults: number = 4,
): RecommenderItem[] {
  if (cart.length === 0) {
    const bestsellers = [
      "Butter Chicken",
      "Chicken Biryani",
      "Paneer Tikka",
      "Garlic Naan",
      "Mango Lassi",
      "Gulab Jamun",
    ];
    return allItems
      .filter((i) => bestsellers.includes(i.name))
      .slice(0, maxResults);
  }

  const cartNames = new Set(cart.map((i) => i.name));
  const cartCategories = new Set(cart.map((i) => i.category));
  const scores: Map<string, number> = new Map();

  const addScore = (name: string, score: number) => {
    if (!cartNames.has(name)) {
      scores.set(name, (scores.get(name) || 0) + score);
    }
  };

  // Direct pairings — highest weight
  cart.forEach((cartItem) => {
    const pairs = ITEM_PAIRINGS[cartItem.name] || [];
    pairs.forEach((paired) => addScore(paired, 10));
  });

  // Category completion — medium weight
  cartCategories.forEach((cat) => {
    const suggestedCats = CATEGORY_COMPLETION[cat] || [];
    suggestedCats.forEach((sugCat) => {
      allItems
        .filter((i) => i.category === sugCat)
        .forEach((i) => addScore(i.name, 5));
    });
  });

  // Meal completion bonuses
  if (MEAL_STAGES.hasMain(cart) && !MEAL_STAGES.hasBread(cart)) {
    allItems
      .filter((i) => i.category === "Breads")
      .forEach((i) => addScore(i.name, 8));
  }
  if (MEAL_STAGES.hasMain(cart) && !MEAL_STAGES.hasDrink(cart)) {
    allItems
      .filter((i) => i.category === "Beverages")
      .forEach((i) => addScore(i.name, 7));
  }
  if (MEAL_STAGES.hasMain(cart) && !MEAL_STAGES.hasDessert(cart)) {
    allItems
      .filter((i) => i.category === "Desserts")
      .forEach((i) => addScore(i.name, 4));
  }
  if (
    (MEAL_STAGES.hasStarter(cart) || MEAL_STAGES.hasBread(cart)) &&
    !MEAL_STAGES.hasMain(cart)
  ) {
    allItems
      .filter((i) => ["Curries", "Biryani"].includes(i.category))
      .forEach((i) => addScore(i.name, 9));
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxResults)
    .map(([name]) => allItems.find((i) => i.name === name)!)
    .filter(Boolean);
}

export function getRecommendationReason(
  item: RecommenderItem,
  cart: RecommenderItem[],
): string {
  const cartCategories = cart.map((i) => i.category);

  if (cart.length === 0) return "Popular choice";

  if (item.category === "Breads" && cartCategories.includes("Curries"))
    return "Goes well with your curry";

  if (item.category === "Beverages" && cartCategories.includes("Biryani"))
    return "Perfect with biryani";

  if (item.category === "Desserts") return "Complete your meal";

  if (item.category === "Curries" && cartCategories.includes("Breads"))
    return "Pair with your bread";

  if (item.category === "Rice" && cartCategories.includes("Curries"))
    return "Great with your curry";

  if (item.category === "Beverages") return "Recommended drink";

  // Check direct pairing
  for (const cartItem of cart) {
    const pairs = ITEM_PAIRINGS[cartItem.name] || [];
    if (pairs.includes(item.name)) return `Goes well with ${cartItem.name}`;
  }

  return "Customers also ordered";
}
