"use client";

/**
 * =============================================================================
 *  ماژول سبد استعلام
 * =============================================================================
 *  در فاز اول این «سبد خرید» نیست، «سبد استعلام» است: کاربر چند محصول را جمع
 *  می‌کند و یک‌جا درخواست قیمت می‌دهد.
 *
 *  ▸ مسیر ارتقا به سبد خرید واقعی:
 *    1. فیلد type را در checkout از QUOTE به ORDER تغییر دهید
 *    2. مرحله انتخاب روش پرداخت را به فرم اضافه کنید
 *    3. در createOrder پس از ثبت، به درگاه هدایت کنید (جدول payments آماده است)
 *    هیچ‌کدام از این‌ها نیازمند تغییر در این store یا کامپوننت‌های محصول نیست.
 * =============================================================================
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  productId: string;
  name: string;
  slug: string;
  sku: string | null;
  imageUrl: string | null;
  unit: string;
  /** قیمت واحد در لحظه افزودن — فقط برای نمایش؛ سرور دوباره قیمت‌گذاری می‌کند */
  unitPrice: number | null;
  priceMode: "PUBLIC" | "ON_REQUEST" | "CALL";
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,

      add: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === line.productId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.productId === line.productId
                  ? { ...l, quantity: Math.min(999, l.quantity + quantity) }
                  : l,
              ),
              isOpen: true,
            };
          }
          return { lines: [...state.lines, { ...line, quantity }], isOpen: true };
        }),

      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.productId === productId ? { ...l, quantity: Math.max(1, Math.min(999, quantity)) } : l,
          ),
        })),

      clear: () => set({ lines: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "aria-quote-cart",
      // وضعیت باز/بسته بودن پنل نباید ذخیره شود
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

/** تعداد کل اقلام — برای نشانگر هدر */
export function useCartCount(): number {
  return useCart((state) => state.lines.reduce((sum, l) => sum + l.quantity, 0));
}

/**
 * جمع مبلغ اقلامی که قیمت عمومی دارند.
 *
 * محاسبه عمداً بیرون از selector انجام می‌شود: اگر selector یک شیء تازه
 * برگرداند، zustand در هر رندر تغییر تشخیص می‌دهد و حلقه بی‌نهایت می‌سازد.
 */
export function useCartSubtotal(): { total: number; hasHiddenPrice: boolean } {
  const lines = useCart((state) => state.lines);
  let total = 0;
  let hasHiddenPrice = false;
  for (const line of lines) {
    if (line.priceMode === "PUBLIC" && line.unitPrice) total += line.unitPrice * line.quantity;
    else hasHiddenPrice = true;
  }
  return { total, hasHiddenPrice };
}
