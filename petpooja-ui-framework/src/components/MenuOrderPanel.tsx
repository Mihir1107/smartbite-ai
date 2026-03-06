"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Minus, CheckCircle2 } from "lucide-react";

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
};

type Props = {
  onOrderPlaced?: () => void;
};

export default function MenuOrderPanel({ onOrderPlaced }: Props) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [orderSuccess, setOrderSuccess] = useState<string>("");

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/api/menu/items");
        const data = await res.json();
        setMenuItems(data.items || []);
      } catch (e) {
        console.error("Failed to fetch menu", e);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const categories = useMemo(() => {
    const vals = Array.from(new Set(menuItems.map((m) => m.category))).sort();
    return ["All", ...vals];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    if (activeCategory === "All") return menuItems;
    return menuItems.filter((m) => m.category === activeCategory);
  }, [menuItems, activeCategory]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const total = useMemo(
    () => cartItems.reduce((acc, i) => acc + i.qty * i.price, 0),
    [cartItems],
  );

  const updateQty = (item: MenuItem, delta: number) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const nextQty = (existing?.qty || 0) + delta;
      if (nextQty <= 0) {
        const cloned = { ...prev };
        delete cloned[item.id];
        return cloned;
      }
      return {
        ...prev,
        [item.id]: {
          menu_item_id: item.id,
          name: item.name,
          qty: nextQty,
          price: item.selling_price,
        },
      };
    });
  };

  const placeDirectOrder = async () => {
    if (!cartItems.length) return;
    setPlacingOrder(true);
    setOrderSuccess("");
    try {
      const payload = {
        session_id: `menu_${Date.now()}`,
        items: cartItems.map((i) => ({
          menu_item_id: i.menu_item_id,
          qty: i.qty,
        })),
      };
      const res = await fetch("http://localhost:8000/api/order/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrderSuccess(`Order #${data.order_id} placed. Total ₹${data.total}`);
        setCart({});
        onOrderPlaced?.();
      } else {
        setOrderSuccess(data.error || "Unable to place order");
      }
    } catch (e) {
      console.error(e);
      setOrderSuccess("Network error while placing order");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A]">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-2xl font-black text-[#1A1A1A]"
          style={{ fontFamily: "Fredoka One" }}
        >
          Browse Menu
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-300 text-sm font-bold text-[#DA291C]">
          <ShoppingCart className="w-4 h-4" />
          {cartItems.length} item(s)
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1 rounded-full text-sm font-bold border ${
              activeCategory === category
                ? "bg-[#DA291C] text-white border-[#1A1A1A]"
                : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-600 font-medium">Loading menu...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-auto pr-1">
          {filteredItems.map((item) => {
            const qty = cart[item.id]?.qty || 0;
            return (
              <div
                key={item.id}
                className="p-3 rounded-xl border-2 border-gray-200 bg-gray-50"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-bold text-[#1A1A1A] leading-tight">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                  <p className="font-black text-[#DA291C]">
                    ₹{item.selling_price}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item, -1)}
                      className="w-7 h-7 rounded-full border border-gray-400 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-bold min-w-6 text-center">{qty}</span>
                    <button
                      onClick={() => updateQty(item, 1)}
                      className="w-7 h-7 rounded-full bg-[#DA291C] text-white border border-[#1A1A1A] flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 p-4 rounded-2xl border-2 border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center mb-3">
          <p className="font-bold text-gray-700">Cart Total</p>
          <p className="text-2xl font-black text-[#1A1A1A]">₹{total}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={!cartItems.length || placingOrder}
          onClick={placeDirectOrder}
          className="w-full py-3 rounded-xl font-black border-2 border-[#1A1A1A] bg-[#DA291C] text-white disabled:opacity-50"
          style={{ fontFamily: "Fredoka One" }}
        >
          {placingOrder ? "Placing..." : "Place Menu Order"}
        </motion.button>

        {orderSuccess && (
          <div className="mt-3 text-sm font-medium text-[#DA291C] bg-red-100 border border-red-300 rounded-lg p-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {orderSuccess}
          </div>
        )}
      </div>
    </div>
  );
}
