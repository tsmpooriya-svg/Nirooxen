import { NextResponse } from "next/server";

import { AuthError, requireWritePermission } from "@/lib/auth";
import { checkDeclaredLength } from "@/lib/http/body-limit";
import { logActivity } from "@/lib/activity";
import { MediaValidationError, maxUploadBytes, maxUploadMb, processUpload } from "@/lib/media/process";
import { getStorage } from "@/lib/storage";
import { newAssetId, productAssetKey, productAssetPrefix } from "@/lib/storage/keys";

/**
 * آپلود تصویر محصول.
 *
 * چرا Route Handler و نه Server Action: محدودیت پیش‌فرض بدنهٔ Server Action در
 * Next یک مگابایت است و برای عکس محصول کافی نیست.
 *
 * هیچ مسیر حذفی اینجا وجود ندارد؛ پاک‌سازی فایل‌ها هنگام ذخیرهٔ محصول و بر پایهٔ
 * تفاوت کلیدها انجام می‌شود تا نقطهٔ حذف مستقلی در معرض دید نباشد.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireWritePermission("products");
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  /*
    `formData()` را نمی‌توان وسط خواندن متوقف کرد، پس سقف فقط از روی هدر قابل
    اعمال است و درخواست بدون Content-Length رد می‌شود؛ وگرنه بدنهٔ chunked
    نامحدود، بررسی حجم را دور می‌زد. مرورگر همیشه این هدر را برای FormData
    می‌فرستد. ضریب ۱.۱ جا برای سربار چندبخشی باز می‌کند؛ حجم واقعی فایل را
    processUpload می‌سنجد.
  */
  const lengthCheck = checkDeclaredLength(request, Math.ceil(maxUploadBytes() * 1.1), {
    requireLength: true,
  });
  if (lengthCheck === "too-large") {
    return NextResponse.json(
      { error: `حجم فایل بیش از ${maxUploadMb()} مگابایت است.` },
      { status: 413 },
    );
  }
  if (lengthCheck === "length-required") {
    return NextResponse.json({ error: "طول درخواست مشخص نیست." }, { status: 411 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "داده ارسالی نامعتبر است." }, { status: 400 });
  }

  const productId = String(form.get("productId") ?? "");
  if (!UUID.test(productId)) {
    return NextResponse.json({ error: "شناسه محصول نامعتبر است." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایلی ارسال نشده است." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let processed;
  try {
    processed = await processUpload(buffer);
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const storage = getStorage();
  const assetId = newAssetId();
  const displayKey = productAssetKey(productId, assetId, "detail", "webp");
  const originalKey = productAssetKey(productId, assetId, "original", processed.originalExtension);

  try {
    await storage.put(displayKey, processed.display, "image/webp");
    await storage.put(originalKey, processed.original, processed.mime);
  } catch {
    // هیچ رکوردی هنوز ساخته نشده؛ فقط آثار نیم‌کارهٔ روی دیسک پاک می‌شود
    await storage.delete(displayKey).catch(() => {});
    await storage.delete(originalKey).catch(() => {});
    return NextResponse.json({ error: "ذخیره‌سازی تصویر ناموفق بود." }, { status: 500 });
  }

  await logActivity({
    userId: user.id,
    action: "create",
    entity: "product",
    entityId: productId,
    summary: "آپلود تصویر محصول",
  });

  return NextResponse.json({
    storageKey: productAssetPrefix(productId, assetId),
    url: storage.publicUrl(displayKey),
    width: processed.width,
    height: processed.height,
  });
}
