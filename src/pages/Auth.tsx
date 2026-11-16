
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
} from "lucide-react";

function Auth() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
  const result = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = result.user;

  const userDoc = await getDoc(
    doc(db, "users", user.uid)
  );

  if (userDoc.exists() && userDoc.data().onboardingCompleted === true) {
    navigate("/dashboard");
  } else {
    navigate("/onboarding");
  }
} else {
        if (name.trim().length < 2) {
          throw new Error("Please enter your full name.");
        }

        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        await updateProfile(result.user, {
          displayName: name.trim(),
        });

        navigate("/onboarding", {
          state: {
            name: name.trim(),
            email,
            isNewUser: true,
          },
        });
      }
    } catch (err: any) {
      const messages: Record<string, string> = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password must contain at least 6 characters.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
      };

      setError(
        messages[err.code] ||
        err.message ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090f] text-white flex items-center justify-center px-5 py-10">

      <div className="w-full max-w-md">

        <button
          onClick={() => navigate("/")}
          className="text-2xl font-bold tracking-tight mb-10"
        >
          Speak<span className="text-violet-400">Mate</span>.
        </button>

        <div className="border border-white/10 bg-white/[0.03] rounded-3xl p-7 md:p-9 shadow-2xl">

          <div className="w-12 h-12 rounded-2xl bg-violet-500/15 text-violet-300 flex items-center justify-center mb-6">
            <Sparkles size={24} />
          </div>

          <h1 className="text-3xl font-bold mb-3">
            {isLogin ? "Welcome back!" : "Create your account"}
          </h1>

          <p className="text-gray-400 text-sm mb-8">
            {isLogin
              ? "Continue your English learning journey."
              : "Start building your English communication skills."}
          </p>

          <form onSubmit={handleAuth} className="space-y-5">

            {!isLogin && (
              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  Full Name
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  />

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    minLength={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-violet-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Email Address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-violet-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 outline-none focus:border-violet-500 transition"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 font-semibold transition"
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Login to SpeakMate"
                  : "Create Account"}

              {!loading && <ArrowRight size={18} />}
            </button>

          </form>

          <div className="text-center text-sm text-gray-400 mt-7">
            {isLogin
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-violet-400 font-semibold ml-2"
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </div>

        </div>

        <p className="text-center text-xs text-gray-600 mt-7">
          By continuing, you agree to use SpeakMate responsibly.
        </p>

      </div>
    </div>
  );
}

export default Auth;
