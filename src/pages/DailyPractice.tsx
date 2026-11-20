
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

import { auth, db } from "../firebase";

import {
  Clock,
  Target,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";


interface UserProfile {
  fullName?: string;
  goal?: string;
  dailyMinutes?: number;
  englishLevel?: string;
}

interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface Exercise {
  type: string;
  title: string;
  description: string;
  duration_minutes: number;
  difficulty: string;
  questions?: Question[];
  topic?: string;
}

interface DailyPlan {
  title: string;
  focus: string;
  total_minutes: number;
  reason: string;
  exercises: Exercise[];
}

interface AssessmentReport {
  overall_level?: string;
  overall_summary?: string;
  strengths?: {
    area: string;
    evidence?: string;
  }[];
  weaknesses?: {
    area: string;
    evidence?: string;
    priority?: string;
  }[];
  learning_priorities?: string[];
}


export default function DailyPractice() {

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);

  const [error, setError] = useState("");
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<string, boolean>>({});

  const [planDocumentPath, setPlanDocumentPath] = useState<string | null>(null);


  // Get today's local date as YYYY-MM-DD
  const getTodayKey = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };


  // Generate daily plan using FastAPI
  const generateDailyPlan = async (
    userId: string,
    userProfile: UserProfile,
    assessment: AssessmentReport
  ) => {

    setGenerating(true);
    setError("");

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/api/practice/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            goal: userProfile.goal || "English Fluency",
            daily_minutes: userProfile.dailyMinutes || 30,
            english_level:
              assessment.overall_level ||
              userProfile.englishLevel ||
              "beginner",
            assessment_report: assessment,
            previous_performance: [],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Unable to generate daily exercises."
        );
      }

      const result = await response.json();

      if (!result.daily_plan || !Array.isArray(result.daily_plan.exercises)) {
        throw new Error("The AI returned an invalid daily plan.");
      }

      const dailyPlan = result.daily_plan as DailyPlan;

      // Save plan in Firestore
      const dateKey = getTodayKey();

      const planRef = doc(
        db,
        "users",
        userId,
        "daily_plans",
        dateKey
      );

      await setDoc(planRef, {
        ...dailyPlan,
        date: dateKey,
        completedExerciseIds: [],
        createdAt: serverTimestamp(),
      });

      setPlan(dailyPlan);
      setCompletedExercises([]);
      setPlanDocumentPath(dateKey);

    } catch (err) {

      console.error("Daily plan generation error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating your plan."
      );

    } finally {
      setGenerating(false);
    }
  };


  // Fetch profile, assessment and today's plan
  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      if (!user) {
        navigate("/auth");
        return;
      }

      try {

        setLoading(true);
        setError("");

        // 1. Fetch user profile
        const profileRef = doc(db, "users", user.uid);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
          navigate("/onboarding");
          return;
        }

        const userProfile = profileSnap.data() as UserProfile;
        setProfile(userProfile);

        // 2. Fetch latest assessment
        const assessmentsRef = collection(
          db,
          "users",
          user.uid,
          "assessments"
        );

        const latestAssessmentQuery = query(
          assessmentsRef,
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const assessmentSnap = await getDocs(latestAssessmentQuery);

        if (assessmentSnap.empty) {
          setReport(null);
          setError("Please complete your speaking assessment first.");
          return;
        }

        const assessment = assessmentSnap.docs[0].data() as AssessmentReport;
        setReport(assessment);

        // 3. Check today's saved plan
        const dateKey = getTodayKey();

        const planRef = doc(
          db,
          "users",
          user.uid,
          "daily_plans",
          dateKey
        );

        setPlanDocumentPath(dateKey);

        const planSnap = await getDoc(planRef);

        if (planSnap.exists()) {

          const savedData = planSnap.data();

          setPlan({
            title: savedData.title,
            focus: savedData.focus,
            total_minutes: savedData.total_minutes,
            reason: savedData.reason,
            exercises: savedData.exercises || [],
          });

          setCompletedExercises(
            savedData.completedExerciseIds || []
          );

        } else {

          // 4. Generate today's plan if it doesn't exist
          await generateDailyPlan(
            user.uid,
            userProfile,
            assessment
          );

        }

      } catch (err) {

        console.error("Daily practice loading error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your learning information."
        );

      } finally {
        setLoading(false);
      }

    });

    return () => unsubscribe();

  }, [navigate]);


  // Check an MCQ answer
  const checkAnswer = (key: string) => {
    setCheckedAnswers((previous) => ({
      ...previous,
      [key]: true,
    }));
  };


  // Mark exercise as completed and save to Firestore
  const markExerciseComplete = async (exerciseIndex: number) => {

    const exerciseId = `exercise-${exerciseIndex}`;

    if (completedExercises.includes(exerciseId)) {
      return;
    }

    const user = auth.currentUser;

    if (!user || !planDocumentPath) {
      return;
    }

    try {

      const planRef = doc(
        db,
        "users",
        user.uid,
        "daily_plans",
        planDocumentPath
      );

      await updateDoc(planRef, {
        completedExerciseIds: arrayUnion(exerciseId),
      });

      setCompletedExercises((previous) => [
        ...previous,
        exerciseId,
      ]);

    } catch (err) {

      console.error("Exercise completion error:", err);
      setError("Unable to save exercise progress. Please try again.");

    }
  };


  // Loading screen
  if (loading || generating) {

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">

        <Loader2 className="animate-spin text-cyan-400 mb-4" size={38} />

        <h2 className="text-xl font-semibold">
          {generating
            ? "Creating your personalized learning plan..."
            : "Loading your learning profile..."}
        </h2>

        <p className="text-slate-400 mt-2">
          TalkMate is preparing your daily exercises.
        </p>

      </div>
    );
  }


  return (

    <div className="min-h-screen bg-slate-950 text-white px-5 py-8 md:px-12">

      <div className="max-w-6xl mx-auto">

        {/* Header */}

        <button
          onClick={() => navigate("/dashboard")}
          className="text-slate-400 hover:text-white mb-8"
        >
          ← Back to Dashboard
        </button>


        <div className="mb-10">

          <p className="text-cyan-400 font-medium mb-2">
            YOUR PERSONAL LEARNING SPACE
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Daily Practice
          </h1>

          <p className="text-slate-400">
            Welcome back, {profile?.fullName || "Learner"}!
            Let's improve your English one day at a time.
          </p>

        </div>


        {/* Error */}

        {error && (

          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 mb-6 text-red-300">
            {error}

            {!report && (
              <button
                onClick={() => navigate("/assessment")}
                className="block mt-3 underline"
              >
                Complete assessment
              </button>
            )}

          </div>

        )}


        {/* Profile overview */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <Target className="text-cyan-400 mb-4" size={26} />

            <p className="text-slate-400 text-sm">
              Learning Goal
            </p>

            <h2 className="text-xl font-semibold mt-2">
              {profile?.goal || "Not specified"}
            </h2>

          </div>


          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <Clock className="text-cyan-400 mb-4" size={26} />

            <p className="text-slate-400 text-sm">
              Daily Available Time
            </p>

            <h2 className="text-xl font-semibold mt-2">
              {profile?.dailyMinutes || 30} Minutes
            </h2>

          </div>


          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <TrendingUp className="text-cyan-400 mb-4" size={26} />

            <p className="text-slate-400 text-sm">
              Current English Level
            </p>

            <h2 className="text-xl font-semibold mt-2">
              {report?.overall_level || profile?.englishLevel || "Not assessed"}
            </h2>

          </div>

        </div>


        {/* Daily Plan */}

        {plan && (

          <>

            <div className="bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-900 rounded-2xl p-6 md:p-8 mb-8">

              <div className="flex items-center gap-2 text-cyan-400 mb-3">
                <Sparkles size={20} />
                <span className="font-semibold">
                  YOUR AI-GENERATED PLAN
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                {plan.title}
              </h2>

              <p className="text-slate-300 mb-5">
                {plan.reason}
              </p>

              <div className="flex flex-wrap gap-4 text-sm text-slate-300">

                <span className="flex items-center gap-2">
                  <Clock size={17} />
                  {plan.total_minutes} minutes
                </span>

                <span className="flex items-center gap-2">
                  <Target size={17} />
                  Focus: {plan.focus}
                </span>

              </div>

            </div>


            {/* Progress */}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">

              <div className="flex justify-between items-center mb-3">

                <h3 className="font-semibold">
                  Today's Progress
                </h3>

                <span className="text-cyan-400 font-semibold">
                  {completedExercises.length}/{plan.exercises.length} completed
                </span>

              </div>

              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">

                <div
                  className="bg-cyan-400 h-3 rounded-full transition-all"
                  style={{
                    width: `${
                      plan.exercises.length
                        ? (completedExercises.length / plan.exercises.length) * 100
                        : 0
                    }%`,
                  }}
                />

              </div>

            </div>


            {/* Exercises */}

            <div className="mb-6">

              <h2 className="text-2xl font-bold mb-2">
                Today's Exercises
              </h2>

              <p className="text-slate-400">
                Complete each activity at your own pace.
              </p>

            </div>


            <div className="space-y-6">

              {plan.exercises.map((exercise, exerciseIndex) => {

                const exerciseId = `exercise-${exerciseIndex}`;

                const isCompleted = completedExercises.includes(exerciseId);

                return (

                  <div
                    key={exerciseId}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8"
                  >

                    <div className="flex flex-wrap justify-between gap-3 mb-5">

                      <div>

                        <p className="text-cyan-400 uppercase text-xs font-semibold mb-2">
                          {exercise.type}
                        </p>

                        <h3 className="text-xl font-bold">
                          {exercise.title}
                        </h3>

                      </div>

                      {isCompleted && (
                        <span className="text-green-400 flex items-center gap-2">
                          <CheckCircle2 size={18} />
                          Completed
                        </span>
                      )}

                    </div>


                    <p className="text-slate-300 mb-4">
                      {exercise.description}
                    </p>


                    <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-6">

                      <span className="flex items-center gap-2">
                        <Clock size={15} />
                        {exercise.duration_minutes} minutes
                      </span>

                      <span>
                        Difficulty: {exercise.difficulty}
                      </span>

                    </div>


                    {/* MCQ questions */}

                    {exercise.questions?.map((question, questionIndex) => {

                      const answerKey = `${exerciseIndex}-${questionIndex}`;

                      const selected = selectedAnswers[answerKey];

                      const checked = checkedAnswers[answerKey];

                      const isCorrect =
                        selected === question.correct_answer;

                      return (

                        <div
                          key={answerKey}
                          className="border-t border-slate-800 pt-5 mt-5"
                        >

                          <h4 className="font-semibold mb-4">
                            {questionIndex + 1}. {question.question}
                          </h4>


                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                            {question.options?.map((option, optionIndex) => {

                              const isSelected = selected === option;

                              const isCorrectOption =
                                checked && option === question.correct_answer;

                              return (

                                <button
                                  key={optionIndex}
                                  disabled={checked || isCompleted}
                                  onClick={() =>
                                    setSelectedAnswers((previous) => ({
                                      ...previous,
                                      [answerKey]: option,
                                    }))
                                  }
                                  className={`text-left p-4 rounded-xl border transition ${
                                    isCorrectOption
                                      ? "bg-green-950 border-green-500 text-green-300"
                                      : checked && isSelected
                                      ? "bg-red-950 border-red-500 text-red-300"
                                      : isSelected
                                      ? "bg-cyan-950 border-cyan-400 text-white"
                                      : "bg-slate-800 border-slate-700 hover:border-cyan-400"
                                  }`}
                                >
                                  {option}
                                </button>

                              );

                            })}

                          </div>


                          {!checked && !isCompleted && (

                            <button
                              disabled={!selected}
                              onClick={() => checkAnswer(answerKey)}
                              className="mt-4 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold disabled:opacity-40"
                            >
                              Check Answer
                            </button>

                          )}


                          {checked && (

                            <div className={`mt-4 p-4 rounded-xl ${
                              isCorrect
                                ? "bg-green-950/50 text-green-300"
                                : "bg-red-950/50 text-red-300"
                            }`}>

                              <p className="font-semibold mb-2">
                                {isCorrect ? "Correct answer!" : "Not quite. Try to remember this."}
                              </p>

                              <p className="text-sm">
                                Correct answer: {question.correct_answer}
                              </p>

                              <p className="text-sm mt-2 text-slate-300">
                                {question.explanation}
                              </p>

                            </div>

                          )}

                        </div>

                      );

                    })}


                    {/* Speaking topic */}

                    {exercise.topic && (

                      <div className="bg-slate-800 rounded-xl p-5 mt-5">

                        <p className="text-cyan-400 font-semibold mb-2">
                          Speaking Topic
                        </p>

                        <p className="text-lg">
                          {exercise.topic}
                        </p>

                        <p className="text-sm text-slate-400 mt-3">
                          Speak about this topic for the recommended duration.
                          Try to use complete sentences and new vocabulary.
                        </p>

                      </div>

                    )}


                    {/* Complete exercise */}

                    <button
                      disabled={isCompleted}
                      onClick={() => markExerciseComplete(exerciseIndex)}
                      className={`mt-6 px-6 py-3 rounded-xl font-semibold transition ${
                        isCompleted
                          ? "bg-green-900/40 text-green-400 cursor-default"
                          : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                      }`}
                    >

                      {isCompleted
                        ? "Exercise Completed"
                        : "Mark as Completed"}

                    </button>

                  </div>

                );

              })}

            </div>


            {/* Completion message */}

            {completedExercises.length === plan.exercises.length &&
              plan.exercises.length > 0 && (

                <div className="mt-8 bg-green-950/40 border border-green-800 rounded-2xl p-8 text-center">

                  <CheckCircle2
                    size={42}
                    className="text-green-400 mx-auto mb-4"
                  />

                  <h2 className="text-2xl font-bold mb-2">
                    Excellent Work!
                  </h2>

                  <p className="text-slate-300">
                    You completed today's learning plan. Keep practising
                    consistently to improve your English.
                  </p>

                </div>

              )}

          </>

        )}

      </div>

    </div>

  );

}
