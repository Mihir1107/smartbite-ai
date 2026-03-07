"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Sparkles,
  BarChart3,
  Crown,
  Flame,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { usePollableFetch } from "@/lib/api";
import type { MenuAnalyticsResponse } from "@/lib/types";
import {
  AppNavigationBar,
  Section,
  SectionTitle,
  Footer,
} from "@/components/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Revenue Engine Page ─────────────────────────────────────────────────────
export default function RevenueEnginePage() {
  const [activeTab, setActiveTab] = useState<"analytics" | "combos">(
    "analytics",
  );
  const [actionModal, setActionModal] = useState<{
    itemId: string;
    itemName: string;
    currentPrice: number;
    action: "raise_price" | "archive";
  } | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [sortCol, setSortCol] = useState<string>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: menuData, refetch: refetchMenu } =
    usePollableFetch<MenuAnalyticsResponse>(
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
      const body: Record<string, unknown> = { action };
      if (action === "raise_price" && newPrice) {
        body.new_price = Number(newPrice);
      }
      const response = await fetch(`${API_BASE}/api/menu/${itemId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Action failed");
      setActionModal(null);
      setNewPrice("");
      await refetchMenu();
    } catch (error) {
      console.error("Menu action error:", error);
    }
  };

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const sortedItems = [...(menuData?.items || [])].sort((a, b) => {
    const key = sortCol as keyof typeof a;
    const av = (a[key] as number) ?? 0;
    const bv = (b[key] as number) ?? 0;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col)
      return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 inline ml-1 text-[#DA291C]" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1 text-[#DA291C]" />
    );
  };

  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <AppNavigationBar variant="owner" />

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
                        <th
                          className="text-left p-3 font-black text-[#1A1A1A] dark:text-white text-sm cursor-pointer select-none"
                          onClick={() => toggleSort("selling_price")}
                        >
                          Price <SortIcon col="selling_price" />
                        </th>
                        <th
                          className="text-left p-3 font-black text-[#1A1A1A] dark:text-white text-sm cursor-pointer select-none"
                          onClick={() => toggleSort("units_sold")}
                        >
                          Orders <SortIcon col="units_sold" />
                        </th>
                        <th
                          className="text-left p-3 font-black text-[#1A1A1A] dark:text-white text-sm cursor-pointer select-none"
                          onClick={() => toggleSort("revenue")}
                        >
                          Revenue <SortIcon col="revenue" />
                        </th>
                        <th
                          className="text-left p-3 font-black text-[#1A1A1A] dark:text-white text-sm cursor-pointer select-none"
                          onClick={() => toggleSort("cm_percentage")}
                        >
                          Margin <SortIcon col="cm_percentage" />
                        </th>
                        <th className="text-left p-3 font-black text-[#1A1A1A] dark:text-white text-sm">
                          Quadrant
                        </th>
                        <th className="text-right p-3 font-black text-[#1A1A1A] dark:text-white text-sm">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.length ? (
                        sortedItems.map((item) => (
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
                            <td className="p-3 font-semibold text-[#1A1A1A] dark:text-white">
                              ₹{item.revenue.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                  item.cm_percentage >= 70
                                    ? "bg-green-100 text-green-700"
                                    : item.cm_percentage >= 50
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {item.cm_percentage.toFixed(0)}%
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                  item.quadrant === "Star"
                                    ? "bg-green-100 text-green-700"
                                    : item.quadrant === "Plowhorse"
                                      ? "bg-orange-100 text-orange-700"
                                      : item.quadrant === "Puzzle"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-red-100 text-red-700"
                                }`}
                              >
                                {item.quadrant}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() =>
                                  setActionModal({
                                    itemId: String(item.id),
                                    itemName: item.name,
                                    currentPrice: item.selling_price,
                                    action: "raise_price",
                                  })
                                }
                                className="pp-btn-icon mr-2 bg-[#DA291C] border-[#1A1A1A] text-white hover:bg-[#9B1C1C]"
                                title="Optimize Price"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setActionModal({
                                    itemId: String(item.id),
                                    itemName: item.name,
                                    currentPrice: item.selling_price,
                                    action: "archive",
                                  })
                                }
                                className="pp-btn-icon bg-red-100 border-red-600 text-red-600"
                                title="Archive Item"
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
                        <div className="text-xs text-[#DA291C] font-bold">
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
                onClick={() => {
                  setActionModal(null);
                  setNewPrice("");
                }}
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
                    {actionModal.action === "raise_price"
                      ? "Optimize Price"
                      : "Archive Item"}
                  </h3>
                  {actionModal.action === "raise_price" ? (
                    <div className="mb-6">
                      <p className="text-[#666] dark:text-[#aaa] mb-3">
                        Current price for &ldquo;{actionModal.itemName}&rdquo;:{" "}
                        <span className="font-bold text-[#1A1A1A] dark:text-white">
                          ₹{actionModal.currentPrice}
                        </span>
                      </p>
                      <label className="block text-sm font-bold text-[#1A1A1A] dark:text-white mb-1">
                        New Price (₹)
                      </label>
                      <input
                        type="number"
                        value={
                          newPrice ||
                          String(Math.round(actionModal.currentPrice * 1.12))
                        }
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border-2 border-[#1A1A1A] bg-white dark:bg-[#2a2a2a] text-[#1A1A1A] dark:text-white font-bold text-lg"
                      />
                      <p className="text-xs text-[#888] mt-1">
                        AI suggests ~12% increase: ₹
                        {Math.round(actionModal.currentPrice * 1.12)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[#666] dark:text-[#aaa] mb-6">
                      Remove &ldquo;{actionModal.itemName}&rdquo; from the
                      active menu?
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (actionModal.action === "raise_price" && !newPrice) {
                          setNewPrice(
                            String(Math.round(actionModal.currentPrice * 1.12)),
                          );
                        }
                        handleMenuAction(
                          actionModal.itemId,
                          actionModal.action,
                        );
                      }}
                      className="flex-1 pp-btn-primary justify-center"
                    >
                      {actionModal.action === "raise_price"
                        ? "Update Price"
                        : "Archive"}
                    </button>
                    <button
                      onClick={() => {
                        setActionModal(null);
                        setNewPrice("");
                      }}
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
