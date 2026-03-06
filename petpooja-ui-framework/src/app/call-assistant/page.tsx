"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChefHat } from "lucide-react";
import VoiceCallAssistant from "@/components/VoiceCallAssistant";

export default function CallAssistantPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("User");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const storedUsername = localStorage.getItem("username");

    if (!token || role !== "user") {
      router.push("/login");
      return;
    }

    setUsername(storedUsername || "User");
  }, [mounted, router]);

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
              href="/orders"
              className="text-[#1A1A1A] hover:text-[#DA291C]"
            >
              My Orders
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
          Call Assistant
        </h1>
        <VoiceCallAssistant />
      </main>
    </div>
  );
}
