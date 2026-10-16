"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { publicMessageSchema, type PublicMessageInput } from "@/lib/validation";
import { ui } from "@/components/ui";

export function PublicForm({ publicId, orgName }: { publicId: string; orgName: string }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PublicMessageInput>({ resolver: zodResolver(publicMessageSchema) });

  const onSubmit = async (data: PublicMessageInput) => {
    try {
      const res = await fetch(`/api/public/forms/${publicId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error ?? "That didn't go through. Give it another try in a minute.");
        return;
      }
      toast.success(`Got it, thanks. ${orgName} will write back soon.`);
      reset();
    } catch {
      toast.error("That didn't go through. Check your connection and try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 pt-6">
      <div>
        <input {...register("name")} placeholder="Name" aria-label="Name" autoComplete="name" className={ui.input} />
        {errors.name && <p className={ui.error}>{errors.name.message}</p>}
      </div>
      <div>
        <input type="email" {...register("email")} placeholder="Email" aria-label="Email" autoComplete="email" className={ui.input} />
        {errors.email && <p className={ui.error}>{errors.email.message}</p>}
      </div>
      <div>
        <input {...register("subject")} placeholder="Subject" aria-label="Subject" className={ui.input} />
        {errors.subject && <p className={ui.error}>{errors.subject.message}</p>}
      </div>
      <div>
        <textarea {...register("message")} placeholder="How can we help?" aria-label="Message" rows={3} className={`${ui.input} resize-none`} />
        {errors.message && <p className={ui.error}>{errors.message.message}</p>}
      </div>

      {/* Honeypot: off-screen, people never fill it in */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        {...register("website")}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="pt-6">
        <button type="submit" disabled={isSubmitting} className={ui.button}>
          {isSubmitting ? "Sending..." : "Send message"}
        </button>
      </div>
    </form>
  );
}
