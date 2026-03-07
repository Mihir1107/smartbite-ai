"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Lock,
  AlertCircle,
  ArrowRight,
  UtensilsCrossed,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitWithCredentials = async (
    loginUsername: string,
    loginPassword: string,
  ) => {
    setError("");
    setLoading(true);

    try {
      // Create FormData for OAuth2 password flow
      const formData = new FormData();
      formData.append("username", loginUsername);
      formData.append("password", loginPassword);

      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await response.json();

      // Store auth per-tab so owner/user can run side-by-side.
      setAuthSession(data.access_token, data.username, data.role);

      // Redirect based on role
      if (data.role === "owner") {
        router.push("/owner");
      } else {
        router.push("/user");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submitWithCredentials(username, password);
  };

  const handleDemoLogin = async (role: "owner" | "user") => {
    const credentials =
      role === "owner"
        ? { username: "owner", password: "owner123" }
        : { username: "customer", password: "customer123" };

    setUsername(credentials.username);
    setPassword(credentials.password);

    // One click on stage: auto-fill visuals and submit immediately.
    await submitWithCredentials(credentials.username, credentials.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#DA291C] via-[#DA291C] to-[#DA291C] flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.1) 50px, rgba(255,255,255,0.1) 51px)`,
          }}
        ></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#DA291C] mb-4"
            >
              <UtensilsCrossed className="w-10 h-10 text-white" />
            </motion.div>
            <h1
              className="text-4xl font-black text-gray-800"
              style={{ fontFamily: "Fredoka One" }}
            >
              SmartBite
            </h1>
            <p className="text-gray-600 mt-2 font-medium">
              Sign in to continue
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          {/* Login Form */}
          <form id="login-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-[#ccc] rounded-xl focus:border-[#DA291C] focus:bg-white focus:outline-none transition-all text-gray-800 font-medium"
                  placeholder="Enter username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-[#ccc] rounded-xl focus:border-[#DA291C] focus:bg-white focus:outline-none transition-all text-gray-800 font-medium"
                  placeholder="Enter password"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#DA291C] hover:bg-[#9B1C1C] text-white font-black py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl"
              style={{ fontFamily: "Fredoka One" }}
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-8 pt-6 border-t-2 border-gray-100">
            <p className="text-center text-sm font-bold text-gray-600 mb-4">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDemoLogin("owner")}
                disabled={loading}
                className="py-3 px-4 bg-[#DA291C] hover:bg-[#9B1C1C] text-white font-bold rounded-xl transition-all disabled:opacity-50 border-2 border-[#1A1A1A]"
              >
                👨‍💼 Owner
              </button>
              <button
                onClick={() => handleDemoLogin("user")}
                disabled={loading}
                className="py-3 px-4 bg-[#FFC72C] hover:bg-[#eab225] text-[#1A1A1A] font-bold rounded-xl transition-all disabled:opacity-50 border-2 border-[#1A1A1A]"
              >
                👤 Customer
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              Demo accounts auto-fill credentials
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-6 font-medium">
          Don&apos;t have an account? Contact your restaurant administrator
        </p>
      </motion.div>
    </div>
  );
}
