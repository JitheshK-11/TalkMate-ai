
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  Square,
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle,
  Loader2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { auth, db } from "../firebase";

import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

const API_URL = "http://127.0.0.1:8000";

const questions = [
  {
    title: "Introduce yourself",
    description:
      "Tell us about yourself, your education, interests and goals.",
    hint: "Imagine you are introducing yourself to a new friend.",
  },
  {
    title: "Describe your daily routine",
    description:
      "Talk about what you usually do from morning until night.",
    hint: "Explain your activities in chronological order.",
  },
  {
    title: "Describe a memorable experience",
    description:
      "Talk about an experience that made you happy or taught you something.",
    hint: "Explain what happened and how you felt.",
  },
  {
    title: "Express your opinion",
    description:
      "Do you think technology makes our lives better? Why?",
    hint: "Give your opinion and support it with examples.",
  },
  {
    title: "Handle a real-life situation",
    description:
      "Imagine you are attending a job interview. Why should we hire you?",
    hint: "Talk about your skills, strengths and willingness to learn.",
  },
];

const goalNames: Record<string, string> = {
  fluency: "English Fluency",
  interviews: "Job Interviews & Placements",
  corporate: "Corporate Communication",
  grammar: "Grammar & Vocabulary",
  confidence: "Confidence & Public Speaking",
  academic: "Academic Communication",
};

interface AssessmentReport {
  overall_level: string;
  overall_summary: string;
  scores: Record<string, number>;
  strengths: string[];
  weaknesses: {
    area: string;
    problem: string;
    evidence: string;
    priority: string;
  }[];
  recurring_mistakes: {
    mistake: string;
    correction: string;
    explanation: string;
    occurrences: string;
  }[];
  vocabulary_analysis: {
    observations: string;
    suggestions: string[];
  };
  learning_priorities: {
    skill: string;
    reason: string;
    recommended_activity: string;
  }[];
  recommended_focus: string;
  personalized_roadmap?: {
    estimated_duration: string;
    daily_minutes: number;
    daily_session: {
      activity: string;
      duration_minutes: number;
      description: string;
    }[];
    milestones: {
      stage: string;
      focus: string;
      success_criteria: string;
    }[];
    adaptation_rules: string[];
  };
}

function getPreferences() {
  try {
    const saved = localStorage.getItem("talkmate_preferences");

    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Could not load preferences:", error);
  }

  return {
    goal: "fluency",
    dailyMinutes: 30,
  };
}

export default function Assessment() {
  const navigate = useNavigate();

  const [current, setCurrent] = useState(0);
  const [recording, setRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const [recordings, setRecordings] = useState<
    (Blob | null)[]
  >(Array(questions.length).fill(null));

  const [error, setError] = useState("");
  const [report, setReport] = useState<AssessmentReport | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const preferences = getPreferences();

  const goal = preferences.goal || "fluency";
  const dailyMinutes = Number(preferences.dailyMinutes) || 30;

  const question = questions[current];
  const currentRecording = recordings[current];

  // Recording timer
  useEffect(() => {
    if (!recording) return;

    if (timeLeft <= 0) {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((previous: number) => previous - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [recording, timeLeft]);

  // Stop microphone when component is removed
  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  // Start recording
  async function startRecording() {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      const questionIndex = current;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (audioBlob.size > 0) {
          setRecordings((previous) => {
            const updated = [...previous];
            updated[questionIndex] = audioBlob;
            return updated;
          });

          setError("");
        } else {
          setError("Recording is empty. Please try again.");
        }

        setRecording(false);
      };

      recorder.start();

      setTimeLeft(60);
      setRecording(true);
    } catch (error) {
      console.error("Microphone error:", error);

      setError(
        "Microphone access failed. Please allow microphone permission."
      );
    }
  }

  // Stop recording
  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  // Move to next question
  function nextQuestion() {
    if (recording || isProcessing) return;

    if (!recordings[current]) {
      setError("Please record your answer before continuing.");
      return;
    }

    if (current < questions.length - 1) {
      setCurrent((previous) => previous + 1);
      setTimeLeft(60);
      setError("");
    }
  }

  // Move to previous question
  function previousQuestion() {
    if (recording || isProcessing || current === 0) return;

    setCurrent((previous) => previous - 1);
    setTimeLeft(60);
    setError("");
  }

  // Transcribe and evaluate all five answers
  async function processAssessment() {
    if (recording || isProcessing) return;

    const missingIndex = recordings.findIndex((item) => !item);

    if (missingIndex !== -1) {
      setCurrent(missingIndex);
      setError(
        `Please record your answer for Question ${missingIndex + 1}.`
      );
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const transcripts: {
        question: string;
        transcript: string;
      }[] = [];

      // STEP 1: Transcribe all five recordings
      for (let index = 0; index < questions.length; index++) {
        const audioBlob = recordings[index];

        if (!audioBlob) {
          throw new Error(`Recording ${index + 1} is missing.`);
        }

        const formData = new FormData();

        formData.append(
          "audio",
          audioBlob,
          `answer-${index + 1}.webm`
        );

        const transcriptionResponse = await fetch(
          `${API_URL}/api/assessment/transcribe`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!transcriptionResponse.ok) {
          const message = await transcriptionResponse.text();
          throw new Error(
            `Question ${index + 1} transcription failed: ${message}`
          );
        }

        const transcriptionData = await transcriptionResponse.json();

        const transcript = transcriptionData.transcript;

        if (!transcript || !transcript.trim()) {
          throw new Error(
            `No speech was detected in Question ${index + 1}. Please restart the assessment.`
          );
        }

        transcripts.push({
          question: questions[index].description,
          transcript: transcript,
        });
      }

      // STEP 2: Send all five transcripts together
      const evaluationResponse = await fetch(
        `${API_URL}/api/assessment/evaluate-full`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: transcripts,
            goal: goal,
            daily_minutes: dailyMinutes,
          }),
        }
      );

      if (!evaluationResponse.ok) {
        const message = await evaluationResponse.text();

        throw new Error(
          `Combined AI evaluation failed: ${message}`
        );
      }

      const evaluationData = await evaluationResponse.json();

      if (!evaluationData.assessment_report) {
        throw new Error("AI did not return an assessment report.");
      }

      if (!evaluationData.assessment_report) {
        throw new Error("AI did not return an assessment report.");
      }

      const assessmentReport = evaluationData.assessment_report;

      setReport(assessmentReport);

      const user = auth.currentUser;

      if (!user) {
        throw new Error("User is not logged in. Please log in again.");
      }

      const assessmentRef = collection(
        db,
        "users",
        user.uid,
        "assessments"
      );

      await addDoc(assessmentRef, {
        ...assessmentReport,
        goal: goal,
        daily_minutes: dailyMinutes,
        createdAt: serverTimestamp(),
      });

      console.log("Assessment report saved successfully!");
    } catch (error) {
      console.error("Assessment processing failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while processing your assessment."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (report) {
    const roadmap = report.personalized_roadmap;

    return (
      <div className="min-h-screen bg-[#080a12] text-white px-5 py-10">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-10">
            <CheckCircle
              size={60}
              className="text-green-400 mx-auto mb-5"
            />

            <p className="text-violet-400 font-semibold text-sm mb-3">
              TALKMATE AI · ASSESSMENT REPORT
            </p>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Your English assessment
            </h1>

            <p className="text-gray-400">
              All five answers have been evaluated together.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-7 mb-7">
            <p className="text-sm text-violet-300 mb-2">
              YOUR CURRENT LEVEL
            </p>

            <h2 className="text-3xl font-bold mb-4">
              {report.overall_level}
            </h2>

            <p className="text-gray-300 leading-relaxed">
              {report.overall_summary}
            </p>

            <div className="mt-5 text-sm text-gray-400 space-y-1">
              <p>
                Learning goal: {goalNames[goal] || goal}
              </p>
              <p>Daily practice: {dailyMinutes} minutes</p>
            </div>
          </div>

          {/* Scores */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-7 mb-7">
            <h2 className="text-xl font-bold mb-6">
              Your skill scores
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(report.scores || {}).map(
                ([label, score]) => (
                  <div
                    key={label}
                    className="bg-white/5 p-4 rounded-xl"
                  >
                    <p className="text-xs text-gray-400 mb-2 capitalize">
                      {label.replaceAll("_", " ")}
                    </p>

                    <p className="text-3xl font-bold text-violet-300">
                      {score}/10
                    </p>
                  </div>
                )
              )}
            </div>

            <p className="text-xs text-gray-500 mt-5">
              Fluency indicators are estimated from transcripts.
              Actual speaking speed, pauses and pronunciation are
              not measured by this text-based evaluation.
            </p>
          </div>

          {/* Strengths */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-7 mb-7">
            <h2 className="text-xl font-bold mb-5">
              Your strengths
            </h2>

            {(report.strengths || []).map((item, index) => (
              <p
                key={index}
                className="text-green-300 mb-3"
              >
                ✓ {item}
              </p>
            ))}
          </div>

          {/* Weaknesses */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-7 mb-7">
            <h2 className="text-xl font-bold mb-5">
              Areas to improve
            </h2>

            {(report.weaknesses || []).map((item, index) => (
              <div
                key={index}
                className="bg-white/5 rounded-xl p-5 mb-4"
              >
                <div className="flex justify-between gap-3 mb-2">
                  <h3 className="font-semibold">
                    {item.area}
                  </h3>

                  <span className="text-xs text-orange-300">
                    {item.priority} priority
                  </span>
                </div>

                <p className="text-gray-300 text-sm mb-3">
                  {item.problem}
                </p>

                <p className="text-red-300 text-sm">
                  Evidence: {item.evidence}
                </p>
              </div>
            ))}
          </div>

          {/* Recurring mistakes */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-7 mb-7">
            <h2 className="text-xl font-bold mb-5">
              Repeated mistakes and corrections
            </h2>

            {(report.recurring_mistakes || []).map(
              (item, index) => (
                <div
                  key={index}
                  className="border-b border-white/10 pb-5 mb-5 last:border-0"
                >
                  <p className="text-red-300 mb-2">
                    {item.mistake}
                  </p>

                  <p className="text-green-300 mb-2">
                    {item.correction}
                  </p>

                  <p className="text-gray-400 text-sm">
                    {item.explanation}
                  </p>
                </div>
              )
            )}
          </div>

          {/* Vocabulary */}
          {report.vocabulary_analysis && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-7 mb-7">
              <h2 className="text-xl font-bold mb-4">
                Vocabulary analysis
              </h2>

              <p className="text-gray-300 mb-5">
                {report.vocabulary_analysis.observations}
              </p>

              {(report.vocabulary_analysis.suggestions || []).map(
                (item, index) => (
                  <p key={index} className="text-violet-300 mb-2">
                    • {item}
                  </p>
                )
              )}
            </div>
          )}

          {/* Learning priorities */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-7 mb-7">
            <h2 className="text-xl font-bold mb-5">
              Your learning priorities
            </h2>

            {(report.learning_priorities || []).map(
              (item, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded-xl p-4 mb-3"
                >
                  <h3 className="font-semibold text-violet-300 mb-2">
                    {item.skill}
                  </h3>

                  <p className="text-gray-300 text-sm mb-2">
                    {item.reason}
                  </p>

                  <p className="text-gray-400 text-sm">
                    Practice: {item.recommended_activity}
                  </p>
                </div>
              )
            )}

            <div className="mt-5 bg-violet-500/10 rounded-xl p-4">
              <p className="text-violet-300 font-semibold mb-2">
                Recommended first focus
              </p>
              <p className="text-gray-300">
                {report.recommended_focus}
              </p>
            </div>
          </div>

          {/* Personalized roadmap */}
          {roadmap && (
            <div className="bg-white/5 border border-violet-500/30 rounded-3xl p-7 mb-7">
              <div className="flex items-center gap-3 mb-5">
                <Sparkles className="text-violet-400" size={25} />
                <h2 className="text-2xl font-bold">
                  Your personalized roadmap
                </h2>
              </div>

              <p className="text-gray-400 text-sm mb-2">
                Estimated learning duration
              </p>

              <h3 className="text-2xl font-bold text-violet-300 mb-5">
                {roadmap.estimated_duration}
              </h3>

              <p className="text-gray-400 text-sm mb-5">
                Daily commitment: {roadmap.daily_minutes} minutes
              </p>

              <h3 className="font-semibold mb-4">
                Your daily learning session
              </h3>

              {(roadmap.daily_session || []).map(
                (item, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-xl p-4 mb-3"
                  >
                    <div className="flex justify-between gap-3 mb-2">
                      <h4 className="font-semibold">
                        {item.activity}
                      </h4>

                      <span className="text-violet-300 text-sm whitespace-nowrap">
                        {item.duration_minutes} min
                      </span>
                    </div>

                    <p className="text-gray-400 text-sm">
                      {item.description}
                    </p>
                  </div>
                )
              )}

              <h3 className="font-semibold mt-7 mb-4">
                Learning milestones
              </h3>

              {(roadmap.milestones || []).map(
                (item, index) => (
                  <div
                    key={index}
                    className="border-l-2 border-violet-500 pl-5 pb-5"
                  >
                    <h4 className="font-semibold text-violet-300">
                      {item.stage}
                    </h4>

                    <p className="text-gray-300 text-sm mt-2">
                      {item.focus}
                    </p>

                    <p className="text-gray-500 text-sm mt-2">
                      Goal: {item.success_criteria}
                    </p>
                  </div>
                )
              )}

              <h3 className="font-semibold mt-5 mb-3">
                How your roadmap adapts
              </h3>

              {(roadmap.adaptation_rules || []).map(
                (item, index) => (
                  <p key={index} className="text-gray-400 text-sm mb-2">
                    • {item}
                  </p>
                )
              )}
            </div>
          )}

          <button
            onClick={() => navigate("/")}
            className="w-full bg-violet-600 hover:bg-violet-500 rounded-xl py-4 font-semibold transition"
          >
            Back to Home
          </button>

        </div>
      </div>
    );
  }

  // Processing screen
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-[#080a12] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <Loader2
            size={60}
            className="animate-spin text-violet-400 mx-auto mb-7"
          />

          <h1 className="text-3xl font-bold mb-4">
            Analyzing your English
          </h1>

          <p className="text-gray-400 mb-6">
            SpeakMate is transcribing your five recordings and
            analyzing your communication patterns.
          </p>

          <div className="bg-white/5 rounded-xl p-5 text-left space-y-3">
            <p className="text-sm text-violet-300">
              <Loader2 size={15} className="inline animate-spin mr-2" />
              Transcribing recordings and preparing your report...
            </p>
            <p className="text-xs text-gray-500">
              Please keep this page open until the analysis finishes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Assessment questions
  return (
    <div className="min-h-screen bg-[#080a12] text-white px-5 py-10">
      <div className="max-w-3xl mx-auto">

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-10"
        >
          <ArrowLeft size={18} />
          Back to home
        </button>

        <div className="mb-8">
          <p className="text-violet-400 font-semibold text-sm mb-2">
            SPEAKMATE AI · INITIAL ASSESSMENT
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Let's understand your English.
          </h1>

          <p className="text-gray-400">
            Answer naturally. Your answers will be evaluated together
            after all five questions.
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-gray-400">
            <span className="bg-white/5 rounded-full px-3 py-2">
              Goal: {goalNames[goal] || goal}
            </span>

            <span className="bg-white/5 rounded-full px-3 py-2">
              Daily practice: {dailyMinutes} minutes
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex justify-between text-sm text-gray-400 mb-3">
          <span>
            Question {current + 1} of {questions.length}
          </span>

          <span>
            {recordings.filter(Boolean).length} of 5 recorded
          </span>
        </div>

        <div className="h-2 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{
              width: `${
                (recordings.filter(Boolean).length / questions.length) * 100
              }%`,
            }}
          />
        </div>

        {/* Question card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-7 md:p-10">

          <div className="flex justify-between items-center mb-8">
            <span className="text-xs font-semibold tracking-wider text-violet-300 bg-violet-500/10 px-4 py-2 rounded-full">
              SPEAKING TASK
            </span>

            <span className="flex items-center gap-2 text-gray-400 text-sm">
              <Clock size={16} />
              60 seconds
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
            <div
              className={`text-4xl font-bold mb-5 ${
                recording ? "text-red-400" : "text-white"
              }`}
            >
              {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
              {String(timeLeft % 60).padStart(2, "0")}
            </div>

            <button
              onClick={
                recording ? stopRecording : startRecording
              }
              className={`mx-auto flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition ${
                recording
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-violet-600 hover:bg-violet-500"
              }`}
            >
              {recording ? (
                <Square size={20} />
              ) : (
                <Mic size={20} />
              )}

              {recording ? "Stop recording" : "Start speaking"}
            </button>

            {!recording && currentRecording && (
              <div className="mt-5 flex flex-col items-center gap-3">
                <p className="text-sm text-green-300 flex items-center gap-2">
                  <CheckCircle size={17} />
                  Recording saved successfully
                </p>

                <button
                  onClick={startRecording}
                  className="text-sm text-violet-300 hover:text-violet-200 flex items-center gap-2"
                >
                  <RotateCcw size={15} />
                  Record again
                </button>
              </div>
            )}

            {!recording && !currentRecording && (
              <p className="text-xs text-gray-500 mt-4">
                Allow microphone access and start speaking.
              </p>
            )}

            {recording && (
              <p className="text-sm text-red-300 mt-5 animate-pulse">
                Recording in progress...
              </p>
            )}
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-7 gap-3">
          <button
            onClick={previousQuestion}
            disabled={current === 0 || recording}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-gray-300 disabled:opacity-30"
          >
            <ArrowLeft size={18} />
            Previous
          </button>

          {current < questions.length - 1 ? (
            <button
              onClick={nextQuestion}
              disabled={recording || !currentRecording}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold disabled:opacity-30"
            >
              Next question
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={processAssessment}
              disabled={
                recording ||
                recordings.some((item) => !item)
              }
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold disabled:opacity-30"
            >
              Finish & Analyze
              <Sparkles size={18} />
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Your answers are analyzed together only after all five
          recordings are completed.
        </p>

      </div>
    </div>
  );
}
