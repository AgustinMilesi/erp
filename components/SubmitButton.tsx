"use client";

import { useFormStatus } from "react-dom";
import { ui } from "@/components/ui";

export function SubmitButton({
  children,
  pendingText = "Saving...",
  variant = "button",
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "button" | "ghost" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={ui[variant]}>
      {pending ? pendingText : children}
    </button>
  );
}
