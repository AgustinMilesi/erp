import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/auth-forms";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/app");
  return (
    <AuthShell
      light={["Good to", "see you again."]}
      bold="Sign in."
      side={
        <p>
          New here?{" "}
          <Link href="/register" className="text-white hover:text-rose-400 transition">
            Create an account
          </Link>
          .
        </p>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
