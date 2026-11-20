
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  UserRound,
  GraduationCap,
  Target,
  Clock3,
  ArrowRight,
  Check,
  Sparkles,
  Loader2,
} from "lucide-react";

const goals = [
  {
    id: "fluency",
    title: "English Fluency",
    description: "Speak naturally in everyday conversations.",
  },
  {
    id: "interviews",
    title: "Job Interviews & Placements",
    description: "Prepare for interviews and professional discussions.",
  },
  {
    id: "corporate",
    title: "Corporate Communication",
    description: "Communicate confidently in the workplace.",
  },
  {
    id: "grammar",
    title: "Grammar & Vocabulary",
    description: "Improve grammar and vocabulary.",
  },
  {
    id: "confidence",
    title: "Confidence & Public Speaking",
    description: "Overcome hesitation and speak confidently.",
  },
  {
    id: "academic",
    title: "Academic Communication",
    description: "Improve presentations and discussions.",
  },
];

const timeOptions = [15, 30, 45, 60, 90, 120];

function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState(
    location.state?.name || ""
  );
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("India");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [englishLevel, setEnglishLevel] = useState("beginner");
  const [goal, setGoal] = useState("fluency");
  const [dailyMinutes, setDailyMinutes] = useState(30);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (!currentUser) {
        navigate("/auth", { replace: true });
        return;
      }

      setFullName((previous: string) =>
  previous || currentUser.displayName || ""
);

      try {
        const profileRef = doc(db, "users", currentUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();

          if (data.fullName) setFullName(data.fullName);
          if (data.age) setAge(String(data.age));
          if (data.gender) setGender(data.gender);
          if (data.country) setCountry(data.country);
          if (data.nativeLanguage) setNativeLanguage(data.nativeLanguage);
          if (data.englishLevel) setEnglishLevel(data.englishLevel);
          if (data.goal) setGoal(data.goal);
          if (data.dailyMinutes) setDailyMinutes(data.dailyMinutes);
        }
      } catch (err) {
        console.error("Could not load profile:", err);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("Please log in before completing your profile.");
      return;
    }

    const ageNumber = Number(age);

    if (!Number.isInteger(ageNumber) || ageNumber < 13 || ageNumber > 100) {
      setError("Please enter a valid age between 13 and 100.");
      return;
    }

    if (fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!nativeLanguage.trim() || !country.trim()) {
      setError("Please enter your country and native language.");
      return;
    }

    setLoading(true);

    try {
      const profileRef = doc(db, "users", user.uid);
      const existingProfile = await getDoc(profileRef);

      const profileData = {
        uid: user.uid,
        fullName: fullName.trim(),
        email: user.email,
        age: ageNumber,
        gender: gender || null,
        country: country.trim(),
        nativeLanguage: nativeLanguage.trim(),
        englishLevel,
        goal,
        dailyMinutes,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
        ...(!existingProfile.exists() && {
          createdAt: serverTimestamp(),
        }),
      };

      await setDoc(profileRef, profileData, { merge: true });

      localStorage.setItem(
        "talkkmate_preferences",
        JSON.stringify({ goal, dailyMinutes })
      );

      navigate("/assessment", {
        state: { goal, dailyMinutes },
      });
    } catch (err) {
      console.error("Profile save error:", err);
      setError("Unable to save your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-violet-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] text-white px-5 py-10">
      <div className="max-w-3xl mx-auto">

        <header className="flex justify-between items-center mb-12">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-bold"
          >
            Speak<span className="text-violet-400">Mate</span>.
          </button>

          <span className="text-sm text-gray-400">
            Your learning profile
          </span>
        </header>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-5">
            <Sparkles size={16} />
            Let's personalize your journey
          </div>

          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Tell us about <span className="text-violet-400">yourself.</span>
          </h1>

          <p className="text-gray-400 max-w-xl mx-auto">
            Help TalkMate understand your background, current English
            level and learning goals.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-9">

          {/* Personal information */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div className="flex items-center gap-3 mb-7">
              <UserRound className="text-violet-400" size={23} />
              <div>
                <h2 className="text-xl font-semibold">Personal information</h2>
                <p className="text-sm text-gray-500">
                  Basic details about you
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-300 mb-2">
                  Full name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  minLength={2}
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3.5 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  min="13"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter your age"
                  required
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3.5 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Gender <span className="text-gray-500">(optional)</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl bg-[#151520] border border-white/10 p-3.5 outline-none focus:border-violet-500"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Country
                </label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Your country"
                  required
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3.5 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Native language
                </label>
                <input
                  value={nativeLanguage}
                  onChange={(e) => setNativeLanguage(e.target.value)}
                  placeholder="e.g. Kannada, Hindi"
                  required
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3.5 outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </section>

          {/* English level */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <GraduationCap className="text-violet-400" size={24} />
              <div>
                <h2 className="text-xl font-semibold">Current English level</h2>
                <p className="text-sm text-gray-500">
                  Choose the level you think describes you
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: "beginner", title: "Beginner", desc: "I know basic English." },
                { id: "intermediate", title: "Intermediate", desc: "I can communicate, but make mistakes." },
                { id: "advanced", title: "Advanced", desc: "I communicate well and want to improve." },
              ].map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setEnglishLevel(level.id)}
                  className={`text-left rounded-xl border p-4 transition ${
                    englishLevel === level.id
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{level.title}</span>
                    {englishLevel === level.id && (
                      <Check size={17} className="text-violet-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{level.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Learning goal */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Target className="text-violet-400" size={23} />
              <div>
                <h2 className="text-xl font-semibold">Your learning goal</h2>
                <p className="text-sm text-gray-500">
                  What do you want to achieve?
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {goals.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGoal(item.id)}
                  className={`text-left p-4 rounded-xl border transition ${
                    goal === item.id
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm">{item.title}</span>
                    {goal === item.id && (
                      <Check size={17} className="text-violet-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Daily time */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock3 className="text-violet-400" size={23} />
              <div>
                <h2 className="text-xl font-semibold">Daily practice time</h2>
                <p className="text-sm text-gray-500">
                  How much time can you dedicate each day?
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {timeOptions.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDailyMinutes(minutes)}
                  className={`rounded-xl border p-4 font-semibold transition ${
                    dailyMinutes === minutes
                      ? "border-violet-500 bg-violet-500/10 text-violet-300"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  {minutes >= 60
                    ? `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`
                    : `${minutes} minutes`}
                </button>
              ))}
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !user}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 py-4 font-semibold transition"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={19} />
                Saving your profile...
              </>
            ) : (
              <>
                Save Profile & Continue to Assessment
                <ArrowRight size={19} />
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500 pb-5">
            Your information is saved securely to your TalkMate account.
          </p>

        </form>
      </div>
    </div>
  );
}

export default Onboarding;
