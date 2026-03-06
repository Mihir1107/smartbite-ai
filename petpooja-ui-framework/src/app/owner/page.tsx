"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Mic,
  Phone,
  BarChart3,
  DollarSign,
  Users,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppNavigationBar,
  Section,
  SectionTitle,
  Footer,
} from "@/components/shared";

export default function OwnerDashboard() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [stats, setStats] = useState<{
    total_revenue_30d: number;
    total_orders_7d: number;
    menu_items_count: number;
    voice_orders_count?: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check authentication
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const storedUsername = localStorage.getItem("username");

    if (!token || role !== "owner") {
      router.push("/login");
      return;
    }

    setUsername(storedUsername || "Owner");
    fetchStats();
  }, [router, mounted]);

  const fetchStats = async () => {
    try {
      const [summaryResponse, menuAnalyticsResponse] = await Promise.all([
        fetch("http://localhost:8000/api/dashboard/summary"),
        fetch("http://localhost:8000/api/menu/analytics"),
      ]);

      if (summaryResponse.ok && menuAnalyticsResponse.ok) {
        const summaryData = await summaryResponse.json();
        const menuAnalyticsData = await menuAnalyticsResponse.json();

        setStats({
          total_revenue_30d: summaryData.total_revenue_30d ?? 0,
          total_orders_7d: summaryData.total_orders_7d ?? 0,
          menu_items_count: Array.isArray(menuAnalyticsData.items)
            ? menuAnalyticsData.items.length
            : 0,
          voice_orders_count: summaryData.voice_orders ?? 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const handleSwitchToCustomer = () => {
    localStorage.setItem("role", "user");
    router.push("/user");
  };

  const modules = [
    {
      title: "Revenue Engine",
      description:
        "AI-powered menu analytics, pricing optimization, and combo recommendations",
      icon: <TrendingUp className="w-12 h-12" />,
      color: "from-green-400 to-green-600",
      href: "/owner/revenue-engine",
      stats: stats?.total_revenue_30d
        ? `₹${stats.total_revenue_30d.toLocaleString()}`
        : null,
      statsLabel: "Revenue (30d)",
    },
    {
      title: "Voice Copilot",
      description:
        "Take orders by voice with AI-powered speech recognition and upselling",
      icon: <Mic className="w-12 h-12" />,
      color: "from-blue-400 to-blue-600",
      href: "/owner/voice-copilot",
      stats: stats?.voice_orders_count ? `${stats.voice_orders_count}` : null,
      statsLabel: "Voice Orders",
    },
    {
      title: "Ghost Recovery",
      description:
        "Recover missed calls and convert them into orders automatically",
      icon: <Phone className="w-12 h-12" />,
      color: "from-purple-400 to-purple-600",
      href: "/owner/ghost-recovery",
      stats: "68%",
      statsLabel: "Recovery Rate",
    },
    {
      title: "AI Optimizer",
      description:
        "Jump straight to live AI recommendations for pricing, combos, and menu optimization",
      icon: <Sparkles className="w-12 h-12" />,
      color: "from-orange-400 to-orange-600",
      href: "/owner/revenue-engine#ai-recommendations",
      stats: null,
      statsLabel: null,
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
                <DollarSign className="w-8 h-8 text-green-600" />
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
                <BarChart3 className="w-8 h-8 text-blue-600" />
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
                <Users className="w-8 h-8 text-purple-600" />
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
                <div className="group relative bg-white rounded-3xl p-8 border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] hover:shadow-[5px_5px_0_#1A1A1A] transition-all duration-300 cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] h-full">
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
                        className={`text-3xl font-black bg-gradient-to-r ${module.color} bg-clip-text text-transparent`}
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
                  <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-[#FF4500] flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
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
          className="mt-12 bg-gradient-to-r from-[#FF4500] to-[#FD5602] rounded-3xl p-8 text-white shadow-2xl"
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
              <button className="px-6 py-3 bg-white text-[#FF4500] font-black rounded-xl hover:bg-gray-100 transition-all shadow-lg">
                Revenue Analytics
              </button>
            </Link>
            <Link href="/owner/voice-copilot">
              <button className="px-6 py-3 bg-white text-[#FF4500] font-black rounded-xl hover:bg-gray-100 transition-all shadow-lg">
                Take Voice Order
              </button>
            </Link>
            <Link href="/owner/ghost-recovery">
              <button className="px-6 py-3 bg-white text-[#FF4500] font-black rounded-xl hover:bg-gray-100 transition-all shadow-lg">
                Check Missed Calls
              </button>
            </Link>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
