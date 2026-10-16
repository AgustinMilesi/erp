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
    <form onSubmit={handleSubmit(async (data) => handle(await loginAction(data)))} className="space-y-4">
      <Field error={errors.email?.message}>
        <label className={ui.label} htmlFor="login-email">Email</label>
        <div className="relative">
          <input
            id="login-email"
            {...register("email")}
            type="email"
            placeholder="usuario@comercio.com"
            aria-label="Email"
            autoComplete="email"
            className={`${ui.input} !pt-1 !pb-2.5`}
          />
        </div>
      </Field>

      <Field error={errors.password?.message}>
        <div className="flex items-center justify-between">
          <label className={ui.label} htmlFor="login-password">Contraseña</label>
          <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-rose-400 transition mb-2">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <div className="relative">
          <input
            id="login-password"
            {...register("password")}
            type="password"
            placeholder="••••••••••••"
            aria-label="Contraseña"
            autoComplete="current-password"
            className={`${ui.input} !pt-1 !pb-2.5`}
          />
        </div>
      </Field>

      <div className="pt-4">
        <button type="submit" disabled={isSubmitting} className={`${ui.button} w-full text-center py-3.5`}>
          {isSubmitting ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>
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

export function AcceptInviteForm({
  token,
  email,
  isExistingUser,
}: {
  token: string;
  email: string;
  isExistingUser: boolean;
}) {
  const handle = useResult();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ token: string; name?: string; password?: string }>({
    defaultValues: { token },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const { acceptInvitationAction } = await import("@/app/actions/auth");
        handle(await acceptInvitationAction(data));
      })}
      className="space-y-4"
    >
      <input type="hidden" {...register("token")} />

      <div>
        <label className={ui.label}>Email</label>
        <input
          value={email}
          disabled
          readOnly
          className={`${ui.input} !opacity-70 !cursor-not-allowed`}
        />
      </div>

      {!isExistingUser && (
        <>
          <Field error={errors.name?.message}>
            <label className={ui.label}>Your full name</label>
            <input
              {...register("name", { required: "Please enter your name" })}
              type="text"
              placeholder="Your name"
              autoComplete="name"
              className={ui.input}
            />
          </Field>

          <Field error={errors.password?.message}>
            <label className={ui.label}>Create a password</label>
            <input
              {...register("password", {
                required: "Please choose a password",
                minLength: { value: 10, message: "Use at least 10 characters" },
              })}
              type="password"
              placeholder="At least 10 characters"
              autoComplete="new-password"
              className={ui.input}
            />
          </Field>
        </>
      )}

      <div className="pt-4">
        <button type="submit" disabled={isSubmitting} className={`${ui.button} w-full`}>
          {isSubmitting ? "Joining workspace..." : "Accept & join workspace"}
        </button>
      </div>
    </form>
  );
}

