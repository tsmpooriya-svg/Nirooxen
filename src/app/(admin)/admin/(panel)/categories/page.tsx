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
            trigger={(open) => (
              <button
                type="button"
                onClick={open}
                className="flex h-10 items-center gap-2 rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-[var(--fg-on-brand)] transition-colors hover:bg-[var(--brand-hover)]"
              >
                دسته‌بندی جدید
              </button>
            )}
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
              <Td className="font-mono text-[0.6875rem] text-[var(--fg-subtle)]" dir="ltr">{category.slug}</Td>
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
                    trigger={(open) => (
                      <button
                        type="button"
                        onClick={open}
                        aria-label={`ویرایش ${category.name}`}
                        className="grid size-8 place-items-center rounded-md text-[var(--fg-subtle)] transition-colors hover:text-[var(--brand)]"
                      >
                        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M11 2.5 13.5 5 6 12.5 3 13l.5-3z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
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
