import { UserDialog } from "@/components/admin/user-form";
import { AdminPageHeader, DataTable, Panel, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { USER_ROLE } from "@/lib/constants";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { listUsers } from "@/modules/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <>
      <AdminPageHeader
        title="کاربران پنل"
        description="سطح دسترسی هر کاربر تعیین می‌کند به کدام بخش‌های پنل دسترسی دارد."
        actions={
          <UserDialog
            values={{ name: "", email: "", phone: "", role: "SALES", isActive: true }}
            trigger={(open) => (
              <button
                type="button"
                onClick={open}
                className="flex h-10 items-center rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-[var(--fg-on-brand)] hover:bg-[var(--brand-hover)]"
              >
                کاربر جدید
              </button>
            )}
          />
        }
      />

      <Panel padded={false}>
        <DataTable head={["کاربر", "سطح دسترسی", "وضعیت", "آخرین ورود", ""]} empty={users.length === 0}>
          {users.map((user) => (
            <Tr key={user.id}>
              <Td>
                <span className="block font-medium">{user.name}</span>
                <span className="mt-0.5 block font-mono text-[0.625rem] text-[var(--fg-subtle)]" dir="ltr">{user.email}</span>
              </Td>
              <Td>
                <StatusBadge map={USER_ROLE} value={user.role} />
                <span className="mt-1 block text-[0.625rem] text-[var(--fg-subtle)]">{USER_ROLE[user.role].description}</span>
              </Td>
              <Td>
                <StatusBadge
                  map={{ on: { label: "فعال", tone: "ok" }, off: { label: "غیرفعال", tone: "danger" } }}
                  value={user.isActive ? "on" : "off"}
                />
              </Td>
              <Td className="whitespace-nowrap text-[0.6875rem] text-[var(--fg-subtle)]">
                {user.lastLoginAt ? (
                  <>
                    <span className="block">{formatRelative(user.lastLoginAt)}</span>
                    <span className="mt-0.5 block">{formatDateTime(user.lastLoginAt)}</span>
                  </>
                ) : (
                  "هرگز"
                )}
              </Td>
              <Td className="w-16">
                <UserDialog
                  values={{
                    id: user.id, name: user.name, email: user.email,
                    phone: user.phone ?? "", role: user.role, isActive: user.isActive,
                  }}
                  trigger={(open) => (
                    <button
                      type="button"
                      onClick={open}
                      aria-label={`ویرایش ${user.name}`}
                      className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--brand)]"
                    >
                      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M11 2.5 13.5 5 6 12.5 3 13l.5-3z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                />
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
