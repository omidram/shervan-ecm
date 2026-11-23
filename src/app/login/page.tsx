import { login, registerCompany } from "@/app/actions";
import { L } from "@/lib/i18n";
import { getLocale } from "@/lib/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ err?: string; ok?: string }> }) {
  const locale = await getLocale();
  const sp = await searchParams;
  const err = sp.err === "bad"
    ? L(locale, "نام کاربری یا گذرواژه درست نیست.", "The username or password is not right.")
    : sp.err === "taken"
      ? L(locale, "این شرکت یا نام کاربری قبلاً ثبت شده است.", "That company or username is already registered.")
      : sp.err === "form"
        ? L(locale, "نام شرکت، کد، نام کاربری و گذرواژه ۸ نویسه‌ای لازم است.", "Company name, code, username, and an 8-character password are required.")
        : "";
  return (
    <div className="login-wrap">
      <section className="login-card">
        <p className="kicker">SHERVAN ECM</p>
        <h1>{L(locale, "ورود", "Sign in")}</h1>
        <p className="lede">{L(locale, "هر نفر با نام کاربری خودش وارد می‌شود و فقط داده شرکت خودش را می‌بیند.", "Each person signs in with their own account and sees only their company's data.")}</p>
        {err ? <p className="form-error">{err}</p> : null}
        <form action={login} className="stack">
          <label>{L(locale, "نام کاربری", "Username")}<input name="username" autoComplete="username" required /></label>
          <label>{L(locale, "گذرواژه", "Password")}<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="btn" type="submit">{L(locale, "ورود", "Sign in")}</button>
        </form>
        <p className="note">{L(locale, "حساب نمونه: kavir.admin و گذرواژه Shervan-184. تحلیلگر همان شرکت: kavir.analyst. تعمیرگاه: rayyan.engineer.", "Sample account: kavir.admin with password Shervan-184. Same company analyst: kavir.analyst. Shop: rayyan.engineer.")}</p>
      </section>
      <section className="login-card">
        <h2>{L(locale, "ثبت شرکت جدید", "Register a company")}</h2>
        <p className="lede">{L(locale, "حساب مدیر سازمان ساخته می‌شود. بعداً همان مدیر برای هر شغل، کاربر و سطح دسترسی جدا تعریف می‌کند.", "This creates the organization administrator. That admin later gives each job its own user and access.")}</p>
        <form action={registerCompany} className="stack">
          <label>{L(locale, "نام شرکت", "Company name")}<input name="name" required /></label>
          <label>{L(locale, "نام فارسی", "Persian name")}<input name="nameFa" /></label>
          <label>{L(locale, "نوع", "Kind")}
            <select name="kind">
              <option value="owner">{L(locale, "مالک", "Owner")}</option>
              <option value="operator">{L(locale, "بهره‌بردار", "Operator")}</option>
              <option value="mro">{L(locale, "تعمیرگاه", "MRO")}</option>
            </select>
          </label>
          <label>{L(locale, "کد شرکت", "Company code")}<input name="code" required placeholder="KAVIR" /></label>
          <label>{L(locale, "نام مدیر", "Admin name")}<input name="displayName" required /></label>
          <label>{L(locale, "نام کاربری مدیر", "Admin username")}<input name="username" required autoComplete="off" /></label>
          <label>{L(locale, "گذرواژه", "Password")}<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
          <button className="btn" type="submit">{L(locale, "ثبت شرکت", "Register company")}</button>
        </form>
      </section>
    </div>
  );
}
