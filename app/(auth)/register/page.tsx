import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { RegisterForm } from "@/components/auth-forms";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getSession()) redirect("/app");
  return (
    <AuthShell
      light={["Let's set up", "your inbox."]}
      bold="Create account."
      side={
        <>
          <p>You get a workspace and your first contact form right away.</p>
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:text-rose-400 transition">
              Sign in
            </Link>
            .
          </p>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
