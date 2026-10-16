import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { CopyButton } from "@/components/CopyButton";
import { PageTitle } from "@/components/Headline";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import { deleteForm, saveForm, toggleForm } from "@/app/actions/dashboard";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Forms" };

export default async function FormsPage() {
  const [{ organization, role }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);
  const admin = canManage(role);

  const forms = await db.form.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { messages: true } } },
  });

  const titleWords = t.yourForms.split(" ");
  const titleLight = titleWords[0];
  const titleBold = titleWords.slice(1).join(" ") ? `${titleWords.slice(1).join(" ")}.` : ".";

  return (
    <div className="space-y-10">
      <div>
        <PageTitle light={titleLight} bold={titleBold} />
        <p className={`${ui.muted} mt-2`}>{t.formsSubtitle}</p>
      </div>

      <div className="space-y-6">
        {forms.map((form) => {
          const link = `${env.APP_URL}/f/${form.publicId}`;
          const embed = `<iframe src="${link}" width="100%" height="640" style="border:0" title="Contact"></iframe>`;
          return (
            <section key={form.id} className={`${ui.card} p-6 space-y-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">{form.name}</h2>
                  <p className="text-sm text-slate-500">
                    {form._count.messages} {t.submissions}
                    {" · "}
                    {form.active ? "Live" : "Paused"}
                  </p>
                </div>
                {admin && (
                  <div className="flex gap-3">
                    <ActionForm action={toggleForm} keepValues>
                      <input type="hidden" name="id" value={form.id} />
                      <SubmitButton variant="ghost" pendingText="...">{form.active ? "Pause" : "Resume"}</SubmitButton>
                    </ActionForm>
                    <ActionForm action={deleteForm} confirm="Delete this form?">
                      <input type="hidden" name="id" value={form.id} />
                      <SubmitButton variant="danger" pendingText="...">{t.delete}</SubmitButton>
                    </ActionForm>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className={ui.label}>{t.viewPublicForm}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <a href={link} target="_blank" rel="noopener noreferrer" className={`${ui.link} break-all`}>{link}</a>
                  <CopyButton text={link} />
                </div>
              </div>

              <div className="space-y-2">
                <p className={ui.label}>Embed code</p>
                <code className="block break-all text-sm text-slate-300 bg-black/30 rounded-xl p-3">{embed}</code>
                <CopyButton text={embed} label={t.copyLink} />
              </div>

              {admin && (
                <details>
                  <summary className="cursor-pointer text-xs uppercase tracking-[0.15em] text-slate-300">{t.edit}</summary>
                  <ActionForm action={saveForm} keepValues className="space-y-2 pt-4">
                    <input type="hidden" name="id" value={form.id} />
                    <div>
                      <label className={ui.label} htmlFor={`name-${form.id}`}>{t.name}</label>
                      <input id={`name-${form.id}`} name="name" required minLength={2} maxLength={80} defaultValue={form.name} className={ui.input} />
                    </div>
                    <div>
                      <label className={ui.label} htmlFor={`origins-${form.id}`}>Allowed sites (optional)</label>
                      <textarea
                        id={`origins-${form.id}`}
                        name="allowedOrigins"
                        rows={2}
                        defaultValue={form.allowedOrigins.join("\n")}
                        placeholder="https://yoursite.com"
                        className={`${ui.input} resize-none`}
                      />
                    </div>
                    <div className="pt-4"><SubmitButton>{t.save}</SubmitButton></div>
                  </ActionForm>
                </details>
              )}
            </section>
          );
        })}
      </div>

      {admin ? (
        <details className={`${ui.card} p-6`}>
          <summary className="cursor-pointer text-xs uppercase tracking-[0.15em] text-slate-300">{t.createFormTitle}</summary>
          <ActionForm action={saveForm} className="space-y-2 pt-6">
            <input name="name" required minLength={2} maxLength={80} placeholder={t.formName} aria-label={t.formName} className={ui.input} />
            <textarea name="allowedOrigins" rows={2} placeholder="Allowed sites, one per line (optional)" aria-label="Allowed sites" className={`${ui.input} resize-none`} />
            <div className="pt-6"><SubmitButton pendingText="...">{t.createFormTitle}</SubmitButton></div>
          </ActionForm>
        </details>
      ) : (
        <p className={ui.muted}>{t.adminOnly}</p>
      )}
    </div>
  );
}
