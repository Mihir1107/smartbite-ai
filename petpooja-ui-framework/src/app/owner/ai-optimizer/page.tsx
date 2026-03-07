"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Target,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Flame,
  Lightbulb,
  DollarSign,
} from "lucide-react";
import { usePollableFetch } from "@/lib/api";
import type { AIRecommendationsResponse, AIRecommendation } from "@/lib/types";
import {
  AppNavigationBar,
  Section,
  SectionTitle,
  Footer,
} from "@/components/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function AIRecommendationsPanel() {
  const { data: recommendations, refetch } =
    usePollableFetch<AIRecommendationsResponse>(
      "/api/menu/ai-recommendations",
      { recommendations: [], total_projected_monthly_gain: 0 },
      10000,
    );

  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [decisionFeedback, setDecisionFeedback] = useState<
    Record<string, string>
  >({});

  const recs = recommendations?.recommendations || recommendations?.items || [];

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
          body: JSON.stringify(
            decision === "approve"
              ? { action: "approve", suggested_price: rec.suggested_price }
              : { action: "reject" },
          ),
        },
      );

      if (!response.ok) throw new Error("Failed to submit decision");

      setDecisionFeedback((prev) => ({
        ...prev,
        [String(rec.item_id)]:
          decision === "approve"
            ? "Approved and applied successfully."
            : "Recommendation rejected.",
      }));
      await refetch();
    } catch (error) {
      console.error("Decision error:", error);
      setDecisionFeedback((prev) => ({
        ...prev,
        [String(rec.item_id)]: "Unable to submit decision. Try again.",
      }));
    } finally {
      setProcessing((prev) => ({ ...prev, [rec.item_id]: false }));
    }
  };

  if (!recs.length) {
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
      {recs.map((rec) => (
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
                  <TrendingUp className="w-5 h-5 text-[#DA291C]" />
                )}
                {rec.action === "create_combo" && (
                  <Sparkles className="w-5 h-5 text-[#FFC72C]" />
                )}
                {rec.action === "promote" && (
                  <Flame className="w-5 h-5 text-[#DA291C]" />
                )}
                <h4 className="font-black text-[#1A1A1A] dark:text-white">
                  {rec.item_name}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                    rec.quadrant === "Star"
                      ? "bg-green-100 text-green-700"
                      : rec.quadrant === "Plowhorse"
                        ? "bg-orange-100 text-orange-700"
                        : rec.quadrant === "Puzzle"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                  }`}
                >
                  {rec.quadrant}
                </span>
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
                  <DollarSign className="w-3.5 h-3.5 text-[#DA291C]" />
                  <span className="font-semibold text-[#DA291C]">
                    Projected Monthly Gain: ₹
                    {rec.projected_gain.toLocaleString()}
                  </span>
                </div>
                {rec.action === "raise_price" && rec.suggested_price && (
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#DA291C]" />
                    <span className="font-semibold text-[#DA291C]">
                      Suggested Price: ₹{rec.suggested_price}
                    </span>
                  </div>
                )}
              </div>
              {decisionFeedback[String(rec.item_id)] && (
                <p className="text-xs mt-3 text-[#DA291C] font-semibold">
                  {decisionFeedback[String(rec.item_id)]}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleDecision(rec, "approve")}
                disabled={processing[rec.item_id]}
                className="pp-btn-icon bg-[#DA291C] border-[#1A1A1A] text-white hover:bg-[#9B1C1C] disabled:opacity-50"
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

export default function AIOptimizerPage() {
  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <AppNavigationBar variant="owner" />

      <section className="py-24 px-4 bg-[var(--pp-bg)] arch-bg mt-16">
        <div className="max-w-6xl mx-auto">
          <Section>
            <SectionTitle
              accent="Module 2"
              sub="Live AI recommendations for pricing, combos, and menu optimization with one-click approve or reject actions"
            >
              AI Optimizer
            </SectionTitle>
          </Section>

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
        </div>
      </section>

      <Footer />
    </div>
  );
}
