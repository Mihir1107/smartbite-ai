"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Target,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  BarChart3,
  Crown,
  Flame,
  XCircle,
  Lightbulb,
} from "lucide-react";
import { usePollableFetch } from "@/lib/api";
import type {
  MenuAnalyticsResponse,
  AIRecommendationsResponse,
  AIRecommendation,
} from "@/lib/types";
import {
  NavigationBar,
  Section,
  SectionTitle,
  Footer,
} from "@/components/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── AI Recommendations Panel ────────────────────────────────────────────────
function AIRecommendationsPanel() {
  const { data: recommendations } = usePollableFetch<AIRecommendationsResponse>(
    "/api/menu/ai-recommendations",
    { recommendations: [], total_projected_monthly_gain: 0 },
    10000,
  );

  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  const handleDecision = async (
    rec: AIRecommendation,
    decision: "approve" | "reject",
  ) => {
    setProcessing((prev) => ({ ...prev, [rec.item_id]: true }));
    try {
      const response = await fetch(
        `${API_BASE}/api/menu/ai-recommendations/${rec.item_id}/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        },
      );
      if (!response.ok) throw new Error("Failed to submit decision");
    } catch (error) {
      console.error("Decision error:", error);
    } finally {
      setProcessing((prev) => ({ ...prev, [rec.item_id]: false }));
    }
  };

  if (!recommendations?.recommendations?.length) {
    return (
      <div className="pp-card border-2 border-[#1A1A1A] text-center py-8">
        <Sparkles className="w-12 h-12 text-[#FFC72C] mx-auto mb-3" />
        <p className="text-sm text-[#888]">
          No AI recommendations at the moment
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.recommendations.map((rec) => (
        <motion.div
          key={rec.item_id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="pp-card border-2 border-[#1A1A1A]"
          style={{ boxShadow: "4px 4px 0px #FFC72C" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {rec.action === "raise_price" && (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                )}
                {rec.action === "create_combo" && (
                  <Sparkles className="w-5 h-5 text-purple-600" />
                )}
                {rec.action === "promote" && (
                  <Flame className="w-5 h-5 text-[#DA291C]" />
                )}
                <h4 className="font-black text-[#1A1A1A] dark:text-white">
                  {rec.item_name}
                </h4>
              </div>
              <p className="text-sm text-[#666] dark:text-[#aaa] mb-3">
                {rec.reasoning}
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#DA291C]" />
                  <span className="font-semibold text-[#1A1A1A] dark:text-white">
                    Confidence: {rec.confidence}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-green-600" />
                  <span className="font-semibold text-green-600">
                    Est. Gain: ₹{rec.projected_gain.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleDecision(rec, "approve")}
                disabled={processing[rec.item_id]}
                className="pp-btn-icon bg-green-100 border-green-600 text-green-600 hover:bg-green-200 disabled:opacity-50"
                title="Approve"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDecision(rec, "reject")}
                disabled={processing[rec.item_id]}
                className="pp-btn-icon bg-red-100 border-red-600 text-red-600 hover:bg-red-200 disabled:opacity-50"
                title="Reject"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Revenue Engine Page ─────────────────────────────────────────────────────
export default function RevenueEnginePage() {
  const [activeTab, setActiveTab] = useState<"analytics" | "combos">(
    "analytics",
  );
  const [actionModal, setActionModal] = useState<{
    itemId: string;
    itemName: string;
    action: "raise_price" | "archive";
  } | null>(null);

  const { data: menuData } = usePollableFetch<MenuAnalyticsResponse>(
    "/api/menu/analytics",
    { items: [], median_units: 0, median_cm: 0 },
    10000,
  );

  const { data: combosData } = usePollableFetch<{
    combos: {
      item_a: string;
      item_b: string;
      frequency: number;
      combo_price: number;
      saving: number;
    }[];
  }>("/api/menu/combos", { combos: [] }, 10000);

  const handleMenuAction = async (
    itemId: string,
    action: "raise_price" | "archive",
  ) => {
    try {
      const response = await fetch(`${API_BASE}/api/menu/${itemId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error("Action failed");
      setActionModal(null);
    } catch (error) {
      console.error("Menu action error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <NavigationBar />

      <section className="py-24 px-4 bg-[var(--pp-bg)] arch-bg mt-16">
        <div className="max-w-6xl mx-auto">
          <Section>
            <SectionTitle
              accent="Module 1"
              sub="Real-time ML recommendations for pricing, combos, and menu optimization to maximize revenue per order"
            >
              AI Revenue Engine
            </SectionTitle>
          </Section>

          {/* AI Recommendations Panel */}
          <Section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#FFC72C] rounded-xl border-2 border-[#1A1A1A] flex items-center justify-center shadow-[2px_2px_0_#1A1A1A]">
                <Lightbulb className="w-5 h-5 text-[#1A1A1A]" />
              </div>
              <h3
                className="text-2xl font-black text-[#1A1A1A] dark:text-white"
                style={{ fontFamily: "'Fredoka One', cursive" }}
              >
                Live AI Recommendations
              </h3>
            </div>
            <AIRecommendationsPanel />
          </Section>

          {/* Tabs */}
          <Section>
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex-1 py-3 px-6 rounded-xl font-bold border-2 transition-all ${
                  activeTab === "analytics"
                    ? "bg-[#DA291C] text-white border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A]"
                    : "bg-white dark:bg-[#2a2a2a] text-[#1A1A1A] dark:text-white border-[#ccc] dark:border-[#444]"
                }`}
              >
                <BarChart3 className="w-5 h-5 inline mr-2" />
                Menu Analytics
              </button>
              <button
                onClick={() => setActiveTab("combos")}
                className={`flex-1 py-3 px-6 rounded-xl font-bold border-2 transition-all ${
                  activeTab === "combos"
                    ? "bg-[#DA291C] text-white border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A]"
                    : "bg-white dark:bg-[#2a2a2a] text-[#1A1A1A] dark:text-white border-[#ccc] dark:border-[#444]"
                }`}
              >
                <Sparkles className="w-5 h-5 inline mr-2" />
                AI Combos
              </button>
            </div>
          </Section>

          {/* Menu Analytics Table */}
          {activeTab === "analytics" && (
            <Section>
              <div
                className="pp-card border-2 border-[#1A1A1A]"
                style={{ boxShadow: "4px 4px 0px #1A1A1A" }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-[#e0e0e0] dark:border-[#333]">
                        <th className="text-left p-3 font-black text-[#1A1A1A] dark:text-white text-sm">
                          Item
                        </th>
                        <th className="text-left p-3 font-black text-[#1A1A1A] dark:text-white text-sm">
                          Price
                        </th>
                        <th className="text-left p-3 font-black text-[#1A1A1A] dark:text-white text-sm">
                          Orders
                        </th>
                        <th className="text-left p-3 font-black text-[#1A1A1A] dark:text-white text-sm">
                          Revenue
                        </th>
                        <th className="text-left p-3 font-black text-[#1A1A1A] dark:text-white text-sm">
                          Margin
                        </th>
                        <th className="text-left p-3 font-black text-[#1A1A1A] dark:text-white text-sm">
                          Trend
                        </th>
                        <th className="text-right p-3 font-black text-[#1A1A1A] dark:text-white text-sm">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuData?.items?.length ? (
                        menuData.items.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-[#f0f0f0] dark:border-[#2a2a2a]"
                          >
                            <td className="p-3 font-semibold text-[#1A1A1A] dark:text-white">
                              {item.name}
                            </td>
                            <td className="p-3 text-[#666] dark:text-[#aaa]">
                              ₹{item.selling_price}
                            </td>
                            <td className="p-3 text-[#666] dark:text-[#aaa]">
                              {item.units_sold}
                            </td>
                            <td className="p-3 font-semibold text-green-600">
                              ₹{item.revenue.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                  item.cm_percentage > 50
                                    ? "bg-green-100 text-green-700"
                                    : "bg-orange-100 text-orange-700"
                                }`}
                              >
                                {item.cm_percentage.toFixed(0)}%
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-[#888]">—</span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() =>
                                  setActionModal({
                                    itemId: String(item.id),
                                    itemName: item.name,
                                    action: "raise_price",
                                  })
                                }
                                className="pp-btn-icon mr-2"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setActionModal({
                                    itemId: String(item.id),
                                    itemName: item.name,
                                    action: "archive",
                                  })
                                }
                                className="pp-btn-icon bg-red-100 border-red-600 text-red-600"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-8 text-center text-[#888]"
                          >
                            No menu data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          )}

          {/* AI Combos Grid */}
          {activeTab === "combos" && (
            <Section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {combosData?.combos?.length ? (
                  combosData.combos.map((combo, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="pp-card border-2 border-[#1A1A1A]"
                      style={{ boxShadow: "4px 4px 0px #FFC72C" }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-[#FFC72C] rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center">
                          <Crown className="w-4 h-4 text-[#1A1A1A]" />
                        </div>
                        <h4 className="font-black text-[#1A1A1A] dark:text-white">
                          Combo Deal #{i + 1}
                        </h4>
                      </div>
                      <p className="text-sm text-[#666] dark:text-[#aaa] mb-3">
                        {combo.item_a} + {combo.item_b}
                      </p>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-[#888]">
                          <span className="font-semibold">
                            Ordered Together:
                          </span>{" "}
                          {combo.frequency} times
                        </div>
                        <div className="text-xs text-green-600 font-bold">
                          Save ₹{combo.saving}
                        </div>
                      </div>
                      <div className="text-lg font-black text-[#DA291C]">
                        ₹{combo.combo_price}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-2 pp-card text-center py-8">
                    <p className="text-sm text-[#888]">
                      No combo suggestions available
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Action Modal */}
          <AnimatePresence>
            {actionModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setActionModal(null)}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                  className="pp-card border-4 border-[#1A1A1A] max-w-md w-full"
                  style={{ boxShadow: "8px 8px 0px #DA291C" }}
                >
                  <h3 className="text-xl font-black text-[#1A1A1A] dark:text-white mb-4">
                    Confirm Action
                  </h3>
                  <p className="text-[#666] dark:text-[#aaa] mb-6">
                    {actionModal.action === "raise_price"
                      ? `Increase price for "${actionModal.itemName}"?`
                      : `Archive "${actionModal.itemName}"?`}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        handleMenuAction(actionModal.itemId, actionModal.action)
                      }
                      className="flex-1 pp-btn-primary justify-center"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setActionModal(null)}
                      className="flex-1 pp-btn-ghost justify-center"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <Footer />
    </div>
  );
}
