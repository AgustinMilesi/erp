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
  resetOrganizationData,
  revokeApiKey,
  rotateWebhookSecret,
  saveModulesSettings,
  saveSettings,
  updateMemberRole,
} from "@/app/actions/dashboard";
import { savePosSettings } from "@/app/actions/pos";
import { DataImporter } from "@/components/pos/DataImporter";
import { canManage, requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { CURRENCIES } from "@/lib/validation";
import { getServerTranslations } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [{ organization, role, user }, { t }] = await Promise.all([
    requireSession(),
    getServerTranslations(),
  ]);

  const titleWords = t.yourSettings.split(" ");
  const titleLight = titleWords[0];
  const titleBold = titleWords.slice(1).join(" ") ? `${titleWords.slice(1).join(" ")}.` : ".";

  if (!canManage(role)) {
    return (
      <div className="space-y-6">
        <PageTitle light={titleLight} bold={titleBold} />
        <p className={ui.muted}>{t.adminOnly}</p>
      </div>
    );
  }

  const [org, keys, members, pendingInvites] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organization.id },
      select: {
        name: true,
        notifyEmail: true,
        webhookUrl: true,
        webhookSecret: true,
        currency: true,
        showDecimals: true,
        allowNegativeStock: true,
        timezone: true,
        enabledModules: true,
      },
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
      <div>
        <PageTitle light={titleLight} bold={titleBold} />
        <p className={`${ui.muted} mt-2`}>{t.settingsSubtitle}</p>
      </div>

      <section className="space-y-4">
        <p className={ui.label}>{t.workspaceSection}</p>
        <ActionForm action={saveSettings} keepValues className="space-y-2">
          <div>
            <label className={ui.label} htmlFor="name">{t.orgName}</label>
            <input id="name" name="name" required minLength={2} maxLength={80} defaultValue={org.name} className={ui.input} />
          </div>
          <div>
            <label className={ui.label} htmlFor="notifyEmail">{t.notifyEmail}</label>
            <input id="notifyEmail" name="notifyEmail" type="email" defaultValue={org.notifyEmail ?? ""} placeholder="you@company.com" className={ui.input} />
          </div>
          <div>
            <label className={ui.label} htmlFor="timezone">{t.timezone}</label>
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
            <label className={ui.label} htmlFor="webhookUrl">{t.webhookUrl}</label>
            <input id="webhookUrl" name="webhookUrl" type="url" defaultValue={org.webhookUrl ?? ""} placeholder="https://erp.company.com/hooks/contact" className={ui.input} />
            <p className="text-xs text-slate-500 mt-1">{t.webhookDesc}</p>
          </div>
          <div className="pt-6"><SubmitButton>{t.saveSettingsBtn}</SubmitButton></div>
        </ActionForm>

        {org.webhookUrl && org.webhookSecret && (
          <div className={`${ui.card} p-4 space-y-3`}>
            <p className={ui.label}>Webhook Secret</p>
            <code className="block break-all text-sm text-slate-300">{org.webhookSecret}</code>
            <div className="flex gap-3">
              <CopyButton text={org.webhookSecret} />
              <ActionForm action={rotateWebhookSecret} keepValues confirm="Generate a new secret?">
                <SubmitButton variant="ghost" pendingText="...">Generate</SubmitButton>
              </ActionForm>
            </div>
          </div>
        )}
      </section>

      {/* Módulos y Apartados del Sistema */}
      <section className="space-y-4">
        <div>
          <p className={ui.label}>Módulos y Apartados</p>
          <p className="text-xs text-slate-400">
            Activá o desactivá los apartados que usás en tu negocio. Las secciones desactivadas se ocultarán de la barra de navegación lateral.
          </p>
        </div>

        <ActionForm action={saveModulesSettings} keepValues className={`${ui.card} p-6 space-y-4`}>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { id: "overview", label: "Vista General (Resumen y métricas)", desc: "Métricas del día, ventas recientes y alertas de stock." },
              { id: "pos", label: "Punto de Venta (Terminal POS)", desc: "Pantalla rápida de cobro y tickets de venta." },
              { id: "sales", label: "Historial de Ventas", desc: "Listado de todas las ventas cobradas y anuladas." },
              { id: "products", label: "Productos / Comida / Inventario", desc: "Catálogo de artículos, precios, códigos de barra y stock." },
              { id: "debtors", label: "Deudores y Cuentas Corrientes", desc: "Control de clientes fiados, deuda pendiente y pagos." },
              { id: "expenses", label: "Gastos y Facturas", desc: "Egresos a proveedores, facturas de luz, agua y servicios." },
              { id: "cash", label: "Caja Registradora", desc: "Apertura y cierre de turnos de caja, conteo y arqueo." },
              { id: "contacts", label: "Contactos y Clientes", desc: "Libreta de clientes, proveedores y prospectos." },
              { id: "inbox", label: "Mensajes de Clientes", desc: "Bandeja de entrada de consultas recibidas." },
              { id: "forms", label: "Formularios Web", desc: "Formularios públicos para captar clientes en línea." },
            ].map((m) => {
              const isChecked = (org.enabledModules || [
                "overview",
                "sales",
                "products",
                "cash",
                "debtors",
                "expenses",
                "inbox",
                "contacts",
                "forms",
              ]).includes(m.id);

              return (
                <label
                  key={m.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03] transition cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    name="modules"
                    value={m.id}
                    defaultChecked={isChecked}
                    className="mt-1 size-4 rounded accent-rose-400"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{m.label}</p>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{m.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="pt-2">
            <SubmitButton>Guardar Módulos Activos</SubmitButton>
          </div>
        </ActionForm>
      </section>

      {/* Importación de Datos (JSON / Excel) */}
      <section className="space-y-4">
        <div>
          <p className={ui.label}>Importación de Datos (JSON / Excel)</p>
          <p className="text-xs text-slate-400">
            Cargá backups completos de marierp (productos, deudores, facturas y ventas) o planillas de Excel con tu catálogo sin límites de tamaño.
          </p>
        </div>

        <div className={`${ui.card} p-6 sm:p-8 border-rose-400/30 bg-rose-400/[0.02]`}>
          <DataImporter />
        </div>
      </section>

      <section className="space-y-4">
        <p className={ui.label}>{t.posSection}</p>
        <ActionForm action={savePosSettings} keepValues className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className={ui.label} htmlFor="currency">Moneda de Cobro (Currency)</label>
              <select id="currency" name="currency" defaultValue={org.currency} className={ui.input}>
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div className="pt-2 sm:pt-6">
              <label className="flex items-center gap-3 text-slate-300 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="showDecimals"
                  defaultChecked={org.showDecimals}
                  className="accent-rose-400 size-4"
                />
                <span>Mostrar centavos / decimales (,00)</span>
              </label>
              <p className="text-xs text-slate-500 mt-1">
                En Argentina no se usa (ej: $ 2.900). En EE.UU. u otros países sí (ej: $ 2.900,00).
              </p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 text-slate-300 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                name="allowNegativeStock"
                defaultChecked={org.allowNegativeStock}
                className="accent-rose-400 size-4"
              />
              <span>{t.allowNegativeStock}</span>
            </label>
            <p className="text-xs text-slate-500 mt-1">{t.allowNegativeStockHelp}</p>
          </div>

          <div className="pt-2"><SubmitButton>{t.savePosBtn}</SubmitButton></div>
        </ActionForm>
      </section>

      {/* Zona de Peligro / Borrar Datos */}
      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-rose-400">Zona de Peligro · Borrar Datos</p>
          <p className="text-xs text-slate-400">
            Podés reiniciar o vaciar datos de prueba o módulos específicos de tu negocio. Se solicitará confirmación en pantalla antes de ejecutar la acción.
          </p>
        </div>

        <div className={`${ui.card} p-6 border-rose-500/30 bg-rose-500/[0.03] space-y-4`}>
          <ActionForm
            action={resetOrganizationData}
            confirm="¿Estás completamente seguro de que querés borrar estos datos? Esta acción es definitiva y no se puede deshacer."
            className="space-y-4"
          >
            <div>
              <label className={ui.label} htmlFor="scope">¿Qué datos querés eliminar?</label>
              <select id="scope" name="scope" defaultValue="all" className={ui.input}>
                <option value="all">⚠️ Todo el sistema (Ventas, Caja, Fiados, Gastos, Catálogo y Contactos)</option>
                <option value="sales">Solo Historial de Ventas y Turnos de Caja</option>
                <option value="debtors">Solo Deudores y Cuentas Corrientes (Fiados)</option>
                <option value="expenses">Solo Gastos y Facturas</option>
                <option value="products">Solo Productos y Categorías de Inventario</option>
                <option value="contacts">Solo Contactos y Clientes</option>
              </select>
            </div>

            <p className="text-xs text-rose-300/80">
              Al presionar el botón se abrirá una ventana emergente de confirmación (&quot;¿Estás seguro?&quot;) para evitar accidentes.
            </p>

            <div>
              <SubmitButton variant="danger" pendingText="Borrando...">
                Borrar Datos Seleccionados
              </SubmitButton>
            </div>
          </ActionForm>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className={ui.label}>{t.apiKeysSection}</p>
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
                    {" · "}{formatDate(key.createdAt)}
                  </p>
                </div>
                <ActionForm action={revokeApiKey} confirm={t.revokeKeyConfirm}>
                  <input type="hidden" name="id" value={key.id} />
                  <SubmitButton variant="danger" pendingText="...">{t.revokeKey}</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className={ui.label}>{t.teamSection}</p>
        </div>

        <ActionForm action={inviteMember} className="space-y-4">
          <div className="grid sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
            <div>
              <label className={ui.label} htmlFor="inviteEmail">{t.inviteEmail}</label>
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
              <label className={ui.label} htmlFor="inviteRole">{t.inviteRole}</label>
              <select id="inviteRole" name="role" defaultValue="MEMBER" className={ui.input}>
                <option value="MEMBER">{t.roleCashier}</option>
                <option value="ADMIN">{t.roleAdmin}</option>
              </select>
            </div>
            <SubmitButton pendingText="...">{t.sendInviteBtn}</SubmitButton>
          </div>
        </ActionForm>

        {pendingInvites.length > 0 && (
          <div className="space-y-3 pt-4">
            <p className={ui.label}>{t.pendingInvites}</p>
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                  <div>
                    <span className="text-white text-sm">{inv.email}</span>
                    <span className="ml-2 text-xs uppercase tracking-wider text-slate-400">({inv.role.toLowerCase()})</span>
                    <span className="block text-xs text-slate-500">{t.expires} {formatDate(inv.expiresAt)}</span>
                  </div>
                  <ActionForm action={cancelInvitation} confirm={t.cancelInvite + "?"}>
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <SubmitButton variant="ghost" pendingText="...">{t.cancelInvite}</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3 pt-4">
          <p className={ui.label}>{t.teamSection} ({members.length})</p>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {members.map((m) => {
              const isMe = m.user.id === user.id;
              const isOwner = m.role === "OWNER";
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="text-white">
                      {m.user.name} {isMe && <span className="text-xs text-rose-400 font-semibold">(Tú)</span>}
                    </p>
                    <p className="text-sm text-slate-500">
                      {m.user.email} · {formatDate(m.createdAt)}
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
                      <ActionForm action={removeMember} confirm={t.removeMemberConfirm}>
                        <input type="hidden" name="membershipId" value={m.id} />
                        <SubmitButton variant="danger" pendingText="...">{t.removeMember}</SubmitButton>
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
