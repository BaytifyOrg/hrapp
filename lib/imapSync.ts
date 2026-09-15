import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/candidateActivity";
import { sendCandidateAcknowledgmentEmail } from "@/lib/email";

type Admin = ReturnType<typeof createAdminClient>;

function isIndeedApplicationEmail(fromAddress: string, subject: string): boolean {
  return fromAddress.endsWith("@indeedemail.com") && /new application for/i.test(subject);
}

function parseIndeedApplication(parsed: ParsedMail): { name: string; position: string | null; cvLink: string | null } {
  const name = parsed.from?.value?.[0]?.name?.trim() || "Indeed Applicant";

  const subjectMatch = (parsed.subject ?? "").match(/new application for\s+(.+)$/i);
  const position = subjectMatch ? subjectMatch[1].trim() : null;

  const html = parsed.html || "";
  let cvLink: string | null = null;
  const vmlMatch = html.match(/href="([^"]+)"[^>]*title="link: View resume"/i);
  if (vmlMatch) {
    cvLink = vmlMatch[1];
  } else {
    const anchorMatches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,80}?)<\/a>/gi)];
    const cvAnchor = anchorMatches.find((m) => /view\s*cv|view\s*resume/i.test(m[2]));
    if (cvAnchor) cvLink = cvAnchor[1];
  }

  return { name, position, cvLink };
}

async function syncMailbox(
  client: ImapFlow,
  admin: Admin,
  mailbox: string,
  emailMap: Map<string, string>,
  backfillOnFirstRun: boolean
): Promise<{ processed: number; matched: number; indeedApplications: number; initialized: boolean }> {
  const lock = await client.getMailboxLock(mailbox);
  try {
    const status = await client.status(mailbox, { uidNext: true });
    const currentUidNext = status.uidNext!;

    const { data: state } = await admin.from("imap_sync_state").select("last_uid").eq("mailbox", mailbox).single();

    if (!state) {
      const baseline = backfillOnFirstRun ? 1 : currentUidNext;
      await admin.from("imap_sync_state").insert({ mailbox, last_uid: baseline });
      if (!backfillOnFirstRun) return { processed: 0, matched: 0, indeedApplications: 0, initialized: true };
    }

    const startUid = state?.last_uid ?? 1;
    if (currentUidNext <= startUid) {
      return { processed: 0, matched: 0, indeedApplications: 0, initialized: false };
    }

    let processed = 0;
    let matched = 0;
    let indeedApplications = 0;

    for await (const message of client.fetch(`${startUid}:${currentUidNext - 1}`, { source: true, uid: true }, { uid: true })) {
      processed++;
      if (!message.source) continue;
      const parsed: ParsedMail = await simpleParser(message.source);
      const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase();
      if (!fromAddress) continue;

      const existingCandidateId = emailMap.get(fromAddress);

      // New Indeed application from an address we haven't seen before -> auto-create the candidate.
      if (!existingCandidateId && isIndeedApplicationEmail(fromAddress, parsed.subject ?? "")) {
        const { name, position, cvLink } = parseIndeedApplication(parsed);
        const spaceIdx = name.indexOf(" ");
        const first_name = spaceIdx === -1 ? name : name.slice(0, spaceIdx);
        const last_name = spaceIdx === -1 ? "" : name.slice(spaceIdx + 1);

        const { data: created } = await admin.from("candidates").insert({
          first_name,
          last_name,
          email: fromAddress,
          position_applied: position,
          source: "Indeed",
          stage: "new",
          notes: cvLink ? `Applied via Indeed. View CV on Indeed: ${cvLink}` : "Applied via Indeed.",
          welcome_email_sent: true,
        }).select().single();

        if (created) {
          indeedApplications++;
          emailMap.set(fromAddress, created.id);
          await logActivity(admin, created.id, "note", {
            subject: "New Indeed application",
            body_snippet: `Auto-added from Indeed application for "${position ?? "unknown position"}"${mailbox === "Spam" ? " (recovered from Spam folder)" : ""}`,
          });
          try {
            await sendCandidateAcknowledgmentEmail({ to: fromAddress, name: first_name, positionApplied: position ?? undefined });
            await logActivity(admin, created.id, "email_sent", {
              subject: "Your Baytify application — next steps",
              body_snippet: `Acknowledgment email sent to ${fromAddress}`,
            });
          } catch {}
        }
        continue;
      }

      if (!existingCandidateId) continue;

      matched++;
      await logActivity(admin, existingCandidateId, "email_received", {
        subject: parsed.subject ?? "(no subject)",
        body_snippet: (parsed.text ?? "").slice(0, 500) + (mailbox === "Spam" ? " (found in Spam folder)" : ""),
        metadata: { from: fromAddress, date: parsed.date?.toISOString(), mailbox },
      });
    }

    await admin.from("imap_sync_state").upsert({ mailbox, last_uid: currentUidNext });

    return { processed, matched, indeedApplications, initialized: false };
  } finally {
    lock.release();
  }
}

export async function syncRecruitmentInbox(): Promise<{
  processed: number;
  matched: number;
  indeedApplications: number;
  initialized?: boolean;
  byMailbox: Record<string, { processed: number; matched: number; indeedApplications: number }>;
}> {
  const admin = createAdminClient();

  const client = new ImapFlow({
    host: process.env.RECRUITMENT_IMAP_HOST!,
    port: Number(process.env.RECRUITMENT_IMAP_PORT),
    secure: true,
    auth: {
      user: process.env.RECRUITMENT_EMAIL!,
      pass: process.env.RECRUITMENT_EMAIL_PASSWORD!,
    },
    logger: false,
  });

  await client.connect();

  try {
    const { data: candidates } = await admin.from("candidates").select("id, email");
    const emailMap = new Map((candidates ?? []).filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.id]));

    // INBOX starts fresh from "now" on first run (avoid backfilling years of handled mail).
    // Spam has never been checked before, so we backfill it fully once to recover anything
    // the mail server's spam filter has been silently swallowing.
    const inboxResult = await syncMailbox(client, admin, "INBOX", emailMap, false);
    const spamResult = await syncMailbox(client, admin, "Spam", emailMap, true);

    return {
      processed: inboxResult.processed + spamResult.processed,
      matched: inboxResult.matched + spamResult.matched,
      indeedApplications: inboxResult.indeedApplications + spamResult.indeedApplications,
      initialized: inboxResult.initialized || spamResult.initialized,
      byMailbox: { INBOX: inboxResult, Spam: spamResult },
    };
  } finally {
    await client.logout();
  }
}
