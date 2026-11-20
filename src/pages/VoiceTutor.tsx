
import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, ArrowLeft, Bot, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";

import { auth, db } from "../firebase";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function VoiceTutor() {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! Welcome to your English speaking practice. Let's start with a simple question. Tell me about yourself."
    }
  ]);

  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready to practice");
  const [learnerName, setLearnerName] = useState("");
  const [englishLevel, setEnglishLevel] = useState("Beginner");
  const [learningGoal, setLearningGoal] = useState("English Fluency");
  const [assessmentContext, setAssessmentContext] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const historyRef = useRef<Message[]>([]);


  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setProfileLoading(false);
      setStatus("Please log in to continue.");
      return;
    }

    try {
      // Load learner profile
      const profileRef = doc(db, "users", user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const profile = profileSnap.data();

        setLearnerName(profile.fullName || "");
        setEnglishLevel(profile.englishLevel || "Beginner");
        setLearningGoal(profile.goal || "English Fluency");
      }

      // Load latest assessment
      const assessmentsRef = collection(
        db,
        "users",
        user.uid,
        "assessments"
      );

      const assessmentQuery = query(
        assessmentsRef,
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const assessmentSnap = await getDocs(assessmentQuery);

      if (!assessmentSnap.empty) {
        const report = assessmentSnap.docs[0].data();

        const context = {
          overall_level: report.overall_level,
          overall_summary: report.overall_summary,
          weaknesses: report.weaknesses,
          learning_priorities: report.learning_priorities
        };

        setAssessmentContext(JSON.stringify(context));
      }

      setStatus("Your personalized tutor is ready!");
    } catch (error) {
      console.error("Profile loading error:", error);
      setStatus("Could not load your learning profile.");
    } finally {
      setProfileLoading(false);
    }
  });

  return () => unsubscribe();
}, []);

  useEffect(() => {
    historyRef.current = messages;
  }, [messages]);

  // Speak the tutor's response
  const speak = (text: string) => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;

    window.speechSynthesis.speak(utterance);
  };

  // Start microphone recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      const recorder = new MediaRecorder(stream);

      mediaRecorder.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, {
          type: recorder.mimeType || "audio/webm"
        });

        stream.getTracks().forEach((track) => track.stop());

        await processAudio(audioBlob);
      };

      recorder.start();

      setRecording(true);
      setStatus("Listening to you...");
    } catch (error) {
      console.error(error);
      setStatus("Microphone access failed. Please allow microphone permission.");
    }
  };

  // Stop microphone recording
  const stopRecording = () => {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();
      setRecording(false);
      setLoading(true);
      setStatus("Understanding your answer...");
    }
  };

  // Send audio to backend and get tutor response
  const processAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();

      formData.append("audio", audioBlob, "recording.webm");

      const transcriptionResponse = await fetch(
        "http://127.0.0.1:8000/api/voice/transcribe",
        {
          method: "POST",
          body: formData
        }
      );

      if (!transcriptionResponse.ok) {
        throw new Error("Audio transcription failed");
      }

      const transcriptionData = await transcriptionResponse.json();
      const transcript = transcriptionData.transcript;

      if (!transcript?.trim()) {
        setStatus("I couldn't hear that clearly. Please try again.");
        return;
      }

      const userMessage: Message = {
        role: "user",
        content: transcript
      };

      const updatedHistory = [
        ...historyRef.current,
        userMessage
      ];

      setMessages(updatedHistory);
      historyRef.current = updatedHistory;

      setStatus("Your tutor is thinking...");

      const replyResponse = await fetch(
        "http://127.0.0.1:8000/api/voice/reply",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
         body: JSON.stringify({
  transcript,
  history: historyRef.current.slice(0, -1),
  english_level: englishLevel,
  learning_goal: learningGoal,
  assessment_context: assessmentContext
})
        }
      );

      if (!replyResponse.ok) {
        throw new Error("Tutor response failed");
      }

      const replyData = await replyResponse.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: replyData.reply
      };

      const finalHistory = [
        ...updatedHistory,
        assistantMessage
      ];

      setMessages(finalHistory);
      historyRef.current = finalHistory;

      setStatus("Your tutor is speaking...");
      speak(replyData.reply);

      setStatus("Your turn! Tap the microphone to speak.");
    } catch (error) {
      console.error(error);
      setStatus("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Stop speech when leaving the page
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      mediaRecorder.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    
    <div className="min-h-screen bg-slate-950 text-white px-4 py-6">
      <div className="max-w-3xl mx-auto">

        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <Bot size={38} className="text-blue-400" />
          </div>

          <h1 className="text-3xl font-bold">TalkMate AI Tutor</h1>
          <p className="text-slate-400 mt-2">
            {profileLoading
              ? "Loading your learning profile..."
              : `Welcome${learnerName ? `, ${learnerName}` : ""}! Let's improve your English.`}
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 min-h-[350px] max-h-[450px] overflow-y-auto space-y-5">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Bot size={19} className="text-blue-400" />
                </div>
              )}

              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                  message.role === "user"
                    ? "bg-blue-600"
                    : "bg-slate-800"
                }`}
              >
                <p className="text-sm leading-6">{message.content}</p>
              </div>

              {message.role === "user" && (
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                  <User size={19} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-7">
          <p className="text-slate-400 text-sm mb-5">{status}</p>

          <button
            onClick={recording ? stopRecording : startRecording}
           disabled={loading || profileLoading}
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition ${
              recording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-blue-600 hover:bg-blue-500"
            } disabled:opacity-50`}
          >
            {recording ? <MicOff size={30} /> : <Mic size={30} />}
          </button>

          <p className="text-sm text-slate-400 mt-4">
            {recording
              ? "Tap to finish speaking"
              : loading
              ? "Please wait..."
              : "Tap the microphone and speak"}
          </p>

          <button
            onClick={() => speak(messages[messages.length - 1].content)}
            className="mt-5 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
          >
            <Volume2 size={17} />
            Replay tutor's response
          </button>
        </div>
      </div>
    </div>
  );
}
