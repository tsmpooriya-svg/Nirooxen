import { BrandDialog, DeleteTaxonomyButton } from "@/components/admin/taxonomy-forms";
import { AdminPageHeader, DataTable, Panel, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { toFaDigits } from "@/lib/utils";
import { getBrandOptions } from "@/modules/admin/queries";
import { requirePageAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

const empty = {
  name: "", slug: "", latinName: "", country: "", description: "",
  website: "", logoUrl: "", position: "0", isActive: true, isFeatured: false,
};

export default async function AdminBrandsPage() {
  await requirePageAccess("brands");

  const brands = await getBrandOptions();

  return (
    <>
      <AdminPageHeader
        title="برندها"
        description="برندهایی که محصولاتشان را تأمین می‌کنید."
        actions={
          <BrandDialog
            values={empty}
            trigger={{ kind: "primary", label: "برند جدید" }}
            />
        }
      />

      <Panel padded={false}>
        <DataTable head={["برند", "کشور", "تعداد محصول", "وضعیت", "ترتیب", ""]} empty={brands.length === 0}>
          {brands.map((brand) => (
            <Tr key={brand.id}>
              <Td>
                <span className="block font-medium">{brand.name}</span>
                <span className="mt-0.5 block font-mono text-micro text-[var(--fg-subtle)]" dir="ltr">{brand.slug}</span>
              </Td>
              <Td className="text-xs">{brand.country ?? "—"}</Td>
              <Td className="font-mono text-xs">{toFaDigits(brand.productCount)}</Td>
              <Td>
                <StatusBadge
                  map={{ on: { label: "فعال", tone: "ok" }, off: { label: "غیرفعال", tone: "neutral" } }}
                  value={brand.isActive ? "on" : "off"}
                />
                {brand.isFeatured && <span className="mt-1 block text-micro text-[var(--signal-text)]">شاخص</span>}
              </Td>
              <Td className="font-mono text-xs">{toFaDigits(brand.position)}</Td>
              <Td className="w-24">
                <div className="flex items-center gap-0.5">
                  <BrandDialog
                    values={{
                      id: brand.id, name: brand.name, slug: brand.slug, latinName: "", country: brand.country ?? "",
                      description: "", website: "", logoUrl: "", position: String(brand.position),
                      isActive: brand.isActive, isFeatured: brand.isFeatured,
                    }}
                    trigger={{ kind: "icon", label: `ویرایش ${brand.name}` }}
                    />
                  <DeleteTaxonomyButton kind="brand" id={brand.id} name={brand.name} productCount={brand.productCount} />
                </div>
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
