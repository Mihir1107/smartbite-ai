"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Star, Zap } from "lucide-react";
import {
  NavigationBar,
  Section,
  SectionTitle,
  Footer,
  ToastContainer,
} from "@/components/shared";

// ─── Buttons Showcase ────────────────────────────────────────────────────────
function ButtonsShowcase({
  addToast,
}: {
  addToast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  return (
    <div className="pp-card">
      <h3 className="showcase-label">Buttons</h3>
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => addToast("Primary action triggered!", "success")}
          className="pp-btn-primary"
        >
          Primary Red
        </button>
        <button
          onClick={() => addToast("Golden action!", "info")}
          className="pp-btn-yellow"
        >
          Golden Yellow
        </button>
        <button
          onClick={() => addToast("Ghost clicked!", "info")}
          className="pp-btn-ghost"
        >
          Ghost
        </button>
        <button disabled className="pp-btn-disabled">
          Disabled
        </button>
        <button
          onClick={() => addToast("Danger! Danger!", "error")}
          className="pp-btn-danger"
        >
          Danger
        </button>
        <button className="pp-btn-icon" aria-label="Bell">
          <Bell className="w-4 h-4" />
        </button>
        <button
          className="pp-btn-icon bg-[#FFC72C] border-[#1A1A1A]"
          aria-label="Star"
        >
          <Star className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Color Palette ───────────────────────────────────────────────────────────
function ColorPaletteSection({
  addToast,
}: {
  addToast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const colors = [
    { name: "Primary Red", value: "#DA291C", var: "--pp-red" },
    { name: "Golden Yellow", value: "#FFC72C", var: "--pp-yellow" },
    { name: "Deep Black", value: "#1A1A1A", var: "--pp-black" },
    { name: "Pure White", value: "#FFFFFF", var: "--pp-white" },
  ];

  const copyColor = (value: string, name: string) => {
    navigator.clipboard.writeText(value);
    addToast(`Copied ${name}: ${value}`, "success");
  };

  return (
    <div className="pp-card">
      <h3 className="showcase-label">Color Palette</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {colors.map((color) => (
          <button
            key={color.var}
            onClick={() => copyColor(color.value, color.name)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-[#1A1A1A] hover:scale-105 transition-transform"
            style={{ backgroundColor: color.value }}
          >
            <div className="w-full aspect-square rounded-lg border-2 border-[#1A1A1A]" />
            <span
              className={`text-xs font-bold ${
                color.value === "#FFFFFF" ? "text-[#1A1A1A]" : "text-white"
              }`}
            >
              {color.name}
            </span>
            <code
              className={`text-xs ${
                color.value === "#FFFFFF" ? "text-[#666]" : "text-white/80"
              }`}
            >
              {color.value}
            </code>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Typography ──────────────────────────────────────────────────────────────
function TypographySection() {
  return (
    <div className="pp-card">
      <h3 className="showcase-label">Typography</h3>
      <div className="space-y-6">
        <div>
          <h1
            className="text-5xl font-black text-[#1A1A1A] dark:text-white mb-2"
            style={{ fontFamily: "'Fredoka One', cursive" }}
          >
            Fredoka One Display
          </h1>
          <p className="text-sm text-[#888]">
            Used for headings, hero titles, and impactful UI labels
          </p>
        </div>
        <div>
          <p className="text-lg font-semibold text-[#1A1A1A] dark:text-white mb-2">
            DM Sans Body Text
          </p>
          <p className="text-sm text-[#666] dark:text-[#aaa]">
            The quick brown fox jumps over the lazy dog. Clean, modern, and
            highly readable for body content, descriptions, and UI copy across
            all screen sizes.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Motion Examples ─────────────────────────────────────────────────────────
function MotionExamples() {
  const [isHovered, setIsHovered] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <div className="pp-card">
      <h3 className="showcase-label">Motion & Animation</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          whileHover={{ scale: 1.05, rotate: 2 }}
          className="p-6 bg-[#DA291C] text-white rounded-2xl border-2 border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] cursor-pointer text-center"
        >
          <motion.div
            animate={{ rotate: isHovered ? 360 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <Star className="w-12 h-12 mx-auto mb-3" />
          </motion.div>
          <h4 className="font-black">Hover Me</h4>
        </motion.div>

        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={() => setCount(count + 1)}
          className="p-6 bg-[#FFC72C] text-[#1A1A1A] rounded-2xl border-2 border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] cursor-pointer text-center"
        >
          <Bell className="w-12 h-12 mx-auto mb-3" />
          <h4 className="font-black">Tap Me</h4>
          <AnimatePresence mode="wait">
            <motion.div
              key={count}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-2xl font-black mt-2"
            >
              {count}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
          className="p-6 bg-[#1A1A1A] text-white rounded-2xl border-2 border-[#FFC72C] shadow-[4px_4px_0px_#FFC72C] text-center"
        >
          <Zap className="w-12 h-12 mx-auto mb-3" />
          <h4 className="font-black">Floating</h4>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Components Page ─────────────────────────────────────────────────────────
export default function ComponentsPage() {
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; type: "success" | "error" | "info" }>
  >([]);
  const toastId = useRef(0);

  const addToast = (message: string, type: "success" | "error" | "info") => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <NavigationBar />
      <ToastContainer toasts={toasts} />

      <section className="py-24 px-4 bg-[var(--pp-bg)] arch-bg mt-16">
        <div className="max-w-6xl mx-auto space-y-12">
          <Section>
            <SectionTitle accent="UI Framework">
              PetPooja Components Showcase
            </SectionTitle>
          </Section>
          <Section>
            <ButtonsShowcase addToast={addToast} />
          </Section>
          <Section>
            <ColorPaletteSection addToast={addToast} />
          </Section>
          <Section>
            <TypographySection />
          </Section>
          <Section>
            <MotionExamples />
          </Section>
        </div>
      </section>

      <Footer />
    </div>
  );
}
