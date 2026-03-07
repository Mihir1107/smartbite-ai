"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChefHat, CheckCircle2 } from "lucide-react";
import { formatSmartTimestamp } from "@/lib/time";
import { getAuthSession } from "@/lib/auth";

type VoiceOrder = {
  id: number;
  phone?: string;
  transcript: string;
  structured_order: string;
  created_at: string;
  status: string;
};

type ParsedItem = { name: string; qty: number; price: number };

const JUNK_TRANSCRIPT_REGEX = /^(yes|no|done|place\s*order)\.?$/i;

function parseItems(structuredOrder: string): ParsedItem[] {
  try {
    const parsed = JSON.parse(structuredOrder);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      name: item.name || item.item || "Item",
      qty: item.qty || 1,
      price: item.price || 0,
    }));
  } catch {
    return [];
  }
}

function isJunkTranscript(text: string): boolean {
  const normalized = (text || "").trim();
  if (!normalized) return true;
  if (normalized.length < 10) return true;
  return JUNK_TRANSCRIPT_REGEX.test(normalized);
}

function truncateTranscript(text: string): string {
  const cleaned = (text || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return "Voice Order";
  if (cleaned.length <= 56) return cleaned;
  return `${cleaned.slice(0, 56).trimEnd()}...`;
}

function buildOrderTitle(items: ParsedItem[], transcript: string): string {
  if (!items.length) return truncateTranscript(transcript);
  if (items.length === 1) {
    const item = items[0];
    return `${item.qty}x ${item.name}`;
  }
  const first = `${items[0].qty}x ${items[0].name}`;
  return `${first} + ${items.length - 1} more`;
}

export default function OrdersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("User");
  const [orders, setOrders] = useState<VoiceOrder[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const { token, role, username: storedUsername } = getAuthSession();

    if (!token || role !== "user") {
      router.push("/login");
      return;
    }

    setUsername(storedUsername || "User");
    fetchOrders();
  }, [mounted, router]);

  const fetchOrders = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/voice/orders");
      const data = await response.json();
      const filtered = (data.orders || []).filter((order: VoiceOrder) => {
        const blockedSource =
          !(order.phone || "").includes("session_") &&
          !(order.phone || "").includes("diag_") &&
          !(order.phone || "").includes("smoke_test");
        return blockedSource && !isJunkTranscript(order.transcript || "");
      });
      setOrders(filtered);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };

  // Poll every 3 seconds for live status updates
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleOrders = useMemo(() => {
    return [...orders]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 20);
  }, [orders]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#fffdf9]" />;
  }

  return (
    <div className="min-h-screen bg-[#fffdf9]">
      <header className="sticky top-0 z-40 bg-white border-b-2 border-[#1A1A1A]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#DA291C] border-2 border-[#1A1A1A] flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-lg font-black text-[#1A1A1A]"
              style={{ fontFamily: "Fredoka One" }}
            >
              SmartBite
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <Link href="/user" className="text-[#1A1A1A] hover:text-[#DA291C]">
              Menu
            </Link>
            <Link
              href="/call-assistant"
              className="text-[#1A1A1A] hover:text-[#DA291C]"
            >
              Call Assistant
            </Link>
            <span className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1
          className="text-2xl font-black text-[#1A1A1A] mb-4"
          style={{ fontFamily: "Fredoka One" }}
        >
          Recent Orders
        </h1>
        <p className="text-sm font-medium text-gray-600 mb-4">
          Latest confirmed voice and menu orders
        </p>

        <div className="space-y-3">
          {visibleOrders.map((order) => {
            const items = parseItems(order.structured_order);
            const total = items.reduce(
              (sum, item) => sum + item.qty * item.price,
              0,
            );
            const title = buildOrderTitle(items, order.transcript);
            return (
              <article
                key={order.id}
                className="bg-white border-2 border-[#1A1A1A] rounded-2xl p-4 transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-black text-[#1A1A1A] truncate">
                      {title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatSmartTimestamp(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-[#DA291C]">
                      ₹{Math.round(total)}
                    </p>
                    {(() => {
                      const s = (order.status || "confirmed").toLowerCase();
                      if (s === "pending")
                        return (
                          <span className="mt-1 inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300 items-center gap-1">
                            Pending
                          </span>
                        );
                      if (s === "confirmed" || s === "preparing")
                        return (
                          <span className="mt-1 inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                            Preparing
                          </span>
                        );
                      if (s === "ready")
                        return (
                          <span className="mt-1 inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ready for Pickup
                          </span>
                        );
                      if (s === "delivered")
                        return (
                          <span className="mt-1 inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 items-center gap-1">
                            Delivered
                          </span>
                        );
                      if (s === "rejected")
                        return (
                          <span className="mt-1 inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200 items-center gap-1">
                            Rejected
                          </span>
                        );
                      return (
                        <span className="mt-1 inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-[#DA291C] border border-red-200 items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {s}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                {items.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {items
                      .map((item) => `${item.qty}x ${item.name}`)
                      .join(", ")}
                  </p>
                )}
              </article>
            );
          })}

          {!visibleOrders.length && (
            <div className="border border-dashed border-gray-300 rounded-2xl p-5 text-sm text-gray-600 bg-white">
              No valid customer orders yet.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
