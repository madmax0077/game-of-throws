/**
 * Lightweight email sender that talks to Resend's HTTP API directly.
 *
 * No extra npm dependency: a plain `fetch` call against
 * https://api.resend.com/emails. Set RESEND_API_KEY (and optionally
 * EMAIL_FROM) in your Vercel project settings to enable real emails.
 *
 * If RESEND_API_KEY is missing the helper just logs the email it WOULD
 * have sent and returns `{ ok: false, skipped: true }` — that way local
 * development and forgotten-env-var deploys don't crash; you just don't
 * get the email.
 */

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type SendResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  id?: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Game of Throws <onboarding@resend.dev>";

function getFromAddress(): string {
  return (process.env.EMAIL_FROM || DEFAULT_FROM).trim();
}

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY is not set — skipping send. To: ${args.to}, Subject: ${args.subject}`
    );
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: getFromAddress(),
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend returned ${res.status}: ${body}`);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Compose + send the "new tournament awaiting approval" email to the
 * configured admin. Safe to call fire-and-forget.
 */
export async function sendTournamentSubmittedEmail(args: {
  to: string;
  tournament: {
    id: string;
    name: string;
    city: string;
    overs: number;
    startDate: Date;
    endDate: Date;
  };
  organizer: { name: string; email: string };
  approveUrl: string;
  dashboardUrl: string;
}): Promise<SendResult> {
  const { tournament, organizer, approveUrl, dashboardUrl, to } = args;

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

  const subject = `[Game of Throws] New tournament awaiting approval — ${tournament.name}`;
  const html = `<!doctype html>
<html lang="en">
  <body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:linear-gradient(135deg,#b91c1c,#7f1d1d);padding:24px;color:#ffffff;">
        <p style="margin:0 0 6px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Game of Throws · Admin</p>
        <h1 style="margin:0;font-size:22px;font-weight:800;">New tournament awaiting approval</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 12px 0;font-size:15px;line-height:1.55;">
          <b>${escapeHtml(organizer.name)}</b>
          (<a href="mailto:${escapeAttr(organizer.email)}" style="color:#b91c1c;text-decoration:none;">${escapeHtml(organizer.email)}</a>)
          just submitted a new tournament:
        </p>

        <div style="margin:16px 0;padding:16px 18px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
          <p style="margin:0 0 6px 0;font-size:18px;font-weight:700;">${escapeHtml(tournament.name)}</p>
          <p style="margin:0;font-size:13px;color:#475569;">
            ${escapeHtml(tournament.city)} · ${tournament.overs} overs a side<br/>
            ${fmt(tournament.startDate)} → ${fmt(tournament.endDate)}
          </p>
        </div>

        <p style="margin:0 0 18px 0;font-size:14px;color:#475569;line-height:1.55;">
          It&apos;s currently <b style="color:#b45309;">pending</b> and is hidden from
          the public until you approve it.
        </p>

        <p style="margin:0 0 12px 0;">
          <a href="${escapeAttr(approveUrl)}"
             style="display:inline-block;padding:12px 22px;background:#16a34a;color:#ffffff;font-weight:700;font-size:15px;border-radius:9px;text-decoration:none;">
            Approve tournament
          </a>
        </p>

        <p style="margin:14px 0 0 0;font-size:13px;color:#64748b;">
          Prefer to review it first?
          <a href="${escapeAttr(dashboardUrl)}" style="color:#b91c1c;text-decoration:none;font-weight:600;">Open the admin dashboard →</a>
        </p>

        <p style="margin:24px 0 0 0;font-size:11px;color:#94a3b8;line-height:1.5;">
          This approval link is signed and expires in 14 days. It only works
          for this specific tournament and can&apos;t be used to approve any
          others. If you didn&apos;t expect this email, just ignore it — the
          tournament stays hidden.
        </p>
      </div>
    </div>
  </body>
</html>`;

  const text = `New tournament awaiting approval — ${tournament.name}

Organizer: ${organizer.name} <${organizer.email}>
Tournament: ${tournament.name}
City: ${tournament.city}
Overs: ${tournament.overs}
Dates: ${fmt(tournament.startDate)} → ${fmt(tournament.endDate)}

Approve directly (link expires in 14 days):
${approveUrl}

Open the admin dashboard instead:
${dashboardUrl}
`;

  return sendEmail({ to, subject, html, text });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
