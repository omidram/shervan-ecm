import { L } from "@/lib/i18n";
import { getLocale } from "@/lib/session";

export default async function NotFound() {
  const locale = await getLocale();
  return (
    <section className="panel">
      <h1>{L(locale, "این پرونده در نشست شما نیست", "This record is outside your session")}</h1>
      <p className="muted">
        {L(locale, "یا وجود ندارد، یا سازمان این نشست اجازه دیدنش را ندارد.", "It does not exist, or this session is not allowed to see it.")}
      </p>
      <a className="btn" href="/">{L(locale, "بازگشت به ناوگان", "Back to fleet")}</a>
    </section>
  );
}
