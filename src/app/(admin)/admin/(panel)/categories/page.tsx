import { CategoryDialog, DeleteTaxonomyButton } from "@/components/admin/taxonomy-forms";
import { AdminPageHeader, DataTable, Panel, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { toFaDigits } from "@/lib/utils";
import { getCategoryOptions } from "@/modules/admin/queries";

export const dynamic = "force-dynamic";

const empty = {
  name: "", slug: "", description: "", icon: "", parentId: "",
  position: "0", isActive: true, isFeatured: false, metaTitle: "", metaDescription: "",
};

export default async function AdminCategoriesPage() {
  const categories = await getCategoryOptions();
  const roots = categories.filter((c) => c.depth === 0).map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <AdminPageHeader
        title="دسته‌بندی‌ها"
        description="ساختار درختی کاتالوگ. دسته‌ای که محصول دارد قابل حذف نیست."
        actions={
          <CategoryDialog
            values={empty}
            parents={roots}
            trigger={{ kind: "primary", label: "دسته‌بندی جدید" }}
            />
        }
      />

      <Panel padded={false}>
        <DataTable head={["نام", "نامک", "تعداد محصول", "وضعیت", "ترتیب", ""]} empty={categories.length === 0}>
          {categories.map((category) => (
            <Tr key={category.id}>
              <Td>
                <span className={category.depth > 0 ? "flex items-center gap-2 ps-6" : "flex items-center gap-2"}>
                  {category.depth > 0 && <span className="text-[var(--fg-subtle)]">└</span>}
                  <span className="font-medium">{category.name}</span>
                </span>
              </Td>
              <Td className="font-mono text-micro text-[var(--fg-subtle)]" dir="ltr">{category.slug}</Td>
              <Td className="font-mono text-xs">{toFaDigits(category.productCount)}</Td>
              <Td>
                <StatusBadge
                  map={{ on: { label: "فعال", tone: "ok" }, off: { label: "غیرفعال", tone: "neutral" } }}
                  value={category.isActive ? "on" : "off"}
                />
              </Td>
              <Td className="font-mono text-xs">{toFaDigits(category.position)}</Td>
              <Td className="w-24">
                <div className="flex items-center gap-0.5">
                  <CategoryDialog
                    values={{
                      id: category.id, name: category.name, slug: category.slug, description: "",
                      icon: "", parentId: category.parentId ?? "", position: String(category.position),
                      isActive: category.isActive, isFeatured: false, metaTitle: "", metaDescription: "",
                    }}
                    parents={roots}
                    trigger={{ kind: "icon", label: `ویرایش ${category.name}` }}
                    />
                  <DeleteTaxonomyButton kind="category" id={category.id} name={category.name} />
                </div>
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
