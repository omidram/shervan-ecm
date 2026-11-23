import { L, type Locale } from "@/lib/i18n";
import { healthColor } from "@/lib/health-color";

export function Num({ children }: { children: React.ReactNode }) {
  return <span className="num">{children}</span>;
}

export function PlanningBanner({ locale }: { locale: Locale }) {
  return (
    <div className="banner-warn">
      {L(
        locale,
        "پشتیبانی برنامه‌ریزی فقط — این نتیجه تصمیم صلاحیت پروازی یا اعزام پرواز نیست. باندها و عمر باقیمانده مدل مرجع مهندسی‌اند، نه حدود کنترل‌شده سازنده.",
        "Planning support only — not an airworthiness or dispatch decision. Bands and remaining-life figures are engineering reference models, not controlled OEM limits.",
      )}
    </div>
  );
}

const OK: Record<string, { fa: string; en: string }> = {
  status: { fa: "وضعیت به‌صورت رویداد ثبت شد.", en: "Status was recorded as an event." },
  util: { fa: "رویداد کارکرد ثبت شد و شمارنده‌ها دوباره ساخته شدند.", en: "Utilization was recorded and the counters were rebuilt." },
  transfer: { fa: "انتقال مالکیت ثبت شد.", en: "Ownership transfer recorded." },
  install: { fa: "نصب روی هواپیما ثبت شد.", en: "Aircraft installation recorded." },
  remove: { fa: "پیاده‌سازی ثبت شد.", en: "Removal recorded." },
  engine: { fa: "پرونده موتور ساخته شد.", en: "Engine passport created." },
  maintenance: { fa: "سابقه تعمیراتی ثبت شد.", en: "Maintenance record added." },
  verify: { fa: "سابقه تأیید شد و از این پس فقط با نسخه جدید عوض می‌شود.", en: "Record verified. Further changes require a new version." },
  version: { fa: "نسخه اصلاحی ساخته شد. نسخه تأییدشده قبلی سر جایش ماند.", en: "A correction version was created. The verified record stays." },
  field: { fa: "وضعیت فیلد به‌روز شد.", en: "Field status updated." },
  commit: { fa: "فقط فیلدهای تأییدشده به پرونده نشست.", en: "Only approved fields were committed to the passport." },
  upload: { fa: "سند خوانده شد و استخراج قاعده‌ای در صف تأیید است.", en: "Document read. Rule-based extraction is waiting for review." },
  plan: { fa: "برنامه بسته شد و رویداد تعمیراتی در شناسنامه نوشته شد.", en: "Plan closed and a maintenance event was written to the passport." },
  fault: { fa: "عیب با مشاهده جدید بسته شد.", en: "Fault cleared by a new observation." },
  part: { fa: "تغییر پیکربندی ثبت شد.", en: "Configuration change recorded." },
  ack: { fa: "هشدار دیده شد و در ممیزی نشست.", en: "Alert acknowledged and written to the audit trail." },
};

const ERR: Record<string, { fa: string; en: string }> = {
  denied: { fa: "این نشست اجازه این کار را ندارد.", en: "This session cannot do that." },
  empty: { fa: "داده‌های لازم کامل نیست.", en: "Required fields are missing." },
  unique: { fa: "این شماره سریال برای همین مدل قبلاً ثبت شده است.", en: "That serial already exists for this model." },
  file: { fa: "فقط فایل متنی یا PDF تا ۲ مگابایت پذیرفته می‌شود.", en: "Only a text or PDF file up to 2 MB is accepted." },
  installed: { fa: "این موتور یا قطعه هنوز نصب باز دارد.", en: "This engine or part still has an open installation." },
  closed: { fa: "این مورد دیگر باز نیست.", en: "This item is no longer open." },
};

export function Flash({ locale, ok, err }: { locale: Locale; ok?: string; err?: string }) {
  if (ok && OK[ok]) return <div className="flash good">{L(locale, OK[ok].fa, OK[ok].en)}</div>;
  if (err && ERR[err]) return <div className="flash bad">{L(locale, ERR[err].fa, ERR[err].en)}</div>;
  return null;
}

export function HealthDot({ value }: { value: number | null }) {
  return <i style={{ background: healthColor(value), width: 8, height: 8, borderRadius: 99, display: "inline-block" }} />;
}

export function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="muted">—</span>;
  const w = 88;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * w;
      const y = h - 2 - ((value - min) / (max - min || 1)) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts} />
    </svg>
  );
}
