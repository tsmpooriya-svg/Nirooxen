/**
 * تولید تصاویر جانشین «نقشه فنی» برای محصولات و پروژه‌ها.
 *
 * تا زمانی که عکس واقعی محصولات آپلود شود، این SVGها به‌جای تصویر خالی
 * یا لینک شکسته می‌نشینند. سبک آن‌ها عمداً با زبان بصری سایت (بلوپرینت)
 * یکی است تا صفحه حرفه‌ای دیده شود.
 *
 * اجرا:  node scripts/generate-placeholders.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/images/products");
mkdirSync(outDir, { recursive: true });

/** نقشه‌های فنی — مختصات روی بوم ۴۸۰×۳۶۰ */
const drawings = {
  "centrifugal-pump": `
    <circle cx="200" cy="190" r="82" />
    <circle cx="200" cy="190" r="58" opacity=".55" />
    <circle cx="200" cy="190" r="10" fill="currentColor" stroke="none" />
    <path d="M200 190 258 148M200 190l62 30M200 190l-24 78M200 190l-72-26M200 190l34-72" opacity=".7" />
    <path d="M200 108V70h64" />
    <path d="M282 190h76v52" />
    <rect x="118" y="252" width="164" height="30" rx="4" />
    <path d="M140 282v18M260 282v18" />
    <path d="M330 132h52M356 106v52" opacity=".45" />`,
  "electro-pump": `
    <rect x="60" y="132" width="150" height="110" rx="8" />
    <path d="M84 132v-22M186 132v-22M92 242v22M178 242v22" />
    <path d="M78 158h114M78 178h114M78 198h114" opacity=".35" />
    <circle cx="292" cy="188" r="66" />
    <circle cx="292" cy="188" r="44" opacity=".5" />
    <circle cx="292" cy="188" r="8" fill="currentColor" stroke="none" />
    <path d="M292 188l44-30M292 188l38 34M292 188l-14 50" opacity=".7" />
    <path d="M292 122V78h58" />
    <path d="M210 188h16" />`,
  "pressure-tank": `
    <path d="M150 122a90 44 0 0 1 180 0v128a90 44 0 0 1-180 0z" />
    <ellipse cx="240" cy="122" rx="90" ry="44" />
    <ellipse cx="240" cy="122" rx="58" ry="28" opacity=".4" />
    <path d="M150 190a90 44 0 0 0 180 0" opacity=".35" />
    <path d="M240 78V44M186 294v34M294 294v34" />
    <rect x="216" y="30" width="48" height="16" rx="3" />
    <path d="M330 210h56M358 184v52" opacity=".45" />
    <path d="M110 122h30M110 250h30" opacity=".45" />`,
  "gate-valve": `
    <path d="M60 190h92M328 190h92" />
    <path d="m152 132 176 116V132L152 248z" />
    <path d="M240 190v-72" />
    <ellipse cx="240" cy="110" rx="56" ry="14" />
    <path d="M240 96V78" />
    <circle cx="240" cy="70" r="10" />
    <path d="M60 158v64M420 158v64" opacity=".5" />
    <path d="M196 268h88" opacity=".4" />`,
  "pipe-fitting": `
    <path d="M60 130h120a44 44 0 0 1 44 44v52a44 44 0 0 0 44 44h152" />
    <path d="M60 96v68M420 236v68" opacity=".5" />
    <path d="M132 96v68M348 236v68" opacity=".3" />
    <rect x="168" y="112" width="26" height="36" rx="3" />
    <rect x="286" y="252" width="26" height="36" rx="3" />
    <path d="M240 174v52" opacity=".3" stroke-dasharray="4 6" />`,
  "booster-set": `
    <rect x="60" y="230" width="360" height="24" rx="4" />
    <circle cx="140" cy="180" r="44" />
    <circle cx="140" cy="180" r="26" opacity=".5" />
    <path d="M140 136v-32h48" />
    <circle cx="270" cy="180" r="44" />
    <circle cx="270" cy="180" r="26" opacity=".5" />
    <path d="M270 136v-32h48" />
    <path d="M348 104h44v126" />
    <path d="M96 254v34M204 254v34M330 254v34M400 254v34" opacity=".6" />
    <rect x="330" y="60" width="80" height="44" rx="6" opacity=".7" />`,
  "submersible-pump": `
    <path d="M180 40h120v40H180z" />
    <path d="M196 80v200h88V80" />
    <path d="M196 118h88M196 156h88M196 194h88M196 232h88" opacity=".4" />
    <path d="M240 280v42" />
    <path d="M204 322h72l-36 34z" />
    <path d="M120 60h44M120 340h44" opacity=".4" />
    <path d="M142 60v280" opacity=".25" stroke-dasharray="5 7" />
    <path d="M316 140h58M345 114v52" opacity=".45" />`,
  "water-filter": `
    <path d="M150 70h180l-64 84v128l-52-30V154z" />
    <path d="M150 70v-26h180v26" />
    <path d="M198 200h30M198 226h30" opacity=".4" />
    <path d="M266 296v30h-52" opacity=".5" />
    <circle cx="356" cy="140" r="34" opacity=".55" />
    <path d="M356 122v36M338 140h36" opacity=".55" />
    <path d="M90 154h44M90 282h44" opacity=".4" />`,
  generic: `
    <rect x="120" y="110" width="240" height="160" rx="10" />
    <path d="M120 170h240M180 110v160" opacity=".35" />
    <circle cx="270" cy="220" r="34" opacity=".6" />
    <path d="M150 140h20" opacity=".6" />
    <path d="M90 110v160M390 110v160" opacity=".4" />`,

  /* ---- مخازن آب پلی‌اتیلن — یکی برای هر خانواده ------------------------ */
  "tank-vertical": `
    <path d="M170 108h140v170a14 14 0 0 1-14 14H184a14 14 0 0 1-14-14z" />
    <ellipse cx="240" cy="108" rx="70" ry="18" />
    <ellipse cx="240" cy="108" rx="26" ry="7" opacity=".6" />
    <path d="M214 101h52" opacity=".6" />
    <path d="M180 150h120M180 190h120M180 230h120" opacity=".28" />
    <path d="M186 292v14h108v-14" opacity=".55" />
    <path d="M340 108v184M334 108h12M334 292h12" opacity=".45" />
    <path d="M170 322h140M170 316v12M310 316v12" opacity=".45" />`,
  "tank-horizontal": `
    <path d="M126 150h228v104H126z" />
    <ellipse cx="126" cy="202" rx="24" ry="52" />
    <ellipse cx="354" cy="202" rx="24" ry="52" opacity=".55" />
    <ellipse cx="240" cy="150" rx="24" ry="8" />
    <path d="M224 143h32" opacity=".6" />
    <path d="M170 254v34h-26v-34M310 254v34h26v-34" opacity=".7" />
    <path d="M126 202h228" opacity=".22" />
    <path d="M102 150v104M96 150h12M96 254h12" opacity=".45" />
    <path d="M126 316h228M126 310v12M354 310v12" opacity=".45" />`,
  "tank-booklike": `
    <path d="M186 104h108v190H186z" />
    <path d="M294 104l36 22v190l-36-22z" opacity=".6" />
    <path d="M186 104l36-22h108l-36 22" opacity=".6" />
    <ellipse cx="240" cy="104" rx="22" ry="7" />
    <path d="M196 148h88M196 190h88M196 232h88" opacity=".26" />
    <path d="M196 294v16h88v-16" opacity=".5" />
    <path d="M156 104v190M150 104h12M150 294h12" opacity=".45" />
    <path d="M186 330h144M186 324v12M330 324v12" opacity=".45" />`,
  "tank-spherical": `
    <circle cx="240" cy="188" r="94" />
    <ellipse cx="240" cy="188" rx="94" ry="30" opacity=".3" />
    <ellipse cx="240" cy="188" rx="34" ry="94" opacity=".22" />
    <ellipse cx="240" cy="96" rx="24" ry="8" />
    <path d="M224 89h32" opacity=".6" />
    <path d="M188 274l-14 34h132l-14-34" opacity=".65" />
    <path d="M174 308h132" opacity=".65" />
    <path d="M356 94v188M350 94h12M350 282h12" opacity=".45" />`,
  "tank-cubic": `
    <path d="M150 140h150v152H150z" />
    <path d="M300 140l40-28v152l-40 28z" opacity=".6" />
    <path d="M150 140l40-28h150l-40 28z" opacity=".6" />
    <ellipse cx="228" cy="128" rx="20" ry="7" />
    <path d="M160 182h130M160 226h130M160 270h130" opacity=".24" />
    <path d="M162 292v16M288 292v16" opacity=".5" />
    <path d="M120 140v152M114 140h12M114 292h12" opacity=".45" />
    <path d="M150 330h190M150 324v12M340 324v12" opacity=".45" />`,
  "tank-underthestairs": `
    <path d="M136 292V208l56-44 56-44 56-44v216z" />
    <path d="M192 164v128M248 120v172" opacity=".3" />
    <ellipse cx="300" cy="76" rx="20" ry="7" />
    <path d="M284 69h32" opacity=".6" />
    <path d="M136 250h168M136 292h168" opacity=".22" />
    <path d="M146 292v16h130v-16" opacity=".5" />
    <path d="M356 76v216M350 76h12M350 292h12" opacity=".45" />
    <path d="M136 330h168M136 324v12M304 324v12" opacity=".45" />`,
};

const label = {
  "centrifugal-pump": "CENTRIFUGAL PUMP",
  "electro-pump": "ELECTRO PUMP UNIT",
  "pressure-tank": "PRESSURE VESSEL",
  "gate-valve": "GATE VALVE",
  "pipe-fitting": "PIPE FITTING",
  "booster-set": "BOOSTER SET",
  "submersible-pump": "SUBMERSIBLE PUMP",
  "water-filter": "FILTRATION UNIT",
  generic: "EQUIPMENT",
  "tank-vertical": "VERTICAL WATER TANK",
  "tank-horizontal": "HORIZONTAL WATER TANK",
  "tank-booklike": "BOOK-TYPE WATER TANK",
  "tank-spherical": "SPHERICAL WATER TANK",
  "tank-cubic": "CUBIC WATER TANK",
  "tank-underthestairs": "UNDER-STAIR WATER TANK",
};

function build(key, paths, index) {
  const id = `g${index}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" width="480" height="360" role="img" aria-label="${label[key]}">
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1220"/>
      <stop offset="1" stop-color="#050910"/>
    </linearGradient>
    <radialGradient id="glow-${id}" cx="50%" cy="42%" r="58%">
      <stop offset="0" stop-color="#22bcd6" stop-opacity=".2"/>
      <stop offset="1" stop-color="#22bcd6" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid-${id}" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0v24" fill="none" stroke="#ffffff" stroke-opacity=".045" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="480" height="360" fill="url(#bg-${id})"/>
  <rect width="480" height="360" fill="url(#grid-${id})"/>
  <rect width="480" height="360" fill="url(#glow-${id})"/>
  <g fill="none" stroke="#4fd3e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".92">
    ${paths.trim()}
  </g>
  <g fill="none" stroke="#22bcd6" stroke-width="1" opacity=".5">
    <path d="M18 18h26M18 18v26M462 18h-26M462 18v26M18 342h26M18 342v-26M462 342h-26M462 342v-26"/>
  </g>
  <text x="24" y="348" fill="#4fd3e8" fill-opacity=".55" font-family="ui-monospace, monospace" font-size="11" letter-spacing="2">${label[key]}</text>
</svg>
`;
}

let i = 0;
for (const [key, paths] of Object.entries(drawings)) {
  writeFileSync(resolve(outDir, `${key}.svg`), build(key, paths, i++), "utf8");
}

console.log(`✔ ${Object.keys(drawings).length} تصویر جانشین در public/images/products ساخته شد.`);
