import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/Headline";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import { saveContact } from "@/app/actions/dashboard";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Contacts" };

const PAGE_SIZE = 25;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { organization } = await requireSession();
  const query = await searchParams;
  const q = query.q?.trim().slice(0, 100);
  const page = Math.max(1, Number(query.page) || 1);

  const where = {
    organizationId: organization.id,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { company: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [contacts, total] = await Promise.all([
    db.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, company: true },
    }),
    db.contact.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `/app/contacts?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="space-y-10">
      <PageTitle light="Your" bold="contacts." />

      <form action="/app/contacts" className="flex items-end gap-4">
        <div className="flex-1">
          <label htmlFor="q" className={ui.label}>Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, email or company" className={ui.input} />
        </div>
        <button type="submit" className={ui.ghost}>Search</button>
      </form>

      {contacts.length === 0 ? (
        <p className={ui.muted}>{q ? "No contacts match that search." : "No contacts yet. Anyone who writes through a form shows up here."}</p>
      ) : (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {contacts.map((c) => (
            <li key={c.id}>
              <Link href={`/app/contacts/${c.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-rose-400 transition">
                <span className="min-w-0">
                  <span className="block truncate text-white">{c.name}</span>
                  <span className="block text-sm text-slate-500 truncate">{c.email}</span>
                </span>
                <span className="text-sm text-slate-500 truncate">{c.company}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-4 text-sm">
          {page > 1 && <Link href={href(page - 1)} className={ui.ghost}>Previous</Link>}
          <span className={ui.muted}>Page {page} of {pages}</span>
          {page < pages && <Link href={href(page + 1)} className={ui.ghost}>Next</Link>}
        </div>
      )}

      <details className={`${ui.card} p-6`}>
        <summary className="cursor-pointer text-xs uppercase tracking-[0.15em] text-slate-300">Add a contact</summary>
        <ActionForm action={saveContact} className="space-y-2 pt-6">
          <input name="name" required minLength={2} maxLength={120} placeholder="Name" aria-label="Name" className={ui.input} />
          <input name="email" type="email" required placeholder="Email" aria-label="Email" className={ui.input} />
          <input name="phone" maxLength={40} placeholder="Phone (optional)" aria-label="Phone" className={ui.input} />
          <input name="company" maxLength={120} placeholder="Company (optional)" aria-label="Company" className={ui.input} />
          <div className="pt-6"><SubmitButton>Add contact</SubmitButton></div>
        </ActionForm>
      </details>
    </div>
  );
}
