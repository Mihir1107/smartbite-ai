"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Loader2, ShoppingCart, X, Volume2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface OrderItem {
  menu_item_id: number;
  name: string;
  qty: number;
  price: number;
}

interface AIChatProps {
  onClose?: () => void;
  onOrderUpdate?: () => void;
}

export default function AIChat({ onClose, onOrderUpdate }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi there! Welcome to SmartBite. What would you like to order today?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [conversationState, setConversationState] = useState("{}");
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderFinalized, setOrderFinalized] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Keep scroll inside chat container to avoid page-level jump on Enter.
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const playAudio = (audioDataUri: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioDataUri);
    audioRef.current = audio;

    audio.onplay = () => setAudioPlaying(true);
    audio.onended = () => setAudioPlaying(false);
    audio.onerror = () => setAudioPlaying(false);

    audio.play();
  };

  const sendMessage = async (text?: string, audioBlob?: Blob) => {
    const messageText = text || inputText.trim();

    if (!messageText && !audioBlob) return;

    // Add user message to chat
    if (messageText) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: messageText, timestamp: new Date() },
      ]);
      setInputText("");
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      if (audioBlob) {
        formData.append("audio", audioBlob, "recording.webm");
      } else {
        formData.append("text", messageText);
      }
      formData.append("session_id", sessionId);
      formData.append("conversation_state", conversationState);

      const response = await fetch("http://localhost:8000/api/voice/chat", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Add assistant response
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response, timestamp: new Date() },
        ]);

        // Update state
        setConversationState(data.state);
        setCurrentOrder(data.order_items || []);
        setOrderTotal(data.order_total || 0);
        setOrderFinalized(data.order_finalized || false);
        onOrderUpdate?.();

        // Play TTS audio if available
        if (data.audio) {
          playAudio(data.audio);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I had trouble understanding that. Could you try again?",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error. Please check your connection.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
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
        await sendMessage(undefined, audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access denied:", error);
      alert("Please allow microphone access");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-3xl border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#DA291C] to-[#DA291C] px-6 py-4 flex items-center justify-between border-b-2 border-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white border-2 border-[#1A1A1A] flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h3
              className="text-white font-black text-lg"
              style={{ fontFamily: "Fredoka One" }}
            >
              SmartBite AI
            </h3>
            <p className="text-white/80 text-xs font-medium">
              {audioPlaying ? "Speaking..." : "Chat with AI to order"}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Order Summary Badge */}
      {currentOrder.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFC72C]/20 border-b-2 border-[#FFC72C] px-6 py-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[#1A1A1A]" />
              <span className="font-bold text-sm text-[#1A1A1A]">
                {currentOrder.length} item(s) • ₹{orderTotal}
              </span>
            </div>
            {orderFinalized && (
              <span className="text-xs font-black text-white bg-[#DA291C] px-3 py-1 rounded-full">
                ✓ Confirmed
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"
      >
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                  msg.role === "user"
                    ? "bg-[#DA291C] text-white border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A]"
                    : "bg-white text-gray-800 border-2 border-gray-200"
                }`}
              >
                <p className="text-sm font-medium whitespace-pre-wrap">
                  {msg.content}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    msg.role === "user" ? "text-white/70" : "text-gray-400"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white rounded-2xl px-5 py-3 border-2 border-gray-200">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                <span className="text-sm text-gray-600 font-medium">
                  Thinking...
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t-2 border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          {/* Voice Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? "bg-red-500 animate-pulse"
                : "bg-[#DA291C] hover:bg-[#9B1C1C]"
            } text-white border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] disabled:opacity-50`}
          >
            {isRecording ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </motion.button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing || orderFinalized}
            placeholder={
              orderFinalized
                ? "Order complete! Start new conversation..."
                : "Type your order or use voice..."
            }
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-[#DA291C] focus:outline-none font-medium disabled:bg-gray-100"
          />

          {/* Send Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || isProcessing || orderFinalized}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-[#DA291C] to-[#DA291C] text-white flex items-center justify-center border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>

        {isRecording && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-red-500 font-bold mt-2"
          >
            🎤 Recording... Tap mic again to send
          </motion.p>
        )}
      </div>
    </div>
  );
}
