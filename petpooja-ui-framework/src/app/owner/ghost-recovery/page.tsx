"use client";

import { motion } from "framer-motion";
import {
  PhoneMissed,
  PhoneCall,
  XCircle,
  Phone,
  PhoneIncoming,
  TrendingUp,
  DollarSign,
  Clock,
} from "lucide-react";
import { usePollableFetch } from "@/lib/api";
import type { MissedCallsResponse } from "@/lib/types";
import {
  AppNavigationBar,
  Section,
  SectionTitle,
  Footer,
} from "@/components/shared";

export default function GhostRecoveryPage() {
  const { data: missedCallsData } = usePollableFetch<MissedCallsResponse>(
    "/api/missed-calls",
    { missed_calls: [] },
    10000,
  );

  const handleCallback = async (phoneNumber: string) => {
    alert(`Initiating callback to ${phoneNumber}`);
    // TODO: Integrate with telephony API
  };

  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <AppNavigationBar variant="owner" />

      <section className="py-24 px-4 bg-[var(--pp-bg)] arch-bg mt-16">
        <div className="max-w-6xl mx-auto">
          <Section>
            <SectionTitle
              accent="Module 3"
              sub="Capture and convert missed calls into revenue with automated callback scheduling and AI-powered follow-ups"
            >
              Ghost Recovery System
            </SectionTitle>
          </Section>

          <Section>
            <div
              className="pp-card border-2 border-[#1A1A1A]"
              style={{ boxShadow: "4px 4px 0px #1A1A1A" }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#DA291C] rounded-xl border-2 border-[#1A1A1A] flex items-center justify-center shadow-[2px_2px_0_#1A1A1A]">
                    <PhoneMissed className="w-5 h-5 text-white" />
                  </div>
                  <h3
                    className="text-2xl font-black text-[#1A1A1A] dark:text-white"
                    style={{ fontFamily: "'Fredoka One', cursive" }}
                  >
                    Missed Calls Dashboard
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-[#DA291C]">
                    {missedCallsData?.missed_calls?.length || 0}
                  </div>
                  <div className="text-xs text-[#888]">Pending Follow-ups</div>
                </div>
              </div>

              {missedCallsData?.missed_calls?.length ? (
                <div className="space-y-3">
                  {missedCallsData.missed_calls.map((call) => (
                    <motion.div
                      key={call.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-[#f9f9f9] dark:bg-[#222] rounded-xl border-2 border-[#e0e0e0] dark:border-[#333]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-[#FFC72C] rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center">
                              <Phone className="w-5 h-5 text-[#1A1A1A]" />
                            </div>
                            <div>
                              <p className="font-black text-[#1A1A1A] dark:text-white">
                                {call.phone}
                              </p>
                              <p className="text-xs text-[#888]">
                                {call.timestamp}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs mt-3">
                            <span
                              className={`px-2 py-1 rounded-lg font-bold ${
                                call.recovered
                                  ? "bg-green-100 text-green-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {call.recovered ? "Recovered" : "Pending"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleCallback(call.phone)}
                            className="pp-btn-primary whitespace-nowrap px-4 py-2.5 text-sm"
                          >
                            <PhoneCall className="w-4 h-4" />
                            Call Back
                          </button>
                          <button className="pp-btn-ghost whitespace-nowrap px-4 py-2.5 text-sm">
                            <XCircle className="w-4 h-4" />
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PhoneIncoming className="w-16 h-16 text-[#888] mx-auto mb-4" />
                  <p className="text-sm text-[#888]">
                    No missed calls to recover
                  </p>
                  <p className="text-xs text-[#888] mt-1">
                    All calls have been answered or followed up
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* Stats Grid */}
          <Section className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  label: "Recovery Rate",
                  value: "68%",
                  icon: <TrendingUp className="w-6 h-6" />,
                  color: "bg-green-100 text-green-700 border-green-200",
                },
                {
                  label: "Avg. Revenue Recovered",
                  value: "₹847",
                  icon: <DollarSign className="w-6 h-6" />,
                  color: "bg-blue-100 text-blue-700 border-blue-200",
                },
                {
                  label: "Callback Response Time",
                  value: "4.2 min",
                  icon: <Clock className="w-6 h-6" />,
                  color: "bg-purple-100 text-purple-700 border-purple-200",
                },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className={`pp-card border-2 ${stat.color}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {stat.icon}
                    <h4 className="font-black text-sm">{stat.label}</h4>
                  </div>
                  <p className="text-3xl font-black">{stat.value}</p>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      <Footer />
    </div>
  );
}
