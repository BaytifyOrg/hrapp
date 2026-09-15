"use client";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary flex items-center gap-2"
    >
      <Printer size={16} /> Print / Save as PDF
    </button>
  );
}
