"use client";

import { useMemo, useRef, useState } from "react";

import { toFaDigits } from "@/lib/utils";

/**
 * =============================================================================
 *  نمودار ترافیک روزانه
 * =============================================================================
 *  دو سری روی یک محور: بازدید و بازدیدکننده. هر دو شمارش‌اند و یک واحد دارند،
 *  پس روی یک مقیاس می‌نشینند — محور دوم اینجا فقط شیب‌ها را دروغ نشان می‌داد.
 *
 *  رنگ‌ها از توکن‌های --chart-* می‌آیند که در globals.css با اسکریپت سنجیده
 *  شده‌اند. اینجا رنگ ثابتی نوشته نمی‌شود تا حالت روشن و تیره هرکدام پلهٔ خودشان
 *  را بگیرند.
 *
 *  محور زمان چپ‌به‌راست است، برخلاف جهت صفحه. این عمدی است: در نمودار زمانی،
 *  چپ‌به‌راست قراردادی است که همه — از اکسل تا ابزارهای فارسی — به کار می‌برند،
 *  و شکستنش خواندن شیب را سخت می‌کند.
 * =============================================================================
 */

export type TrafficPoint = { day: string; views: number; visitors: number };

const W = 760;
const H = 260;
const PAD = { top: 18, right: 18, bottom: 30, left: 44 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const SERIES = [
  { key: "views", label: "بازدید", color: "var(--chart-views)" },
  { key: "visitors", label: "بازدیدکننده", color: "var(--chart-visitors)" },
] as const;

/** روز به تقویم شمسی، کوتاه — «۲۶ شهریور» */
function faDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

/**
 * سقف محور.
 *
 * تا نزدیک‌ترین عدد گرد بالا می‌رود تا خطوط راهنما عددهای خوانا بگیرند. سقف
 * حداقل ۴ است، وگرنه روی داده‌های خیلی کوچک هر چهار خط روی هم می‌افتند.
 */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

export function TrafficChart({ data }: { data: TrafficPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { max, points } = useMemo(() => {
    const peak = niceMax(Math.max(1, ...data.map((d) => Math.max(d.views, d.visitors))));
    return {
      max: peak,
      points: data.map((d, i) => ({
        ...d,
        // یک نقطه هم باید جایی بنشیند، پس تقسیم بر صفر نمی‌شود
        x: PAD.left + (data.length === 1 ? PLOT_W / 2 : (i / (data.length - 1)) * PLOT_W),
        views_y: PAD.top + PLOT_H - (d.views / peak) * PLOT_H,
        visitors_y: PAD.top + PLOT_H - (d.visitors / peak) * PLOT_H,
      })),
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <p className="py-14 text-center text-sm text-[var(--fg-muted)]">
        هنوز بازدیدی ثبت نشده است.
      </p>
    );
  }

  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  /* برچسب هر روز جا نمی‌شود؛ حدود شش تا کافی است و بقیه حذف می‌شوند */
  const tickEvery = Math.max(1, Math.ceil(points.length / 6));
  /*
    روز آخر همیشه برچسب می‌گیرد، مگر آنکه بغل‌دستِ برچسب قبلی باشد. بدون این
    شرط، در بازه‌هایی که طولشان بر گام بخش‌پذیر نیست، دو برچسب روی هم می‌افتند.
  */
  const lastIndex = points.length - 1;
  const showLast = lastIndex % tickEvery !== 0 && lastIndex % tickEvery >= tickEvery / 2;
  const last = points[points.length - 1]!;
  const active = hover === null ? null : points[hover];

  function locate(event: React.PointerEvent<SVGSVGElement>) {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    // مختصات صفحه به مختصات viewBox — بدون این، روی هر عرضی نقطهٔ اشتباه انتخاب می‌شد
    const x = ((event.clientX - box.left) / box.width) * W;
    let nearest = 0;
    for (let i = 1; i < points.length; i += 1) {
      if (Math.abs(points[i]!.x - x) < Math.abs(points[nearest]!.x - x)) nearest = i;
    }
    setHover(nearest);
  }

  return (
    <div className="relative">
      {/* راهنما — با دو سری همیشه هست، پس هویت هرگز فقط با رنگ گفته نمی‌شود */}
      <div className="mb-3 flex items-center gap-5 text-xs text-[var(--fg-secondary)]">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-[3px] w-5 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`نمودار بازدید روزانه در ${toFaDigits(data.length)} روز گذشته`}
        onPointerMove={locate}
        onPointerLeave={() => setHover(null)}
      >
        {/* شبکه — عمداً کم‌رنگ؛ داده باید جلوتر از آن دیده شود */}
        {gridValues.map((value, i) => {
          const y = PAD.top + PLOT_H - (i / (gridValues.length - 1)) * PLOT_H;
          return (
            <g key={value + "-" + i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="var(--border-hairline)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[var(--fg-subtle)]"
                style={{ fontSize: 11 }}
              >
                {toFaDigits(value)}
              </text>
            </g>
          );
        })}

        {/* برچسب روزها */}
        {points.map((p, i) =>
          i % tickEvery === 0 || (i === lastIndex && showLast) ? (
            <text
              key={p.day}
              x={p.x}
              y={H - 10}
              textAnchor="middle"
              className="fill-[var(--fg-subtle)]"
              style={{ fontSize: 11 }}
            >
              {faDay(p.day)}
            </text>
          ) : null,
        )}

        {/* خط عمودی زیر نشانگر، پیش از خطوط داده تا رویشان نیفتد */}
        {active && (
          <line
            x1={active.x}
            x2={active.x}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="var(--border-default)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/*
          سطح زیر «بازدید». بازدیدکننده هیچ‌وقت از بازدید بیشتر نیست، پس در
          روزهایی که هر بازدیدکننده فقط یک صفحه دیده، دو خط دقیقاً روی هم
          می‌افتند و یکی ناپدید می‌شود. این سطح همان‌جا هم می‌گوید کدام کدام است.
        */}
        <path
          d={
            points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.views_y}`).join(" ") +
            ` L ${last.x} ${PAD.top + PLOT_H} L ${points[0]!.x} ${PAD.top + PLOT_H} Z`
          }
          fill="var(--chart-views)"
          opacity={0.1}
        />

        {SERIES.map((s) => {
          const d = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p[`${s.key}_y`]}`)
            .join(" ");
          return (
            <g key={s.key}>
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {/* نشانگر روی نقطهٔ فعال — حلقهٔ هم‌رنگ زمینه تا روی خط گم نشود */}
              {active && (
                <circle
                  cx={active.x}
                  cy={active[`${s.key}_y`]}
                  r={5}
                  fill={s.color}
                  stroke="var(--bg-elev-1)"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}

        {/* برچسب مستقیم روی آخرین نقطه — با دو سری، خواندن راهنما لازم نشود */}
        {SERIES.map((s) => (
          <text
            key={s.key}
            x={last.x - 6}
            y={last[`${s.key}_y`] - 8}
            textAnchor="end"
            className="fill-[var(--fg-secondary)]"
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            {toFaDigits(last[s.key])}
          </text>
        ))}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute top-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-3 py-2 text-xs shadow-[var(--shadow-md)]"
          /*
            «left» و نه inset-inline-start: پنل راست‌به‌چپ است، پس خاصیت منطقی
            از لبهٔ راست اندازه می‌گیرد، در حالی که x نمودار از چپ می‌آید — و
            تولتیپ آینهٔ نقطه‌ای می‌نشست که نشان می‌داد.

            درصد هم بین ۶ و ۹۴ محدود می‌شود تا در دو سر بازه از قاب بیرون نزند.
          */
          style={{
            left: `${Math.min(94, Math.max(6, (active.x / W) * 100))}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="mb-1 font-medium text-[var(--fg-primary)]">{faDay(active.day)}</div>
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-[var(--fg-secondary)]">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}: {toFaDigits(active[s.key])}
            </div>
          ))}
        </div>
      )}

      {/* همان داده به شکل جدول — برای کسی که نمودار برایش خوانا نیست */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-[var(--fg-muted)] hover:text-[var(--fg-secondary)]">
          نمایش جدولی همین داده
        </summary>
        <table className="mt-3 w-full text-xs">
          <thead className="text-[var(--fg-muted)]">
            <tr>
              <th className="p-2 text-start font-medium">روز</th>
              <th className="p-2 text-start font-medium">بازدید</th>
              <th className="p-2 text-start font-medium">بازدیدکننده</th>
            </tr>
          </thead>
          <tbody className="text-[var(--fg-secondary)]">
            {data.map((d) => (
              <tr key={d.day} className="border-t border-[var(--border-hairline)]">
                <td className="p-2">{faDay(d.day)}</td>
                <td className="p-2">{toFaDigits(d.views)}</td>
                <td className="p-2">{toFaDigits(d.visitors)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
