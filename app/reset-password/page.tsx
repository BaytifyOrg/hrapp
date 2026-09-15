"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

function ResetForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"verifying" | "ready" | "error">("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verify() {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (tokenHash && type === "recovery") {
        // Verify the token from the email link
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (error) {
          setStatus("error");
        } else {
          setStatus("ready");
        }
      } else {
        // No token in URL — check if there's already a recovery session (came via callback)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus("ready");
        } else {
          setStatus("error");
        }
      }
    }
    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
  }

  if (status === "verifying") {
    return <p className="text-gray-400 text-sm text-center">Verifying your link…</p>;
  }

  if (status === "error") {
    return (
      <div className="card text-center">
        <p className="text-gray-700 font-medium mb-2">Link expired or already used</p>
        <p className="text-sm text-gray-500 mb-4">
          Password reset links expire after 1 hour. Please ask your admin to send a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-1" style={{ color: "#232D3E" }}>Set your password</h2>
      <p className="text-sm text-gray-500 mb-6">Choose a password to secure your account.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input w-full"
            placeholder="Min. 8 characters"
            required
          />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="input w-full"
            placeholder="Repeat your password"
            required
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Saving…" : "Set password & log in"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFFDF6" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#232D3E" }}>
            Baytify
          </h1>
          <p className="text-xs tracking-widest uppercase mt-1" style={{ color: "#C2B08B" }}>HR Portal</p>
        </div>
        <Suspense fallback={<p className="text-center text-gray-400 text-sm">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
