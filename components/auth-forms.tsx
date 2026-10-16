"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
} from "@/app/actions/auth";
import type { ActionResult } from "@/lib/action";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validation";
import { ui } from "@/components/ui";

function Field({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div>
      {children}
      {error && <p className={ui.error}>{error}</p>}
    </div>
  );
}

function useResult() {
  const router = useRouter();
  return (result: ActionResult) => {
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    if (result.message) toast.success(result.message);
    if (result.redirectTo) {
      router.push(result.redirectTo);
      router.refresh();
    }
    return true;
  };
}

export function LoginForm() {
  const handle = useResult();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  return (
    <form onSubmit={handleSubmit(async (data) => handle(await loginAction(data)))} className="space-y-2">
      <Field error={errors.email?.message}>
        <input {...register("email")} type="email" placeholder="Email" aria-label="Email" autoComplete="email" className={ui.input} />
      </Field>
      <Field error={errors.password?.message}>
        <input {...register("password")} type="password" placeholder="Password" aria-label="Password" autoComplete="current-password" className={ui.input} />
      </Field>
      <div className="pt-6 flex flex-wrap items-center gap-6">
        <button type="submit" disabled={isSubmitting} className={ui.button}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
        <Link href="/forgot-password" className={`${ui.muted} text-sm hover:text-rose-400 transition`}>
          Forgot your password?
        </Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const handle = useResult();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });

  return (
    <form onSubmit={handleSubmit(async (data) => handle(await registerAction(data)))} className="space-y-2">
      <Field error={errors.name?.message}>
        <input {...register("name")} placeholder="Your name" aria-label="Your name" autoComplete="name" className={ui.input} />
      </Field>
      <Field error={errors.organization?.message}>
        <input {...register("organization")} placeholder="Company or team name" aria-label="Company or team name" autoComplete="organization" className={ui.input} />
      </Field>
      <Field error={errors.email?.message}>
        <input {...register("email")} type="email" placeholder="Email" aria-label="Email" autoComplete="email" className={ui.input} />
      </Field>
      <Field error={errors.password?.message}>
        <input {...register("password")} type="password" placeholder="Password (10 characters or more)" aria-label="Password" autoComplete="new-password" className={ui.input} />
      </Field>
      <div className="pt-6">
        <button type="submit" disabled={isSubmitting} className={ui.button}>
          {isSubmitting ? "Creating..." : "Create account"}
        </button>
      </div>
    </form>
  );
}

export function ForgotForm() {
  const handle = useResult();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        if (handle(await forgotPasswordAction(data))) reset();
      })}
      className="space-y-2"
    >
      <Field error={errors.email?.message}>
        <input {...register("email")} type="email" placeholder="Email" aria-label="Email" autoComplete="email" className={ui.input} />
      </Field>
      <div className="pt-6">
        <button type="submit" disabled={isSubmitting} className={ui.button}>
          {isSubmitting ? "Sending..." : "Send the link"}
        </button>
      </div>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const handle = useResult();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token },
  });

  return (
    <form onSubmit={handleSubmit(async (data) => handle(await resetPasswordAction(data)))} className="space-y-2">
      <input type="hidden" {...register("token")} />
      <Field error={errors.password?.message}>
        <input {...register("password")} type="password" placeholder="New password (10 characters or more)" aria-label="New password" autoComplete="new-password" className={ui.input} />
      </Field>
      <div className="pt-6">
        <button type="submit" disabled={isSubmitting} className={ui.button}>
          {isSubmitting ? "Saving..." : "Save new password"}
        </button>
      </div>
    </form>
  );
}
