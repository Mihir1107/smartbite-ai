"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Square,
  Loader2,
  CheckCircle2,
  Package,
  MessageCircle,
  Zap,
  Phone,
  UtensilsCrossed,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AIChat from "@/components/AIChat";
import MenuOrderPanel from "@/components/MenuOrderPanel";
import VoiceCallAssistant from "@/components/VoiceCallAssistant";
import { AppNavigationBar, Section, Footer } from "@/components/shared";

export default function UserDashboard() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [orderResult, setOrderResult] = useState<{
    transcript?: string;
    items?: { name: string; qty: number; price: number }[];
    total?: number;
  } | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recentOrders, setRecentOrders] = useState<
    { id?: number; transcript?: string; status?: string; created_at?: string }[]
  >([]);
  const [mounted, setMounted] = useState(false);
  const [orderMode, setOrderMode] = useState<"quick" | "ai" | "menu" | "call">(
    "ai",
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check authentication
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const storedUsername = localStorage.getItem("username");

    if (!token || role !== "user") {
      router.push("/login");
      return;
    }

    setUsername(storedUsername || "User");
    fetchRecentOrders();
  }, [router, mounted]);

  const fetchRecentOrders = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/voice/orders");
      if (response.ok) {
        const data = await response.json();
        setRecentOrders(data.orders.slice(0, 5));
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        console.log("Recording stopped, blob created:", {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: chunksRef.current.length,
        });

        if (audioBlob.size === 0) {
          console.error("Audio blob is empty!");
          alert("Recording failed - no audio data captured. Please try again.");
          setIsProcessing(false);
          return;
        }

        await sendAudioToBackend(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording with timeslice to ensure data is captured
      mediaRecorder.start(100); // Capture data every 100ms
      console.log("Recording started, state:", mediaRecorder.state);
      setIsRecording(true);
      setRecordingTime(0);
      setTranscript("");
      setOrderResult(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Microphone access denied:", error);
      alert("Please allow microphone access to place voice orders");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    console.log("Sending audio to backend, blob size:", audioBlob.size);

    try {
      const response = await fetch("http://localhost:8000/api/voice/live", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok && data.success !== false) {
        setTranscript(data.transcript || "");
        setOrderResult(data);
        fetchRecentOrders();
      } else {
        const errorMsg = data.error || "Failed to process audio";
        console.error("Backend error:", errorMsg);
        alert(`Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error sending audio:", error);
      alert("Network error. Please check your connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDemoOrder = async () => {
    setIsProcessing(true);
    setTranscript("");
    setOrderResult(null);

    console.log("Starting demo order...");

    try {
      const response = await fetch("http://localhost:8000/api/voice/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript:
            "I want 2 butter chicken, 3 garlic naan and 1 mango lassi",
        }),
      });

      console.log("Demo response status:", response.status);
      const data = await response.json();
      console.log("Demo response data:", data);

      if (response.ok && data.success !== false) {
        setTranscript(
          data.transcript ||
            "I want 2 butter chicken, 3 garlic naan and 1 mango lassi",
        );
        setOrderResult(data);
        fetchRecentOrders();
      } else {
        const errorMsg = data.error || "Demo order failed";
        console.error("Demo error:", errorMsg);
        alert(`Demo Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Demo order failed:", error);
      alert("Network error during demo. Please check connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-800 text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <AppNavigationBar
        variant="customer"
        username={username}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
        <Section className="mb-6">
          <div className="pp-card border-2 border-[#1A1A1A] bg-white">
            <h1
              className="text-3xl font-black text-[#1A1A1A]"
              style={{ fontFamily: "Fredoka One" }}
            >
              Customer Ordering Hub
            </h1>
            <p className="text-sm text-gray-600 font-medium mt-2">
              AI chat, quick voice, menu checkout, and call assistant in one
              seamless flow.
            </p>
          </div>
        </Section>

        {/* Mode Selector */}
        <div
          id="order-modes"
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 scroll-mt-24"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setOrderMode("ai")}
            className={`flex-1 px-6 py-4 rounded-2xl border-2 border-[#1A1A1A] font-black transition-all ${
              orderMode === "ai"
                ? "bg-gradient-to-r from-[#FF4500] to-[#FD5602] text-white shadow-[3px_3px_0_#1A1A1A]"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Fredoka One" }}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span>AI Chat (Recommended)</span>
            </div>
            <p
              className={`text-xs mt-1 font-normal ${orderMode === "ai" ? "text-white/80" : "text-gray-500"}`}
            >
              Smart recommendations • Natural conversation
            </p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setOrderMode("quick")}
            className={`flex-1 px-6 py-4 rounded-2xl border-2 border-[#1A1A1A] font-black transition-all ${
              orderMode === "quick"
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[3px_3px_0_#1A1A1A]"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Fredoka One" }}
          >
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" />
              <span>Quick Order</span>
            </div>
            <p
              className={`text-xs mt-1 font-normal ${orderMode === "quick" ? "text-white/80" : "text-gray-500"}`}
            >
              Simple voice ordering
            </p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setOrderMode("menu")}
            className={`flex-1 px-6 py-4 rounded-2xl border-2 border-[#1A1A1A] font-black transition-all ${
              orderMode === "menu"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[3px_3px_0_#1A1A1A]"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Fredoka One" }}
          >
            <div className="flex items-center justify-center gap-2">
              <UtensilsCrossed className="w-5 h-5" />
              <span>Order From Menu</span>
            </div>
            <p
              className={`text-xs mt-1 font-normal ${orderMode === "menu" ? "text-white/80" : "text-gray-500"}`}
            >
              Add directly from menu and checkout
            </p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setOrderMode("call")}
            className={`flex-1 px-6 py-4 rounded-2xl border-2 border-[#1A1A1A] font-black transition-all ${
              orderMode === "call"
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[3px_3px_0_#1A1A1A]"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Fredoka One" }}
          >
            <div className="flex items-center justify-center gap-2">
              <Phone className="w-5 h-5" />
              <span>Call Assistant</span>
            </div>
            <p
              className={`text-xs mt-1 font-normal ${orderMode === "call" ? "text-white/80" : "text-gray-500"}`}
            >
              Talk turn-by-turn like a phone call
            </p>
          </motion.button>
        </div>

        {/* AI Chat Mode */}
        {orderMode === "ai" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AIChat onOrderUpdate={fetchRecentOrders} />
          </motion.div>
        )}

        {orderMode === "menu" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MenuOrderPanel onOrderPlaced={fetchRecentOrders} />
          </motion.div>
        )}

        {orderMode === "call" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <VoiceCallAssistant onOrderUpdate={fetchRecentOrders} />
          </motion.div>
        )}

        {/* Quick Voice Order Mode */}
        {orderMode === "quick" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 md:p-12 border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A]"
          >
            <h2
              className="text-3xl font-black text-center mb-8 text-[#1A1A1A]"
              style={{ fontFamily: "Fredoka One" }}
            >
              🎤 Voice Order
            </h2>

            {/* Recording Button */}
            <div className="flex flex-col items-center gap-6 mb-8">
              {!isRecording && !isProcessing && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startRecording}
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-[#FF4500] to-[#FD5602] text-white shadow-2xl flex items-center justify-center hover:shadow-3xl transition-all"
                >
                  <Mic className="w-16 h-16" />
                </motion.button>
              )}

              {isRecording && (
                <motion.button
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  onClick={stopRecording}
                  className="w-32 h-32 rounded-full bg-red-500 text-white shadow-2xl flex items-center justify-center"
                >
                  <Square className="w-12 h-12" />
                </motion.button>
              )}

              {isProcessing && (
                <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center">
                  <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                </div>
              )}

              {/* Status Text */}
              <div className="text-center">
                {isRecording && (
                  <div>
                    <p
                      className="text-xl font-black text-red-500"
                      style={{ fontFamily: "Fredoka One" }}
                    >
                      Recording... {formatTime(recordingTime)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Speak your order clearly
                    </p>
                  </div>
                )}
                {isProcessing && (
                  <p
                    className="text-xl font-black text-blue-500"
                    style={{ fontFamily: "Fredoka One" }}
                  >
                    Processing your order...
                  </p>
                )}
                {!isRecording && !isProcessing && (
                  <div>
                    <p
                      className="text-xl font-black text-gray-800"
                      style={{ fontFamily: "Fredoka One" }}
                    >
                      Tap to Start
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Hold and speak, release when done
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Demo Button */}
            {!isRecording && !isProcessing && (
              <button
                onClick={handleDemoOrder}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black rounded-2xl hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg"
                style={{ fontFamily: "Fredoka One" }}
              >
                🎬 Try Demo Order
              </button>
            )}

            {/* Transcript */}
            {transcript && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 p-6 bg-gray-50 rounded-2xl border-2 border-gray-200"
              >
                <p className="text-sm font-bold text-gray-600 mb-2">
                  You said:
                </p>
                <p className="text-lg text-[#1A1A1A] font-medium">
                  &ldquo;{transcript}&rdquo;
                </p>
              </motion.div>
            )}

            {/* Order Result */}
            {orderResult && orderResult.items && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-6 bg-green-50 rounded-2xl border-3 border-green-300"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <p
                    className="text-xl font-black text-green-700"
                    style={{ fontFamily: "Fredoka One" }}
                  >
                    Order Confirmed!
                  </p>
                </div>

                <div className="space-y-2">
                  {orderResult.items.map((item, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-2 border-b border-green-200"
                    >
                      <span className="font-bold text-[#1A1A1A]">
                        {item.qty}× {item.name}
                      </span>
                      <span className="font-black text-green-600">
                        ₹{item.price * item.qty}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t-2 border-green-300 flex justify-between items-center">
                  <span className="text-lg font-black text-[#1A1A1A]">
                    Total:
                  </span>
                  <span className="text-2xl font-black text-green-600">
                    ₹{orderResult.total}
                  </span>
                </div>

                <p className="mt-4 text-sm text-green-700 font-medium text-center">
                  Your order has been sent to the kitchen! 🍽️
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            id="recent-orders"
            className="mt-8 bg-white rounded-3xl p-8 border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] scroll-mt-24"
          >
            <h3
              className="text-2xl font-black mb-6 text-[#1A1A1A] flex items-center gap-2"
              style={{ fontFamily: "Fredoka One" }}
            >
              <Package className="w-6 h-6 text-[#FF4500]" />
              Recent Orders
            </h3>
            <div className="space-y-4">
              {recentOrders.map((order, idx) => (
                <div
                  key={order.id || idx}
                  className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-[#1A1A1A]">
                      {order.transcript?.slice(0, 50)}...
                    </p>
                    <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {order.created_at
                      ? new Date(order.created_at).toLocaleString()
                      : "Unknown"}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}
