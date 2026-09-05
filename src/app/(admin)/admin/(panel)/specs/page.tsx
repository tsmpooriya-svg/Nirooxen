import {
  CategorySpecDialog,
  DATA_TYPE_LABELS,
  DIMENSION_LABELS,
  DeleteSpecButton,
  FILTER_UI_LABELS,
  SpecDefinitionDialog,
  UnitDialog,
} from "@/components/admin/spec-forms";
import { AdminPageHeader, DataTable, Panel, StatusBadge, Td, Tr } from "@/components/admin/ui";
import { requirePageAccess } from "@/lib/auth";
import { toFaDigits } from "@/lib/utils";
import {
  getAdminCategorySpecs,
  getAdminSpecDefinitions,
  getAdminUnits,
  getCategoryOptions,
} from "@/modules/admin/queries";

export const dynamic = "force-dynamic";

const emptyUnit = {
  code: "", label: "", symbol: "", dimension: "OTHER",
  toBaseFactor: "1", isBase: false, isActive: true, position: "0",
};

const emptyDefinition = {
  key: "", label: "", description: "", dataType: "NUMBER", dimension: "",
  defaultUnitId: "", groupName: "مشخصات عمومی", isFilterable: false,
  filterUi: "NONE", isActive: true, position: "0",
};

export default async function AdminSpecsPage() {
  await requirePageAccess("products");

  const [units, definitions, links, categories] = await Promise.all([
    getAdminUnits(),
    getAdminSpecDefinitions(),
    getAdminCategorySpecs(),
    getCategoryOptions(),
  ]);

  const unitOptions = units.map((u) => ({
    id: u.unit.id,
    label: u.unit.label,
    dimension: u.unit.dimension,
  }));

  const definitionOptions = definitions.map((d) => ({
    id: d.definition.id,
    label: d.definition.label,
    key: d.definition.key,
  }));

  return (
    <>
      <AdminPageHeader
        title="مشخصات فنی"
        description="مشخصه‌ها، واحدها و اینکه هر دسته‌بندی چه فیلترهایی نشان دهد. تغییرات بدون نیاز به کدنویسی روی سایت اعمال می‌شوند."
      />

      {/* ---------------------------- تعریف مشخصه‌ها --------------------------- */}
      <Panel
        title="مشخصه‌ها"
        padded={false}
        className="mb-6"
        action={
          <SpecDefinitionDialog
            values={emptyDefinition}
            units={unitOptions}
            trigger={{ kind: "primary", label: "مشخصه جدید" }}
            />
        }
      >
        <DataTable
          head={["مشخصه", "نوع", "واحد", "گروه", "فیلتر", "مقادیر", "دسته‌ها", "وضعیت", ""]}
          empty={definitions.length === 0}
        >
          {definitions.map((row) => (
            <Tr key={row.definition.id}>
              <Td>
                <span className="block font-medium">{row.definition.label}</span>
                <span className="mt-0.5 block font-mono text-micro text-[var(--fg-subtle)]" dir="ltr">
                  {row.definition.key}
                </span>
              </Td>
              <Td className="text-xs">{DATA_TYPE_LABELS[row.definition.dataType]}</Td>
              <Td className="text-xs">
                {row.unitLabel ?? "—"}
                {row.unitSymbol && (
                  <span className="ms-1 font-mono text-micro text-[var(--fg-subtle)]" dir="ltr">
                    {row.unitSymbol}
                  </span>
                )}
              </Td>
              <Td className="text-xs">{row.definition.groupName}</Td>
              <Td className="text-xs">
                {row.definition.isFilterable ? FILTER_UI_LABELS[row.definition.filterUi] : "—"}
              </Td>
              <Td className="font-mono text-xs">{toFaDigits(row.valueCount)}</Td>
              <Td className="font-mono text-xs">{toFaDigits(row.categoryCount)}</Td>
              <Td>
                <StatusBadge
                  map={{ on: { label: "فعال", tone: "ok" }, off: { label: "غیرفعال", tone: "neutral" } }}
                  value={row.definition.isActive ? "on" : "off"}
                />
              </Td>
              <Td className="w-24">
                <div className="flex items-center gap-0.5">
                  <SpecDefinitionDialog
                    units={unitOptions}
                    values={{
                      id: row.definition.id,
                      key: row.definition.key,
                      label: row.definition.label,
                      description: row.definition.description ?? "",
                      dataType: row.definition.dataType,
                      dimension: row.definition.dimension ?? "",
                      defaultUnitId: row.definition.defaultUnitId ?? "",
                      groupName: row.definition.groupName,
                      isFilterable: row.definition.isFilterable,
                      filterUi: row.definition.filterUi,
                      isActive: row.definition.isActive,
                      position: String(row.definition.position),
                    }}
                    trigger={{ kind: "icon", label: `ویرایش ${row.definition.label}` }}
                    />
                  <DeleteSpecButton kind="definition" id={row.definition.id} name={row.definition.label} />
                </div>
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>

      {/* ------------------------ اتصال مشخصه به دسته ------------------------- */}
      <Panel
        title="فیلترهای هر دسته‌بندی"
        padded={false}
        className="mb-6"
        action={
          <CategorySpecDialog
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            definitions={definitionOptions}
            trigger={{ kind: "primary", label: "اتصال جدید" }}
            />
        }
      >
        <DataTable head={["دسته‌بندی", "مشخصه", "فیلتر", "کارت محصول", "ترتیب", ""]} empty={links.length === 0}>
          {links.map((row) => (
            <Tr key={row.link.id}>
              <Td>
                <span className="block font-medium">{row.categoryName}</span>
                <span className="mt-0.5 block font-mono text-micro text-[var(--fg-subtle)]" dir="ltr">
                  {row.categorySlug}
                </span>
              </Td>
              <Td className="text-xs">{row.definitionLabel}</Td>
              <Td className="text-xs">
                {(row.link.isFilterable ?? row.definitionFilterable)
                  ? FILTER_UI_LABELS[row.filterUi]
                  : "—"}
              </Td>
              <Td className="text-xs">{row.link.isKey ? "بله" : "—"}</Td>
              <Td className="font-mono text-xs">{toFaDigits(row.link.position)}</Td>
              <Td className="w-16">
                <DeleteSpecButton
                  kind="link"
                  id={row.link.id}
                  name={`${row.definitionLabel} از ${row.categoryName}`}
                />
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>

      {/* -------------------------------- واحدها ------------------------------ */}
      <Panel
        title="واحدها"
        padded={false}
        action={
          <UnitDialog
            values={emptyUnit}
            trigger={{ kind: "primary", label: "واحد جدید" }}
            />
        }
      >
        <DataTable
          head={["واحد", "بُعد", "ضریب تبدیل", "پایه", "استفاده", "وضعیت", ""]}
          empty={units.length === 0}
        >
          {units.map((row) => (
            <Tr key={row.unit.id}>
              <Td>
                <span className="block font-medium">{row.unit.label}</span>
                <span className="mt-0.5 block font-mono text-micro text-[var(--fg-subtle)]" dir="ltr">
                  {row.unit.code}
                  {row.unit.symbol ? ` · ${row.unit.symbol}` : ""}
                </span>
              </Td>
              <Td className="text-xs">{DIMENSION_LABELS[row.unit.dimension] ?? row.unit.dimension}</Td>
              <Td className="font-mono text-xs" dir="ltr">{row.unit.toBaseFactor}</Td>
              <Td className="text-xs">{row.unit.isBase ? "✓" : "—"}</Td>
              <Td className="font-mono text-xs">{toFaDigits(row.usageCount)}</Td>
              <Td>
                <StatusBadge
                  map={{ on: { label: "فعال", tone: "ok" }, off: { label: "غیرفعال", tone: "neutral" } }}
                  value={row.unit.isActive ? "on" : "off"}
                />
              </Td>
              <Td className="w-16">
                <UnitDialog
                  values={{
                    id: row.unit.id,
                    code: row.unit.code,
                    label: row.unit.label,
                    symbol: row.unit.symbol ?? "",
                    dimension: row.unit.dimension,
                    toBaseFactor: row.unit.toBaseFactor,
                    isBase: row.unit.isBase,
                    isActive: row.unit.isActive,
                    position: String(row.unit.position),
                  }}
                  trigger={{ kind: "icon", label: `ویرایش ${row.unit.label}` }}
                    />
              </Td>
            </Tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
