import { createCompanyUser } from "@/app/actions";
import { JOBS, MODULES, modulesForJob } from "@/lib/accounts";
import { prisma } from "@/lib/db";
import { L } from "@/lib/i18n";
import { getLocale, getPersona } from "@/lib/session";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const persona = await getPersona();
  const locale = await getLocale();
  const sp = await searchParams;
  const users = await prisma.appUser.findMany({
    where: persona.job === "super" ? {} : { orgId: persona.orgId },
    include: { org: true },
    orderBy: { username: "asc" },
  });
  const jobs = JOBS.filter((job) => job.id !== "super" || persona.job === "super");
  const canManage = persona.job === "org_admin" || persona.job === "super" || persona.job === "mro_admin";
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">Administration & Security</p>
          <h1>{L(locale, "کاربران شرکت", "Company users")}</h1>
          <p className="lede">{L(locale, "هر کاربر گذرواژه خودش را دارد و فقط داده همین شرکت را می‌بیند. سطح دسترسی را شغل و تیک بخش‌ها مشخص می‌کند.", "Each user has a password and sees only this company's data. The job and the checked sections set the access.")}</p>
        </div>
      </header>
      {sp.ok ? <p className="note">{sp.ok === "company" ? "شرکت ثبت شد." : "کاربر ساخته شد."}</p> : null}
      {sp.err ? <p className="form-error">{sp.err === "taken" ? "این نام کاربری هست." : sp.err === "denied" ? "اجازه ساخت کاربر نیست." : "فرم ناقص است."}</p> : null}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>کاربر</th>
              <th>نام</th>
              <th>شغل</th>
              <th>شرکت</th>
              <th>بخش‌ها</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="num">{user.username}</td>
                <td>{user.displayName}</td>
                <td>{user.job}</td>
                <td>{user.org.nameFa}</td>
                <td className="note">{user.modules}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {canManage ? (
        <section className="panel">
          <h2>{L(locale, "کاربر جدید", "New user")}</h2>
          <form action={createCompanyUser} className="stack">
            <div className="form-grid">
              <label>نام کاربری<input name="username" required /></label>
              <label>نام نمایشی<input name="displayName" required /></label>
              <label>گذرواژه<input name="password" type="password" minLength={8} required /></label>
              <label>شغل
                <select name="job" defaultValue="analyst">
                  {jobs.map((job) => <option key={job.id} value={job.id}>{job.fa}</option>)}
                </select>
              </label>
            </div>
            <p className="note">اگر بخشی را تیک نزنید، مجموعه پیش‌فرض همان شغل ذخیره می‌شود. پیش‌فرض تحلیلگر: {modulesForJob("analyst")}</p>
            <div className="check-grid">
              {MODULES.map((item) => (
                <label key={item.id}><input type="checkbox" name="modules" value={item.id} /> {item.fa}</label>
              ))}
            </div>
            <button className="btn" type="submit">ساخت کاربر</button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
