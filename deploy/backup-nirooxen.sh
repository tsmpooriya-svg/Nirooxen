#!/usr/bin/env bash
# =============================================================================
#  پشتیبان‌گیری نیروکسن
# =============================================================================
#  دو چیز گرفته می‌شود، چون هیچ‌کدام بدون دیگری کامل نیست:
#    • پایگاه داده — محصولات، سفارش‌ها، مشتریان، کاربران
#    • پوشهٔ مدیا — فایل تصاویری که از پنل آپلود شده و در پایگاه داده نیست
#
#  دامپ با فرمت custom گرفته می‌شود (فشرده، و pg_restore می‌تواند بخشی از آن
#  را هم برگرداند)، بعد خوانده می‌شود تا مطمئن شویم سالم است. فایلی که باز
#  نمی‌شود پشتیبان نیست، و بدترین وقت برای فهمیدنش روز حادثه است. نسخه‌های
#  قدیمی فقط پس از تأیید سالم بودنِ نسخهٔ تازه پاک می‌شوند.
#
#  اجرا با root:  bash deploy/backup-nirooxen.sh
#  زمان‌بندی:      deploy/nirooxen-backup.timer
# =============================================================================
set -euo pipefail

DB_NAME="${DB_NAME:-nirooxen}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/nirooxen}"
MEDIA_DIR="${MEDIA_DIR:-/var/lib/nirooxen/media}"
KEEP_DAYS="${KEEP_DAYS:-14}"
# کمترین تعداد جدولِ داده‌دار که یک دامپ سالم باید داشته باشد
MIN_TABLES="${MIN_TABLES:-10}"
# کاربری که pg_dump با آن اجرا می‌شود؛ روی سرور با socket وارد می‌شود و رمز نمی‌خواهد
PG_USER="${PG_USER:-postgres}"

stamp="$(date +%Y%m%d-%H%M%S)"
db_file="$BACKUP_DIR/db-$stamp.dump"
media_file="$BACKUP_DIR/media-$stamp.tar.gz"

# فایلِ نیمه‌کاره نباید بماند: هم جای دیسک می‌گیرد و هم ممکن است روزی با یک
# پشتیبان سالم اشتباه گرفته شود. نسخه‌های قبلی دست نمی‌خورند.
fail() {
  rm -f "$db_file" "$media_file"
  echo "✖ پشتیبان‌گیری ناموفق — $1" >&2
  exit 1
}

install -d -m 700 "$BACKUP_DIR"

# ── پایگاه داده ─────────────────────────────────────────────────────────────
# خروجی به‌صورت جریان به فایل می‌رود تا کاربر postgres نیازی به دسترسی نوشتن
# در پوشهٔ پشتیبان نداشته باشد؛ آن پوشه فقط برای root خواندنی است.
runuser -u "$PG_USER" -- pg_dump --format=custom --no-owner --no-privileges "$DB_NAME" > "$db_file" \
  || fail "pg_dump اجرا نشد"

pg_restore --list "$db_file" > /dev/null 2>&1 || fail "دامپ خوانده نمی‌شود: $db_file"
tables="$(pg_restore --list "$db_file" | grep -c 'TABLE DATA' || true)"
[ "$tables" -ge "$MIN_TABLES" ] || fail "دامپ فقط $tables جدول دارد؛ انتظار دست‌کم $MIN_TABLES"

# ── فایل‌های آپلودشده ───────────────────────────────────────────────────────
if [ -d "$MEDIA_DIR" ]; then
  tar -czf "$media_file" -C "$(dirname "$MEDIA_DIR")" "$(basename "$MEDIA_DIR")" \
    || fail "بسته‌بندی پوشهٔ مدیا انجام نشد"
  tar -tzf "$media_file" > /dev/null 2>&1 || fail "بستهٔ مدیا خوانده نمی‌شود"
else
  echo "⚠ پوشهٔ مدیا پیدا نشد: $MEDIA_DIR — فقط پایگاه داده گرفته شد"
  media_file=""
fi

chmod 600 "$db_file" ${media_file:+"$media_file"}

# ── چرخش ────────────────────────────────────────────────────────────────────
# فقط حالا که نسخهٔ تازه تأیید شده، قدیمی‌ها می‌روند
removed="$(find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'media-*.tar.gz' \) \
  -mtime "+$KEEP_DAYS" -print -delete | wc -l)"

printf '✓ پشتیبان گرفته شد — %s جدول · %s' "$tables" "$(du -h "$db_file" | cut -f1)"
[ -n "$media_file" ] && printf ' + مدیا %s' "$(du -h "$media_file" | cut -f1)"
printf ' · %s نسخهٔ قدیمی حذف شد · %s\n' "$removed" "$BACKUP_DIR"
