/**
 * آیکون‌های اختصاصی دامنه صنعت آب.
 *
 * چرا دست‌ساز؟ هیچ مجموعه آیکون عمومی، «پمپ گریز از مرکز»، «مخزن تحت فشار»
 * یا «شیر فلکه» را با کیفیت قابل قبول ندارد. این‌ها روی گرید ۲۴×۲۴ با ضخامت
 * خط ۱٫۵ کشیده شده‌اند تا کنار آیکون‌های lucide یکدست بنشینند.
 */
import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** پمپ گریز از مرکز */
export const IconPump = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="13" r="5.5" />
    <path d="M10 13 13.6 9.4M10 13l4.6 1.6M10 13 8 18.2" />
    <path d="M10 7.5V4h5" />
    <path d="M15.5 13H21v4" />
    <path d="M4.5 18.5h11" />
  </Svg>
);

/** الکتروپمپ / موتور-پمپ */
export const IconMotorPump = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="8.5" width="9" height="8" rx="1.5" />
    <path d="M4.5 8.5V6.5M9.5 8.5V6.5M5 16.5v2M9 16.5v2" />
    <circle cx="16.5" cy="12.5" r="4" />
    <path d="M16.5 12.5 19 10.4M16.5 12.5l3 1.6" />
    <path d="M16.5 8.5V5.5h4" />
  </Svg>
);

/** مخزن تحت فشار */
export const IconTank = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 8.5a5.5 3 0 0 1 11 0v7a5.5 3 0 0 1-11 0z" />
    <ellipse cx="12" cy="8.5" rx="5.5" ry="3" />
    <path d="M12 3v2.5M8.5 19.5v1.5M15.5 19.5v1.5" />
    <path d="M6.5 13.5a5.5 3 0 0 0 11 0" opacity=".5" />
  </Svg>
);

/** لوله و اتصالات */
export const IconPipe = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8h6a3 3 0 0 1 3 3v3a3 3 0 0 0 3 3h6" />
    <path d="M3 5.5v5M21 15.5v5" />
    <path d="M8.5 5.5v5M15.5 15.5v5" opacity=".55" />
  </Svg>
);

/** شیر فلکه */
export const IconValve = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12h4.5M16.5 12H21" />
    <path d="m7.5 7.5 9 9V7.5l-9 9z" />
    <path d="M12 12V6" />
    <path d="M8.5 4.5h7" />
  </Svg>
);

/** فیلتر / تصفیه */
export const IconFilter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4h16l-6 7.5V20l-4-2.5v-6z" />
    <path d="M9 8h6" opacity=".5" />
  </Svg>
);

/** قطره آب */
export const IconDrop = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5c3.2 3.6 5.5 6.6 5.5 9.4a5.5 5.5 0 1 1-11 0c0-2.8 2.3-5.8 5.5-9.4Z" />
    <path d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5" opacity=".6" />
  </Svg>
);

/** فشارسنج / مانومتر */
export const IconGauge = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m12 12 3.5-3" />
    <path d="M12 3.5v2M20.5 12h-2M12 20.5v-1M3.5 12h2M6 6l1.4 1.4M18 6l-1.4 1.4" opacity=".6" />
  </Svg>
);

/** چاه / پمپ شناور */
export const IconWell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8h16" />
    <path d="M6 8v12h12V8" />
    <rect x="10" y="11" width="4" height="7" rx="1.5" />
    <path d="M12 11V8M12 21v-3" />
    <path d="M8 4.5h8" opacity=".6" />
  </Svg>
);

/** جوش و نصب */
export const IconInstall = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14.5 3.5 6 6-2.5 2.5-6-6z" />
    <path d="m12 6 6 6" opacity=".5" />
    <path d="M11 9 4 16v4h4l7-7" />
    <path d="M6.5 17.5h.01" />
  </Svg>
);

/** گواهی / استاندارد */
export const IconCertificate = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="12" rx="2" />
    <path d="M7 7.5h6M7 11h4" opacity=".6" />
    <circle cx="16.5" cy="10" r="2.2" />
    <path d="m15 12.5-.5 4 2-1 2 1-.5-4" />
  </Svg>
);

/** پشتیبانی فنی */
export const IconSupport = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
    <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
    <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
    <path d="M19.5 19v.5a2.5 2.5 0 0 1-2.5 2.5h-3" />
  </Svg>
);

export const domainIcons = {
  pump: IconPump,
  "motor-pump": IconMotorPump,
  tank: IconTank,
  pipe: IconPipe,
  valve: IconValve,
  filter: IconFilter,
  drop: IconDrop,
  gauge: IconGauge,
  well: IconWell,
  install: IconInstall,
  certificate: IconCertificate,
  support: IconSupport,
} as const;

export type DomainIconKey = keyof typeof domainIcons;

/** رندر آیکون بر اساس کلید ذخیره‌شده در پایگاه داده */
export function DomainIcon({
  name,
  ...props
}: Omit<IconProps, "name"> & { name?: string | null }) {
  const Component = (name && domainIcons[name as DomainIconKey]) || IconDrop;
  return <Component {...props} />;
}

/* ------------------------------ لوگو و نشان ------------------------------- */

/**
 * نشان شرکت — سه موج در یک شش‌ضلعی مهندسی.
 * از currentColor استفاده می‌کند تا در هر تم درست بنشیند.
 */
export function Logomark({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true" {...props}>
      <path
        d="M20 2.5 35.5 11v18L20 37.5 4.5 29V11L20 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity=".38"
      />
      <path
        d="M20 6.5 32 13.4v13.2L20 33.5 8 26.6V13.4L20 6.5Z"
        fill="url(#logo-fill)"
        opacity=".14"
      />
      <path
        d="M11.5 17.2c2.4-2.1 4.2-2.1 6.5 0s4.1 2.1 6.5 0 4.2-2.1 6.5 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M11.5 22.4c2.4-2.1 4.2-2.1 6.5 0s4.1 2.1 6.5 0 4.2-2.1 6.5 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".62"
      />
      <path
        d="M11.5 27.6c2.4-2.1 4.2-2.1 6.5 0s4.1 2.1 6.5 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".3"
      />
      <defs>
        <linearGradient id="logo-fill" x1="8" y1="6.5" x2="32" y2="33.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
