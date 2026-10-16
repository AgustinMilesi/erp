import Link from "next/link";
import { Headline } from "@/components/Headline";
import { ui } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-6xl space-y-8">
        <Headline light={["We looked", "everywhere."]} bold="Nothing here." />
        <Link href="/" className={`${ui.button} inline-block`}>
          Go home
        </Link>
      </div>
    </main>
  );
}
