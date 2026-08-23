import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/shell";
import { getCurrentUser } from "@/lib/auth";
import { getBadgeCounts } from "@/modules/admin/queries";

/**
 * محافظ پنل.
 *
 * بررسی نشست در layout انجام می‌شود تا هیچ صفحه‌ای از قلم نیفتد؛ اما هر
 * Server Action هم مستقلاً requireUser/requirePermission را صدا می‌زند —
 * چون layout فقط رندر را محافظت می‌کند، نه فراخوانی مستقیم اکشن‌ها.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const counts = await getBadgeCounts();

  return (
    <AdminShell user={user} counts={counts}>
      {children}
    </AdminShell>
  );
}
