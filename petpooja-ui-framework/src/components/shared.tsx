"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ChefHat,
  Zap,
  Menu,
  X,
  LogOut,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

// ─── Navigation Bar ──────────────────────────────────────────────────────────
export function NavigationBar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActiveLink = (href: string) => pathname === href.split("#")[0];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/revenue-engine", label: "Revenue Engine" },
    { href: "/components", label: "Components" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-lg shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#DA291C] rounded-xl border-2 border-[#1A1A1A] flex items-center justify-center shadow-[3px_3px_0_#1A1A1A]">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <span
              className="text-xl font-black text-[#1A1A1A] dark:text-white"
              style={{ fontFamily: "'Fredoka One', cursive" }}
            >
              SmartBite
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                  isActiveLink(link.href)
                    ? "text-[#DA291C] underline decoration-2 decoration-[#DA291C] underline-offset-4"
                    : "text-[#1A1A1A] dark:text-white hover:bg-[#FFC72C]/25 hover:text-[#DA291C]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 pp-btn-primary px-4 py-2 text-sm"
            >
              <Zap className="w-4 h-4" />
              API Docs
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden pp-btn-icon"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pb-4 space-y-2"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                    isActiveLink(link.href)
                      ? "text-[#DA291C] bg-[#FFC72C]/20"
                      : "text-[#1A1A1A] dark:text-white hover:bg-[#FFC72C]/25 hover:text-[#DA291C]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="block pp-btn-primary px-4 py-2 text-sm text-center"
              >
                API Docs
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

type NavVariant = "default" | "owner" | "customer";

export function AppNavigationBar({
  variant = "default",
  username,
  onLogout,
  onSwitchToCustomer,
}: {
  variant?: NavVariant;
  username?: string;
  onLogout?: () => void;
  onSwitchToCustomer?: () => void;
}) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const isActiveLink = (href: string) => pathname === href.split("#")[0];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const navLinks =
    variant === "owner"
      ? [
          { href: "/owner", label: "Dashboard" },
          { href: "/owner/revenue-engine", label: "Revenue Engine" },
          {
            href: "/owner/revenue-engine#ai-recommendations",
            label: "AI Optimizer",
          },
        ]
      : variant === "customer"
        ? [
            { href: "/user", label: "Customer Dashboard" },
            { href: "/user#order-modes", label: "Order Modes" },
            { href: "/user#recent-orders", label: "Recent Orders" },
          ]
        : [
            { href: "/revenue-engine", label: "Revenue Engine" },
            { href: "/components", label: "Components" },
          ];

  const displayName =
    username ||
    (typeof window !== "undefined"
      ? localStorage.getItem("username") ||
        (variant === "owner" ? "Owner" : "User")
      : variant === "owner"
        ? "Owner"
        : "User");
  const userInitial = displayName.charAt(0).toUpperCase();

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  const handleSwitchClick = () => {
    if (onSwitchToCustomer) {
      onSwitchToCustomer();
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("role", "user");
      window.location.href = "/user";
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-lg shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#DA291C] rounded-xl border-2 border-[#1A1A1A] flex items-center justify-center shadow-[3px_3px_0_#1A1A1A]">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <span
              className="text-xl font-black text-[#1A1A1A] dark:text-white"
              style={{ fontFamily: "'Fredoka One', cursive" }}
            >
              SmartBite
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 whitespace-nowrap">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-bold rounded-xl transition-all ${
                  isActiveLink(link.href)
                    ? "text-[#DA291C] underline decoration-2 decoration-[#DA291C] underline-offset-4"
                    : link.label === "AI Optimizer"
                      ? "text-[#1A1A1A] bg-[#FFC72C]/35 border border-[#FFC72C] hover:bg-[#FFC72C]/50 hover:text-[#1A1A1A]"
                      : "text-[#1A1A1A] dark:text-white hover:bg-[#FFC72C]/25 hover:text-[#DA291C]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {(variant === "owner" || variant === "customer") && (
              <div ref={profileRef} className="ml-3 relative">
                <button
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className="w-10 h-10 rounded-full bg-[#DA291C] border-2 border-[#1A1A1A] text-white font-black shadow-[2px_2px_0_#1A1A1A] flex items-center justify-center"
                  aria-label="Open profile menu"
                >
                  {userInitial}
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-52 bg-white border-2 border-[#1A1A1A] rounded-2xl shadow-[4px_4px_0_#1A1A1A] p-2"
                    >
                      <div className="px-3 py-2 text-xs font-bold text-gray-500">
                        {variant === "owner" ? "Owner" : "Customer"}
                      </div>
                      {variant === "owner" && (
                        <>
                          <button
                            onClick={() => {
                              setIsProfileOpen(false);
                              handleSwitchClick();
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-[#1A1A1A] hover:bg-red-50"
                          >
                            Switch to Customer
                          </button>
                          <div className="my-2 border-t border-gray-200" />
                        </>
                      )}
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogoutClick();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-[#DA291C] hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

// ─── Section with Animation ──────────────────────────────────────────────────
export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6 }}
      className={className}
      id={id}
    >
      {children}
    </motion.div>
  );
}

// ─── Section Title ───────────────────────────────────────────────────────────
export function SectionTitle({
  children,
  accent,
  sub,
}: {
  children: React.ReactNode;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="text-center mb-12">
      {accent && (
        <div className="inline-block px-4 py-1.5 bg-[#DA291C] text-white text-xs font-bold rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] mb-4">
          {accent}
        </div>
      )}
      <h2
        className="text-3xl md:text-5xl font-black text-[#1A1A1A] dark:text-white mb-4"
        style={{ fontFamily: "'Fredoka One', cursive" }}
      >
        {children}
      </h2>
      {sub && (
        <p className="text-[#666] dark:text-[#aaa] max-w-3xl mx-auto text-base">
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="py-8 px-4 bg-[#1A1A1A] text-white text-center">
      <p className="text-sm">
        Built with{" "}
        <span className="text-[#DA291C]" role="img" aria-label="heart">
          ❤️
        </span>{" "}
        using <strong>PetPooja UI Framework</strong> — Where bold design meets
        powerful functionality
      </p>
      <p className="text-xs text-[#888] mt-2">
        © 2026 SmartBite. All rights reserved.
      </p>
    </footer>
  );
}

// ─── Toast Container ─────────────────────────────────────────────────────────
export function ToastContainer({
  toasts,
}: {
  toasts: Array<{
    id: number;
    message: string;
    type: "success" | "error" | "info";
  }>;
}) {
  return (
    <div className="fixed top-20 right-4 z-40 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`pp-card px-4 py-3 shadow-lg border-2 ${
              toast.type === "success"
                ? "border-[#DA291C] bg-red-50"
                : toast.type === "error"
                  ? "border-red-600 bg-red-50"
                  : "border-[#FFC72C] bg-[#FFC72C]/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" && (
                <CheckCircle className="w-4 h-4 text-[#DA291C]" />
              )}
              {toast.type === "error" && (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              {toast.type === "info" && (
                <AlertTriangle className="w-4 h-4 text-[#7a5900]" />
              )}
              <span className="text-sm font-semibold text-[#1A1A1A]">
                {toast.message}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
