"use client";

import { useEffect, useState, use } from "react";
import { Loader2, CheckCircle, Video } from "lucide-react";

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<{ interviewAt: string; zoomUrl: string } | null>(null);
  const [alreadyBooked, setAlreadyBooked] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
  }, []);

  useEffect(() => {
    if (token === null) return;
    if (!token) { setError("This link is missing its access code."); setLoading(false); return; }

    fetch(`/api/schedule/${id}?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setName(data.name);
        setPosition(data.positionApplied);
        if (data.alreadyBooked) setAlreadyBooked(data.interviewAt);
        else setSlots(data.slots ?? []);
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  async function book() {
    if (!selected || !token) return;
    setBooking(true);
    setError(null);
    const res = await fetch(`/api/schedule/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, interview_at: selected }),
    });
    const data = await res.json();
    setBooking(false);
    if (data.error) { setError(data.error); return; }
    setBooked({ interviewAt: data.interviewAt, zoomUrl: data.zoomUrl });
  }

  const slotsByDay = slots.reduce<Record<string, string[]>>((acc, iso) => {
    const dayLabel = new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Dubai" });
    acc[dayLabel] = acc[dayLabel] ? [...acc[dayLabel], iso] : [iso];
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#FFFDF6" }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6" style={{ backgroundColor: "#232D3E" }}>
          <p className="text-white text-lg font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Baytify</p>
          <p className="text-xs tracking-widest uppercase" style={{ color: "#C2B08B" }}>Interview Scheduling</p>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : booked ? (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
              <p className="text-lg font-semibold text-gray-900 mb-1">You're booked!</p>
              <p className="text-sm text-gray-500 mb-4">
                {new Date(booked.interviewAt).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })} (Dubai time)
              </p>
              <a href={booked.zoomUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: "#232D3E" }}>
                <Video size={15} /> Zoom link
              </a>
              <p className="text-xs text-gray-400 mt-4">A confirmation email with these details has also been sent to you.</p>
            </div>
          ) : alreadyBooked ? (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
              <p className="text-lg font-semibold text-gray-900 mb-1">Already scheduled</p>
              <p className="text-sm text-gray-500">
                Your interview is booked for {new Date(alreadyBooked).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })} (Dubai time). Check your email for the Zoom link, or reply to that email if you need to change it.
              </p>
            </div>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-900 mb-1">Hi {name},</p>
              <p className="text-sm text-gray-500 mb-6">
                Pick a time that works for you{position ? ` for the ${position} interview` : ""}. All times shown are Dubai time.
              </p>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {Object.entries(slotsByDay).map(([day, times]) => (
                  <div key={day}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{day}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {times.map((iso) => (
                        <button
                          key={iso}
                          onClick={() => setSelected(iso)}
                          className="text-sm py-2 rounded-lg border transition-colors"
                          style={selected === iso
                            ? { backgroundColor: "#232D3E", color: "white", borderColor: "#232D3E" }
                            : { borderColor: "#e5e7eb", color: "#374151" }}
                        >
                          {new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" })}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

              <button
                disabled={!selected || booking}
                onClick={book}
                className="w-full mt-6 py-3 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "#232D3E" }}
              >
                {booking ? "Booking…" : "Confirm interview"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
