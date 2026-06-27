import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { login as apiLogin } from "@/api/client"

/* ---------- Floating character blobs ---------- */
interface CharBlobProps {
  char: string
  style: React.CSSProperties
  animClass: string
}

function CharBlob({ char, style, animClass }: CharBlobProps) {
  return (
    <div
      className={cn("absolute select-none pointer-events-none font-black text-white/10", animClass)}
      style={style}
    >
      {char}
    </div>
  )
}

const blobs: CharBlobProps[] = [
  { char: "S", style: { top: "8%",  left: "6%",  fontSize: 120 }, animClass: "animate-float-a" },
  { char: "K", style: { top: "55%", left: "2%",  fontSize: 80  }, animClass: "animate-float-b" },
  { char: "{}", style: { top: "20%", right: "4%", fontSize: 64  }, animClass: "animate-float-c" },
  { char: "/>", style: { bottom: "12%", left: "10%", fontSize: 56 }, animClass: "animate-float-a" },
  { char: "#",  style: { bottom: "20%", right: "8%", fontSize: 90  }, animClass: "animate-float-b" },
  { char: "✦",  style: { top: "42%", left: "40%", fontSize: 32  }, animClass: "animate-float-c" },
  { char: "⬡",  style: { top: "70%", right: "30%", fontSize: 48 }, animClass: "animate-float-a" },
]

/* ---------- Main Component ---------- */
export function Component() {
  const { login } = useAuth()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [name, setName]         = useState("")
  const [remember, setRemember] = useState(false)
  const [error, setError]       = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      if (mode === "register") {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Registration failed")
        login(data.token, data.user)
      } else {
        const data = await apiLogin(email, password)
        login(data.token, data.user)
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } }; message?: string })
          ?.response?.data?.error ??
        (err as { message?: string })?.message ??
        "Invalid email or password"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Keyframe styles injected once */}
      <style>{`
        @keyframes float-a {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-18px) rotate(3deg); }
          66%       { transform: translateY(8px) rotate(-2deg); }
        }
        @keyframes float-b {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-24px) rotate(-4deg); }
        }
        @keyframes float-c {
          0%, 100% { transform: translateY(0px) scale(1); }
          40%       { transform: translateY(-12px) scale(1.05); }
          80%       { transform: translateY(6px) scale(0.97); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-float-a { animation: float-a 7s ease-in-out infinite; }
        .animate-float-b { animation: float-b 9s ease-in-out infinite; }
        .animate-float-c { animation: float-c 6s ease-in-out infinite; }
        .slide-up { animation: slide-up 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .fade-in  { animation: fade-in 0.4s ease both; }
      `}</style>

      <div className="flex h-screen w-screen overflow-hidden bg-white">
        {/* ── Left panel ── */}
        <div
          className="relative hidden md:flex flex-col items-center justify-center overflow-hidden"
          style={{
            width: "45%",
            background: "linear-gradient(145deg, #1a00d9 0%, #2219f5 60%, #4b35ff 100%)",
          }}
        >
          {/* Animated character blobs */}
          {blobs.map((b, i) => <CharBlob key={i} {...b} />)}

          {/* Centered content */}
          <div className="relative z-10 flex flex-col items-center text-center px-10">
            {/* Logo */}
            <div
              className="flex items-center justify-center rounded-2xl font-black text-white mb-6"
              style={{
                width: 80, height: 80,
                background: "#fe6e06",
                fontSize: 40,
                boxShadow: "0 8px 32px rgba(254,110,6,0.45)",
              }}
            >
              S
            </div>

            <h1 className="text-white font-black text-4xl mb-2 tracking-tight">SkillSeeker</h1>
            <p className="text-white/60 text-xs uppercase tracking-widest mb-10">
              Challenge Hub
            </p>

            {/* Feature bullets */}
            {[
              { emoji: "🎯", text: "Pick challenges that match your skills" },
              { emoji: "⚡", text: "Earn points for every approved submission" },
              { emoji: "🏆", text: "Climb the leaderboard and earn badges" },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3 mb-4 w-full max-w-xs">
                <div
                  className="flex items-center justify-center shrink-0 rounded-full text-base"
                  style={{
                    width: 36, height: 36,
                    background: "rgba(255,255,255,0.12)",
                  }}
                >
                  {emoji}
                </div>
                <span className="text-white/80 text-sm text-left">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex items-center justify-center bg-white px-8">
          <div
            className={cn("w-full max-w-sm", mounted ? "slide-up" : "opacity-0")}
          >
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-black text-gray-900 mb-1">
                {mode === "login" ? "Welcome back" : "Create account"}
              </h2>
              <p className="text-sm text-gray-500">
                {mode === "login"
                  ? "Sign in to your account to continue"
                  : "Join your team's challenge platform"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={remember}
                      onCheckedChange={v => setRemember(v === true)}
                    />
                    <Label htmlFor="remember" className="font-normal text-gray-600 cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                </div>
              )}

              {error && (
                <div className="fade-in rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading}
                style={{ background: "#1a00d9" }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      style={{ animation: "spin 0.7s linear infinite" }}
                    />
                    {mode === "login" ? "Signing in…" : "Creating account…"}
                  </span>
                ) : mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>

            {/* Toggle */}
            <p className="mt-6 text-center text-sm text-gray-500">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError("") }}
                className="font-semibold text-[#1a00d9] hover:underline"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
