import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { ApiKeyCreator } from "@/components/ApiKeyCreator";
import { CopyButton } from "@/components/CopyButton";
import { PageTitle } from "@/components/Headline";
import { SubmitButton } from "@/components/SubmitButton";
import { ui } from "@/components/ui";
import {
  cancelInvitation,
  inviteMember,
  removeMember,
  revokeApiKey,
  rotateWebhookSecret,
  saveSettings,
  updateMemberRole,
} from "@/app/actions/dashboard";
import { savePosSettings } from "@/app/actions/pos";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { CURRENCIES } from "@/lib/validation";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { organization, role, user } = await requireSession();

  if (!canManage(role)) {
    return (
      <div className="space-y-6">
        <PageTitle light="Your" bold="settings." />
        <p className={ui.muted}>Only owners and admins can change the workspace settings.</p>
      </div>
    );
  }

  const [org, keys, members, pendingInvites] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organization.id },
      select: { name: true, notifyEmail: true, webhookUrl: true, webhookSecret: true, currency: true, allowNegativeStock: true, timezone: true },
    }),
    db.apiKey.findMany({
      where: { organizationId: organization.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    }),
    db.membership.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.invitation.findMany({
      where: { organizationId: organization.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, expiresAt: true },
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
            <label className={ui.label} htmlFor="timezone">Timezone</label>
            <select id="timezone" name="timezone" defaultValue={org.timezone} className={ui.input}>
              <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires (GMT-3)</option>
              <option value="America/Sao_Paulo">America/Sao_Paulo (GMT-3)</option>
              <option value="America/Santiago">America/Santiago (GMT-4/GMT-3)</option>
              <option value="America/Montevideo">America/Montevideo (GMT-3)</option>
              <option value="America/Bogota">America/Bogota (GMT-5)</option>
              <option value="America/Mexico_City">America/Mexico_City (GMT-6)</option>
              <option value="America/New_York">America/New_York (US Eastern)</option>
              <option value="Europe/Madrid">Europe/Madrid (GMT+1/GMT+2)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Asia/Shanghai">Asia/Shanghai (GMT+8 - China)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
            </select>
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

      <section className="space-y-6">
        <div className="space-y-2">
          <p className={ui.label}>Team & Cashiers</p>
          <p className={ui.muted}>
            Invite cashiers and administrators to this workspace. Members can operate the POS and record sales. Owners and admins can manage stock, prices, voids and settings.
          </p>
        </div>

        <ActionForm action={inviteMember} className="space-y-4">
          <div className="grid sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
            <div>
              <label className={ui.label} htmlFor="inviteEmail">Email address</label>
              <input
                id="inviteEmail"
                name="email"
                type="email"
                required
                placeholder="colleague@store.com"
                className={ui.input}
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="inviteRole">Role</label>
              <select id="inviteRole" name="role" defaultValue="MEMBER" className={ui.input}>
                <option value="MEMBER">Member (Cashier)</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <SubmitButton pendingText="Inviting...">Invite</SubmitButton>
          </div>
        </ActionForm>

        {pendingInvites.length > 0 && (
          <div className="space-y-3 pt-4">
            <p className={ui.label}>Pending invitations</p>
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                  <div>
                    <span className="text-white text-sm">{inv.email}</span>
                    <span className="ml-2 text-xs uppercase tracking-wider text-slate-400">({inv.role.toLowerCase()})</span>
                    <span className="block text-xs text-slate-500">Expires {formatDate(inv.expiresAt)}</span>
                  </div>
                  <ActionForm action={cancelInvitation} confirm="Cancel this invitation?">
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <SubmitButton variant="ghost" pendingText="...">Cancel</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3 pt-4">
          <p className={ui.label}>Active members ({members.length})</p>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {members.map((m) => {
              const isMe = m.user.id === user.id;
              const isOwner = m.role === "OWNER";
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="text-white">
                      {m.user.name} {isMe && <span className="text-xs text-rose-400 font-semibold">(You)</span>}
                    </p>
                    <p className="text-sm text-slate-500">
                      {m.user.email} · joined {formatDate(m.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-wider text-slate-300 font-mono bg-white/5 px-2.5 py-1 rounded">
                      {m.role}
                    </span>

                    {!isOwner && !isMe && role === "OWNER" && (
                      <ActionForm action={updateMemberRole}>
                        <input type="hidden" name="membershipId" value={m.id} />
                        <select
                          name="role"
                          defaultValue={m.role}
                          onChange={(e) => e.target.form?.requestSubmit()}
                          className="bg-transparent border border-white/10 text-xs text-slate-300 rounded px-2 py-1 outline-none focus:border-rose-400"
                        >
                          <option value="MEMBER">MEMBER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </ActionForm>
                    )}

                    {!isOwner && !isMe && (
                      <ActionForm action={removeMember} confirm={`Remove ${m.user.name} from this workspace?`}>
                        <input type="hidden" name="membershipId" value={m.id} />
                        <SubmitButton variant="danger" pendingText="...">Remove</SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
