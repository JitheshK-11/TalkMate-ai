
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  AudioLines,
  BookOpen,
  Target,
  Clock3,
  Flame,
  Mic,
  ChartNoAxesCombined,
  LogOut,
  Loader2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface AssessmentReport {
  overall_level?: string;
  overall_summary?: string;
  scores?: Record<string, number>;
  strengths?: string[];
  weaknesses?: {
    area: string;
    problem: string;
    priority: string;
  }[];
  personalized_roadmap?: {
    estimated_duration?: string;
    daily_minutes?: number;
    daily_session?: {
      activity: string;
      duration_minutes: number;
      description: string;
    }[];
    milestones?: {
      stage: string;
      focus: string;
      success_criteria: string;
    }[];
  };
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/auth", { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Load learner profile
        const profileRef = doc(db, "users", user.uid);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
          navigate("/onboarding", { replace: true });
          return;
        }

        const profileData = profileSnap.data();
        setProfile(profileData);

        if (!profileData.onboardingCompleted) {
          navigate("/onboarding", { replace: true });
          return;
        }

        // Load latest assessment report
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

        if (!assessmentSnap.empty) {
          setReport(
            assessmentSnap.docs[0].data() as AssessmentReport
          );
        }
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError("Unable to load your dashboard. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  async function handleLogout() {
    await signOut(auth);
    navigate("/auth", { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12] flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-violet-400" size={36} />
      </div>
    );
  }

  const roadmap = report?.personalized_roadmap;

  return (
    <main className="min-h-screen bg-[#080a12] text-white">
      <header className="border-b border-white/10 bg-[#0c0e18]">
        <div className="max-w-7xl mx-auto px-5 py-5 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-xl font-bold"
          >
            <AudioLines className="text-violet-400" />
            TalkMate<span className="text-violet-400">.</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-10">
        <section className="mb-10">
          <p className="text-violet-400 text-sm font-semibold mb-3">
            YOUR LEARNING DASHBOARD
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Welcome back, {profile?.fullName || "Learner"}! 👋
          </h1>

          <p className="text-gray-400">
            Keep practising. Every conversation makes you better.
          </p>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <Target className="text-violet-400 mb-4" />
            <p className="text-gray-400 text-sm">English level</p>
            <h2 className="text-2xl font-bold mt-2">
              {report?.overall_level || "Not assessed"}
            </h2>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <Clock3 className="text-blue-400 mb-4" />
            <p className="text-gray-400 text-sm">Daily commitment</p>
            <h2 className="text-2xl font-bold mt-2">
              {profile?.dailyMinutes || 30} min
            </h2>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <BookOpen className="text-green-400 mb-4" />
            <p className="text-gray-400 text-sm">Learning goal</p>
            <h2 className="text-lg font-bold mt-2 capitalize">
              {profile?.goal || "English Fluency"}
            </h2>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <Flame className="text-orange-400 mb-4" />
            <p className="text-gray-400 text-sm">Practice streak</p>
            <h2 className="text-2xl font-bold mt-2">0 days</h2>
            <p className="text-xs text-gray-500 mt-1">
              Daily tracking coming next
            </p>
          </div>
        </section>

        {!report ? (
          <section className="rounded-3xl border border-violet-500/30 bg-violet-500/5 p-8 md:p-12 text-center">
            <Mic size={42} className="text-violet-400 mx-auto mb-5" />
            <h2 className="text-2xl font-bold mb-3">
              Your first assessment is waiting!
            </h2>
            <p className="text-gray-400 mb-7">
              Complete your speaking assessment to unlock your personalized
              learning roadmap.
            </p>
            <button
              onClick={() => navigate("/assessment")}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 rounded-xl px-6 py-3 font-semibold"
            >
              Start assessment <ArrowRight size={18} />
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-7 md:p-9 mb-8">
              <div className="flex items-center gap-3 mb-5">
                <Sparkles className="text-violet-400" />
                <h2 className="text-xl font-bold">
                  Your latest assessment
                </h2>
              </div>

              <h3 className="text-3xl font-bold mb-4">
                {report.overall_level || "Assessment completed"}
              </h3>

              <p className="text-gray-300 leading-7">
                {report.overall_summary}
              </p>

             
 <div className="mt-6 flex flex-wrap gap-3">
  <button
    onClick={() => navigate("/dashboard/voice-tutor")}
    className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 rounded-xl px-6 py-3 font-semibold transition"
  >
    <Mic size={18} />
    Start AI Voice Tutor
    <ArrowRight size={18} />
  </button>
</div>
            </section>

            {report.scores && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                  <ChartNoAxesCombined className="text-violet-400" />
                  Your skill scores
                </h2>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(report.scores).map(([skill, score]) => (
                    <div
                      key={skill}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                    >
                      <p className="text-gray-400 capitalize text-sm mb-3">
                        {skill.replaceAll("_", " ")}
                      </p>
                      <p className="text-3xl font-bold text-violet-300">
                        {score}/10
                      </p>
                      <div className="h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, Number(score) * 10))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {roadmap && (
              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 mb-8">
                <div className="flex items-center gap-3 mb-5">
                  <BookOpen className="text-violet-400" />
                  <h2 className="text-xl font-bold">
                    Your personalized learning roadmap
                  </h2>
                </div>

                <p className="text-gray-400 text-sm">
                  Estimated learning duration
                </p>
                <h3 className="text-2xl font-bold text-violet-300 mt-2 mb-6">
                  {roadmap.estimated_duration || "Personalized"}
                </h3>

                <h3 className="font-semibold mb-4">Today's learning session</h3>

                <div className="space-y-3">
                  {(roadmap.daily_session || []).map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl bg-white/[0.04] p-5 flex gap-4"
                    >
                      <CheckCircle2 className="text-violet-400 shrink-0 mt-1" />
                      <div className="flex-1">
                        <div className="flex justify-between gap-3">
                          <h4 className="font-semibold">{item.activity}</h4>
                          <span className="text-violet-300 text-sm whitespace-nowrap">
                            {item.duration_minutes} min
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mt-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {report.strengths && report.strengths.length > 0 && (
              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 mb-8">
                <h2 className="text-xl font-bold mb-5">Your strengths</h2>
                <div className="space-y-3">
                  {report.strengths.map((item, index) => (
                    <p key={index} className="text-green-300">
                      ✓ {item}
                    </p>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
