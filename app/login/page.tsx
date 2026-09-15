"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#FFFDF6" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ backgroundColor: "#232D3E" }}>
        <div>
          <h1 className="text-white text-3xl font-semibold tracking-wide" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Baytify
          </h1>
          <p className="text-white/40 text-sm mt-1 tracking-widest uppercase">HR Portal</p>
        </div>
        <div>
          <blockquote className="text-white/80 text-xl leading-relaxed" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            &ldquo;To build stronger relationships globally through expert application of local genius.&rdquo;
          </blockquote>
          <p className="text-white/40 text-sm mt-4">Global Local Real Estate.</p>
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#C2B08B" }} />
          <div className="w-2 h-2 rounded-full bg-white/20" />
          <div className="w-2 h-2 rounded-full bg-white/20" />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#232D3E" }}>
              Baytify
            </h1>
            <p className="text-xs tracking-widest uppercase mt-1" style={{ color: "#C2B08B" }}>HR Portal</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold" style={{ color: "#232D3E" }}>Welcome back</h2>
            <p className="text-sm mt-1" style={{ color: "#606e84" }}>Sign in to your HR account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@baytify.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full justify-center py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#232D3E" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs mt-8" style={{ color: "#C2B08B" }}>
            Baytify · Global Local Real Estate
          </p>
        </div>
      </div>
    </div>
  );
}
