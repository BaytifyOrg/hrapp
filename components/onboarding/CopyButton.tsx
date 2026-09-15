"use client";

export default function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="btn-secondary text-xs py-1.5 px-3"
    >
      Copy
    </button>
  );
}
