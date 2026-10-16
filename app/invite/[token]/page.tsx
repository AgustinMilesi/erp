import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { AcceptInviteForm } from "@/components/auth-forms";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/ids";

export const metadata: Metadata = { title: "Team Invitation" };

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = sha256(token);

  const invite = await db.invitation.findUnique({
    where: { id: tokenHash },
    include: { organization: { select: { name: true } } },
  });

  if (!invite || invite.expiresAt < new Date()) {
    notFound();
  }

  const existingUser = await db.user.findUnique({
    where: { email: invite.email },
    select: { id: true, name: true },
  });

  return (
    <AuthShell
      light={["Join", invite.organization.name]}
      bold="welcome."
      side={
        <>
          <p>
            You were invited as a{" "}
            <strong className="text-white font-semibold">
              {invite.role === "ADMIN" ? "Administrator" : "Cashier (Member)"}
            </strong>{" "}
            in {invite.organization.name}.
          </p>
          <p>
            {existingUser
              ? "You already have an account. Confirm to join this workspace."
              : "Set up your name and password to start recording sales or managing the store."}
          </p>
        </>
      }
    >
      <div className="space-y-4">
        <AcceptInviteForm
          token={token}
          email={invite.email}
          isExistingUser={Boolean(existingUser)}
        />
        <p className="text-sm text-slate-500">
          Already have an account with a different email?{" "}
          <Link href="/login" className="text-rose-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
