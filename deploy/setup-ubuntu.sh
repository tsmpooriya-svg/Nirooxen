#!/usr/bin/env bash
# =============================================================================
#  آماده‌سازی سرور Ubuntu 24 برای نیروکسن
# =============================================================================
#  این اسکریپت فقط زیرساخت را نصب می‌کند: Node، PostgreSQL، nginx، کاربر و
#  پوشه‌ها. خودِ برنامه را مستقر نمی‌کند و به هیچ پایگاه دادهٔ موجودی دست
#  نمی‌زند. دوباره اجرا کردنش بی‌خطر است.
#
#  اجرا:  sudo bash deploy/setup-ubuntu.sh
# =============================================================================
set -euo pipefail

APP_USER=nirooxen
APP_DIR=/var/www/nirooxen
MEDIA_DIR=/var/lib/nirooxen/media
ENV_DIR=/etc/nirooxen
NODE_MAJOR=22
PG_MAJOR=17          # دامپ موجود با PostgreSQL 17 گرفته شده؛ pg_restore نسخهٔ ۱۶ آن را نمی‌خواند

say() { printf "\n\033[1;36m== %s\033[0m\n" "$1"; }
ok()  { printf "   \033[32m✓\033[0m %s\n" "$1"; }

[[ $EUID -eq 0 ]] || { echo "با sudo اجرا کنید"; exit 1; }

say "بسته‌های پایه"
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg lsb-release ufw git unzip >/dev/null
ok "نصب شد"

say "فضای swap"
# ۴ گیگ رم برای اجرا کافی است، ولی next build ممکن است لحظه‌ای بیشتر بخواهد.
# بدون swap، build با OOM کشته می‌شود و پیامش گمراه‌کننده است.
if swapon --show | grep -q .; then
  ok "swap از قبل فعال است"
else
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap -q /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "۲ گیگابایت swap ساخته و دائمی شد"
fi

say "Node.js $NODE_MAJOR"
if command -v node >/dev/null && node -v | grep -q "^v$NODE_MAJOR\."; then
  ok "از قبل نصب است: $(node -v)"
else
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs >/dev/null
  ok "نصب شد: $(node -v) / npm $(npm -v)"
fi

say "PostgreSQL $PG_MAJOR"
if command -v psql >/dev/null && psql --version | grep -q " $PG_MAJOR\."; then
  ok "از قبل نصب است: $(psql --version)"
else
  # مخزن رسمی PGDG — اوبونتو ۲۴ خودش نسخهٔ ۱۶ دارد که دامپ ۱۷ را باز نمی‌کند
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq
  apt-get install -y -qq "postgresql-$PG_MAJOR" "postgresql-client-$PG_MAJOR" >/dev/null
  systemctl enable --now postgresql >/dev/null 2>&1 || true
  ok "نصب شد: $(psql --version)"
fi

say "nginx"
if command -v nginx >/dev/null; then ok "از قبل نصب است"; else
  apt-get install -y -qq nginx >/dev/null
  ok "نصب شد"
fi

say "کاربر و پوشه‌ها"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR" "$MEDIA_DIR"
install -d -m 750 "$ENV_DIR"
ok "کاربر $APP_USER · برنامه در $APP_DIR · مدیا در $MEDIA_DIR"

if [[ ! -f "$ENV_DIR/nirooxen.env" ]]; then
  cat > "$ENV_DIR/nirooxen.env" <<'ENVEOF'
# مقادیر را پر کنید. این فایل را در مخزن نگذارید.
DATABASE_URL="postgresql://nirooxen:رمز-قوی@127.0.0.1:5432/nirooxen"
NEXT_PUBLIC_SITE_URL="https://example.com"
MEDIA_STORAGE_ROOT="/var/lib/nirooxen/media"
NODE_ENV=production
ENVEOF
  chmod 600 "$ENV_DIR/nirooxen.env"
  ok "قالب متغیرها ساخته شد: $ENV_DIR/nirooxen.env  (باید پرش کنید)"
else
  ok "فایل متغیرها از قبل هست — دست نخورد"
fi

say "دیوار آتش"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true
ok "فقط SSH و وب باز است؛ پورت ۳۰۰۰ و ۵۴۳۲ از بیرون بسته‌اند"

cat <<'NEXT'

── زیرساخت آماده است. گام‌های بعدی ──────────────────────────────────────────

  ۱. پایگاه داده و کاربرش را بسازید:
       sudo -u postgres createuser --pwprompt nirooxen
       sudo -u postgres createdb -O nirooxen nirooxen

  ۲. مقادیر /etc/nirooxen/nirooxen.env را پر کنید (همان رمز بالا)

  ۳. اگر دامپ قبلی دارید، همین حالا برگردانید:
       sudo -u postgres pg_restore -d nirooxen --no-owner --no-privileges backup.dump

  ۴. کد را در /var/www/nirooxen بگذارید، بعد:
       cd /var/www/nirooxen
       sudo -u nirooxen npm ci
       sudo -u nirooxen --preserve-env npm run db:migrate
       sudo -u nirooxen npm run build
       sudo chown -R nirooxen:nirooxen /var/www/nirooxen

  ۵. سرویس و پروکسی:
       sudo cp deploy/nirooxen.service /etc/systemd/system/
       sudo systemctl daemon-reload && sudo systemctl enable --now nirooxen
       sudo cp deploy/nginx-nirooxen.conf /etc/nginx/sites-available/nirooxen
       sudo ln -sf /etc/nginx/sites-available/nirooxen /etc/nginx/sites-enabled/
       sudo rm -f /etc/nginx/sites-enabled/default
       sudo nginx -t && sudo systemctl reload nginx

  ۶. گواهی TLS:
       sudo apt install -y certbot python3-certbot-nginx
       sudo certbot --nginx -d example.com -d www.example.com

NEXT
