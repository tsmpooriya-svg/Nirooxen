import { MessageStatusPicker } from "@/components/admin/message-actions";
import { AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";
import type { MessageStatus } from "@/db/schema";
import { MESSAGE_STATUS } from "@/lib/constants";
import { buildQuery, formatDateTime, formatRelative, toFaDigits } from "@/lib/utils";
import { listMessages } from "@/modules/admin/queries";
import Link from "next/link";
import { requirePageAccess } from "@/lib/auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const dynamic = "force-dynamic";
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePageAccess("messages");

  const params = await searchParams;
  const status = first(params.status) as MessageStatus | undefined;
  const page = Math.max(1, Number(first(params.page) ?? 1) || 1);
  const { items, total, pageCount } = await listMessages({ status, page });

  return (
    <>
      <AdminPageHeader title="پیام‌های تماس" description={`${toFaDigits(total)} پیام دریافت شده است.`} />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip href="/admin/messages" active={!status}>همه</Chip>
        {(Object.keys(MESSAGE_STATUS) as MessageStatus[]).map((key) => (
          <Chip key={key} href={`/admin/messages?status=${key}`} active={status === key}>
            {MESSAGE_STATUS[key].label}
          </Chip>
        ))}
      </div>

      {items.length === 0 ? (
        <Panel><EmptyState title="پیامی یافت نشد" /></Panel>
      ) : (
        <ul className="space-y-3">
          {items.map((message) => (
            <li key={message.id}>
              <Panel>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{message.name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-micro text-[var(--fg-subtle)]">
                      <a href={`tel:${message.phone}`} className="font-mono transition-colors hover:text-[var(--brand)]" dir="ltr">
                        {message.phone}
                      </a>
                      {message.email && (
                        <a href={`mailto:${message.email}`} className="font-mono transition-colors hover:text-[var(--brand)]" dir="ltr">
                          {message.email}
                        </a>
                      )}
                      <span>{formatRelative(message.createdAt)}</span>
                      <span>{formatDateTime(message.createdAt)}</span>
                    </p>
                  </div>
                  <MessageStatusPicker messageId={message.id} status={message.status} />
                </div>

                {message.subject && (
                  <p className="mb-2 text-meta font-medium text-[var(--fg-secondary)]">{message.subject}</p>
                )}
                <p className="whitespace-pre-line rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev-2)] p-4 text-meta leading-8 text-[var(--fg-secondary)]">
                  {message.message}
                </p>
              </Panel>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pageCount={pageCount} buildHref={(n) => `/admin/messages${buildQuery({ status, page: n === 1 ? undefined : n })}`} />
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-3 py-1.5 text-micro font-medium transition-all " +
        (active
          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
          : "border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--border-brand)] hover:text-[var(--brand)]")
      }
    >
      {children}
    </Link>
  );
}
