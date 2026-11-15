
import { useEffect, useRef, useState } from "react";
import {
  Mic, Square, ArrowLeft, ArrowRight,
  Clock, CheckCircle, Loader2
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

const questions = [
  {
    title: "Introduce yourself",
    description: "Tell us about yourself, your education, interests and goals.",
    hint: "Imagine you are introducing yourself to a new friend."
  },
  {
    title: "Describe your daily routine",
    description: "Talk about what you usually do from morning until night.",
    hint: "Explain your activities in chronological order."
  },
  {
    title: "Describe a memorable experience",
    description: "Talk about an experience that made you happy or taught you something.",
    hint: "Explain what happened and how you felt."
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

interface Evaluation {
  overall_feedback: string;
  grammar_score: number;
  vocabulary_score: number;
  sentence_formation_score: number;
  relevance_score: number;
  strengths: string[];
  mistakes: {
    original: string;
    correction: string;
    explanation: string;
  }[];
  improved_answer: string;
  practice_tip: string;
}

interface AnalysisResult {
  transcript: string;
  evaluation: Evaluation;
}

export default function Assessment() {
  const [current, setCurrent] = useState(0);
  const [recording, setRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<Record<number, AnalysisResult>>({});
  const [error, setError] = useState("");

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

  async function analyzeRecording(blob: Blob, questionIndex: number) {
    setIsAnalyzing(true);
    setError("");

    try {
      // 1. Send recording to Groq through FastAPI
      const formData = new FormData();

      formData.append(
        "audio",
        blob,
        "answer.webm"
      );

      const transcriptionResponse = await fetch(
        `${API_URL}/api/assessment/transcribe`,
        {
          method: "POST",
          body: formData
        }
      );

      if (!transcriptionResponse.ok) {
        const message = await transcriptionResponse.text();
        throw new Error(message || "Speech transcription failed.");
      }

      const transcriptionData = await transcriptionResponse.json();
      const transcript = transcriptionData.transcript;

      if (!transcript || !transcript.trim()) {
        throw new Error("No speech was detected. Please record again.");
      }

      // 2. Send transcript to Gemini through FastAPI
      const evaluationResponse = await fetch(
        `${API_URL}/api/assessment/evaluate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            question: questions[questionIndex].description,
            transcript: transcript
          })
        }
      );

      if (!evaluationResponse.ok) {
        const message = await evaluationResponse.text();
        throw new Error(message || "AI evaluation failed.");
      }

      const evaluationData = await evaluationResponse.json();

      // 3. Save result for this question
      setResults((previous) => ({
        ...previous,
        [questionIndex]: {
          transcript: transcript,
          evaluation: evaluationData.evaluation
        }
      }));

    } catch (err) {
      console.error("Analysis error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function startRecording() {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      const questionIndex = current;

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm"
        });

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (audioBlob.size > 0) {
          await analyzeRecording(audioBlob, questionIndex);
        } else {
          setError("Recording is empty. Please try again.");
        }
      };

      recorder.start();
      setRecording(true);

    } catch (err) {
      console.error(err);
      setError(
        "Microphone access failed. Please allow microphone permission."
      );
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }

    setRecording(false);
  }

  function nextQuestion() {
    if (recording || isAnalyzing) return;

    if (current === questions.length - 1) {
      setCompleted(true);
    } else {
      setCurrent((value) => value + 1);
      setTimeLeft(60);
      setError("");
    }
  }

  function previousQuestion() {
    if (recording || isAnalyzing || current === 0) return;

    setCurrent((value) => value - 1);
    setTimeLeft(60);
    setError("");
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#080a12] text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center bg-white/5 border border-white/10 rounded-3xl p-10">
          <CheckCircle size={64} className="text-green-400 mx-auto mb-5" />

          <h1 className="text-3xl font-bold mb-3">
            Assessment completed!
          </h1>

          <p className="text-gray-400 mb-6">
            You completed {questions.length} speaking questions.
            AI analysis is available for {Object.keys(results).length} answers.
          </p>

          <div className="text-left space-y-3 mb-7">
            {questions.map((q, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-white/5 rounded-xl p-4"
              >
                <span className="text-sm">{q.title}</span>
                {results[index] ? (
                  <CheckCircle className="text-green-400" size={20} />
                ) : (
                  <span className="text-xs text-gray-500">Not analyzed</span>
                )}
              </div>
            ))}
          </div>

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

  const currentResult = results[current];

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
          <span>
            {Math.round(((current + 1) / questions.length) * 100)}% completed
          </span>
        </div>

        <div className="h-2 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{
              width: `${((current + 1) / questions.length) * 100}%`
            }}
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
            <div className={`text-4xl font-bold mb-5 ${
              recording ? "text-red-400" : "text-white"
            }`}>
              {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
              {String(timeLeft % 60).padStart(2, "0")}
            </div>

            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={isAnalyzing}
              className={`mx-auto flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition disabled:opacity-50 ${
                recording
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-violet-600 hover:bg-violet-500"
              }`}
            >
              {recording ? <Square size={20} /> : <Mic size={20} />}
              {recording ? "Stop recording" : "Start speaking"}
            </button>

            {isAnalyzing && (
              <div className="mt-5 flex items-center justify-center gap-2 text-violet-300">
                <Loader2 className="animate-spin" size={18} />
                <span className="text-sm">
                  AI is analyzing your answer...
                </span>
              </div>
            )}

            {!recording && !isAnalyzing && (
              <p className="text-xs text-gray-500 mt-4">
                {currentResult
                  ? "Your answer has been analyzed. You can record again."
                  : "Allow microphone access and start speaking."}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {currentResult && (
          <div className="mt-8 bg-white/5 border border-white/10 rounded-3xl p-7 space-y-6">

            <div>
              <h3 className="text-xl font-bold mb-3">
                Your speech transcript
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {currentResult.transcript}
              </p>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h3 className="text-xl font-bold mb-3">
                AI feedback
              </h3>

              <p className="text-gray-300 mb-5">
                {currentResult.evaluation.overall_feedback}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Grammar", currentResult.evaluation.grammar_score],
                  ["Vocabulary", currentResult.evaluation.vocabulary_score],
                  ["Sentence formation", currentResult.evaluation.sentence_formation_score],
                  ["Relevance", currentResult.evaluation.relevance_score]
                ].map(([label, score]) => (
                  <div key={label} className="bg-white/5 p-4 rounded-xl">
                    <p className="text-xs text-gray-400 mb-2">{label}</p>
                    <p className="text-2xl font-bold text-violet-300">
                      {score}/10
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h4 className="font-semibold mb-3">Your strengths</h4>
              {currentResult.evaluation.strengths.map((item, index) => (
                <p key={index} className="text-sm text-green-300 mb-2">
                  ✓ {item}
                </p>
              ))}
            </div>

            <div className="border-t border-white/10 pt-6">
              <h4 className="font-semibold mb-3">Mistakes and corrections</h4>

              {currentResult.evaluation.mistakes.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No major grammar mistakes were identified in this answer.
                </p>
              ) : (
                currentResult.evaluation.mistakes.map((mistake, index) => (
                  <div key={index} className="bg-white/5 rounded-xl p-4 mb-3">
                    <p className="text-red-300 text-sm">
                      Original: {mistake.original}
                    </p>
                    <p className="text-green-300 text-sm mt-2">
                      Correction: {mistake.correction}
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      {mistake.explanation}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/10 pt-6">
              <h4 className="font-semibold mb-3">Improved answer</h4>
              <p className="text-gray-300 leading-relaxed">
                {currentResult.evaluation.improved_answer}
              </p>
            </div>

            <div className="bg-violet-500/10 rounded-xl p-4">
              <h4 className="font-semibold text-violet-300 mb-2">
                Your practice tip
              </h4>
              <p className="text-sm text-gray-300">
                {currentResult.evaluation.practice_tip}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-7">
          <button
            onClick={previousQuestion}
            disabled={current === 0 || recording || isAnalyzing}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-gray-300 disabled:opacity-30"
          >
            <ArrowLeft size={18} /> Previous
          </button>

          <button
            onClick={nextQuestion}
            disabled={recording || isAnalyzing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold disabled:opacity-30"
          >
            {current === questions.length - 1
              ? "Finish assessment"
              : "Next question"}
            <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
