import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

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

export function Component() {
  const [error, setError]       = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleMicrosoftLogin = async () => {
    setError("")
    setIsLoading(true)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: window.location.origin,
          scopes: 'email profile openid',
        },
      })
      if (oauthError) throw oauthError
      // Page will redirect — no further action needed here
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Sign-in failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <>
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
        .ms-btn {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          width: 100%; padding: 13px 20px;
          background: #fff; border: 1.5px solid #d1d5db; border-radius: 10px;
          font-size: 15px; font-weight: 600; color: #111827;
          cursor: pointer; transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
          font-family: 'Hanken Grotesk', sans-serif;
        }
        .ms-btn:hover:not(:disabled) {
          background: #f9fafb; border-color: #9ca3af;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .ms-btn:active:not(:disabled) { transform: scale(0.98); }
        .ms-btn:disabled { opacity: 0.6; cursor: not-allowed; }
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
          {blobs.map((b, i) => <CharBlob key={i} {...b} />)}

          <div className="relative z-10 flex flex-col items-center text-center px-10">
            <div
              className="flex items-center justify-center rounded-2xl font-black text-white mb-6"
              style={{ width: 80, height: 80, background: "#fe6e06", fontSize: 40, boxShadow: "0 8px 32px rgba(254,110,6,0.45)" }}
            >
              S
            </div>

            <h1 className="text-white font-black text-4xl mb-2 tracking-tight">SkillSeeker</h1>
            <p className="text-white/60 text-xs uppercase tracking-widest mb-10">Challenge Hub</p>

            {[
              { emoji: "🎯", text: "Pick challenges that match your skills" },
              { emoji: "⚡", text: "Earn points for every approved submission" },
              { emoji: "🏆", text: "Climb the leaderboard and earn badges" },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3 mb-4 w-full max-w-xs">
                <div className="flex items-center justify-center shrink-0 rounded-full text-base"
                  style={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)" }}
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
          <div className={cn("w-full max-w-sm", mounted ? "slide-up" : "opacity-0")}>
            <div className="mb-8">
              <h2 className="text-3xl font-black text-gray-900 mb-1">Welcome</h2>
              <p className="text-sm text-gray-500">Sign in with your Microsoft work account to continue</p>
            </div>

            <button
              className="ms-btn"
              onClick={handleMicrosoftLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <span
                  className="inline-block w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full"
                  style={{ animation: "spin 0.7s linear infinite" }}
                />
              ) : (
                /* Microsoft logo SVG */
                <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
              )}
              {isLoading ? "Redirecting…" : "Sign in with Microsoft"}
            </button>

            {error && (
              <div className="fade-in mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <p className="mt-8 text-center text-xs text-gray-400">
              Access is restricted to your organisation's Microsoft accounts.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
