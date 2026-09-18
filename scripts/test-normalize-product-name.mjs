import assert from "node:assert/strict";
import { normalizeProductNameDigits } from "./lib/normalize-product-name.mjs";

const cases = [
  ["پمپ 2 اسب", "پمپ ۲ اسب"],
  ["مدل PM 45", "مدل PM 45"],
  ["کف‌کش توان تک مدل TMR 18/4 F", "کف‌کش توان تک مدل TMR 18/4 F"],
  ["تیلر مدل T-900", "تیلر مدل T-900"],
  ["شناور ۷۰ متری یک اینچ 4SKM", "شناور ۷۰ متری یک اینچ 4SKM"],
  ["پمپ 1/5 اسب", "پمپ ۱/۵ اسب"],
];

for (const [input, expected] of cases) {
  assert.equal(normalizeProductNameDigits(input), expected, input);
}

console.log(\`✓ \${cases.length} نام نرمال‌سازی‌شده مطابق قاعده هستند.\`);
