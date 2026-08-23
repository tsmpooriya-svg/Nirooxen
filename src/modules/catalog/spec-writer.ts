/**
 * =============================================================================
 *  نوشتن مشخصات فنی — تبدیل ورودی فرم به ردیف نوع‌دار
 * =============================================================================
 *  هر جایی که مشخصات یک محصول ذخیره می‌شود باید از این ماژول عبور کند.
 *
 *  چرا؟ ذخیره مستقیم ورودی فرم، ستون‌های نوع‌دار را خالی می‌گذارد و محصول
 *  بی‌صدا از فیلترها حذف می‌شود. این ماژول همان منطقی را اجرا می‌کند که
 *  اسکریپت backfill اجرا کرد، پس داده‌ای که از پنل مدیریت وارد می‌شود با
 *  داده‌ای که مهاجرت ساخته یکسان است.
 *
 *  پنل مدیریت آینده می‌تواند `definitionKey` را صریح بفرستد (وقتی مدیر از
 *  فهرست مشخصه‌ها انتخاب می‌کند). اگر نفرستد، تطبیق با برچسب انجام می‌شود تا
 *  فرم فعلی هم بدون تغییر کار کند.
 * =============================================================================
 */
import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { specDefinitions, units } from "@/db/schema";
import { parseBooleanValue, parseNumericValue } from "@/lib/spec-value";

export type SpecInput = {
  groupName?: string;
  label: string;
  value: string;
  unit?: string | null;
  isKey?: boolean;
  /** پنل مدیریت آینده این را صریح می‌فرستد */
  definitionKey?: string;
};

export type SpecRow = {
  productId: string;
  definitionId: string | null;
  groupName: string;
  label: string;
  value: string;
  unit: string | null;
  valueText: string | null;
  valueNum: string | null;
  valueNumMax: string | null;
  valueBool: boolean | null;
  unitId: string | null;
  valueBase: string | null;
  valueBaseMax: string | null;
  isUnparsed: boolean;
  position: number;
  isKey: boolean;
};

/**
 * ساخت ردیف‌های آماده درج از ورودی خام فرم.
 *
 * تعریف‌ها و واحدها یک‌بار از پایگاه داده خوانده می‌شوند، پس تعداد کوئری
 * مستقل از تعداد مشخصات است.
 */
export async function buildSpecRows(productId: string, specs: SpecInput[]): Promise<SpecRow[]> {
  if (specs.length === 0) return [];

  const [defRows, unitRows] = await Promise.all([
    db.select().from(specDefinitions).where(eq(specDefinitions.isActive, true)),
    db.select().from(units).where(eq(units.isActive, true)),
  ]);

  const unitById = new Map(unitRows.map((u) => [u.id, u]));
  const unitByLabel = new Map(unitRows.map((u) => [u.label.trim(), u]));
  const defByKey = new Map(defRows.map((d) => [d.key, d]));
  // تطبیق با برچسبِ خودِ تعریف — نگاشت برچسب‌های میراثی در backfill انجام شده
  const defByLabel = new Map(defRows.map((d) => [d.label.trim(), d]));

  return specs.map((spec, index) => {
    const definition =
      (spec.definitionKey ? defByKey.get(spec.definitionKey) : undefined) ??
      defByLabel.get(spec.label.trim()) ??
      null;

    const base: SpecRow = {
      productId,
      definitionId: definition?.id ?? null,
      groupName: definition?.groupName ?? spec.groupName ?? "مشخصات عمومی",
      label: spec.label,
      value: spec.value,
      unit: spec.unit || null,
      valueText: null,
      valueNum: null,
      valueNumMax: null,
      valueBool: null,
      unitId: null,
      valueBase: null,
      valueBaseMax: null,
      isUnparsed: false,
      position: index,
      isKey: Boolean(spec.isKey),
    };

    // بدون تعریف، ردیف فقط با ستون‌های قدیمی ذخیره می‌شود و درست نمایش داده
    // می‌شود — اما در فیلترها نمی‌آید. این حالت مجاز و بی‌خطر است.
    if (!definition) return base;

    const unitRow =
      (spec.unit ? unitByLabel.get(spec.unit.trim()) : undefined) ??
      (definition.defaultUnitId ? unitById.get(definition.defaultUnitId) : undefined) ??
      null;

    base.unitId = unitRow?.id ?? null;
    const factor = unitRow ? Number(unitRow.toBaseFactor) : 1;

    if (definition.dataType === "TEXT") {
      base.valueText = spec.value.trim();
      return base;
    }

    if (definition.dataType === "BOOLEAN") {
      const parsed = parseBooleanValue(spec.value);
      if (parsed === null) {
        base.isUnparsed = true;
        base.valueText = spec.value.trim();
      } else {
        base.valueBool = parsed;
      }
      return base;
    }

    const parsed = parseNumericValue(spec.value);
    if (!parsed.ok) {
      // مقدار حدس زده نمی‌شود؛ خام حفظ و علامت‌گذاری می‌شود
      base.isUnparsed = true;
      base.valueText = spec.value.trim();
      return base;
    }

    base.valueNum = parsed.min === null ? null : String(parsed.min);
    base.valueNumMax = parsed.max === null ? null : String(parsed.max);
    base.valueBase = parsed.min === null ? null : String(parsed.min * factor);
    base.valueBaseMax = parsed.max === null ? null : String(parsed.max * factor);
    return base;
  });
}
