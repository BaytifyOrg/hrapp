"use client";

import { useEffect, useRef, useState, use } from "react";
import { Loader2, CheckCircle, PenLine, RotateCcw } from "lucide-react";
import type SignaturePad from "signature_pad";

export default function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);

  const padRef = useRef<HTMLCanvasElement>(null);
  const sigPad = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setToken(p.get("token"));
  }, []);

  useEffect(() => {
    if (token === null) return;
    if (!token) { setError("This link is missing its access code."); setLoading(false); return; }

    fetch(`/api/offer/${id}?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setName(data.name);
        setSigned(!!data.signed);
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(() => {
    if (!loading && !error && !signed && !done && padRef.current) {
      import("signature_pad").then(({ default: SignaturePadClass }) => {
        if (padRef.current) sigPad.current = new SignaturePadClass(padRef.current, { backgroundColor: "rgb(255,255,255)" });
      });
    }
  }, [loading, error, signed, done]);

  async function sign() {
    if (!sigPad.current || sigPad.current.isEmpty()) {
      setError("Please sign before continuing.");
      return;
    }
    setSigning(true);
    setError(null);
    const res = await fetch(`/api/offer/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, signature: sigPad.current.toDataURL("image/png") }),
    });
    const data = await res.json();
    setSigning(false);
    if (data.error) { setError(data.error); return; }
    setDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#FFFDF6" }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6" style={{ backgroundColor: "#232D3E" }}>
          <p className="text-white text-lg font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Baytify</p>
          <p className="text-xs tracking-widest uppercase" style={{ color: "#C2B08B" }}>Offer Letter</p>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
          ) : error && !name ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : done || signed ? (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
              <p className="text-lg font-semibold text-gray-900 mb-1">Offer signed!</p>
              <p className="text-sm text-gray-500 mb-5">
                Thank you, {name} — your signed offer letter has been sent to Baytify. We'll be in touch with next steps.
              </p>
              <iframe
                src={`/api/offer/${id}/pdf?token=${encodeURIComponent(token ?? "")}`}
                className="w-full border border-gray-100 rounded-lg"
                style={{ height: "60vh" }}
                title="Signed offer letter"
              />
            </div>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-900 mb-1">Hi {name},</p>
              <p className="text-sm text-gray-500 mb-4">Please review the offer letter below, then sign at the bottom to accept.</p>

              <iframe
                src={`/api/offer/${id}/pdf?token=${encodeURIComponent(token ?? "")}`}
                className="w-full border border-gray-200 rounded-lg mb-5"
                style={{ height: "55vh" }}
                title="Offer letter"
              />

              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5"><PenLine size={12} /> Sign below to accept this offer</p>
              <canvas
                ref={padRef}
                width={640}
                height={140}
                className="border-2 border-dashed border-gray-200 rounded-xl w-full touch-none"
              />
              <div className="flex gap-3 justify-center mt-3">
                <button className="text-xs text-gray-500 underline flex items-center gap-1" onClick={() => sigPad.current?.clear()}>
                  <RotateCcw size={12} /> Clear
                </button>
              </div>

              {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

              <button
                disabled={signing}
                onClick={sign}
                className="w-full mt-4 py-3 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "#232D3E" }}
              >
                {signing ? "Signing…" : "Sign & accept offer"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
