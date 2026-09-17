import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import {
  PasswordForm,
  ProfileDetailsForm,
  RevokeOthersButton,
  RevokeSessionButton,
} from "@/components/admin/profile-forms";
import { requireUser } from "@/lib/auth";
import { USER_ROLE } from "@/lib/constants";
import { formatDate, formatRelative, initials, toFaDigits } from "@/lib/utils";
import { countOtherSessions, getMyProfile, getMySessions } from "@/modules/auth/profile";

export const dynamic = "force-dynamic";

/**
 * حساب کاربری.
 *
 * تنها صفحهٔ پنل که مجوز بخشی نمی‌خواهد — موضوعش حساب خودِ فرد است. پیش از
 * این، کارشناس فروش برای عوض کردن رمزش باید از مدیر ارشد خواهش می‌کرد، چون
 * تنها راه، صفحهٔ «کاربران پنل» بود که فقط OWNER می‌بیند.
 */
export default async function AdminProfilePage() {
  await requireUser();

  const [profile, sessions, others] = await Promise.all([
    getMyProfile(),
    getMySessions(),
    countOtherSessions(),
  ]);

  if (!profile) return null;

  const role = USER_ROLE[profile.role];

  /*
    فهرست بریده می‌شود، چون هر ورود یک نشست می‌سازد و کسی که از چند مرورگر و
    چند دستگاه کار می‌کند به‌سرعت ده‌ها ردیف جمع می‌کند. آنچه به کار می‌آید
    تازه‌ترین‌هاست؛ برای دم دراز، دکمهٔ «خروج از بقیهٔ دستگاه‌ها» همان کار را
    یک‌جا می‌کند.
  */
  const VISIBLE = 8;
  const shown = sessions.slice(0, VISIBLE);
  const hidden = sessions.length - shown.length;

  return (
    <>
      <AdminPageHeader
        title="حساب کاربری"
        description="اطلاعات شخصی، رمز عبور و دستگاه‌هایی که با آن‌ها وارد شده‌اید."
      />

      {/* ── کارت هویت ─────────────────────────────────────────────────────
          شبکهٔ نقشه‌کشی و درخشش برند، همان زبان بصری بقیهٔ سایت. تزئین محض
          نیست: این کارت باید در یک نگاه بگوید «این حساب کیست و چه دسترسی‌ای
          دارد» — همان چیزی که پیش از هر تغییری باید مطمئن شد. */}
      <section className="edge-lit relative mb-6 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)]">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 120% at 82% -10%, var(--brand-soft), transparent 68%)," +
              "repeating-linear-gradient(to right, var(--grid-line) 0 1px, transparent 1px 28px)," +
              "repeating-linear-gradient(to bottom, var(--grid-line) 0 1px, transparent 1px 28px)",
          }}
        />

        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-[var(--brand-soft)] font-display text-2xl font-bold text-[var(--brand)] ring-1 ring-[var(--border-brand)]">
            {initials(profile.name)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-bold">{profile.name}</h2>
              <Badge tone={role.tone} dot>{role.label}</Badge>
            </div>
            <p className="mt-1.5 font-mono text-meta text-[var(--fg-muted)]" dir="ltr">
              {profile.email}
            </p>
            <p className="mt-1 text-micro text-[var(--fg-subtle)]">{role.description}</p>
          </div>

          <dl className="grid shrink-0 grid-cols-3 gap-5 border-t border-[var(--border-hairline)] pt-5 sm:border-s sm:border-t-0 sm:ps-8 sm:pt-0">
            {[
              { label: "عضو از", value: formatDate(profile.createdAt) },
              { label: "آخرین ورود", value: formatRelative(profile.lastLoginAt) },
              { label: "دستگاه فعال", value: toFaDigits(sessions.length) },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-micro text-[var(--fg-subtle)]">{stat.label}</dt>
                <dd className="mt-1 text-meta font-semibold text-[var(--fg-primary)]">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel title="اطلاعات شخصی">
          <ProfileDetailsForm name={profile.name} phone={profile.phone ?? ""} />
          {/*
            ایمیل و نقش عمداً اینجا قابل ویرایش نیستند: اولی شناسهٔ ورود است و
            دومی مرز دسترسی. هیچ‌کدام نباید با فرمی که خود کاربر پر می‌کند
            جابه‌جا شود.
          */}
          <p className="mt-5 border-t border-[var(--border-hairline)] pt-4 text-micro leading-6 text-[var(--fg-subtle)]">
            ایمیل و سطح دسترسی را فقط مدیر ارشد می‌تواند عوض کند.
          </p>
        </Panel>

        <Panel title="تغییر رمز عبور">
          <PasswordForm />
        </Panel>
      </div>

      <Panel
        title="دستگاه‌های فعال"
        action={<RevokeOthersButton count={others} />}
        padded={false}
      >
        <ul className="divide-y divide-[var(--border-hairline)]">
          {shown.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span
                aria-hidden
                className={
                  session.isCurrent
                    ? "grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--ok-soft)] text-[var(--ok)]"
                    : "grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--bg-elev-3)] text-[var(--fg-subtle)]"
                }
              >
                <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2.5" y="3.5" width="15" height="10" rx="1.5" />
                  <path d="M7 16.5h6" />
                </svg>
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-meta font-medium">
                  {session.device}
                  {session.isCurrent && <Badge tone="ok" dot>همین دستگاه</Badge>}
                </p>
                <p className="mt-1 text-micro text-[var(--fg-subtle)]">
                  ورود {formatRelative(session.createdAt)}
                  {session.ip && (
                    <>
                      {" · "}
                      <span dir="ltr">{session.ip}</span>
                    </>
                  )}
                  {" · "}
                  اعتبار تا {formatDate(session.expiresAt)}
                </p>
              </div>

              {!session.isCurrent && <RevokeSessionButton sessionId={session.id} />}
            </li>
          ))}
        </ul>

        <p className="border-t border-[var(--border-hairline)] px-5 py-4 text-micro leading-6 text-[var(--fg-subtle)]">
          {hidden > 0 && (
            <>
              و {toFaDigits(hidden)} نشست قدیمی‌تر که اینجا نشان داده نشده — با دکمهٔ بالا همه
              با هم بسته می‌شوند.
              <br />
            </>
          )}
          هر ورود یک نشست می‌سازد و پس از سی روز خودش منقضی می‌شود. اگر دستگاهی را
          نمی‌شناسید، ببندیدش و رمزتان را عوض کنید.
        </p>
      </Panel>
    </>
  );
}
