import { Headline } from "@/components/Headline";
import { MailIcon } from "@/components/MailIcon";
import { ui } from "@/components/ui";

// Same two-column layout as the contact page: headline and form on the left,
// a short note on the right.
export function AuthShell({
  light,
  bold,
  children,
  side,
}: {
  light: string[];
  bold: string;
  children: React.ReactNode;
  side: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-6xl grid md:grid-cols-5 gap-12 md:gap-20">
        <div className="md:col-span-3 space-y-8">
          <Headline light={light} bold={bold} />
          <div className="pt-6">{children}</div>
        </div>
        <div className={`md:col-span-2 space-y-8 md:pt-24 ${ui.muted}`}>
          <MailIcon />
          <div className="space-y-4 text-lg">{side}</div>
        </div>
      </div>
    </main>
  );
}
