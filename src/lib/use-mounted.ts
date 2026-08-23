"use client";

import * as React from "react";

/** هیچ‌وقت تغییر نمی‌کند، پس نیازی به اشتراک واقعی نیست */
const subscribe = () => () => {};

/**
 * آیا کامپوننت روی کلاینت هیدریت شده است؟
 *
 * جایگزین الگوی `useState(false)` + `useEffect(() => setMounted(true))`.
 * آن الگو یک رندر اضافی تحمیل می‌کند و قانون `react-hooks/set-state-in-effect`
 * را نقض می‌کند؛ `useSyncExternalStore` همان نتیجه را بدون effect می‌دهد:
 * روی سرور `false` و روی کلاینت `true`.
 *
 * کاربرد: پنهان کردن مقادیری که فقط در مرورگر وجود دارند (مثل محتوای
 * localStorage) تا HTML سرور و اولین رندر کلاینت یکسان بمانند.
 */
export function useMounted(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
