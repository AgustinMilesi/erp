import Link from "next/link";
import { Headline } from "@/components/Headline";
import { MailIcon } from "@/components/MailIcon";
import { ui } from "@/components/ui";

const points = [
  {
    label: "Point of sale",
    text: "Fast barcode scanner till with cash, card, transfer and split payments.",
  },
  {
    label: "Cash shifts",
    text: "Strict register openings, real-time balance tracking and closing audit logs.",
  },
  {
    label: "Inventory ledger",
    text: "Automatic stock deductions on checkout, restocks, and gap-free sale numbers.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-6xl grid md:grid-cols-5 gap-12 md:gap-20">
        <div className="md:col-span-3 space-y-8">
          <Headline light={["Modern retail", "point of sale,"]} bold="built for speed." />
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
