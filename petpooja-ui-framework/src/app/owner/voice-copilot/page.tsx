"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  CheckCircle,
  PlayCircle,
  RotateCcw,
  Loader2,
  ShoppingCart,
  Volume2,
  Brain,
  MessageSquare,
  Zap,
  ChefHat,
  Activity,
} from "lucide-react";
import { usePollableFetch } from "@/lib/api";
import type { VoiceOrdersResponse } from "@/lib/types";
import {
  AppNavigationBar,
  Section,
  SectionTitle,
  Footer,
} from "@/components/shared";
import { formatSmartTimestamp } from "@/lib/time";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ParsedOrderChip = {
  name?: string;
  item?: string;
  qty?: number;
};

const DEBUG_PHONE_PATTERNS = ["session_", "diag_", "smoke_test"];

function shouldHideVoiceOrder(phone: string): boolean {
  return DEBUG_PHONE_PATTERNS.some((prefix) => phone.includes(prefix));
}

function formatVoicePhone(phone: string): string {
  if (phone === "LIVE_DEMO") return "🎙 Live Demo";
  return phone;
}

function parseStructuredOrder(structuredOrder: string): ParsedOrderChip[] {
  try {
    const parsed = JSON.parse(structuredOrder);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export default function VoiceCopilotPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [orderResult, setOrderResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: voiceOrders } = usePollableFetch<VoiceOrdersResponse>(
    "/api/voice/orders",
    { orders: [] },
    10000,
  );
  const filteredVoiceOrders = (voiceOrders?.orders || []).filter(
    (order) => !shouldHideVoiceOrder(order.phone),
  );

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert(
          "Your browser doesn't support audio recording. Please use Chrome or Edge.",
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        try {
          const response = await fetch(`${API_BASE}/api/voice/live`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const result = await response.json();
          setTranscript(result.transcript || "No speech detected");
          setOrderResult(result);
        } catch (error) {
          console.error("Upload error:", error);
          setTranscript("Error: Could not process audio");
          alert(
            "Failed to process recording. Please check if the backend is running on port 8000.",
          );
        } finally {
          setIsProcessing(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        alert(
          "Microphone access denied. Please allow microphone permissions in your browser.",
        );
      } else {
        alert("Failed to start recording: " + (error as Error).message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTextDemo = async (text: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/api/voice/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      setTranscript(text);
      setOrderResult(result);
    } catch (error) {
      console.error("Demo error:", error);
      setTranscript("Error: Could not process demo");
      alert(
        "Failed to process demo. Please check if the backend is running on port 8000.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resetVoiceState = () => {
    setTranscript("");
    setOrderResult(null);
    setRecordingTime(0);
  };

  return (
    <div className="min-h-screen bg-[var(--pp-bg)]">
      <AppNavigationBar variant="owner" />

      <section className="py-24 px-4 bg-[var(--pp-bg)] arch-bg mt-16">
        <div className="max-w-6xl mx-auto">
          <Section>
            <SectionTitle
              accent="Module 2"
              sub="Natural language voice order capture with real-time upselling, multi-language support, and PoS integration"
            >
              AI Voice Ordering Copilot
            </SectionTitle>
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Voice Recording Interface */}
            <Section>
              <div
                className="pp-card border-2 border-[#1A1A1A] h-full"
                style={{ boxShadow: "4px 4px 0px #1A1A1A" }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className={`w-3 h-3 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-[#888]"}`}
                  />
                  <h3
                    className="text-xl font-black text-[#1A1A1A] dark:text-white"
                    style={{ fontFamily: "'Fredoka One', cursive" }}
                  >
                    Voice Recording
                  </h3>
                </div>

                <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-2xl border-2 border-[#e0e0e0] dark:border-[#333] p-8 mb-6 flex flex-col items-center justify-center min-h-[300px]">
                  {isProcessing ? (
                    <div className="text-center">
                      <Loader2 className="w-16 h-16 text-[#DA291C] animate-spin mx-auto mb-4" />
                      <p className="font-bold text-[#1A1A1A] dark:text-white">
                        Processing Audio...
                      </p>
                      <p className="text-xs text-[#888] mt-2">
                        Using AI to transcribe and parse your order
                      </p>
                    </div>
                  ) : isRecording ? (
                    <div className="text-center">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mb-4 mx-auto relative"
                      >
                        <Mic className="w-12 h-12 text-white" />
                        <motion.div
                          animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 rounded-full border-4 border-red-500"
                        />
                      </motion.div>
                      <p className="font-bold text-[#1A1A1A] dark:text-white text-2xl mb-2">
                        {Math.floor(recordingTime / 60)}:
                        {(recordingTime % 60).toString().padStart(2, "0")}
                      </p>
                      <p className="font-bold text-[#1A1A1A] dark:text-white">
                        Recording...
                      </p>
                      <p className="text-xs text-[#888] mt-2">
                        Speak your order clearly • Press Stop when done
                      </p>
                    </div>
                  ) : transcript ? (
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-[#DA291C]" />
                        <h4 className="font-bold text-[#1A1A1A] dark:text-white">
                          Transcript
                        </h4>
                      </div>
                      <p className="text-sm text-[#666] dark:text-[#aaa] mb-4 italic">
                        &ldquo;{transcript}&rdquo;
                      </p>
                      {orderResult && (
                        <div className="bg-white dark:bg-[#2a2a2a] rounded-xl p-4 border-2 border-[#e0e0e0] dark:border-[#444]">
                          <h5 className="font-bold text-[#1A1A1A] dark:text-white mb-2 text-sm">
                            Parsed Order
                          </h5>
                          <pre className="text-xs text-[#666] dark:text-[#aaa] overflow-auto">
                            {JSON.stringify(orderResult, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-[#FFC72C] rounded-2xl border-2 border-[#1A1A1A] flex items-center justify-center mb-3 mx-auto shadow-[3px_3px_0_#1A1A1A]">
                        <Mic className="w-10 h-10 text-[#1A1A1A]" />
                      </div>
                      <p className="font-bold text-[#1A1A1A] dark:text-white">
                        Ready to Record
                      </p>
                      <p className="text-xs text-[#888] mt-1">
                        Press the button below to start
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {!isRecording && !isProcessing ? (
                    <>
                      <button
                        onClick={startRecording}
                        className="flex-1 pp-btn-primary justify-center py-3"
                        disabled={isProcessing}
                      >
                        <Mic className="w-5 h-5" /> Start Recording
                      </button>
                      <button
                        onClick={() =>
                          handleTextDemo(
                            "I want 2 butter chicken, 3 garlic naan and 1 mango lassi",
                          )
                        }
                        className="flex-1 pp-btn-yellow justify-center py-3"
                        disabled={isProcessing}
                      >
                        <PlayCircle className="w-5 h-5" /> Try Demo
                      </button>
                      {transcript && (
                        <button
                          onClick={resetVoiceState}
                          className="pp-btn-ghost px-4 py-3"
                          title="Clear"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  ) : isRecording ? (
                    <button
                      onClick={stopRecording}
                      className="flex-1 pp-btn-danger justify-center py-3"
                    >
                      <MicOff className="w-5 h-5" /> Stop Recording
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 pp-btn-disabled justify-center py-3"
                    >
                      <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                    </button>
                  )}
                </div>
              </div>
            </Section>

            {/* Order Feed */}
            <Section>
              <div
                className="pp-card border-2 border-[#1A1A1A] h-full"
                style={{ boxShadow: "4px 4px 0px #FFC72C" }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-[#FFC72C] rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-[#1A1A1A]" />
                  </div>
                  <h3
                    className="text-xl font-black text-[#1A1A1A] dark:text-white"
                    style={{ fontFamily: "'Fredoka One', cursive" }}
                  >
                    Recent Voice Orders
                  </h3>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {filteredVoiceOrders.length ? (
                    filteredVoiceOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3 bg-[#f9f9f9] dark:bg-[#222] rounded-xl border border-[#eee] dark:border-[#333]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#1A1A1A] dark:text-white">
                            #{order.id}
                          </span>
                          <span className="text-xs text-[#888]">
                            {formatSmartTimestamp(order.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-[#666] dark:text-[#aaa] mb-2 italic">
                          &ldquo;{order.transcript}&rdquo;
                        </p>
                        {parseStructuredOrder(order.structured_order).length >
                          0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {parseStructuredOrder(order.structured_order).map(
                              (item, index) => (
                                <span
                                  key={`${order.id}-${index}`}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#DA291C] border border-red-200"
                                >
                                  {item.qty ?? 1}x{" "}
                                  {item.name || item.item || "Item"}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#888]">
                            Status: {order.status}
                          </span>
                          <span className="text-xs font-semibold text-[#DA291C]">
                            {formatVoicePhone(order.phone)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#888] text-center py-8 italic">
                      No voice orders yet
                    </p>
                  )}
                </div>
              </div>
            </Section>
          </div>

          {/* Capabilities Grid */}
          <Section className="mt-8">
            <div
              className="pp-card border-2 border-[#1A1A1A]"
              style={{ boxShadow: "4px 4px 0px #1A1A1A" }}
            >
              <h3
                className="text-xl font-black text-[#1A1A1A] dark:text-white mb-5"
                style={{ fontFamily: "'Fredoka One', cursive" }}
              >
                Voice Copilot Capabilities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    icon: <Volume2 className="w-5 h-5" />,
                    title: "Speech-to-Text",
                    desc: "Real-time transcription with restaurant-specific vocabulary & noisy environment adaptation",
                    color:
                      "bg-[#FFC72C]/20 text-[#7a5900] border-[#FFC72C]/50 dark:text-[#FFC72C]",
                  },
                  {
                    icon: <Brain className="w-5 h-5" />,
                    title: "Intent Recognition",
                    desc: "NLU pipeline maps voice to PoS item database with modifier & customization handling",
                    color:
                      "bg-[#FFC72C]/20 text-[#7a5900] border-[#FFC72C]/50 dark:text-[#FFC72C]",
                  },
                  {
                    icon: <MessageSquare className="w-5 h-5" />,
                    title: "Ambiguity Resolution",
                    desc: "Clarification prompts for unclear items, sizes, or add-ons with confirmations",
                    color:
                      "bg-[#FFC72C]/20 text-[#7a5900] border-[#FFC72C]/50 dark:text-[#FFC72C]",
                  },
                  {
                    icon: <Zap className="w-5 h-5" />,
                    title: "Real-time Upsell",
                    desc: "Revenue engine suggests combos & upgrades during live call flow to maximize AOV",
                    color: "bg-[#DA291C]/10 text-[#DA291C] border-[#DA291C]/30",
                  },
                  {
                    icon: <ChefHat className="w-5 h-5" />,
                    title: "KOT Auto-Creation",
                    desc: "Structured JSON pushed directly to PoS — zero manual entry, zero errors",
                    color: "bg-[#DA291C]/10 text-[#DA291C] border-[#DA291C]/30",
                  },
                  {
                    icon: <Activity className="w-5 h-5" />,
                    title: "Order Analytics",
                    desc: "Every call analyzed for upsell hit rate, avg handle time, and conversion metrics",
                    color:
                      "bg-red-100 text-[#DA291C] border-red-200 dark:bg-red-900/30 dark:text-red-300",
                  },
                ].map((cap, i) => (
                  <motion.div
                    key={cap.title}
                    className={`p-4 rounded-xl border-2 ${cap.color}`}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {cap.icon}
                      <h4 className="font-black text-sm">{cap.title}</h4>
                    </div>
                    <p className="text-xs leading-relaxed opacity-80">
                      {cap.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </section>

      <Footer />
    </div>
  );
}
