import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { MENU, menuHref } from "@/lib/nav-menu";

export function SideNav({
  locale,
  path,
  alertCount = 0,
  modules,
  engineId,
}: {
  locale: Locale;
  path: string;
  alertCount?: number;
  modules: string[];
  engineId: string;
}) {
  const groups = MENU.filter((group) => modules.includes(group.module));
  return (
    <nav className="side-links" data-menu={groups.length} data-lang={locale}>
      {groups.map((group) => {
        const expanded = group.items.some((item) => {
          const href = menuHref(item, group, engineId);
          return href !== "/" && (path === href || path.startsWith(`${href}/`));
        });
        return (
          <details key={group.id} className="nav-group" open={expanded} data-group={group.en}>
            <summary className="nav-head" data-menu-item={group.en}>
              <span>
                <b>{group.fa}</b>
                <small>{group.en}</small>
              </span>
              <i className="nav-arrow" aria-hidden>▸</i>
            </summary>
            <div className="nav-sub">
              {group.items.map((item) => {
                const href = menuHref(item, group, engineId);
                const depth = href.split("/").filter(Boolean).length;
                const active = path === href || (depth >= 3 && path.startsWith(`${href}/`));
                return (
                  <Link key={item.slug} href={href} className={active ? "active" : ""} data-sub={item.en}>
                    <span>
                      <b>{item.fa}</b>
                      <small>{item.en}</small>
                    </span>
                    {item.to === "/m/alert" && alertCount > 0 ? <span className="nav-pill num">{alertCount}</span> : null}
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
