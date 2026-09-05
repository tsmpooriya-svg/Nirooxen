import { UserDialog } from "@/components/admin/user-form";
import { AdminPageHeader, DataTable, Panel, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { USER_ROLE } from "@/lib/constants";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { listUsers } from "@/modules/admin/queries";
import { requirePageAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requirePageAccess("users");

  const users = await listUsers();

  return (
    <>
      <AdminPageHeader
        title="کاربران پنل"
        description="سطح دسترسی هر کاربر تعیین می‌کند به کدام بخش‌های پنل دسترسی دارد."
        actions={
          <UserDialog
            values={{ name: "", email: "", phone: "", role: "SALES", isActive: true }}
            trigger={{ kind: "primary", label: "کاربر جدید" }}
            />
        }
      />

      <Panel padded={false}>
        <DataTable head={["کاربر", "سطح دسترسی", "وضعیت", "آخرین ورود", ""]} empty={users.length === 0}>
          {users.map((user) => (
            <Tr key={user.id}>
              <Td>
                <span className="block font-medium">{user.name}</span>
                <span className="mt-0.5 block font-mono text-micro text-[var(--fg-subtle)]" dir="ltr">{user.email}</span>
              </Td>
              <Td>
                <StatusBadge map={USER_ROLE} value={user.role} />
                <span className="mt-1 block text-micro text-[var(--fg-subtle)]">{USER_ROLE[user.role].description}</span>
              </Td>
              <Td>
                <StatusBadge
                  map={{ on: { label: "فعال", tone: "ok" }, off: { label: "غیرفعال", tone: "danger" } }}
                  value={user.isActive ? "on" : "off"}
                />
              </Td>
              <Td className="whitespace-nowrap text-micro text-[var(--fg-subtle)]">
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
                  trigger={{ kind: "icon", label: `ویرایش ${user.name}` }}
                    />
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
