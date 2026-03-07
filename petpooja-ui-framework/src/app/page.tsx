"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  UtensilsCrossed,
  Mic,
  TrendingUp,
  PhoneCall,
  MessageSquare,
  ShoppingCart,
  Clock3,
} from "lucide-react";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth";

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check if user is already logged in
    const { token, role } = getAuthSession();

    if (token && role) {
      // Redirect to appropriate dashboard
      if (role === "owner") {
        router.push("/owner");
      } else {
        router.push("/user");
      }
    }
  }, [router, mounted]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#DA291C] via-[#DA291C] to-[#DA291C] relative overflow-hidden">
      {/* Animated Background - Only render on client to avoid hydration mismatch */}
      {mounted && (
        <div className="absolute inset-0 opacity-30">
          {[...Array(70)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/80 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
              }}
              animate={{
                y: [null, Math.random() * window.innerHeight],
                x: [null, Math.random() * window.innerWidth],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
      )}

      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      ></div>

      {/* Content */}
      <div className="relative z-10 px-6 py-12">
        <section className="min-h-screen flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-white shadow-2xl mb-8"
            >
              <UtensilsCrossed className="w-16 h-16 text-[#DA291C]" />
            </motion.div>

            {/* Title */}
            <h1
              className="text-7xl md:text-8xl font-black text-white mb-6"
              style={{ fontFamily: "Fredoka One" }}
            >
              SmartBite
            </h1>
            <p className="text-2xl md:text-3xl text-white/90 font-bold mb-4">
              AI-Powered Restaurant Revolution
            </p>
            <p className="text-lg text-white/80 max-w-2xl mx-auto font-medium">
              Voice ordering, revenue optimization, and customer recovery — all
              powered by AI
            </p>
            <p className="text-base md:text-lg text-white/95 font-bold mt-4">
              Trusted by 500+ restaurants on Petpooja
            </p>
          </motion.div>

          {/* Single CTA */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center"
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-5 bg-white text-[#DA291C] font-black rounded-2xl shadow-[0_0_0_2px_rgba(255,255,255,0.22),0_16px_36px_rgba(255,255,255,0.35)] transition-all text-xl flex items-center gap-3"
                style={{ fontFamily: "Fredoka One" }}
              >
                Login To SmartBite
                <ArrowRight className="w-6 h-6" />
              </motion.button>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-white/70 text-sm mt-8 font-bold"
          >
            Scroll down to view quick features
          </motion.p>
        </section>

        <section className="max-w-5xl mx-auto pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="bg-white/95 backdrop-blur rounded-3xl border-2 border-[#1A1A1A] p-6 md:p-8 shadow-[8px_8px_0_#1A1A1A]"
          >
            <h2
              className="text-3xl md:text-4xl font-black text-[#1A1A1A] mb-6"
              style={{ fontFamily: "Fredoka One" }}
            >
              Quick Features
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex gap-3">
                <Mic className="w-5 h-5 text-[#DA291C] mt-1" />
                <p className="text-[#1A1A1A] font-semibold">
                  Voice ordering with transcript to structured order conversion.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex gap-3">
                <MessageSquare className="w-5 h-5 text-[#DA291C] mt-1" />
                <p className="text-[#1A1A1A] font-semibold">
                  AI chat assistant for guided food ordering and upsells.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex gap-3">
                <PhoneCall className="w-5 h-5 text-[#DA291C] mt-1" />
                <p className="text-[#1A1A1A] font-semibold">
                  Call-style web interaction for natural conversational
                  ordering.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex gap-3">
                <ShoppingCart className="w-5 h-5 text-[#DA291C] mt-1" />
                <p className="text-[#1A1A1A] font-semibold">
                  Direct menu browsing with quick add-to-cart checkout flow.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex gap-3">
                <TrendingUp className="w-5 h-5 text-[#DA291C] mt-1" />
                <p className="text-[#1A1A1A] font-semibold">
                  Revenue insights and recommendation engine for better margins.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex gap-3">
                <Clock3 className="w-5 h-5 text-[#DA291C] mt-1" />
                <p className="text-[#1A1A1A] font-semibold">
                  Fast order confirmation pipeline designed for peak-hour speed.
                </p>
              </div>
            </div>

            <p className="text-[#4A5568] text-sm mt-6 font-medium text-center">
              Powered by AI • Built for Restaurants • Made with ❤️
            </p>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
