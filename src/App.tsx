import { motion } from "framer-motion";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Assessment from "./pages/Assessment";
import {
  ArrowRight,
  AudioLines,
  Mic,
  Brain,
  ChartNoAxesCombined,
  Gamepad2,
  Trophy,
  BookOpen,
  MessageCircle,
  Sparkles,
  Clock3,
  CheckCircle2,
  Play,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const features = [
  {
    icon: Mic,
    title: "AI Speaking Assessment",
    description:
      "Discover your English speaking level through an intelligent voice assessment.",
    color: "purple",
  },
  {
    icon: Brain,
    title: "Personalized Learning",
    description:
      "Get a unique 30-day learning plan based on your speaking strengths and weaknesses.",
    color: "blue",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Daily AI Analysis",
    description:
      "Track your grammar, fluency, vocabulary and pronunciation improvements.",
    color: "green",
  },
  {
    icon: Gamepad2,
    title: "Interactive Games",
    description:
      "Improve your communication skills through fun speaking challenges.",
    color: "orange",
  },
];

const games = [
  {
    icon: Zap,
    name: "Word Sprint",
    description: "Explain a word without saying it.",
    time: "2 min",
    color: "purple",
  },
  {
    icon: Clock3,
    name: "60-Second Challenge",
    description: "Speak about a random topic.",
    time: "1 min",
    color: "blue",
  },
  {
    icon: MessageCircle,
    name: "Interview Battle",
    description: "Practise real placement interviews.",
    time: "5 min",
    color: "green",
  },
  {
    icon: BookOpen,
    name: "Story Builder",
    description: "Create stories using random words.",
    time: "3 min",
    color: "orange",
  },
];

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
    setMenuOpen(false);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#080a12] text-white">
      {/* NAVBAR */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.07] bg-[#080a12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <a href="#" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
              <AudioLines size={23} />
            </div>
            <span className="text-xl font-bold tracking-tight">
              SpeakMate<span className="text-violet-400">.</span>
            </span>
          </a>

          <div className="hidden items-center gap-9 text-sm text-gray-400 md:flex">
            <button onClick={() => scrollTo("features")} className="hover:text-white">Features</button>
            <button onClick={() => scrollTo("journey")} className="hover:text-white">How it works</button>
            <button onClick={() => scrollTo("games")} className="hover:text-white">Speaking games</button>
          </div>

          <div className="hidden md:block">
            <button
              onClick={() => scrollTo("journey")}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-violet-200"
            >
              Get started <ArrowRight size={16} />
            </button>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-5 border-t border-white/10 bg-[#0c0e18] px-6 py-6 md:hidden">
            <button onClick={() => scrollTo("features")}>Features</button>
            <button onClick={() => scrollTo("journey")}>How it works</button>
            <button onClick={() => scrollTo("games")}>Speaking games</button>
            <button onClick={() => scrollTo("journey")} className="rounded-full bg-violet-600 py-3">
              Get started
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative px-6 pb-24 pt-40 lg:px-10 lg:pb-32 lg:pt-48">
        <div className="pointer-events-none absolute left-1/2 top-20 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-700/15 blur-[140px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-300">
              <Sparkles size={14} />
              YOUR PERSONAL AI ENGLISH COACH
            </div>

            <h1 className="max-w-2xl text-5xl font-bold leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl">
              Stop learning.
              <br />
              Start <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">speaking.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-gray-400">
              Discover your speaking level, get a personalized 30-day
              learning plan, and build the confidence to speak English
              naturally.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={() => scrollTo("journey")}
                className="flex items-center gap-3 rounded-full bg-violet-600 px-7 py-4 font-semibold shadow-xl shadow-violet-600/20 transition hover:-translate-y-1 hover:bg-violet-500"
              >
                Start your journey <ArrowRight size={18} />
              </button>

              <button
                onClick={() => scrollTo("features")}
                className="flex items-center gap-3 rounded-full border border-white/15 px-7 py-4 font-semibold text-gray-300 transition hover:bg-white/5"
              >
                <Play size={17} /> Explore features
              </button>
            </div>

            <div className="mt-12 flex flex-wrap gap-7 text-sm text-gray-500">
              <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-400" /> Personalized learning</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-400" /> Daily improvement</span>
            </div>
          </motion.div>

          {/* HERO VISUAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mx-auto w-full max-w-lg"
          >
            <div className="absolute inset-10 rounded-full bg-violet-600/20 blur-[90px]" />

            <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-[#19172b] to-[#101321] p-7 shadow-2xl shadow-violet-950/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Your speaking journey</p>
                  <h3 className="mt-1 text-xl font-bold">Let's get started!</h3>
                </div>
                <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
                  <AudioLines size={25} />
                </div>
              </div>

              <div className="my-12 flex flex-col items-center">
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10">
                  <div className="absolute inset-3 rounded-full border border-violet-400/20 animate-ping" />
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-600/40">
                    <Mic size={45} />
                  </div>
                </div>
                <p className="mt-7 font-semibold">Your AI speaking coach</p>
                <p className="mt-2 text-sm text-gray-500">Ready when you are.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Your 30-day goal</span>
                  <span className="font-semibold text-violet-300">30 Days</span>
                </div>
                <div className="mt-4 flex gap-1.5">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="h-2 flex-1 rounded-full bg-violet-500/30" />
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">A personalized journey starts with understanding your level.</p>
              </div>
            </div>

            <div className="absolute -left-7 top-24 hidden rounded-2xl border border-white/10 bg-[#19172b] p-4 shadow-xl sm:block">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles size={16} className="text-yellow-400" /> AI powered
              </div>
              <p className="mt-1 text-xs text-gray-500">Personalized feedback</p>
            </div>

            <div className="absolute -right-5 bottom-20 hidden rounded-2xl border border-white/10 bg-[#19172b] p-4 shadow-xl sm:block">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Trophy size={16} className="text-yellow-400" /> Daily progress
              </div>
              <p className="mt-1 text-xs text-gray-500">Improve every day</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="scroll-mt-24 border-t border-white/[0.06] px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">Why SpeakMate?</p>
            <h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Everything you need to
              <span className="text-violet-400"> speak confidently.</span>
            </h2>
            <p className="mt-5 leading-7 text-gray-400">
              A complete learning experience designed around your current
              speaking ability and your personal goals.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group rounded-3xl border border-white/[0.08] bg-white/[0.025] p-7 transition hover:-translate-y-2 hover:border-violet-400/30 hover:bg-violet-500/[0.05]"
                >
                  <div className="mb-7 inline-flex rounded-2xl bg-violet-500/15 p-4 text-violet-300 transition group-hover:bg-violet-500 group-hover:text-white">
                    <Icon size={26} />
                  </div>
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-gray-400">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section id="journey" className="scroll-mt-24 px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">Your transformation</p>
            <h2 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
              A smarter way to
              <span className="text-violet-400"> improve every day.</span>
            </h2>
            <p className="mt-6 leading-8 text-gray-400">
              No random lessons. No one-size-fits-all courses. Your learning
              journey is built around your actual speaking performance.
            </p>
            <button
             onClick={() => window.location.href = "/assessment"}
              className="mt-9 flex items-center gap-3 rounded-full bg-white px-7 py-4 font-semibold text-black transition hover:bg-violet-200"
            >
              Begin your assessment <ArrowRight size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {[
              ["01", "Assess your level", "Complete an AI-powered speaking assessment."],
              ["02", "Understand your weaknesses", "Receive a detailed report of your speaking skills."],
              ["03", "Get your 30-day plan", "Follow daily exercises designed for your level."],
              ["04", "Track your transformation", "Compare your daily scores and final assessment."],
            ].map(([number, title, description]) => (
              <div key={number} className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition hover:border-violet-400/30">
                <span className="text-2xl font-bold text-violet-400">{number}</span>
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GAMES */}
      <section id="games" className="scroll-mt-24 border-t border-white/[0.06] bg-[#0c0e18] px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">Learn through play</p>
              <h2 className="mt-4 text-4xl font-bold sm:text-5xl">Speaking can be fun.</h2>
              <p className="mt-4 text-gray-400">Practice your English with interactive speaking games.</p>
            </div>
            <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
              More games coming soon
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {games.map((game) => {
              const Icon = game.icon;
              return (
                <div key={game.name} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-violet-400/30">
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
                      <Icon size={24} />
                    </div>
                    <span className="text-xs text-gray-500">{game.time}</span>
                  </div>
                  <h3 className="mt-7 font-bold">{game.name}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-gray-400">{game.description}</p>
                  <div className="mt-5 flex items-center gap-2 text-sm font-medium text-violet-300">
                    Coming soon <ArrowRight size={15} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 lg:px-10">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-violet-400/20 bg-gradient-to-br from-[#28204b] via-[#17172f] to-[#111426] px-7 py-20 text-center sm:px-16">
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-96 -translate-x-1/2 rounded-full bg-violet-500/20 blur-[100px]" />
          <div className="relative">
            <div className="mx-auto inline-flex rounded-full border border-white/10 bg-white/10 p-4 text-violet-300">
              <AudioLines size={30} />
            </div>
            <h2 className="mx-auto mt-8 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
              Your confidence starts with one conversation.
            </h2>
            <p className="mx-auto mt-6 max-w-xl leading-7 text-gray-300">
              Discover your speaking level and start building better
              communication skills, one day at a time.
            </p>
            <button
              onClick={() => scrollTo("journey")}
              className="mt-9 inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 font-semibold text-black transition hover:-translate-y-1 hover:bg-violet-200"
            >
              Explore your journey <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07] px-6 py-10 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-600 p-2">
              <AudioLines size={19} />
            </div>
            <span className="font-bold">SpeakMate AI</span>
          </div>
          <p className="text-center text-sm text-gray-500">
            Speak better. Grow stronger. Every single day.
          </p>
          <p className="text-xs text-gray-600">© 2026 SpeakMate AI</p>
        </div>
      </footer>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/assessment" element={<Assessment />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
