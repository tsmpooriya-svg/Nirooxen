#!/usr/bin/env bash
# =============================================================================
#  عکس کامل نیروکسن — یک فایل
# =============================================================================
#  با backup-nirooxen.sh فرق دارد و جایگزینش نیست: آن یکی شبانه و خودکار است و
#  دو فایل می‌سازد. این یکی برای لحظه‌ای است که می‌خواهید دست به تغییر بزرگ
#  بزنید و می‌خواهید یک چیز بردارید و کنار بگذارید.
#
#  داخلش:
#    MANIFEST.txt   چه چیزی، از کِی، با چه کامیتی، و دستور بازگرداندن
#    db.dump        کل پایگاه داده (فرمت custom)
#    media/         فایل‌های آپلودشده از پنل
#    config/        nirooxen.env و پیکربندی nginx و systemd
#
#  ⚠ فایل خروجی **رمز پایگاه داده و کلیدهای API** را در خود دارد. دسترسی‌اش
#    ۶۰۰ گذاشته می‌شود؛ هر جا می‌بریدش، همان‌طور نگهش دارید.
#
#  گواهی TLS عمداً داخلش نیست. کلید خصوصی در فایلی که روی لپ‌تاپ جابه‌جا
#  می‌شود ریسک است، در حالی که certbot در چند ثانیه دوباره صادرش می‌کند.
#
#  هیچ‌چیز روی سرور تغییر نمی‌کند؛ فقط خوانده می‌شود.
#
#  اجرا با root:  bash deploy/snapshot-nirooxen.sh
# =============================================================================
set -euo pipefail

DB_NAME="${DB_NAME:-nirooxen}"
OUT_DIR="${OUT_DIR:-/var/backups/nirooxen}"
MEDIA_DIR="${MEDIA_DIR:-/var/lib/nirooxen/media}"
ENV_FILE="${ENV_FILE:-/etc/nirooxen/nirooxen.env}"
APP_DIR="${APP_DIR:-/var/www/nirooxen}"
PG_USER="${PG_USER:-postgres}"
MIN_TABLES="${MIN_TABLES:-10}"

stamp="$(date +%Y%m%d-%H%M%S)"
work="$(mktemp -d)"
out="$OUT_DIR/nirooxen-snapshot-$stamp.tar.gz"

cleanup() { rm -rf "$work"; }
trap cleanup EXIT

fail() {
  rm -f "$out"
  echo "" >&2
  echo "✖ عکس‌برداری ناموفق — $1" >&2
  exit 1
}

install -d -m 700 "$OUT_DIR"
mkdir -p "$work/snapshot/config"
cd "$work/snapshot"

echo ""
echo "── عکس‌برداری کامل ──"
echo ""

# ── پایگاه داده ─────────────────────────────────────────────────────────────
echo "  پایگاه داده…"
runuser -u "$PG_USER" -- pg_dump --format=custom --no-owner --no-privileges "$DB_NAME" > db.dump \
  || fail "pg_dump اجرا نشد"

pg_restore --list db.dump > /dev/null 2>&1 || fail "دامپ خوانده نمی‌شود"
tables="$(pg_restore --list db.dump | grep -c 'TABLE DATA' || true)"
[ "$tables" -ge "$MIN_TABLES" ] || fail "دامپ فقط $tables جدول دارد؛ انتظار دست‌کم $MIN_TABLES"

# شمارش ردیف‌ها، تا بعد از بازگرداندن بشود با همین سنجید
counts="$(runuser -u "$PG_USER" -- psql -d "$DB_NAME" -tA -F' ' -c "
  select 'محصول', count(*) from products
  union all select 'تصویر', count(*) from product_images
  union all select 'سفارش', count(*) from orders
  union all select 'مشتری', count(*) from customers
  union all select 'کاربر پنل', count(*) from users
  union all select 'دسته', count(*) from categories
  union all select 'برند', count(*) from brands
  union all select 'مشخصهٔ فنی', count(*) from product_specs;" 2>/dev/null || echo "(خوانده نشد)")"

# ── فایل‌های آپلودشده ───────────────────────────────────────────────────────
media_note="نیست"
if [ -d "$MEDIA_DIR" ]; then
  echo "  فایل‌های مدیا…"
  cp -a "$MEDIA_DIR" media || fail "کپی پوشهٔ مدیا انجام نشد"
  media_note="$(find media -type f | wc -l) فایل · $(du -sh media | cut -f1)"
fi

# ── پیکربندی ────────────────────────────────────────────────────────────────
echo "  پیکربندی…"
[ -f "$ENV_FILE" ] && cp -a "$ENV_FILE" config/nirooxen.env
for f in /etc/nginx/sites-available/nirooxen /etc/nginx/sites-available/nirooxen-http; do
  [ -f "$f" ] && cp -a "$f" "config/$(basename "$f").nginx"
done
for f in /etc/systemd/system/nirooxen.service /etc/systemd/system/nirooxen-backup.service \
         /etc/systemd/system/nirooxen-backup.timer; do
  [ -f "$f" ] && cp -a "$f" "config/$(basename "$f")"
done

# ── شناسنامه ────────────────────────────────────────────────────────────────
# کامیت لازم است: بازگرداندن داده روی کدی که با آن نمی‌خواند، کار نمی‌کند
commit="(نامعلوم)"
branch="(نامعلوم)"
if [ -d "$APP_DIR/.git" ]; then
  commit="$(git -C "$APP_DIR" rev-parse HEAD 2>/dev/null || echo '(نامعلوم)')"
  branch="$(git -C "$APP_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '(نامعلوم)')"
fi

cat > MANIFEST.txt <<EOF
عکس کامل نیروکسن
=================================================================
تاریخ            $(date '+%Y-%m-%d %H:%M:%S %z')
میزبان           $(hostname)
پایگاه داده      $DB_NAME · $tables جدول داده‌دار
مدیا             $media_note
کامیت کد         $commit
شاخه             $branch
نسخهٔ postgres    $(runuser -u "$PG_USER" -- psql -tAc 'select version()' 2>/dev/null | cut -c1-40)

شمارش ردیف‌ها در لحظهٔ عکس‌برداری
-----------------------------------------------------------------
$counts

محتویات
-----------------------------------------------------------------
db.dump        دامپ کامل، فرمت custom
media/         فایل‌های آپلودشده از پنل
config/        nirooxen.env و پیکربندی nginx و systemd

⚠ config/nirooxen.env رمز پایگاه داده و کلیدهای API دارد.

گواهی TLS اینجا نیست — با certbot در چند ثانیه دوباره صادر می‌شود:
    sudo certbot certonly --nginx -d nirooxen.ir

بازگرداندن
=================================================================
۱. باز کردن بسته
   tar -xzf nirooxen-snapshot-$stamp.tar.gz

۲. کد را به همان کامیت برگردانید — داده بدون کدِ هم‌نسخه کار نمی‌کند
   cd $APP_DIR && git fetch origin && git checkout $commit

۳. پایگاه داده (داده‌های فعلی از بین می‌رود)
   sudo systemctl stop nirooxen
   sudo -u postgres dropdb $DB_NAME
   sudo -u postgres createdb -O $DB_NAME $DB_NAME
   sudo -u postgres pg_restore -d $DB_NAME --no-owner --no-privileges snapshot/db.dump

۴. مدیا
   sudo rsync -a --delete snapshot/media/ $MEDIA_DIR/
   sudo chown -R nirooxen:nirooxen $MEDIA_DIR

۵. پیکربندی — فقط اگر لازم بود
   sudo cp snapshot/config/nirooxen.env $ENV_FILE

۶. بالا آوردن
   cd $APP_DIR && npm ci && npm run build
   sudo systemctl start nirooxen

۷. سنجیدن — شمارش‌های بالا باید بخواند
   psql "\$DATABASE_URL" -c 'select count(*) from products'
EOF

# ── بستن و سنجیدن ───────────────────────────────────────────────────────────
echo "  بسته‌بندی…"
cd "$work"
tar -czf "$out" snapshot || fail "بسته‌بندی انجام نشد"

echo "  بررسی سلامت بسته…"
tar -tzf "$out" > /dev/null 2>&1 || fail "بسته خوانده نمی‌شود"

# بررسی واقعی: دامپ را از *داخل همین بسته* بیرون می‌کشیم و می‌خوانیم. بسته‌ای
# که باز می‌شود ولی دامپ سالمی ندارد، پشتیبان نیست — و روز حادثه بدترین وقت
# برای فهمیدن این است.
check="$work/check"
mkdir -p "$check"
tar -xzf "$out" -C "$check" snapshot/db.dump || fail "دامپ از داخل بسته بیرون نیامد"
pg_restore --list "$check/snapshot/db.dump" > /dev/null 2>&1 \
  || fail "دامپِ داخل بسته خوانده نمی‌شود"
inner="$(pg_restore --list "$check/snapshot/db.dump" | grep -c 'TABLE DATA' || true)"
[ "$inner" = "$tables" ] || fail "دامپِ داخل بسته $inner جدول دارد ولی باید $tables باشد"

chmod 600 "$out"
sha="$(sha256sum "$out" | cut -c1-16)"

echo ""
echo "  ✓ عکس کامل گرفته شد و از داخل بسته بررسی شد"
echo ""
printf '     %s\n' "$out"
printf '     %s · %s جدول · sha256 %s…\n' "$(du -h "$out" | cut -f1)" "$tables" "$sha"
echo ""
echo "  برای برداشتنش روی کامپیوتر خودتان، از همان‌جا:"
echo "     scp root@$(hostname -I | awk '{print $1}'):$out ."
echo ""
echo "  دستور بازگرداندن داخل خود فایل است — MANIFEST.txt"
echo ""
