import { Resend } from "resend";
import { generateInterviewIcs } from "@/lib/ics";

export async function sendOnboardingNotification({
  name,
  email,
  phone,
}: {
  name: string;
  email: string;
  phone?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "emma@baytify.com";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap');</style></head>
<body style="margin:0;padding:0;background:#FFFDF6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e6e0;">
          <tr>
            <td style="background:#232D3E;padding:32px 40px;">
              <p style="margin:0;font-size:24px;font-weight:600;color:#ffffff;font-family:'Playfair Display',Georgia,'Times New Roman',serif;">Baytify</p>
              <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#C2B08B;">HR Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">New starter form received</p>
              <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
                <strong>${name}</strong> has just completed their onboarding form and is ready for review.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;border-radius:10px;border:1px solid #e8e6e0;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C2B08B;">Starter details</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#9ca3af;width:80px;">Name</td>
                        <td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${name}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#9ca3af;">Email</td>
                        <td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${email}</td>
                      </tr>
                      ${phone ? `<tr>
                        <td style="padding:4px 0;font-size:13px;color:#9ca3af;">Phone</td>
                        <td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${phone}</td>
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#232D3E;border-radius:8px;">
                    <a href="${APP_URL}/onboarding" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Review submission →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#9ca3af;">You can approve and convert them to an employee from the Onboarding section.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e8e6e0;">
              <p style="margin:0;font-size:12px;color:#C2B08B;">Baytify · Global Local Real Estate</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from: FROM,
    to: NOTIFY_EMAIL,
    subject: `New starter form: ${name}`,
    html,
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetLink,
}: {
  to: string;
  name?: string;
  resetLink: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const greeting = name ? `Hi ${name},` : "Hi,";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap');</style></head>
<body style="margin:0;padding:0;background:#FFFDF6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e6e0;">
          <tr>
            <td style="background:#232D3E;padding:32px 40px;">
              <p style="margin:0;font-size:24px;font-weight:600;color:#ffffff;font-family:'Playfair Display',Georgia,'Times New Roman',serif;">Baytify</p>
              <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#C2B08B;">HR Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
                Your Baytify HR Portal account has been set up. Click the button below to choose your password and log in.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#232D3E;border-radius:8px;">
                    <a href="${resetLink}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Set my password →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                This link expires in 24 hours. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e8e6e0;">
              <p style="margin:0;font-size:12px;color:#C2B08B;">Baytify · Global Local Real Estate</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: "Set your Baytify HR Portal password",
    html,
  });
}

export async function sendWelcomeEmail({
  to,
  password,
  name,
}: {
  to: string;
  password: string;
  name?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const greeting = name ? `Hi ${name},` : "Welcome,";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#FFFDF6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e6e0;">

          <!-- Header -->
          <tr>
            <td style="background:#232D3E;padding:32px 40px;">
              <p style="margin:0;font-size:24px;font-weight:600;color:#ffffff;font-family:'Playfair Display',Georgia,'Times New Roman',serif;letter-spacing:0.5px;">Baytify</p>
              <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#C2B08B;">HR Portal</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
                Your Baytify HR Portal account is ready. You can log in to view your payslips, submit leave requests and manage your profile.
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;border-radius:10px;border:1px solid #e8e6e0;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C2B08B;">Your login details</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#9ca3af;width:90px;">Email</td>
                        <td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${to}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#9ca3af;">Password</td>
                        <td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${password}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#232D3E;border-radius:8px;">
                    <a href="${APP_URL}/login" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Log in to HR Portal →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                We recommend changing your password after your first login. If you have any trouble, reply to this email or contact your HR team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e8e6e0;">
              <p style="margin:0;font-size:12px;color:#C2B08B;">Baytify · Global Local Real Estate</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return resend.emails.send({
    from: FROM,
    to,
    subject: "Your Baytify HR Portal login details",
    html,
  });
}

export async function sendTaskAssignedEmail({
  to,
  name,
  taskTitle,
  taskDescription,
  dueDate,
  assignedBy,
}: {
  to: string;
  name?: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate?: string;
  assignedBy?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const greeting = name ? `Hi ${name},` : "Hi,";
  const dueLine = dueDate
    ? `<tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;width:100px;">Due date</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${new Date(dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td></tr>`
    : "";
  const assignedLine = assignedBy
    ? `<tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Assigned by</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${assignedBy}</td></tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap');</style></head>
<body style="margin:0;padding:0;background:#FFFDF6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e6e0;">
          <tr>
            <td style="background:#232D3E;padding:32px 40px;">
              <p style="margin:0;font-size:24px;font-weight:600;color:#ffffff;font-family:'Playfair Display',Georgia,'Times New Roman',serif;">Baytify</p>
              <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#C2B08B;">HR Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
                You have been assigned a new task in the Baytify HR Portal.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;border-radius:10px;border:1px solid #e8e6e0;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C2B08B;">Task details</p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#9ca3af;width:100px;">Task</td>
                        <td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${taskTitle}</td>
                      </tr>
                      ${taskDescription ? `<tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;vertical-align:top;">Description</td><td style="padding:4px 0;font-size:13px;color:#232D3E;line-height:1.5;">${taskDescription}</td></tr>` : ""}
                      ${dueLine}
                      ${assignedLine}
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#232D3E;border-radius:8px;">
                    <a href="${APP_URL}/tasks" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      View task →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">Log in to the HR Portal to update your progress and leave notes.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e8e6e0;">
              <p style="margin:0;font-size:12px;color:#C2B08B;">Baytify · Global Local Real Estate</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `New task assigned: ${taskTitle}`,
    html,
  });
}

const emailHeader = `
  <tr>
    <td style="background:#232D3E;padding:32px 40px;">
      <p style="margin:0;font-size:24px;font-weight:600;color:#ffffff;font-family:'Playfair Display',Georgia,'Times New Roman',serif;">Baytify</p>
      <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#C2B08B;">HR Portal</p>
    </td>
  </tr>`;

const emailFooter = `
  <tr>
    <td style="padding:20px 40px;border-top:1px solid #e8e6e0;">
      <p style="margin:0;font-size:12px;color:#C2B08B;">Baytify · Global Local Real Estate</p>
    </td>
  </tr>`;

function emailWrapper(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap');</style></head>
<body style="margin:0;padding:0;background:#FFFDF6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e6e0;">
        ${emailHeader}
        ${content}
        ${emailFooter}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailButton(href: string, label: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr><td style="background:#232D3E;border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
    </td></tr>
  </table>`;
}

export async function sendLeaveRequestEmail({
  employeeName,
  leaveType,
  startDate,
  endDate,
  days,
  reason,
  notifyEmail,
}: {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  notifyEmail?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const NOTIFY_EMAIL = notifyEmail || process.env.NOTIFY_EMAIL || "emma@baytify.com";

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const html = emailWrapper(`
    <tr><td style="padding:40px;">
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">New leave request</p>
      <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
        <strong>${employeeName}</strong> has submitted a leave request that needs your review.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;border-radius:10px;border:1px solid #e8e6e0;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C2B08B;">Request details</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;width:100px;">Employee</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${employeeName}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Type</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${leaveType}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">From</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${fmt(startDate)}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">To</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${fmt(endDate)}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Days</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${days} working day${days !== 1 ? "s" : ""}</td></tr>
            ${reason ? `<tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;vertical-align:top;">Reason</td><td style="padding:4px 0;font-size:13px;color:#232D3E;">${reason}</td></tr>` : ""}
          </table>
        </td></tr>
      </table>
      ${emailButton(`${APP_URL}/leave`, "Review request →")}
    </td></tr>`);

  return resend.emails.send({ from: FROM, to: NOTIFY_EMAIL, subject: `Leave request: ${employeeName}`, html });
}

export async function sendLeaveDecisionEmail({
  to,
  name,
  status,
  leaveType,
  startDate,
  endDate,
  days,
  reviewNote,
}: {
  to: string;
  name?: string;
  status: "approved" | "rejected";
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reviewNote?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const approved = status === "approved";
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const html = emailWrapper(`
    <tr><td style="padding:40px;">
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">Hi ${name ?? "there"},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
        Your leave request has been <strong style="color:${approved ? "#16a34a" : "#dc2626"}">${status}</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;border-radius:10px;border:1px solid #e8e6e0;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C2B08B;">Leave details</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;width:100px;">Type</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${leaveType}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">From</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${fmt(startDate)}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">To</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${fmt(endDate)}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Days</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${days} working day${days !== 1 ? "s" : ""}</td></tr>
            ${reviewNote ? `<tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;vertical-align:top;">Note</td><td style="padding:4px 0;font-size:13px;color:#232D3E;">${reviewNote}</td></tr>` : ""}
          </table>
        </td></tr>
      </table>
      ${emailButton(`${APP_URL}/leave`, "View my leave →")}
    </td></tr>`);

  return resend.emails.send({ from: FROM, to, subject: `Your leave request has been ${status}`, html });
}

export async function sendTaskNoteEmail({
  to,
  name,
  taskTitle,
  noteContent,
  authorName,
}: {
  to: string;
  name?: string;
  taskTitle: string;
  noteContent: string;
  authorName: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const html = emailWrapper(`
    <tr><td style="padding:40px;">
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">Hi ${name ?? "there"},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
        <strong>${authorName}</strong> left a note on the task <strong>${taskTitle}</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;border-radius:10px;border:1px solid #e8e6e0;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C2B08B;">${authorName} wrote</p>
          <p style="margin:0;font-size:14px;color:#232D3E;line-height:1.6;">${noteContent}</p>
        </td></tr>
      </table>
      ${emailButton(`${APP_URL}/tasks`, "Reply in HR Portal →")}
    </td></tr>`);

  return resend.emails.send({ from: FROM, to, subject: `New note on task: ${taskTitle}`, html });
}

export async function sendDealPaidEmail({
  to,
  name,
  propertyAddress,
  dealValue,
  agentCommission,
  splitRate,
  payPeriod,
}: {
  to: string;
  name?: string;
  propertyAddress: string;
  dealValue: number;
  agentCommission: number;
  splitRate: number;
  payPeriod?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const fmt = (n: number) => `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const html = emailWrapper(`
    <tr><td style="padding:40px;">
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">Hi ${name ?? "there"},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
        Great news — your commission for the following deal has been approved and marked as paid.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;border-radius:10px;border:1px solid #e8e6e0;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C2B08B;">Deal summary</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;width:130px;">Property</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${propertyAddress}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Deal value</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${fmt(dealValue)}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Your split</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${splitRate}%</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Your commission</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#16a34a;font-size:15px;">${fmt(agentCommission)}</td></tr>
            ${payPeriod ? `<tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Pay period</td><td style="padding:4px 0;font-size:13px;color:#232D3E;">${payPeriod}</td></tr>` : ""}
          </table>
        </td></tr>
      </table>
      ${emailButton(`${APP_URL}/commissions`, "View my commissions →")}
    </td></tr>`);

  return resend.emails.send({ from: FROM, to, subject: `Commission paid: ${propertyAddress}`, html });
}

const SIGNATURE_IMAGE_URL = "https://pknfmxterwvpctexjdkr.supabase.co/storage/v1/object/public/email-assets/signatures/emma-baytify-signature.png";

export async function sendInterviewInviteEmail({
  to,
  name,
  positionApplied,
  interviewAt,
  zoomUrl,
}: {
  to: string;
  name?: string;
  positionApplied?: string;
  interviewAt: string; // ISO 8601
  zoomUrl: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL_CANDIDATE || "Emma <emma@baytify.com>";
  const roleClause = positionApplied ? ` for the ${positionApplied} position` : "";

  const dt = new Date(interviewAt);
  const dateLabel = dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dubai" });
  const timeLabel = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:15px;color:#232D3E;line-height:1.7;">
          <p style="margin:0 0 16px;">Hi ${name ?? "there"},</p>

          <p style="margin:0 0 16px;">Great speaking with you — I'd like to invite you to a video interview${roleClause} at Baytify Real Estate.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;border-radius:10px;margin:0 0 20px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Interview details</p>
              <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#232D3E;">${dateLabel}</p>
              <p style="margin:0;font-size:15px;color:#232D3E;">${timeLabel} (Dubai time)</p>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#232D3E;border-radius:8px;">
              <a href="${zoomUrl}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Join Zoom meeting →</a>
            </td></tr>
          </table>

          <p style="margin:0 0 24px;">Please let me know if this time doesn't work and we'll find another slot. Looking forward to speaking further.</p>

          <p style="margin:0 0 4px;">Best regards,</p>
          <p style="margin:0 0 20px;">Emma</p>

          <img src="${SIGNATURE_IMAGE_URL}" alt="Baytify Real Estate — Emma Louise K" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return resend.emails.send({ from: FROM, to, subject: "Your Baytify interview — Zoom details", html });
}

export async function sendInterviewScheduledNotification({
  candidateName,
  interviewAt,
  durationMinutes,
  zoomUrl,
  meetingId,
  selfBooked,
}: {
  candidateName: string;
  interviewAt: string;
  durationMinutes: number;
  zoomUrl: string;
  meetingId: string;
  selfBooked: boolean;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "emma@baytify.com";
  const dt = new Date(interviewAt);
  const label = dt.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });

  const html = emailWrapper(`
    <tr><td style="padding:40px;">
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">Interview scheduled</p>
      <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
        ${selfBooked ? `<strong>${candidateName}</strong> has picked their own interview slot` : `An interview with <strong>${candidateName}</strong> has been scheduled`}: <strong>${label} (Dubai time)</strong>. Open the attached invite to add it to your calendar.
      </p>
      ${emailButton(zoomUrl, "Join Zoom meeting →")}
    </td></tr>`);

  const ics = generateInterviewIcs({
    uid: meetingId,
    startIso: interviewAt,
    durationMinutes,
    candidateName,
    zoomUrl,
    organizerEmail: NOTIFY_EMAIL,
  });

  return resend.emails.send({
    from: FROM,
    to: NOTIFY_EMAIL,
    subject: `Interview booked: ${candidateName}`,
    html,
    attachments: [{ filename: "interview.ics", content: ics, contentType: "text/calendar; method=PUBLISH" }],
  });
}

function textToHtmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 16px;">${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function sendCustomCandidateEmail({
  to,
  subject,
  bodyText,
}: {
  to: string;
  subject: string;
  bodyText: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL_CANDIDATE || "Emma <recruitment@baytify.com>";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:15px;color:#232D3E;line-height:1.7;">
          ${textToHtmlParagraphs(bodyText)}
          <img src="${SIGNATURE_IMAGE_URL}" alt="Baytify Real Estate — Emma Louise K" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;margin-top:8px;" />
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendRejectionEmail({
  to,
  name,
  positionApplied,
}: {
  to: string;
  name?: string;
  positionApplied?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL_CANDIDATE || "Emma <recruitment@baytify.com>";
  const roleClause = positionApplied ? ` for the ${positionApplied} position` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:15px;color:#232D3E;line-height:1.7;">
          <p style="margin:0 0 16px;">Hi ${name ?? "there"},</p>
          <p style="margin:0 0 16px;">Thank you for taking the time to apply${roleClause} and for speaking with us about the role. After careful consideration, we've decided not to move forward with your application on this occasion.</p>
          <p style="margin:0 0 16px;">This isn't a reflection of your abilities — we simply had a limited number of positions and a strong pool of candidates. We'll keep your details on file and would be glad to reach out if a suitable opportunity comes up in future.</p>
          <p style="margin:0 0 24px;">Thank you again for your interest in Baytify, and we wish you all the best in your search.</p>
          <p style="margin:0 0 4px;">Best regards,</p>
          <p style="margin:0 0 20px;">Emma</p>
          <img src="${SIGNATURE_IMAGE_URL}" alt="Baytify Real Estate — Emma Louise K" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return resend.emails.send({ from: FROM, to, subject: "Your Baytify application", html });
}

export async function sendSchedulingLinkEmail({
  to,
  name,
  positionApplied,
  schedulingUrl,
}: {
  to: string;
  name?: string;
  positionApplied?: string;
  schedulingUrl: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL_CANDIDATE || "Emma <recruitment@baytify.com>";
  const roleClause = positionApplied ? ` for the ${positionApplied} position` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:15px;color:#232D3E;line-height:1.7;">
          <p style="margin:0 0 16px;">Hi ${name ?? "there"},</p>
          <p style="margin:0 0 16px;">Great speaking with you — I'd like to get a video interview${roleClause} booked in. Please pick a time that works for you using the link below.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#232D3E;border-radius:8px;">
              <a href="${schedulingUrl}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Choose your interview time →</a>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;">Once you've picked a slot, you'll receive a confirmation email with the Zoom link.</p>
          <p style="margin:0 0 4px;">Best regards,</p>
          <p style="margin:0 0 20px;">Emma</p>
          <img src="${SIGNATURE_IMAGE_URL}" alt="Baytify Real Estate — Emma Louise K" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return resend.emails.send({ from: FROM, to, subject: "Pick a time for your Baytify interview", html });
}

export async function sendCandidateAcknowledgmentEmail({
  to,
  name,
  positionApplied,
}: {
  to: string;
  name?: string;
  positionApplied?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL_CANDIDATE || "Emma <emma@baytify.com>";
  const roleClause = positionApplied ? ` for the <strong>${positionApplied}</strong> position` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:15px;color:#232D3E;line-height:1.7;">
          <p style="margin:0 0 16px;">Hi ${name ?? "there"},</p>

          <p style="margin:0 0 16px;">Thank you for your interest in joining Baytify Real Estate. Before we move forward with your application${roleClause}, we'd like you to review a few important details and answer some quick questions.</p>

          <p style="margin:0 0 8px;font-weight:600;">About the role</p>
          <p style="margin:0 0 16px;">This is a commission-only position — there is no base salary. Your income is generated entirely through property sales/rentals, so this role suits candidates who are self-motivated, resilient, and comfortable with a performance-based income structure. We'd like to confirm you're comfortable with this before proceeding.</p>

          <p style="margin:0 0 16px;">As this role is based in Dubai, relocating also comes with upfront costs (housing deposit, initial living expenses, etc.), so we ask that candidates have a minimum of £10,000 (GBP) available to cover their first few months while building their pipeline.</p>

          <p style="margin:0 0 8px;">Please reply with the following information:</p>
          <ul style="margin:0 0 16px;padding-left:20px;">
            <li style="margin-bottom:6px;">Full legal name (as on passport):</li>
            <li style="margin-bottom:6px;">Date of birth:</li>
            <li style="margin-bottom:6px;">Nationality:</li>
            <li style="margin-bottom:6px;">Do you have access to a minimum of £10,000 to support your relocation and initial settling-in period?</li>
            <li style="margin-bottom:6px;">Do you hold a valid driving license?</li>
            <li style="margin-bottom:6px;">Do you confirm you understand this is a commission-only role with no fixed salary?</li>
            <li style="margin-bottom:6px;">Earliest available start date:</li>
          </ul>

          <p style="margin:0 0 16px;">Once we receive your responses, our team will review and follow up with next steps, which may include a short interview.</p>

          <p style="margin:0 0 24px;">Looking forward to hearing from you.</p>

          <p style="margin:0 0 4px;">Best regards,</p>
          <p style="margin:0 0 20px;">Emma</p>

          <img src="${SIGNATURE_IMAGE_URL}" alt="Baytify Real Estate — Emma Louise K" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return resend.emails.send({ from: FROM, to, subject: "Your Baytify application — next steps", html });
}

export async function sendOfferLetterEmail({
  to,
  name,
  positionApplied,
  offerUrl,
}: {
  to: string;
  name?: string;
  positionApplied?: string;
  offerUrl: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL_CANDIDATE || "Emma <recruitment@baytify.com>";
  const roleClause = positionApplied ? ` for the ${positionApplied} position` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:15px;color:#232D3E;line-height:1.7;">
          <p style="margin:0 0 16px;">Hi ${name ?? "there"},</p>
          <p style="margin:0 0 16px;">Congratulations — we'd like to offer you the role${roleClause} at Baytify Real Estate. Please review the details below and sign to accept.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#232D3E;border-radius:8px;">
              <a href="${offerUrl}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Review & sign offer letter →</a>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;">If you have any questions about the offer, just reply to this email.</p>
          <p style="margin:0 0 4px;">Best regards,</p>
          <p style="margin:0 0 20px;">Emma</p>
          <img src="${SIGNATURE_IMAGE_URL}" alt="Baytify Real Estate — Emma Louise K" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return resend.emails.send({ from: FROM, to, subject: "Your Baytify offer letter", html });
}

export async function sendOfferSignedNotification({
  candidateName,
  positionApplied,
  pdfBuffer,
  pdfFilename,
}: {
  candidateName: string;
  positionApplied?: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "emma@baytify.com";
  const roleClause = positionApplied ? ` (${positionApplied})` : "";

  const html = emailWrapper(`
    <tr><td style="padding:40px;">
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">Offer letter signed</p>
      <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
        <strong>${candidateName}</strong>${roleClause} has signed their offer letter. The signed copy is attached.
      </p>
    </td></tr>`);

  return resend.emails.send({
    from: FROM,
    to: NOTIFY_EMAIL,
    subject: `Offer letter signed: ${candidateName}`,
    html,
    attachments: [{ filename: pdfFilename, content: pdfBuffer, contentType: "application/pdf" }],
  });
}

export async function sendOnboardingLinkEmail({
  to,
  name,
  onboardingUrl,
}: {
  to: string;
  name: string;
  onboardingUrl: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";

  const html = emailWrapper(`
    <tr><td style="padding:40px;">
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">Welcome to Baytify, ${name}!</p>
      <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
        Thanks for signing your document. The last step is completing your personal details so we can get you
        set up — it only takes a few minutes.
      </p>
      ${emailButton(onboardingUrl, "Complete my details →")}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">If you have any questions, just reply to this email.</p>
    </td></tr>`);

  return resend.emails.send({ from: FROM, to, subject: "Welcome to Baytify — complete your details", html });
}

export async function sendPandaDocSignedNotification({
  employeeName,
  documentName,
  pdfBuffer,
  pdfFilename,
}: {
  employeeName: string;
  documentName: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "emma@baytify.com";

  const html = emailWrapper(`
    <tr><td style="padding:40px;">
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">Document signed</p>
      <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
        <strong>${employeeName}</strong> has signed "${documentName}". The signed copy is attached.
      </p>
    </td></tr>`);

  return resend.emails.send({
    from: FROM,
    to: NOTIFY_EMAIL,
    subject: `Document signed: ${documentName}`,
    html,
    attachments: [{ filename: pdfFilename, content: pdfBuffer, contentType: "application/pdf" }],
  });
}

export async function sendPayslipReadyEmail({
  to,
  name,
  month,
  year,
  grossPay,
  netPay,
}: {
  to: string;
  name?: string;
  month: number;
  year: number;
  grossPay: number;
  netPay: number;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL || "HR Portal <hr@baytify.com>";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const monthName = new Date(year, month - 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const fmt = (n: number) => `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const html = emailWrapper(`
    <tr><td style="padding:40px;">
      <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#232D3E;">Hi ${name ?? "there"},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#606e84;line-height:1.6;">
        Your payslip for <strong>${monthName}</strong> is now available in the HR Portal.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF6;border-radius:10px;border:1px solid #e8e6e0;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#C2B08B;">Pay summary</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;width:120px;">Period</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${monthName}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Gross pay</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#232D3E;">${fmt(grossPay)}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#9ca3af;">Net pay</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#16a34a;font-size:15px;">${fmt(netPay)}</td></tr>
          </table>
        </td></tr>
      </table>
      ${emailButton(`${APP_URL}/commissions/payslip`, "View my payslip →")}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">Log in to the HR Portal to view your full payslip breakdown.</p>
    </td></tr>`);

  return resend.emails.send({ from: FROM, to, subject: `Your ${monthName} payslip is ready`, html });
}
