import { SettingsForm } from "@/components/admin/settings-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { getSettings } from "@/modules/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <AdminPageHeader
        title="تنظیمات سایت"
        description="این مقادیر روی کل سایت اثر می‌گذارند. تغییرات بلافاصله اعمال می‌شوند."
      />
      <SettingsForm settings={settings.map((s) => ({ ...s, value: s.value as string | boolean }))} />
    </>
  );
}
