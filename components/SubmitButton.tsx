"use client";

import { useFormStatus } from "react-dom";
import { ui } from "@/components/ui";

export function SubmitButton({
  children,
  pendingText = "Saving...",
  variant = "button",
  className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "button" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${ui[variant]} ${className}`.trim()}>
      {pending ? pendingText : children}
    </button>
  );
}
