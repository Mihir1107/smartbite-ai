"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Users,
  Sparkles,
  Bell,
  Check,
  X,
  ChefHat,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppNavigationBar,
  Section,
  SectionTitle,
  Footer,
} from "@/components/shared";
import { API_BASE } from "@/lib/api";
import { clearAuthSession, getAuthSession, setAuthRole } from "@/lib/auth";

type LiveOrder = {
  id: number;
  phone?: string;
  transcript: string;
  structured_order?: string;
  items: { name: string; qty: number; price: number }[];
  total_amount: number;
  status: string;
  created_at: string;
  updated_at?: string;
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const secs = Math.floor((now - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function formatItems(items: { name: string; qty: number }[]): string {
  return items.map((i) => `${i.qty}x ${i.name}`).join(", ");
}

export default function OwnerDashboard() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [stats, setStats] = useState<{
    total_revenue_30d: number;
    total_orders_7d: number;
    menu_items_count: number;
    voice_orders_count?: number;
    margin_pct?: number;
    recovery_rate?: number;
    total_projected_monthly_gain?: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check authentication
    const { token, role, username: storedUsername } = getAuthSession();

    if (!token || role !== "owner") {
      router.push("/login");
      return;
    }

    setUsername(storedUsername || "Owner");
    fetchStats();

    // Poll stats every 10 seconds so revenue refreshes after orders are fulfilled
    const statsInterval = setInterval(fetchStats, 10000);
    return () => clearInterval(statsInterval);
  }, [router, mounted]);

  const fetchStats = async () => {
    try {
      const [
        summaryResponse,
        menuAnalyticsResponse,
        missedCallsResponse,
        aiRecommendationsResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/summary`),
        fetch(`${API_BASE}/api/menu/analytics`),
        fetch(`${API_BASE}/api/missed-calls`),
        fetch(`${API_BASE}/api/menu/ai-recommendations`),
      ]);

      if (
        summaryResponse.ok &&
        menuAnalyticsResponse.ok &&
        missedCallsResponse.ok &&
        aiRecommendationsResponse.ok
      ) {
        const summaryData = await summaryResponse.json();
        const menuAnalyticsData = await menuAnalyticsResponse.json();
        const missedCallsData = await missedCallsResponse.json();
        const aiRecommendationsData = await aiRecommendationsResponse.json();

        const missedCalls = Array.isArray(missedCallsData.missed_calls)
          ? missedCallsData.missed_calls
          : [];
        const recoveredCount = missedCalls.filter(
          (call: { recovered?: number }) => call.recovered,
        ).length;
        const recoveryRate = missedCalls.length
          ? (recoveredCount / missedCalls.length) * 100
          : 0;

        setStats({
          total_revenue_30d: summaryData.total_revenue_30d ?? 0,
          total_orders_7d: summaryData.total_orders_7d ?? 0,
          menu_items_count: Array.isArray(menuAnalyticsData.items)
            ? menuAnalyticsData.items.length
            : 0,
          voice_orders_count: summaryData.voice_orders ?? 0,
          margin_pct: summaryData.margin_pct ?? 0,
          recovery_rate: recoveryRate,
          total_projected_monthly_gain:
            aiRecommendationsData.total_projected_monthly_gain ?? 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  /* ─── Order Notification System ─────────────────────────────── */
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const [bellPulse, setBellPulse] = useState(false);
  const [rejectedIds, setRejectedIds] = useState<Set<number>>(new Set());
  const notifRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const pendingOrders = useMemo(
    () =>
      liveOrders.filter(
        (o) => o.status === "pending" && !rejectedIds.has(o.id),
      ),
    [liveOrders, rejectedIds],
  );
  const activeOrders = useMemo(
    () =>
      liveOrders.filter(
        (o) =>
          (o.status === "confirmed" || o.status === "preparing") &&
          !rejectedIds.has(o.id),
      ),
    [liveOrders, rejectedIds],
  );

  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      /* audio not supported */
    }
  }, []);

  const fetchLiveOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/live`);
      const data = await res.json();
      const orders: LiveOrder[] = data.orders || [];
      setLiveOrders(orders);

      const newPending = orders.filter((o) => o.status === "pending").length;
      if (newPending > lastSeenCount) {
        playBeep();
        setBellPulse(true);
        setTimeout(() => setBellPulse(false), 2000);
      }
      setLastSeenCount(newPending);
    } catch {
      /* ignore */
    }
  }, [lastSeenCount, playBeep]);

  useEffect(() => {
    if (!mounted) return;
    fetchLiveOrders();
    const interval = setInterval(fetchLiveOrders, 5000);
    return () => clearInterval(interval);
  }, [mounted, fetchLiveOrders]);

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (status === "rejected") {
        setRejectedIds((prev) => new Set(prev).add(orderId));
      }
      fetchLiveOrders();
    } catch {
      /* ignore */
    }
  };
  /* ─── End Notification System ───────────────────────────────── */

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  const handleSwitchToCustomer = () => {
    setAuthRole("user");
    router.push("/user");
  };

  const modules = [
    {
      title: "Revenue Engine",
      description:
        "AI-powered menu analytics, pricing optimization, and combo recommendations",
      icon: <TrendingUp className="w-12 h-12" />,
      color: "from-[#DA291C] to-[#9B1C1C]",
      href: "/owner/revenue-engine",
      stats:
        typeof stats?.margin_pct === "number"
          ? `${stats.margin_pct.toFixed(1)}%`
          : null,
      statsLabel: "Avg Margin",
      statsTone: "default",
    },
    {
      title: "AI Optimizer",
      description:
        "Jump straight to live AI recommendations for pricing, combos, and menu optimization",
      icon: <Sparkles className="w-12 h-12" />,
      color: "from-[#DA291C] to-[#9B1C1C]",
      href: "/owner/revenue-engine#ai-recommendations",
      stats:
        typeof stats?.total_projected_monthly_gain === "number"
          ? `₹${Math.round(stats.total_projected_monthly_gain / 1000)}K`
          : null,
      statsLabel: "Monthly Gain Potential",
      statsTone: "default",
    },
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-800 text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <AppNavigationBar
        variant="owner"
        username={username}
        onLogout={handleLogout}
        onSwitchToCustomer={handleSwitchToCustomer}
      />

      {/* ─── Notification Bell (fixed below navbar) ────────────── */}
      <div ref={notifRef} className="fixed top-[72px] right-6 z-[60]">
        <button
          onClick={() => setNotifOpen((p) => !p)}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-[3px_3px_0_#1A1A1A] transition-transform border-2 border-[#1A1A1A] ${
            pendingOrders.length > 0
              ? "bg-[#DA291C] text-white"
              : "bg-[#FFC72C] text-[#1A1A1A]"
          } ${bellPulse ? "animate-bounce" : "hover:scale-105"}`}
          aria-label="Order notifications"
        >
          <Bell className="w-5 h-5" />
          {pendingOrders.length > 0 && (
            <span className="absolute -top-2 -right-2 text-[11px] font-black bg-[#FFC72C] text-[#1A1A1A] min-w-[22px] h-[22px] rounded-full border-2 border-[#1A1A1A] flex items-center justify-center px-1">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-96 max-h-[80vh] bg-white border-2 border-[#1A1A1A] rounded-2xl shadow-[4px_4px_0_#1A1A1A] overflow-hidden flex flex-col"
            >
              {/* Pending Orders */}
              <div className="p-3 border-b-2 border-[#1A1A1A] bg-[#FFC72C]/20">
                <p className="font-black text-[#1A1A1A] text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  New Orders
                  {pendingOrders.length > 0 && (
                    <span className="ml-auto bg-[#DA291C] text-white text-xs font-black px-2 py-0.5 rounded-full">
                      {pendingOrders.length}
                    </span>
                  )}
                </p>
              </div>

              <div className="overflow-y-auto max-h-[60vh] divide-y divide-gray-100">
                {pendingOrders.length === 0 && activeOrders.length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-sm font-bold">
                    No new orders
                  </div>
                )}

                {pendingOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-black text-[#DA291C]">
                        Order #{order.id}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(order.created_at)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#1A1A1A] mb-1 line-clamp-2">
                      {formatItems(order.items)}
                    </p>
                    <p className="text-xs font-black text-[#1A1A1A] mb-2">
                      Total: ₹{Math.round(order.total_amount)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(order.id, "confirmed")}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-500 text-white text-xs font-black border border-green-700 hover:bg-green-600"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirm
                      </button>
                      <button
                        onClick={() => updateStatus(order.id, "rejected")}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-black border border-red-700 hover:bg-red-600"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Active Orders Section */}
                {activeOrders.length > 0 && (
                  <>
                    <div className="p-3 bg-orange-50 border-t-2 border-[#1A1A1A]">
                      <p className="font-black text-[#1A1A1A] text-xs flex items-center gap-2">
                        <ChefHat className="w-4 h-4 text-orange-600" />
                        Active Orders ({activeOrders.length})
                      </p>
                    </div>
                    {activeOrders.map((order) => (
                      <div key={order.id} className="p-3 bg-orange-50/40">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-black text-orange-600">
                            Order #{order.id}
                          </p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                            {order.status}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[#1A1A1A] mb-1 line-clamp-1">
                          {formatItems(order.items)} — ₹
                          {Math.round(order.total_amount)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {order.status === "confirmed" && (
                            <button
                              onClick={() =>
                                updateStatus(order.id, "preparing")
                              }
                              className="flex-1 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-black border border-orange-700 hover:bg-orange-600"
                            >
                              🍳 Start Preparing
                            </button>
                          )}
                          {order.status === "preparing" && (
                            <button
                              onClick={() => updateStatus(order.id, "ready")}
                              className="flex-1 py-1.5 rounded-lg bg-green-500 text-white text-xs font-black border border-green-700 hover:bg-green-600"
                            >
                              ✅ Mark Ready
                            </button>
                          )}
                          <button
                            onClick={() => updateStatus(order.id, "delivered")}
                            className="flex-1 py-1.5 rounded-lg bg-gray-700 text-white text-xs font-black border border-gray-900 hover:bg-gray-800"
                          >
                            📦 Delivered
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <Section className="mb-10">
          <SectionTitle
            accent="Owner Hub"
            sub="Track performance, navigate modules, and manage the restaurant from one unified control surface"
          >
            Welcome back, {username}
          </SectionTitle>
        </Section>

        {/* Stats Grid */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            <div className="bg-white rounded-2xl p-6 border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A]">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-8 h-8 text-[#DA291C]" />
                <p className="text-sm font-bold text-gray-600">Revenue (30d)</p>
              </div>
              <p
                className="text-4xl font-black text-[#1A1A1A]"
                style={{ fontFamily: "Fredoka One" }}
              >
                ₹{stats.total_revenue_30d?.toLocaleString() ?? "0"}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A]">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-8 h-8 text-[#DA291C]" />
                <p className="text-sm font-bold text-gray-600">Total Orders</p>
              </div>
              <p
                className="text-4xl font-black text-[#1A1A1A]"
                style={{ fontFamily: "Fredoka One" }}
              >
                {stats.total_orders_7d ?? 0}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A]">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-8 h-8 text-[#DA291C]" />
                <p className="text-sm font-bold text-gray-600">Menu Items</p>
              </div>
              <p
                className="text-4xl font-black text-[#1A1A1A]"
                style={{ fontFamily: "Fredoka One" }}
              >
                {stats.menu_items_count ?? 0}
              </p>
            </div>
          </motion.div>
        )}

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modules.map((module, idx) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link href={module.href}>
                <div className="group relative bg-white rounded-3xl p-8 border-2 border-[#1A1A1A] hover:border-[#DA291C] shadow-[3px_3px_0_#1A1A1A] hover:shadow-[5px_5px_0_#1A1A1A] transition-all duration-300 cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] h-full">
                  {/* Icon */}
                  <div
                    className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${module.color} text-white mb-6 group-hover:scale-110 transition-transform`}
                  >
                    {module.icon}
                  </div>

                  {/* Title & Description */}
                  <h3
                    className="text-2xl font-black text-[#1A1A1A] mb-3"
                    style={{ fontFamily: "Fredoka One" }}
                  >
                    {module.title}
                  </h3>
                  <p className="text-gray-600 font-medium mb-6 leading-relaxed">
                    {module.description}
                  </p>

                  {/* Stats Badge */}
                  {module.stats && (
                    <div className="flex items-baseline gap-2 pt-4 border-t-2 border-gray-100">
                      <span
                        className={`text-3xl font-black ${
                          module.statsTone === "green"
                            ? "text-green-600"
                            : `bg-gradient-to-r ${module.color} bg-clip-text text-transparent`
                        }`}
                        style={{ fontFamily: "Fredoka One" }}
                      >
                        {module.stats}
                      </span>
                      {module.statsLabel && (
                        <span className="text-sm text-gray-500 font-bold">
                          {module.statsLabel}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Arrow Indicator */}
                  <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-[#DA291C] flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-gradient-to-r from-[#DA291C] to-[#DA291C] rounded-3xl p-8 text-white shadow-2xl"
        >
          <h2
            className="text-2xl font-black mb-4"
            style={{ fontFamily: "Fredoka One" }}
          >
            🚀 Quick Access
          </h2>
          <p className="text-white/90 mb-6 font-medium">
            Jump directly to the module you need or explore all features
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/owner/revenue-engine">
              <button className="px-6 py-3 bg-white text-[#DA291C] font-black rounded-xl hover:bg-gray-100 transition-all shadow-lg">
                Revenue Analytics
              </button>
            </Link>
            <Link href="/orders">
              <button className="px-6 py-3 bg-white text-[#DA291C] font-black rounded-xl hover:bg-gray-100 transition-all shadow-lg">
                Live Orders
              </button>
            </Link>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
