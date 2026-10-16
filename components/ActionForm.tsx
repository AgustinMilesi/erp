"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action";

// A form that runs a server action and answers with a toast.
export function ActionForm({
  action,
  children,
  className,
  keepValues = false,
  confirm,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  keepValues?: boolean;
  confirm?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={ref}
      className={className}
      action={async (formData) => {
        if (confirm && !window.confirm(confirm)) return;
        const result = await action(formData);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (result.message) toast.success(result.message);
        if (!keepValues) ref.current?.reset();
        if (result.redirectTo) router.push(result.redirectTo);
      }}
    >
      {children}
    </form>
  );
}
