import "./domPolyfill";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const SKIP_LINE_WORDS = ["curriculum vitae", "resume", "personal information", "profile", "contact", "address"];

// Whole-word blacklist: resume section headers, job-related terms, and common
// prepositions that occasionally form false-positive "names" out of section
// headings (e.g. "CORE SKILLS") or address lines (e.g. "CLACTON ON SEA ESSEX").
const NON_NAME_WORDS = new Set([
  "skills", "experience", "education", "profile", "summary", "objective", "employment",
  "qualifications", "references", "certifications", "languages", "interests", "achievements",
  "projects", "training", "career", "competencies", "expertise", "background", "statement",
  "core", "sales", "remote", "hobbies", "volunteering", "awards", "publications",
  "on", "in", "at", "of", "the", "and", "sea", "near",
]);

const NAME_TITLE_RE = /^(mr|mrs|ms|miss|mx|dr|prof)\.?\s+/i;

async function extractCvTextOnce(bytes: ArrayBuffer, contentType: string, filename: string): Promise<string | null> {
  const lower = filename.toLowerCase();
  if (contentType === "application/pdf" || lower.endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return result.value;
  }
  return null;
}

// PDF/DOCX parsing under a busy serverless function (e.g. a bulk upload of many
// files in one request) has occasionally returned empty/near-empty text without
// throwing — a single retry recovers most of these transient failures.
export async function extractCvText(bytes: ArrayBuffer, contentType: string, filename: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await extractCvTextOnce(bytes, contentType, filename);
      if (text && text.trim().length >= 20) return text;
      if (attempt === 2) return text ?? null;
      console.error(`CV text extraction returned too little text for ${filename} (attempt ${attempt}), retrying`);
    } catch (e) {
      console.error(`CV text extraction failed for ${filename} (attempt ${attempt}):`, e instanceof Error ? e.message : e);
      if (attempt === 2) return null;
    }
  }
  return null;
}

export function parseCvFields(text: string): { first_name?: string; last_name?: string; email?: string; phone?: string } {
  const emailMatch = text.match(EMAIL_RE);
  const phoneMatch = text.match(PHONE_RE);

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const isNameLine = (line: string) => {
    const lower = line.toLowerCase();
    if (SKIP_LINE_WORDS.some((w) => lower.includes(w))) return false;
    if (line.includes("@")) return false;
    if (/\d/.test(line)) return false;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 4) return false;
    if (words.some((w) => NON_NAME_WORDS.has(w.toLowerCase()))) return false;
    return words.every((w) => /^[A-Za-zÀ-ÿ'.-]+$/.test(w));
  };

  // CV name headers are very often styled in ALL CAPS — check the first ~20 lines for
  // that pattern before falling back to a generic mixed-case line, which is prone to
  // false positives from Title Case skill/section headings (e.g. "Time Management").
  let name: string | null = lines.slice(0, 20).find((l) => isNameLine(l) && l === l.toUpperCase() && l !== l.toLowerCase()) ?? null;
  if (!name) {
    name = lines.slice(0, 8).find(isNameLine) ?? null;
  }
  if (name) name = name.replace(NAME_TITLE_RE, "");

  let first_name: string | undefined;
  let last_name: string | undefined;
  if (name) {
    const parts = name.split(/\s+/);
    first_name = parts[0];
    last_name = parts.slice(1).join(" ");
  }

  return {
    first_name,
    last_name,
    email: emailMatch ? emailMatch[0] : undefined,
    phone: phoneMatch ? phoneMatch[0].replace(/\s+/g, " ").trim() : undefined,
  };
}
