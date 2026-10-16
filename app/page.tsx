import Link from "next/link";
import { Headline } from "@/components/Headline";
import { MailIcon } from "@/components/MailIcon";
import { ui } from "@/components/ui";

const points = [
  {
    label: "Forms",
    text: "Put a contact form on any website, or just share the link.",
  },
  {
    label: "Inbox",
    text: "Read, answer and archive messages without digging through email.",
  },
  {
    label: "Contacts",
    text: "Everyone who writes to you is saved, and ready to connect to your ERP.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-6xl grid md:grid-cols-5 gap-12 md:gap-20">
        <div className="md:col-span-3 space-y-8">
          <Headline light={["Every message", "from your customers,"]} bold="in one place." />
          <div className="pt-6 flex flex-wrap items-center gap-6">
            <Link href="/register" className={ui.button}>
              Create account
            </Link>
            <Link href="/login" className={`${ui.link} text-sm uppercase tracking-wider`}>
              Sign in
            </Link>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8 md:pt-24">
          <MailIcon />
          <div className="space-y-6">
            {points.map((point) => (
              <div key={point.label}>
                <p className={ui.label}>{point.label}</p>
                <p className="text-white text-lg">{point.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
