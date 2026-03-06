"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, Mic, Loader2 } from "lucide-react";

type Props = {
  onOrderUpdate?: () => void;
};

export default function VoiceCallAssistant({ onOrderUpdate }: Props) {
  const [inCall, setInCall] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationState, setConversationState] = useState("{}");
  const [sessionId] = useState(() => `call_${Date.now()}`);
  const [lastBotReply, setLastBotReply] = useState(
    "Tap Start Call to talk to SmartBite assistant.",
  );
  const [lastUserText, setLastUserText] = useState("");

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );

  const startCall = () => {
    setInCall(true);
    setLastBotReply("Call connected. Tell me your order.");
  };

  const endCall = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setInCall(false);
    setIsRecording(false);
    setIsProcessing(false);
    setLastBotReply("Call ended.");
  };

  const beginTurnRecording = async () => {
    if (!inCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const localChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(localChunks, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        await sendCallTurn(blob);
      };

      recorder.start(100);
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (e) {
      console.error(e);
      setLastBotReply("Microphone permission is required for call mode.");
    }
  };

  const stopTurnRecording = () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;
    setIsRecording(false);
    setIsProcessing(true);
    mediaRecorder.stop();
  };

  const sendCallTurn = async (audioBlob: Blob) => {
    try {
      const form = new FormData();
      form.append("audio", audioBlob, "call.webm");
      form.append("session_id", sessionId);
      form.append("conversation_state", conversationState);

      const res = await fetch("http://localhost:8000/api/voice/chat", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastUserText(data.transcript || "");
        setLastBotReply(data.response || "");
        setConversationState(data.state || "{}");
        onOrderUpdate?.();

        if (data.audio) {
          const audio = new Audio(data.audio);
          audio.play().catch((e) => console.error(e));
        }
      } else {
        setLastBotReply(data.error || "I could not process that call turn.");
      }
    } catch (e) {
      console.error(e);
      setLastBotReply("Network issue during call turn.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A]">
      <h3
        className="text-2xl font-black text-[#1A1A1A] mb-4"
        style={{ fontFamily: "Fredoka One" }}
      >
        Web Call Assistant
      </h3>

      <div className="rounded-2xl border-2 border-gray-200 p-4 bg-gray-50">
        <p className="text-sm text-gray-500 mb-1 font-bold">Assistant</p>
        <p className="text-gray-800 font-medium">{lastBotReply}</p>
        {lastUserText && (
          <>
            <p className="text-sm text-gray-500 mt-3 mb-1 font-bold">
              You said
            </p>
            <p className="text-gray-700">{lastUserText}</p>
          </>
        )}
      </div>

      <div className="flex gap-3 mt-5">
        {!inCall ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={startCall}
            className="flex-1 py-3 rounded-xl bg-green-600 text-white font-black border-2 border-[#1A1A1A] flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" /> Start Call
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={endCall}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black border-2 border-[#1A1A1A] flex items-center justify-center gap-2"
          >
            <PhoneOff className="w-4 h-4" /> End Call
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={!inCall || isProcessing}
          onClick={isRecording ? stopTurnRecording : beginTurnRecording}
          className="flex-1 py-3 rounded-xl bg-[#FF4500] text-white font-black border-2 border-[#1A1A1A] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Processing
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" /> {isRecording ? "Send Turn" : "Talk"}
            </>
          )}
        </motion.button>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        In call mode, each tap on Talk records one conversational turn and sends
        it to the AI assistant.
      </p>
    </div>
  );
}
