function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateInterviewIcs({
  uid,
  startIso,
  durationMinutes,
  candidateName,
  zoomUrl,
  organizerEmail,
}: {
  uid: string;
  startIso: string;
  durationMinutes: number;
  candidateName: string;
  zoomUrl: string;
  organizerEmail: string;
}): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const now = new Date();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Baytify HR Portal//Recruitment//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@baytify.com`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(`Baytify Interview — ${candidateName}`)}`,
    `DESCRIPTION:${escapeIcsText(`Video interview with ${candidateName}. Join: ${zoomUrl}`)}`,
    `LOCATION:${escapeIcsText(zoomUrl)}`,
    `ORGANIZER:mailto:${organizerEmail}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}
