import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { ApiKeyCreator } from "@/components/ApiKeyCreator";
import { CopyButton } from "@/components/CopyButton";
import { PageTitle } from "@/components/Headline";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import { revokeApiKey, rotateWebhookSecret, saveSettings } from "@/app/actions/dashboard";
import { savePosSettings } from "@/app/actions/pos";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { CURRENCIES } from "@/lib/validation";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { organization, role } = await requireSession();

  if (!canManage(role)) {
    return (
      <div className="space-y-6">
        <PageTitle light="Your" bold="settings." />
        <p className={ui.muted}>Only owners and admins can change the workspace settings.</p>
      </div>
    );
  }

  const [org, keys] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organization.id },
      select: { name: true, notifyEmail: true, webhookUrl: true, webhookSecret: true, currency: true, allowNegativeStock: true },
    }),
    db.apiKey.findMany({
      where: { organizationId: organization.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-16">
      <PageTitle light="Your" bold="settings." />

      <section className="space-y-4">
        <p className={ui.label}>Workspace</p>
        <ActionForm action={saveSettings} keepValues className="space-y-2">
          <div>
            <label className={ui.label} htmlFor="name">Name</label>
            <input id="name" name="name" required minLength={2} maxLength={80} defaultValue={org.name} className={ui.input} />
          </div>
          <div>
            <label className={ui.label} htmlFor="notifyEmail">Send new messages to</label>
            <input id="notifyEmail" name="notifyEmail" type="email" defaultValue={org.notifyEmail ?? ""} placeholder="you@company.com" className={ui.input} />
          </div>
          <div>
            <label className={ui.label} htmlFor="webhookUrl">Webhook address (optional)</label>
            <input id="webhookUrl" name="webhookUrl" type="url" defaultValue={org.webhookUrl ?? ""} placeholder="https://erp.company.com/hooks/contact" className={ui.input} />
            <p className="text-xs text-slate-500 mt-1">We call it with each new message, signed so you can check it came from us.</p>
          </div>
          <div className="pt-6"><SubmitButton>Save settings</SubmitButton></div>
        </ActionForm>

        {org.webhookUrl && org.webhookSecret && (
          <div className={`${ui.card} p-4 space-y-3`}>
            <p className={ui.label}>Webhook signing secret</p>
            <code className="block break-all text-sm text-slate-300">{org.webhookSecret}</code>
            <div className="flex gap-3">
              <CopyButton text={org.webhookSecret} />
              <ActionForm action={rotateWebhookSecret} keepValues confirm="Generate a new secret? The old one stops working.">
                <SubmitButton variant="ghost" pendingText="...">Generate a new one</SubmitButton>
              </ActionForm>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <p className={ui.label}>Point of sale</p>
        <ActionForm action={savePosSettings} keepValues className="space-y-2">
          <div>
            <label className={ui.label} htmlFor="currency">Currency</label>
            <select id="currency" name="currency" defaultValue={org.currency} className={ui.input}>
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 pt-4 text-slate-300 text-sm">
            <input type="checkbox" name="allowNegativeStock" defaultChecked={org.allowNegativeStock} className="accent-rose-400 size-4" />
            Let the till sell products that show no stock
          </label>
          <p className="text-xs text-slate-500">Useful while the stock counts aren&apos;t up to date. Stock can then go below zero.</p>
          <div className="pt-6"><SubmitButton>Save</SubmitButton></div>
        </ActionForm>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className={ui.label}>API keys</p>
          <p className={ui.muted}>
            Keys let your ERP or any other system read and create contacts, and read messages, products and sales. See the README for the endpoints.
          </p>
        </div>

        <ApiKeyCreator />

        {keys.length > 0 && (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="text-white">{key.name}</p>
                  <p className="text-sm text-slate-500">
                    <span className="font-mono">{key.prefix}…</span>
                    {" · created "}{formatDate(key.createdAt)}
                    {" · "}{key.lastUsedAt ? `last used ${formatDate(key.lastUsedAt)}` : "never used"}
                  </p>
                </div>
                <ActionForm action={revokeApiKey} confirm="Revoke this key? Anything using it will stop working.">
                  <input type="hidden" name="id" value={key.id} />
                  <SubmitButton variant="danger" pendingText="...">Revoke</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
