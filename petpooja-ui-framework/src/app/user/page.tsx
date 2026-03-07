"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat,
  ShoppingCart,
  Plus,
  Minus,
  Mic,
  Send,
  X,
  MessageCircle,
  Phone,
  PhoneOff,
  Loader2,
} from "lucide-react";
import {
  getRecommendations,
  getRecommendationReason,
  type RecommenderItem,
} from "@/lib/recommender";
import { API_BASE } from "@/lib/api";
import { clearAuthSession, getAuthSession } from "@/lib/auth";

type MenuItem = {
  id: number;
  name: string;
  category: string;
  selling_price: number;
};

type CartItem = {
  menu_item_id: number;
  name: string;
  qty: number;
  price: number;
  category: string;
};

type DemoItem = {
  name?: string;
  item?: string;
  qty?: number;
  price?: number;
};

type DemoResult = {
  success?: boolean;
  error?: string;
  summary?: string;
  transcript?: string;
  items?: DemoItem[];
  total?: number;
  upsell?: {
    should_upsell?: boolean;
    message?: string;
    upsell_item?: string;
  };
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  items?: { name: string; qty: number }[];
};

type CallMessage = {
  role: "user" | "assistant";
  text: string;
};

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: (event: Event) => void | Promise<void>;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

const CATEGORY_TABS = [
  "All",
  "Beverages",
  "Biryani",
  "Breads",
  "Chinese",
  "Curries",
  "Desserts",
  "Rice",
  "Starters",
] as const;

const CONFIRM_ORDER_REGEX =
  /\b(yes|confirm|place\s*order|checkout|finalize|done)\b/i;
const DECLINE_MORE_REGEX = /^(no|nope|nothing else|that's all|thats all)$/i;

const foodImageMap: Record<string, string> = {
  "Butter Chicken":
    "https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg",
  "Chicken Biryani":
    "https://www.themealdb.com/images/media/meals/utmxpv1426455953.jpg",
  "Dal Makhani":
    "https://www.themealdb.com/images/media/meals/wuxrtu1483564410.jpg",
  "Chicken Tikka Masala":
    "https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg",
  "Paneer Tikka": "https://www.themealdb.com/images/media/meals/1548772218.jpg",
  "Gulab Jamun":
    "https://www.themealdb.com/images/media/meals/0t3ize1547050900.jpg",
  Roti: "https://www.themealdb.com/images/media/meals/9x3s321540227255.jpg",
  "Garlic Naan":
    "https://www.themealdb.com/images/media/meals/9x3s321540227255.jpg",
  "Mango Lassi":
    "https://images.unsplash.com/photo-1601303516534-bf4b4b5e7d81?w=90&h=90&fit=crop",
  "Masala Chai":
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=90&h=90&fit=crop",
  "Cold Coffee":
    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=90&h=90&fit=crop",
  "Coca Cola":
    "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=90&h=90&fit=crop",
  Buttermilk:
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=90&h=90&fit=crop",
  "Fresh Lime Soda":
    "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=90&h=90&fit=crop",
  "Mineral Water":
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=90&h=90&fit=crop",
  "Salted Lassi":
    "https://images.unsplash.com/photo-1601303516534-bf4b4b5e7d81?w=90&h=90&fit=crop",
  "Sweet Lassi":
    "https://images.unsplash.com/photo-1601303516534-bf4b4b5e7d81?w=90&h=90&fit=crop",
  "Veg Biryani":
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=90&h=90&fit=crop",
  "Egg Biryani":
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=90&h=90&fit=crop",
  "Mutton Biryani":
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=90&h=90&fit=crop",
  "Chicken Manchurian":
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=90&h=90&fit=crop",
  "Veg Manchurian":
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=90&h=90&fit=crop",
  "Gobi Manchurian":
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=90&h=90&fit=crop",
  Chowmein:
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=90&h=90&fit=crop",
  "Hakka Noodles":
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=90&h=90&fit=crop",
  "Paneer Chilli":
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=90&h=90&fit=crop",
  "Chicken Curry":
    "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=90&h=90&fit=crop",
  "Kadai Paneer":
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=90&h=90&fit=crop",
  "Malai Kofta":
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=90&h=90&fit=crop",
  "Mutton Korma":
    "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=90&h=90&fit=crop",
  "Palak Paneer":
    "https://images.unsplash.com/photo-1618449840665-9ed506d73a34?w=90&h=90&fit=crop",
  "Paneer Butter Masala":
    "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=90&h=90&fit=crop",
  "Rogan Josh":
    "https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=90&h=90&fit=crop",
  "Gajar Halwa":
    "https://images.unsplash.com/photo-1611293388250-580b08c4a145?w=90&h=90&fit=crop",
  "Ice Cream":
    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=90&h=90&fit=crop",
  Kulfi:
    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=90&h=90&fit=crop",
  Rasgulla:
    "https://images.unsplash.com/photo-1611293388250-580b08c4a145?w=90&h=90&fit=crop",
  Rasmalai:
    "https://images.unsplash.com/photo-1611293388250-580b08c4a145?w=90&h=90&fit=crop",
  "Fried Rice":
    "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=90&h=90&fit=crop",
  "Jeera Rice":
    "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=90&h=90&fit=crop",
  "Steamed Rice":
    "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=90&h=90&fit=crop",
  "Veg Pulao":
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=90&h=90&fit=crop",
  "Chicken Tikka":
    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=90&h=90&fit=crop",
  "Chilli Chicken":
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=90&h=90&fit=crop",
  "Crispy Corn":
    "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=90&h=90&fit=crop",
  "Fish Tikka":
    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=90&h=90&fit=crop",
  "Hara Bhara Kabab":
    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=90&h=90&fit=crop",
  "Mushroom Tikka":
    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=90&h=90&fit=crop",
  "Veg Spring Rolls":
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=90&h=90&fit=crop",
  "Aloo Paratha":
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=90&h=90&fit=crop",
  "Butter Naan":
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=90&h=90&fit=crop",
  "Cheese Naan":
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=90&h=90&fit=crop",
  Kulcha:
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=90&h=90&fit=crop",
  "Lachha Paratha":
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=90&h=90&fit=crop",
  "Plain Naan":
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=90&h=90&fit=crop",
};

const getImageUrl = (itemName: string): string => {
  return (
    foodImageMap[itemName] ||
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=90&h=90&fit=crop"
  );
};

const normalizeDemoItems = (items?: DemoItem[]) => {
  if (!Array.isArray(items))
    return [] as { name: string; qty: number; price: number }[];
  return items.map((item) => ({
    name: item.name || item.item || "Item",
    qty: item.qty || 1,
    price: item.price || 0,
  }));
};

const NUMBER_WORD_TO_QTY: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const CALL_ALIAS_TO_ITEM: Record<string, string> = {
  "fresh soda": "Fresh Lime Soda",
  "fresh lime": "Fresh Lime Soda",
  "lime soda": "Fresh Lime Soda",
  lassi: "Salted Lassi",
  chai: "Masala Chai",
  "lachha paratha": "Laccha Paratha",
  "lachcha paratha": "Laccha Paratha",
  "laccha parota": "Laccha Paratha",
  "cold cof": "Cold Coffee",
  "cold cofee": "Cold Coffee",
};

const extractQtyBeforeIndex = (text: string, startIdx: number): number => {
  const prefix = text.slice(0, startIdx).trim();
  if (!prefix) return 1;

  const tokens = prefix.split(/\s+/).slice(-3);
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const token = tokens[i].replace(/[^a-z0-9]/g, "");
    if (!token) continue;
    if (/^\d+$/.test(token)) return Math.max(1, Number(token));
    if (NUMBER_WORD_TO_QTY[token]) return NUMBER_WORD_TO_QTY[token];
  }
  return 1;
};

const parseCallTranscriptItems = (
  transcript: string,
  menuItems: MenuItem[],
): { name: string; qty: number; price: number }[] => {
  const text = transcript.toLowerCase();
  const matched = new Map<
    string,
    { name: string; qty: number; price: number }
  >();

  const candidates = menuItems
    .map((item) => ({
      key: item.name.toLowerCase(),
      name: item.name,
      price: item.selling_price,
    }))
    .sort((a, b) => b.key.length - a.key.length);

  for (const candidate of candidates) {
    const idx = text.indexOf(candidate.key);
    if (idx === -1) continue;
    const qty = extractQtyBeforeIndex(text, idx);
    const prev = matched.get(candidate.name.toLowerCase());
    matched.set(candidate.name.toLowerCase(), {
      name: candidate.name,
      qty: (prev?.qty || 0) + qty,
      price: candidate.price,
    });
  }

  for (const [alias, itemName] of Object.entries(CALL_ALIAS_TO_ITEM)) {
    const idx = text.indexOf(alias);
    if (idx === -1) continue;
    const menuItem = menuItems.find(
      (item) => item.name.toLowerCase() === itemName.toLowerCase(),
    );
    if (!menuItem) continue;

    const qty = extractQtyBeforeIndex(text, idx);
    const key = menuItem.name.toLowerCase();
    const prev = matched.get(key);
    matched.set(key, {
      name: menuItem.name,
      qty: Math.max(prev?.qty || 0, qty),
      price: menuItem.selling_price,
    });
  }

  return Array.from(matched.values());
};

const mergeOrderItems = (
  base: { name: string; qty: number; price: number }[],
  additions: { name: string; qty: number; price: number }[],
) => {
  const map = new Map<string, { name: string; qty: number; price: number }>();

  for (const item of base) {
    map.set(item.name.toLowerCase(), { ...item });
  }

  for (const item of additions) {
    const key = item.name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.qty += item.qty;
      if (item.price > 0) {
        existing.price = item.price;
      }
      map.set(key, existing);
    } else {
      map.set(key, { ...item });
    }
  }

  return Array.from(map.values());
};

export default function UserDashboard() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("User");

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORY_TABS)[number]>("All");

  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi! I can take your order. Try: two butter chicken and three garlic naan.",
    },
  ]);
  const [chatBusy, setChatBusy] = useState(false);
  const [lastChatResult, setLastChatResult] = useState<DemoResult | null>(null);

  const [callPanelOpen, setCallPanelOpen] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  const [callListening, setCallListening] = useState(false);
  const [callBusy, setCallBusy] = useState(false);
  const [callMessages, setCallMessages] = useState<CallMessage[]>([]);
  const [callDraftItems, setCallDraftItems] = useState<
    { name: string; qty: number; price: number }[]
  >([]);
  const [callPhase, setCallPhase] = useState<"idle" | "ringing" | "active">(
    "idle",
  );
  const [callSpeaking, setCallSpeaking] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [callAwaitingConfirm, setCallAwaitingConfirm] = useState(false);

  const callActiveRef = useRef(false);
  const callRecsOfferedRef = useRef(false);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callRecognitionRef = useRef<{
    stop: () => void;
    abort: () => void;
  } | null>(null);
  const callScrollRef = useRef<HTMLDivElement | null>(null);

  // Refs to avoid stale closures in the long-running autoConverse loop
  const callDraftItemsRef = useRef(callDraftItems);
  const callAwaitingConfirmRef = useRef(callAwaitingConfirm);
  const callMessagesRef = useRef(callMessages);
  const menuItemsRef = useRef(menuItems);
  callDraftItemsRef.current = callDraftItems;
  callAwaitingConfirmRef.current = callAwaitingConfirm;
  callMessagesRef.current = callMessages;
  menuItemsRef.current = menuItems;

  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const cartMenuRef = useRef<HTMLDivElement | null>(null);

  /* ─── Recommendations before order ───────────────────────────── */
  const [recsOpen, setRecsOpen] = useState(false);
  const [recs, setRecs] = useState<
    {
      id: number;
      name: string;
      price: number;
      category: string;
      reason: string;
    }[]
  >([]);
  const [recsLoading, setRecsLoading] = useState(false);

  const showRecommendations = async () => {
    if (!cartItems.length) return;
    setRecsLoading(true);
    setRecsOpen(true);
    try {
      const res = await fetch(`${API_BASE}/api/cart/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems.map((i) => i.name) }),
      });
      const data = await res.json();
      setRecs(data.recommendations || []);
    } catch {
      setRecs([]);
    } finally {
      setRecsLoading(false);
    }
  };

  const addRecToCart = (rec: {
    id: number;
    name: string;
    price: number;
    category: string;
  }) => {
    setCart((prev) => {
      const existing = prev[rec.id];
      return {
        ...prev,
        [rec.id]: {
          menu_item_id: rec.id,
          name: rec.name,
          qty: (existing?.qty || 0) + 1,
          price: rec.price,
          category: rec.category,
        },
      };
    });
    setRecs((prev) => prev.filter((r) => r.id !== rec.id));
  };

  const confirmOrderFromRecs = async () => {
    setRecsOpen(false);
    await placeCartOrder();
  };

  /* ─── Live Order Status Tracking ────────────────────────────── */
  const [activeOrderStatus, setActiveOrderStatus] = useState<{
    id: number;
    status: string;
    items: { name: string; qty: number; price: number }[];
    total: number;
  } | null>(null);
  const [statusDismissed, setStatusDismissed] = useState(false);
  const lastPlacedOrderIdRef = useRef<number | null>(null);

  // Poll for order status every 3 seconds
  useEffect(() => {
    if (!mounted) return;
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/orders/live`);
        const data = await res.json();
        const orders = data.orders || [];
        // Find the most recent non-delivered order for this session
        const trackable = orders.find(
          (o: { id: number; status: string; phone?: string }) =>
            (o.phone === "WEB_CALL" ||
              o.phone === "WEB_MENU" ||
              o.phone === "WEB_CHAT") &&
            o.status !== "delivered" &&
            o.status !== "rejected",
        );
        if (trackable) {
          setActiveOrderStatus({
            id: trackable.id,
            status: trackable.status,
            items: trackable.items || [],
            total: trackable.total_amount || 0,
          });
          setStatusDismissed(false);
        } else if (activeOrderStatus) {
          // Check if the order was just delivered/rejected
          const completed = orders.find(
            (o: { id: number; status: string }) =>
              o.id === activeOrderStatus.id,
          );
          if (
            completed &&
            (completed.status === "delivered" ||
              completed.status === "rejected")
          ) {
            setActiveOrderStatus({
              ...activeOrderStatus,
              status: completed.status,
            });
            if (completed.status === "delivered") {
              setTimeout(() => {
                setActiveOrderStatus(null);
                setStatusDismissed(true);
              }, 5000);
            }
          }
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMounted(true);
    // Cleanup on unmount
    return () => {
      callActiveRef.current = false;
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (callRecognitionRef.current) {
        try {
          callRecognitionRef.current.abort();
        } catch {
          /* ignore */
        }
      }
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  // Auto-scroll call messages
  useEffect(() => {
    if (callScrollRef.current) {
      callScrollRef.current.scrollTop = callScrollRef.current.scrollHeight;
    }
  }, [callMessages, callSpeaking, callListening, callBusy]);

  useEffect(() => {
    if (!mounted) return;

    const { token, role, username: storedUsername } = getAuthSession();

    if (!token || role !== "user") {
      router.push("/login");
      return;
    }

    setUsername(storedUsername || "User");
    fetchMenuItems();
  }, [mounted, router]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target as Node)
      ) {
        setAvatarMenuOpen(false);
      }
      if (
        cartMenuRef.current &&
        !cartMenuRef.current.contains(event.target as Node)
      ) {
        setCartOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const fetchMenuItems = async () => {
    setLoadingMenu(true);
    try {
      const response = await fetch(`${API_BASE}/api/menu/items`);
      const data = await response.json();
      setMenuItems(data.items || []);
    } catch (error) {
      console.error("Failed to fetch menu:", error);
    } finally {
      setLoadingMenu(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (activeCategory === "All") return menuItems;
    return menuItems.filter((item) => item.category === activeCategory);
  }, [activeCategory, menuItems]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.qty, 0),
    [cartItems],
  );
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.qty * item.price, 0),
    [cartItems],
  );

  /* ─── Smart Recommendations (pure frontend) ─────────────────── */
  const smartRecs = useMemo(() => {
    const cartR: RecommenderItem[] = cartItems.map((i) => ({
      name: i.name,
      category: i.category,
      price: i.price,
    }));
    const allR: RecommenderItem[] = menuItems.map((i) => ({
      name: i.name,
      category: i.category,
      price: i.selling_price,
    }));
    return getRecommendations(cartR, allR, 6).map((r) => ({
      ...r,
      reason: getRecommendationReason(r, cartR),
      menuItem: menuItems.find((m) => m.name === r.name),
    }));
  }, [cartItems, menuItems]);

  const updateQty = (item: MenuItem, delta: number) => {
    setCart((prev) => {
      const current = prev[item.id];
      const nextQty = (current?.qty || 0) + delta;

      if (nextQty <= 0) {
        const clone = { ...prev };
        delete clone[item.id];
        return clone;
      }

      return {
        ...prev,
        [item.id]: {
          menu_item_id: item.id,
          name: item.name,
          qty: nextQty,
          price: item.selling_price,
          category: item.category,
        },
      };
    });
  };

  const clearCart = () => setCart({});

  const placeVoiceOrder = async (
    source: string,
    transcript: string,
    items: { name: string; qty: number; price: number }[],
  ) => {
    const response = await fetch(`${API_BASE}/api/voice/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: source,
        transcript,
        items,
        upsell: {},
      }),
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Unable to place order");
    }

    return data;
  };

  const placeCartOrder = async () => {
    if (!cartItems.length) return;
    setPlacingOrder(true);
    try {
      await placeVoiceOrder(
        "WEB_MENU",
        `Menu order with ${cartCount} item${cartCount === 1 ? "" : "s"}`,
        cartItems.map((item) => ({
          name: item.name,
          qty: item.qty,
          price: item.price,
        })),
      );

      setCart({});
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Order placed successfully. Total ₹${cartTotal}.`,
        },
      ]);
      setCartOpen(false);
    } catch (error) {
      console.error(error);
      alert("Could not place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const submitChatText = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;

    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setChatBusy(true);

    try {
      const response = await fetch(`${API_BASE}/api/voice/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const data: DemoResult = await response.json();
      const parsedItems = normalizeDemoItems(data.items);

      if (response.ok && data.success !== false) {
        setLastChatResult(data);
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text:
              data.summary ||
              (parsedItems.length
                ? `Got it. Added ${parsedItems.map((i) => `${i.qty}x ${i.name}`).join(", ")}.`
                : "I understood your message."),
            items: parsedItems.map((item) => ({
              name: item.name,
              qty: item.qty,
            })),
          },
        ]);

        // When user says "no" / "that's all" — suggest recommendations
        if (DECLINE_MORE_REGEX.test(text) && lastChatResult) {
          const prevItems = normalizeDemoItems(lastChatResult.items);
          if (prevItems.length) {
            const cartR: RecommenderItem[] = prevItems.map((i) => ({
              name: i.name,
              category: "",
              price: i.price,
            }));
            const allR: RecommenderItem[] = menuItems.map((m) => ({
              name: m.name,
              category: m.category,
              price: m.selling_price,
            }));
            const chatRecs = getRecommendations(cartR, allR, 3);
            if (chatRecs.length) {
              const recNames = chatRecs.map((r) => r.name).join(", ");
              setChatMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  text: `Before I place your order — ${recNames} goes great with what you've got. Want me to add any of these?`,
                },
              ]);
            }
          }
        }

        if (CONFIRM_ORDER_REGEX.test(text) && lastChatResult) {
          const confirmItems = normalizeDemoItems(lastChatResult.items);
          if (confirmItems.length) {
            const orderData = await placeVoiceOrder(
              "WEB_CHAT",
              text,
              confirmItems,
            );
            setChatMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                text: `Order placed successfully. Total ₹${orderData.total || data.total || 0}.`,
              },
            ]);
            setLastChatResult(null);
          }
        }
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text:
              data.error || "I could not parse that order. Please try again.",
          },
        ]);
      }
    } catch (error) {
      console.error(error);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Network error. Please try again." },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  /* ─── Speech TTS ──────────────────────────────────────────────── */

  const speakText = (text: string): Promise<void> =>
    new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        setCallSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setCallSpeaking(false);
        resolve();
      };
      setCallSpeaking(true);
      window.speechSynthesis.speak(utterance);
    });

  /* ─── Speech-to-text (one turn) ─────────────────────────────── */

  const listenForSpeech = (): Promise<string | null> =>
    new Promise((resolve) => {
      const sw =
        typeof window !== "undefined" ? (window as SpeechWindow) : null;
      const Ctor = sw?.SpeechRecognition || sw?.webkitSpeechRecognition;
      if (!Ctor) {
        resolve(null);
        return;
      }
      const recognition = new Ctor();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;
      callRecognitionRef.current = recognition;

      let resolved = false;
      const done = (val: string | null) => {
        if (resolved) return;
        resolved = true;
        callRecognitionRef.current = null;
        setCallListening(false);
        resolve(val);
      };

      recognition.onresult = (event: Event) => {
        const se = event as Event & {
          results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
        };
        const firstResult = se.results?.[0];
        if (!firstResult) {
          done(null);
          return;
        }

        const alternatives = Array.from(firstResult);
        const bestTranscript = alternatives
          .map((alt) => (alt?.transcript || "").trim())
          .filter(Boolean)
          .sort((a, b) => b.length - a.length)[0];

        done(bestTranscript || null);
      };
      recognition.onerror = () => done(null);
      recognition.onend = () => done(null);

      setCallListening(true);
      recognition.start();
    });

  /* ─── Helper: add a call message ────────────────────────────── */

  const addCallMsg = (role: "user" | "assistant", text: string) => {
    setCallMessages((prev) => [...prev, { role, text }]);
  };

  /* ─── Sync call items to the real cart in real-time ────────── */

  const syncItemsToCart = (
    items: { name: string; qty: number; price: number }[],
  ) => {
    setCart((prev) => {
      const next = { ...prev };
      for (const item of items) {
        const menuItem = menuItemsRef.current.find(
          (m) => m.name.toLowerCase() === item.name.toLowerCase(),
        );
        if (menuItem) {
          next[menuItem.id] = {
            menu_item_id: menuItem.id,
            name: menuItem.name,
            qty: item.qty,
            price: menuItem.selling_price,
            category: menuItem.category,
          };
        }
      }
      return next;
    });
  };

  /* ─── Process one call turn via OpenAI smart-turn ────────── */

  const runCallTurn = async (spokenText: string): Promise<string> => {
    addCallMsg("user", spokenText);
    // Read from refs to avoid stale closures
    const pendingItems = callDraftItemsRef.current;
    const pendingTotal = pendingItems.reduce((s, i) => s + i.qty * i.price, 0);
    const awaitingConfirm = callAwaitingConfirmRef.current;

    setCallBusy(true);
    try {
      const response = await fetch(`${API_BASE}/api/voice/smart-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: spokenText,
          conversation: callMessagesRef.current.slice(-10),
          current_order: pendingItems,
        }),
      });
      const data = await response.json();
      const intent: string = data.intent || "unclear";
      const aiReply: string = data.reply || "";
      const newItems: { name: string; qty: number; price: number }[] =
        data.items || [];

      const applyLocalItemFallback = (): string | null => {
        const localItems = parseCallTranscriptItems(
          spokenText,
          menuItemsRef.current,
        );
        if (!localItems.length) return null;

        const mergedItems = mergeOrderItems(pendingItems, localItems);
        const mergedTotal = mergedItems.reduce(
          (s, i) => s + i.qty * i.price,
          0,
        );
        setCallDraftItems(mergedItems);
        syncItemsToCart(mergedItems);

        const itemSummary = localItems
          .map((i) => `${i.qty} ${i.name}`)
          .join(" and ");
        const fallbackReply = `I've added ${itemSummary}. Your total is ₹${mergedTotal}. Would you like anything else?`;
        addCallMsg("assistant", fallbackReply);
        return fallbackReply;
      };

      switch (intent) {
        case "add_items": {
          if (newItems.length) {
            const mergedItems = mergeOrderItems(pendingItems, newItems);
            const mergedTotal = mergedItems.reduce(
              (s, i) => s + i.qty * i.price,
              0,
            );
            setCallDraftItems(mergedItems);
            // Sync to real cart in real-time
            syncItemsToCart(mergedItems);

            const newItemsStr = newItems
              .map((i) => `${i.qty} ${i.name}`)
              .join(" and ");
            const reply =
              aiReply ||
              `I've added ${newItemsStr}. Your total is ₹${mergedTotal}. Would you like anything else?`;
            addCallMsg("assistant", reply);
            return reply;
          }

          const localFallbackReply = applyLocalItemFallback();
          if (localFallbackReply) {
            return localFallbackReply;
          }

          const fallback =
            aiReply ||
            "I couldn't find that item on our menu. Could you try again?";
          addCallMsg("assistant", fallback);
          return fallback;
        }

        case "confirm_order": {
          if (awaitingConfirm && pendingItems.length) {
            // User confirmed after readback — place order from cart
            try {
              const orderSummary = pendingItems
                .map((i) => `${i.qty}x ${i.name}`)
                .join(", ");
              const orderData = await placeVoiceOrder(
                "WEB_CALL",
                `Voice call order: ${orderSummary}`,
                pendingItems,
              );
              const total = orderData.total || pendingTotal;
              const reply =
                aiReply ||
                `Your order has been placed! Total is ₹${total}. Thank you for calling SmartBite!`;
              addCallMsg("assistant", reply);
              setCallDraftItems([]);
              setCart({});
              setCallAwaitingConfirm(false);
              callRecsOfferedRef.current = false;
              setTimeout(() => {
                callActiveRef.current = false;
              }, 500);
              return reply;
            } catch {
              const reply =
                "I'm sorry, there was an issue placing your order. Could you try again?";
              addCallMsg("assistant", reply);
              setCallAwaitingConfirm(false);
              return reply;
            }
          } else if (pendingItems.length) {
            // Readback before confirming
            const itemsList = pendingItems
              .map((i) => `${i.qty} ${i.name}`)
              .join(", ");
            const reply = `Let me confirm your order: ${itemsList}. Your total comes to ₹${pendingTotal}. Shall I place this order?`;
            addCallMsg("assistant", reply);
            setCallAwaitingConfirm(true);
            return reply;
          }
          const noItems =
            "You haven't ordered anything yet. What would you like to have?";
          addCallMsg("assistant", noItems);
          return noItems;
        }

        case "decline_more": {
          if (pendingItems.length) {
            // Suggest recommendations only once
            if (!callRecsOfferedRef.current) {
              const declineCartR: RecommenderItem[] = pendingItems.map((i) => ({
                name: i.name,
                category: "",
                price: i.price,
              }));
              const declineAllR: RecommenderItem[] = menuItemsRef.current.map(
                (m) => ({
                  name: m.name,
                  category: m.category,
                  price: m.selling_price,
                }),
              );
              const declineRecs = getRecommendations(
                declineCartR,
                declineAllR,
                2,
              );
              if (declineRecs.length) {
                callRecsOfferedRef.current = true;
                const recNames = declineRecs.map((r) => r.name).join(" or ");
                const reply = `Sure! By the way, ${recNames} goes great with your order — would you like to add any?`;
                addCallMsg("assistant", reply);
                return reply;
              }
            }

            // Already offered recs or no recs available — proceed to confirm
            const itemsList = pendingItems
              .map((i) => `${i.qty} ${i.name}`)
              .join(", ");
            const reply = `Let me confirm your order: ${itemsList}. Your total comes to ₹${pendingTotal}. Shall I place this order?`;
            addCallMsg("assistant", reply);
            setCallAwaitingConfirm(true);
            return reply;
          }
          const noItems =
            "You haven't ordered anything yet. What would you like to order?";
          addCallMsg("assistant", noItems);
          return noItems;
        }

        case "modify_order": {
          const reply =
            aiReply ||
            "Sure, what changes would you like to make to your order?";
          addCallMsg("assistant", reply);
          return reply;
        }

        case "greeting": {
          const reply = aiReply || "Hello! What would you like to order today?";
          addCallMsg("assistant", reply);
          return reply;
        }

        default: {
          const localFallbackReply = applyLocalItemFallback();
          if (localFallbackReply) {
            return localFallbackReply;
          }

          const reply = aiReply || "I'm sorry, could you say that again?";
          addCallMsg("assistant", reply);
          return reply;
        }
      }
    } catch {
      const localItems = parseCallTranscriptItems(
        spokenText,
        menuItemsRef.current,
      );
      if (localItems.length) {
        const mergedItems = mergeOrderItems(pendingItems, localItems);
        const mergedTotal = mergedItems.reduce(
          (s, i) => s + i.qty * i.price,
          0,
        );
        setCallDraftItems(mergedItems);
        syncItemsToCart(mergedItems);
        const itemSummary = localItems
          .map((i) => `${i.qty} ${i.name}`)
          .join(" and ");
        const reply = `I've added ${itemSummary}. Your total is ₹${mergedTotal}. Would you like anything else?`;
        addCallMsg("assistant", reply);
        return reply;
      }

      const reply =
        "I'm having trouble processing that right now. Could you say it again?";
      addCallMsg("assistant", reply);
      return reply;
    } finally {
      setCallBusy(false);
    }
  };

  /* ─── Auto-conversation loop ────────────────────────────────── */

  const autoConverse = async () => {
    let silenceCount = 0;
    while (callActiveRef.current) {
      const transcript = await listenForSpeech();
      if (!callActiveRef.current) break;

      if (!transcript) {
        silenceCount++;
        if (silenceCount >= 3) {
          const msg =
            "It seems like you may have stepped away. Just say something when you're ready!";
          addCallMsg("assistant", msg);
          await speakText(msg);
          silenceCount = 0;
        }
        continue;
      }

      silenceCount = 0;
      const response = await runCallTurn(transcript);
      if (!callActiveRef.current) break;
      await speakText(response);
    }
  };

  /* ─── Start call (with ringing phase) ───────────────────────── */

  const startCall = async () => {
    setCallPhase("ringing");
    setCallDraftItems([]);
    setCart({});
    setCallAwaitingConfirm(false);
    callRecsOfferedRef.current = false;
    setCallSeconds(0);
    setCallMessages([]);

    // Simulate ringing
    await new Promise((r) => setTimeout(r, 1500));

    setCallPhase("active");
    setCallInProgress(true);
    callActiveRef.current = true;

    // Start call timer
    callTimerRef.current = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);

    const greeting =
      "Hello! Welcome to SmartBite. I'd love to help you with your order today. What would you like to have?";
    addCallMsg("assistant", greeting);
    await speakText(greeting);

    // Begin auto-listening loop
    autoConverse();
  };

  /* ─── End call ──────────────────────────────────────────────── */

  const endCall = async () => {
    callActiveRef.current = false;

    // Stop any ongoing recognition
    if (callRecognitionRef.current) {
      try {
        callRecognitionRef.current.abort();
      } catch {
        /* ignore */
      }
      callRecognitionRef.current = null;
    }

    // Stop any ongoing speech
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();

    // Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Use ref to get current items (avoids stale closure)
    const items = callDraftItemsRef.current;
    if (items.length) {
      const total = items.reduce((s, i) => s + i.qty * i.price, 0);
      const orderSummary = items.map((i) => `${i.qty}x ${i.name}`).join(", ");
      try {
        const orderData = await placeVoiceOrder(
          "WEB_CALL",
          `Voice call order: ${orderSummary}`,
          items,
        );
        const goodbye = `Your order has been placed. Total ₹${orderData.total || total}. Thank you for calling SmartBite!`;
        addCallMsg("assistant", goodbye);
      } catch {
        addCallMsg(
          "assistant",
          "Call ended. There was an issue placing your order.",
        );
      }
    } else {
      addCallMsg(
        "assistant",
        "Thanks for calling SmartBite! Have a great day.",
      );
    }

    setCallInProgress(false);
    setCallPhase("idle");
    setCallSpeaking(false);
    setCallListening(false);
    setCallBusy(false);
    setCallDraftItems([]);
    setCart({});
    setCallAwaitingConfirm(false);
    callRecsOfferedRef.current = false;
  };

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffdf9] pb-28">
      <header className="sticky top-0 z-40 bg-white border-b-2 border-[#1A1A1A] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 min-w-[160px]">
            <div className="w-9 h-9 rounded-xl bg-[#DA291C] border-2 border-[#1A1A1A] flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-lg font-black text-[#1A1A1A]"
              style={{ fontFamily: "Fredoka One" }}
            >
              SmartBite
            </span>
          </div>

          <div className="flex-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-max px-1">
              {CATEGORY_TABS.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold border whitespace-nowrap ${
                    activeCategory === category
                      ? "bg-[#DA291C] text-white border-[#1A1A1A]"
                      : "bg-white text-[#1A1A1A] border-[#d8d8d8]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-fit">
            <div className="relative" ref={cartMenuRef}>
              <button
                onClick={() => setCartOpen((prev) => !prev)}
                className="relative w-9 h-9 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 text-[10px] font-black bg-[#DA291C] text-white w-5 h-5 rounded-full border border-[#1A1A1A] flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {cartOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border-2 border-[#1A1A1A] rounded-xl shadow-[3px_3px_0_#1A1A1A] overflow-hidden z-50">
                  <div className="p-3 border-b border-[#e5e5e5]">
                    <p className="font-black text-[#1A1A1A]">Cart</p>
                  </div>

                  <div className="max-h-56 overflow-y-auto px-3 py-2 space-y-2">
                    {cartItems.length ? (
                      cartItems.map((item) => (
                        <div
                          key={item.menu_item_id}
                          className="text-sm border border-[#eee] rounded-lg p-2"
                        >
                          <p className="font-bold text-[#1A1A1A]">
                            {item.qty}x {item.name}
                          </p>
                          <p className="text-xs text-[#666]">
                            ₹{item.qty * item.price}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#666]">Your cart is empty.</p>
                    )}
                  </div>

                  {/* Smart suggestion chips */}
                  {cartItems.length > 0 && smartRecs.length > 0 && (
                    <div className="px-3 py-2 border-t border-[#e5e5e5]">
                      <p className="text-[10px] font-bold text-gray-500 mb-1">
                        Frequently ordered together
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {smartRecs.slice(0, 2).map((rec) => (
                          <button
                            key={rec.name}
                            onClick={() =>
                              rec.menuItem && updateQty(rec.menuItem, 1)
                            }
                            className="text-[11px] px-2 py-1 rounded-full bg-[#FFC72C] border border-[#1A1A1A] font-bold text-[#1A1A1A] flex items-center gap-1"
                          >
                            <Plus className="w-2.5 h-2.5" /> {rec.name} ₹
                            {rec.price}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 border-t border-[#e5e5e5]">
                    <p className="font-black text-[#1A1A1A] mb-2">
                      Total ₹{cartTotal}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={showRecommendations}
                        disabled={!cartItems.length || placingOrder}
                        className="flex-1 py-2 rounded-lg bg-[#DA291C] border-2 border-[#1A1A1A] text-white font-black disabled:opacity-50"
                      >
                        {placingOrder ? "Placing..." : "Place Order"}
                      </button>
                      <button
                        onClick={clearCart}
                        disabled={!cartItems.length}
                        className="px-3 py-2 rounded-lg bg-[#FFC72C] border-2 border-[#1A1A1A] text-[#1A1A1A] font-black disabled:opacity-50"
                      >
                        Clear Cart
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={avatarMenuRef}>
              <button
                onClick={() => setAvatarMenuOpen((prev) => !prev)}
                className="w-9 h-9 rounded-full bg-[#1A1A1A] text-white text-sm font-black"
                title={username}
              >
                {username.charAt(0).toUpperCase()}
              </button>
              {avatarMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border-2 border-[#1A1A1A] rounded-xl shadow-[3px_3px_0_#1A1A1A] overflow-hidden z-50">
                  <Link
                    href="/orders"
                    onClick={() => setAvatarMenuOpen(false)}
                    className="block px-4 py-2 text-sm font-bold text-[#1A1A1A] hover:bg-red-50"
                  >
                    My Orders
                  </Link>
                  <button
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      setCallPanelOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm font-bold text-[#1A1A1A] hover:bg-red-50"
                  >
                    Call Assistant
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm font-bold text-[#1A1A1A] hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Live Order Status Bar ────────────────────────────── */}
      <AnimatePresence>
        {activeOrderStatus && !statusDismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`sticky top-[60px] z-35 border-b-2 border-[#1A1A1A] overflow-hidden ${
              activeOrderStatus.status === "pending"
                ? "bg-[#FFC72C] text-[#1A1A1A]"
                : activeOrderStatus.status === "confirmed" ||
                    activeOrderStatus.status === "preparing"
                  ? "bg-[#DA291C] text-white"
                  : activeOrderStatus.status === "ready"
                    ? "bg-green-500 text-white"
                    : activeOrderStatus.status === "delivered"
                      ? "bg-green-600 text-white"
                      : activeOrderStatus.status === "rejected"
                        ? "bg-red-600 text-white"
                        : "bg-gray-200 text-[#1A1A1A]"
            }`}
          >
            <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
              <span className="font-black text-sm flex items-center gap-2">
                {activeOrderStatus.status === "pending" && (
                  <>🕐 Order received, waiting for restaurant...</>
                )}
                {activeOrderStatus.status === "confirmed" && (
                  <>👨‍🍳 Order confirmed! Preparing your food...</>
                )}
                {activeOrderStatus.status === "preparing" && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    👨‍🍳 Your food is being prepared...
                  </>
                )}
                {activeOrderStatus.status === "ready" && (
                  <>✅ Your order is ready! Come pick it up</>
                )}
                {activeOrderStatus.status === "delivered" && (
                  <>🎉 Enjoy your meal! Order fulfilled</>
                )}
                {activeOrderStatus.status === "rejected" && (
                  <>❌ Sorry, order was rejected. Please try again</>
                )}
              </span>
              <span className="text-xs font-bold opacity-80">
                Order #{activeOrderStatus.id}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="sticky top-16 z-30 bg-[#DA291C] text-white border-b-2 border-[#1A1A1A]"
          >
            <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 font-black">
              <span>
                🛒 {cartCount} item{cartCount === 1 ? "" : "s"}
              </span>
              <button
                onClick={showRecommendations}
                disabled={placingOrder}
                className="px-3 py-1.5 rounded-lg bg-[#FFC72C] border-2 border-[#1A1A1A] text-[#1A1A1A] disabled:opacity-50"
              >
                {placingOrder
                  ? "Placing..."
                  : `Total ₹${cartTotal} → Place Order`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── "You might also like" horizontal scroll ──────────── */}
      {smartRecs.length > 0 && cartCount > 0 && (
        <section className="max-w-6xl mx-auto px-4 pt-4">
          <h3 className="font-black text-[#1A1A1A] mb-2 text-sm">
            You might also like
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {smartRecs.map((rec) => (
              <div
                key={rec.name}
                className="min-w-[150px] max-w-[150px] bg-white border-2 border-[#1A1A1A] rounded-xl p-2 flex-shrink-0"
              >
                <img
                  src={getImageUrl(rec.name)}
                  alt={rec.name}
                  className="w-full h-20 rounded-lg object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&h=80&fit=crop";
                  }}
                />
                <p className="font-bold text-xs mt-1.5 leading-tight text-[#1A1A1A] truncate">
                  {rec.name}
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {rec.reason}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="font-black text-xs text-[#DA291C]">
                    ₹{rec.price}
                  </span>
                  {rec.menuItem && (
                    <button
                      onClick={() => updateQty(rec.menuItem!, 1)}
                      className="w-6 h-6 rounded-full bg-[#DA291C] text-white border border-[#1A1A1A] flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <main className="max-w-6xl mx-auto px-4 py-5">
        {loadingMenu ? (
          <div className="text-sm text-gray-600 font-medium">
            Loading menu...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const qty = cart[item.id]?.qty || 0;
              return (
                <article
                  key={item.id}
                  className="bg-white border-2 border-[#1A1A1A] rounded-2xl p-3 flex gap-3"
                >
                  <img
                    src={getImageUrl(item.name)}
                    alt={item.name}
                    loading="lazy"
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: 12,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=90&h=90&fit=crop";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[#1A1A1A] leading-tight">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.category}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="font-black text-[#DA291C]">
                        ₹{item.selling_price}
                      </p>
                      {qty === 0 ? (
                        <button
                          onClick={() => updateQty(item, 1)}
                          className="w-7 h-7 rounded-full bg-[#DA291C] text-white border border-[#1A1A1A] flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item, -1)}
                            className="w-7 h-7 rounded-full bg-[#DA291C] text-white border border-[#1A1A1A] flex items-center justify-center"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold min-w-4 text-center">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQty(item, 1)}
                            className="w-7 h-7 rounded-full bg-[#DA291C] text-white border border-[#1A1A1A] flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <button
        onClick={() => setChatOpen((prev) => !prev)}
        className="fixed z-50 bottom-6 right-6 w-12 h-12 rounded-full bg-[#DA291C] text-white border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] flex items-center justify-center"
        aria-label="Open AI Chat"
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      <button
        onClick={() => setCallPanelOpen(true)}
        className="fixed z-50 bottom-6 left-6 w-12 h-12 rounded-full bg-[#DA291C] text-white border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] flex items-center justify-center"
        aria-label="Open Call Assistant"
      >
        <Mic className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed z-50 bottom-24 right-6 w-[380px] h-[500px] max-w-[calc(100vw-24px)] bg-white border-2 border-[#1A1A1A] rounded-2xl overflow-hidden shadow-[4px_4px_0_#1A1A1A]"
          >
            <div className="h-12 px-4 bg-[#DA291C] border-b-2 border-[#1A1A1A] flex items-center justify-between">
              <p
                className="text-white font-black"
                style={{ fontFamily: "Fredoka One" }}
              >
                SmartBite AI
              </p>
              <button onClick={() => setChatOpen(false)} className="text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-[388px] overflow-y-auto bg-[#fffaf4] p-3 space-y-2">
              {chatMessages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm border ${
                      msg.role === "user"
                        ? "bg-[#DA291C] text-white border-[#1A1A1A]"
                        : "bg-white text-[#1A1A1A] border-[#ddd]"
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.items && msg.items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.items.map((item, idx) => (
                          <span
                            key={`${item.name}-${idx}`}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#DA291C] border border-red-200"
                          >
                            {item.qty}x {item.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatBusy && (
                <div className="text-xs text-gray-500 font-medium">
                  Thinking...
                </div>
              )}
            </div>

            <div className="h-[60px] border-t-2 border-[#e5e5e5] p-2 flex items-center gap-2">
              <button
                onClick={() => setCallPanelOpen(true)}
                className="w-9 h-9 rounded-full bg-[#DA291C] border-2 border-[#1A1A1A] text-white flex items-center justify-center"
              >
                <Phone className="w-4 h-4" />
              </button>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitChatText();
                }}
                className="flex-1 h-9 rounded-lg border border-[#d8d8d8] px-3 text-sm"
                placeholder="Type your order..."
              />
              <button
                onClick={submitChatText}
                disabled={chatBusy || !chatInput.trim()}
                className="w-9 h-9 rounded-full bg-[#DA291C] border-2 border-[#1A1A1A] text-white flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {callPanelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed z-50 bottom-24 left-6 w-[380px] h-[520px] max-w-[calc(100vw-24px)] bg-white border-2 border-[#1A1A1A] rounded-2xl overflow-hidden shadow-[4px_4px_0_#1A1A1A]"
          >
            <div className="h-12 px-4 bg-[#DA291C] border-b-2 border-[#1A1A1A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p
                  className="text-white font-black"
                  style={{ fontFamily: "Fredoka One" }}
                >
                  SmartBite Call
                </p>
                {callPhase === "active" && (
                  <span className="text-white/80 text-xs font-mono tabular-nums">
                    {String(Math.floor(callSeconds / 60)).padStart(2, "0")}:
                    {String(callSeconds % 60).padStart(2, "0")}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  if (callInProgress) endCall();
                  setCallPanelOpen(false);
                }}
                className="text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ringing animation */}
            {callPhase === "ringing" && (
              <div className="h-[408px] flex flex-col items-center justify-center bg-[#fffaf4] gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-[#DA291C] flex items-center justify-center animate-pulse">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-[#DA291C] animate-ping opacity-30" />
                </div>
                <p className="text-[#1A1A1A] font-black text-lg">
                  Connecting...
                </p>
                <p className="text-gray-500 text-sm">SmartBite Restaurant</p>
              </div>
            )}

            {/* Messages area */}
            {callPhase !== "ringing" && (
              <div
                ref={callScrollRef}
                className="h-[408px] overflow-y-auto bg-[#fffaf4] p-3 space-y-2"
              >
                {callPhase === "idle" && callMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                      <Phone className="w-7 h-7 text-[#DA291C]" />
                    </div>
                    <p className="font-bold text-[#1A1A1A]">Call SmartBite</p>
                    <p className="text-sm text-gray-500 max-w-[240px]">
                      Tap the button below to start a voice call. Speak
                      naturally — just like calling a real restaurant.
                    </p>
                  </div>
                )}

                {callMessages.map((msg, idx) => (
                  <div
                    key={`${msg.role}-${idx}`}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm border ${
                        msg.role === "user"
                          ? "bg-[#DA291C] text-white border-[#1A1A1A]"
                          : "bg-white text-[#1A1A1A] border-[#ddd]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}

                {/* Live status indicators */}
                {callSpeaking && (
                  <div className="flex items-center gap-2 text-xs text-[#DA291C] font-bold">
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-[#DA291C] rounded-full animate-pulse" />
                      <span
                        className="w-1 h-4 bg-[#DA291C] rounded-full animate-pulse"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="w-1 h-2 bg-[#DA291C] rounded-full animate-pulse"
                        style={{ animationDelay: "0.3s" }}
                      />
                      <span
                        className="w-1 h-5 bg-[#DA291C] rounded-full animate-pulse"
                        style={{ animationDelay: "0.1s" }}
                      />
                    </div>
                    Speaking...
                  </div>
                )}
                {callListening && !callSpeaking && (
                  <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                    <div className="relative w-4 h-4">
                      <Mic className="w-4 h-4" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    Listening...
                  </div>
                )}
                {callBusy && !callSpeaking && !callListening && (
                  <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing your order...
                  </div>
                )}
              </div>
            )}

            <div className="h-[60px] border-t-2 border-[#e5e5e5] p-2 flex items-center gap-2">
              {callPhase === "idle" ? (
                <button
                  onClick={startCall}
                  className="flex-1 h-9 rounded-lg bg-[#DA291C] border-2 border-[#1A1A1A] text-white font-black flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" /> Start Call
                </button>
              ) : callPhase === "ringing" ? (
                <div className="flex-1 text-center text-sm font-bold text-gray-500">
                  Ringing...
                </div>
              ) : (
                <>
                  {/* Status pill */}
                  <div className="flex-1 flex items-center justify-center">
                    {callListening && (
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-300 flex items-center gap-1">
                        <Mic className="w-3 h-3" /> Your turn
                      </span>
                    )}
                    {callSpeaking && (
                      <span className="px-3 py-1 rounded-full bg-red-100 text-[#DA291C] text-xs font-bold border border-red-300">
                        Assistant speaking
                      </span>
                    )}
                    {callBusy && !callSpeaking && !callListening && (
                      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-300 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Processing
                      </span>
                    )}
                    {!callListening && !callSpeaking && !callBusy && (
                      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold border border-gray-200">
                        Connected
                      </span>
                    )}
                  </div>
                  <button
                    onClick={endCall}
                    className="h-9 px-4 rounded-lg bg-red-600 border-2 border-[#1A1A1A] text-white font-black flex items-center gap-1 hover:bg-red-700 transition-colors"
                  >
                    <PhoneOff className="w-4 h-4" /> End
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Recommendations Modal ────────────────────────────── */}
      <AnimatePresence>
        {recsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
            onClick={() => {
              setRecsOpen(false);
            }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border-2 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b-2 border-[#1A1A1A] bg-[#FFC72C]/20 flex items-center justify-between">
                <div>
                  <p
                    className="font-black text-[#1A1A1A] text-lg"
                    style={{ fontFamily: "Fredoka One" }}
                  >
                    Before you order...
                  </p>
                  <p className="text-xs text-[#666] font-bold mt-0.5">
                    Customers also enjoy these with your meal
                  </p>
                </div>
                <button
                  onClick={() => setRecsOpen(false)}
                  className="w-8 h-8 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Recommendations */}
              <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                {recsLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Finding
                    recommendations...
                  </div>
                ) : recs.length > 0 ? (
                  recs.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center gap-3 p-3 border-2 border-[#eee] rounded-xl hover:border-[#FFC72C] transition-colors"
                    >
                      <img
                        src={getImageUrl(rec.name)}
                        alt={rec.name}
                        className="w-14 h-14 rounded-xl object-cover border border-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#1A1A1A] text-sm truncate">
                          {rec.name}
                        </p>
                        <p className="text-xs text-[#888] font-bold">
                          {rec.reason}
                        </p>
                        <p className="text-sm font-black text-[#DA291C] mt-0.5">
                          ₹{rec.price}
                        </p>
                      </div>
                      <button
                        onClick={() => addRecToCart(rec)}
                        className="px-3 py-1.5 rounded-lg bg-[#FFC72C] border-2 border-[#1A1A1A] text-[#1A1A1A] text-xs font-black hover:bg-[#e6b326] whitespace-nowrap"
                      >
                        + Add
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-gray-400 py-4 font-bold">
                    No additional recommendations
                  </p>
                )}
              </div>

              {/* Footer — confirm order */}
              <div className="p-4 border-t-2 border-[#1A1A1A] bg-gray-50 flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-[#666]">
                    {cartCount} item{cartCount === 1 ? "" : "s"}
                  </span>
                  <span className="font-black text-[#1A1A1A] text-lg">
                    ₹{cartTotal}
                  </span>
                </div>
                <button
                  onClick={confirmOrderFromRecs}
                  disabled={placingOrder}
                  className="w-full py-3 rounded-xl bg-[#DA291C] border-2 border-[#1A1A1A] text-white font-black text-base shadow-[3px_3px_0_#1A1A1A] hover:shadow-[1px_1px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
                >
                  {placingOrder ? "Placing Order..." : "Confirm & Place Order"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
