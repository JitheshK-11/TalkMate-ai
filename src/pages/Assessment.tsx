
import { useEffect, useRef, useState } from "react";
import { Mic, Square, ArrowLeft, ArrowRight, Clock, CheckCircle } from "lucide-react";

const questions = [
  {
    title: "Introduce yourself",
    description: "Tell us about yourself, your education, interests and goals.",
    hint: "Imagine you are introducing yourself to a new friend."
  },
  {
    title: "Describe your daily routine",
    description: "Talk about what you usually do from morning until night.",
    hint: "Try to explain your activities in chronological order."
  },
  {
    title: "Describe a memorable experience",
    description: "Talk about an experience that made you happy or taught you something.",
    hint: "Explain what happened, when it happened and how you felt."
  },
  {
    title: "Express your opinion",
    description: "Do you think technology makes our lives better? Why?",
    hint: "Give your opinion and support it with examples."
  },
  {
    title: "Handle a real-life situation",
    description: "Imagine you are attending a job interview. Why should we hire you?",
    hint: "Talk about your skills, strengths and willingness to learn."
  }
];

export default function Assessment() {
  const [current, setCurrent] = useState(0);
  const [recording, setRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [completed, setCompleted] = useState(false);
  const [recordings, setRecordings] = useState<string[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const question = questions[current];

  useEffect(() => {
    if (!recording) return;

    if (timeLeft <= 0) {
      stopRecording();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((time) => time - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [recording, timeLeft]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        setRecordings((previous) => {
          const updated = [...previous];
          updated[current] = audioUrl;
          return updated;
        });

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setRecording(true);
    } catch {
      alert("Microphone access is required. Please allow microphone permission and try again.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
  }

  function nextQuestion() {
    if (recording) stopRecording();

    if (current === questions.length - 1) {
      setCompleted(true);
    } else {
      setCurrent((value) => value + 1);
      setTimeLeft(60);
    }
  }

  function previousQuestion() {
    if (recording) stopRecording();
    setCurrent((value) => Math.max(0, value - 1));
    setTimeLeft(60);
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#080a12] text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center bg-white/5 border border-white/10 rounded-3xl p-10">
          <CheckCircle size={64} className="text-green-400 mx-auto mb-5" />
          <h1 className="text-3xl font-bold mb-3">Assessment completed!</h1>
          <p className="text-gray-400 mb-6">
            Great job! You have completed all five speaking questions.
            Your recordings are currently stored in this browser session.
          </p>
          <p className="text-sm text-yellow-300 mb-6">
            AI analysis and your personalized 30-day plan will be connected in a later step.
          </p>
          <button
            onClick={() => window.location.href = "/"}
            className="bg-violet-600 hover:bg-violet-500 px-6 py-3 rounded-xl font-semibold"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12] text-white px-5 py-10">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => window.location.href = "/"}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-10"
        >
          <ArrowLeft size={18} /> Back to home
        </button>

        <div className="mb-8">
          <p className="text-violet-400 font-semibold text-sm mb-2">
            SPEAKMATE AI · INITIAL ASSESSMENT
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Let's understand your English.
          </h1>
          <p className="text-gray-400">
            Answer naturally. Don't worry about making mistakes.
          </p>
        </div>

        <div className="flex justify-between text-sm text-gray-400 mb-3">
          <span>Question {current + 1} of {questions.length}</span>
          <span>{Math.round(((current + 1) / questions.length) * 100)}% completed</span>
        </div>

        <div className="h-2 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-7 md:p-10">
          <div className="flex justify-between items-center mb-8">
            <span className="text-xs font-semibold tracking-wider text-violet-300 bg-violet-500/10 px-4 py-2 rounded-full">
              SPEAKING TASK
            </span>
            <span className="flex items-center gap-2 text-gray-400 text-sm">
              <Clock size={16} /> 60 seconds
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {question.title}
          </h2>

          <p className="text-gray-300 text-lg mb-5">
            {question.description}
          </p>

          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-10">
            <p className="text-sm text-violet-200">
              <strong>Tip:</strong> {question.hint}
            </p>
          </div>

          <div className="text-center">
            <div className={`text-4xl font-bold mb-5 ${recording ? "text-red-400" : "text-white"}`}>
              {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
              {String(timeLeft % 60).padStart(2, "0")}
            </div>

            <button
              onClick={recording ? stopRecording : startRecording}
              className={`mx-auto flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition ${
                recording
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-violet-600 hover:bg-violet-500"
              }`}
            >
              {recording ? <Square size={20} /> : <Mic size={20} />}
              {recording ? "Stop recording" : "Start speaking"}
            </button>

            <p className="text-xs text-gray-500 mt-4">
              {recording
                ? "Recording in progress. Speak clearly and naturally."
                : recordings[current]
                  ? "Your answer has been recorded. You can record again."
                  : "Allow microphone access when your browser asks."}
            </p>
          </div>
        </div>

        <div className="flex justify-between mt-7">
          <button
            onClick={previousQuestion}
            disabled={current === 0 || recording}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-gray-300 disabled:opacity-30"
          >
            <ArrowLeft size={18} /> Previous
          </button>

          <button
            onClick={nextQuestion}
            disabled={recording}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold disabled:opacity-30"
          >
            {current === questions.length - 1 ? "Finish assessment" : "Next question"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
