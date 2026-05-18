import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifyApprovalToken } from "@/lib/approvalToken";
import { ensureAdminUser, getConfiguredAdminEmail } from "@/lib/adminBootstrap";

export const dynamic = "force-dynamic";

/**
 * /admin/approve?token=...
 *
 * Public landing page reached from the "Approve" button in the new-tournament
 * email. The token in the query string is a signed HMAC of the tournament id
 * + expiry — knowing the token is proof that the request came from the
 * email we sent to the admin's inbox, so we approve in one click without
 * requiring a session login.
 *
 * Each token only flips a PENDING tournament to APPROVED. Reusing it after
 * the tournament is approved (or rejected, or deleted) is a no-op.
 */
export default async function AdminApprovePage({
  searchParams
}: {
  searchParams: { token?: string };
}) {
  // Keep admin user fresh in case env vars changed.
  await ensureAdminUser().catch(() => undefined);

  const result = await processToken(searchParams?.token);

  return (
    <div className="mx-auto max-w-md p-2 sm:p-6">
      <ResultCard result={result} />
    </div>
  );
}

type Outcome =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "not-found" }
  | { kind: "approved-now"; name: string }
  | { kind: "already-approved"; name: string }
  | { kind: "rejected"; name: string };

async function processToken(token: string | undefined): Promise<Outcome> {
  if (!token) return { kind: "missing" };
  const claim = verifyApprovalToken(token);
  if (!claim) return { kind: "invalid" };

  const existing = await prisma.tournament.findUnique({
    where: { id: claim.tournamentId },
    select: { id: true, name: true, approvalStatus: true }
  });
  if (!existing) return { kind: "not-found" };

  if (existing.approvalStatus === "APPROVED") {
    return { kind: "already-approved", name: existing.name };
  }
  if (existing.approvalStatus === "REJECTED") {
    return { kind: "rejected", name: existing.name };
  }

  // Resolve the configured admin's user id so we can stamp `approvedById`.
  const adminEmail = getConfiguredAdminEmail();
  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true }
  });

  await prisma.tournament.update({
    where: { id: existing.id },
    data: {
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
      approvedById: adminUser?.id ?? null,
      rejectionReason: null
    }
  });
  return { kind: "approved-now", name: existing.name };
}

function ResultCard({ result }: { result: Outcome }) {
  switch (result.kind) {
    case "approved-now":
      return (
        <Card
          tone="emerald"
          eyebrow="Approved"
          title={`"${result.name}" is now live.`}
          body="The tournament is visible to organizers and players. The organizer can keep building it out as usual."
        />
      );
    case "already-approved":
      return (
        <Card
          tone="emerald"
          eyebrow="Already approved"
          title={`"${result.name}" was already approved.`}
          body="Nothing to do — the tournament is already visible to everyone."
        />
      );
    case "rejected":
      return (
        <Card
          tone="rose"
          eyebrow="Already rejected"
          title={`"${result.name}" was rejected earlier.`}
          body="If you'd like to bring it back, head to the admin dashboard and approve it from there."
        />
      );
    case "not-found":
      return (
        <Card
          tone="rose"
          eyebrow="Not found"
          title="That tournament no longer exists."
          body="It looks like it was deleted before you could approve it."
        />
      );
    case "invalid":
      return (
        <Card
          tone="rose"
          eyebrow="Invalid or expired link"
          title="This approval link can't be used."
          body="Links expire after 14 days. Open the admin dashboard and approve the tournament from there."
        />
      );
    case "missing":
    default:
      return (
        <Card
          tone="rose"
          eyebrow="Missing token"
          title="No approval token on this URL."
          body="Use the Approve button from the email we sent, or open the admin dashboard."
        />
      );
  }
}

function Card({
  tone,
  eyebrow,
  title,
  body
}: {
  tone: "emerald" | "rose";
  eyebrow: string;
  title: string;
  body: string;
}) {
  const eyebrowClass =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-rose-100 text-rose-800";
  return (
    <div className="card space-y-4 p-6 text-center">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${eyebrowClass}`}
      >
        {eyebrow}
      </span>
      <h1 className="font-display text-2xl font-extrabold">{title}</h1>
      <p className="text-sm text-ink-600">{body}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/admin" className="btn-primary">
          Open admin dashboard
        </Link>
        <Link
          href="/"
          className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
        >
          Back to site
        </Link>
      </div>
    </div>
  );
}
