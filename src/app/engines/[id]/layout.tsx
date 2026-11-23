import { notFound } from "next/navigation";
import { EngineNav } from "@/components/nav";
import { getEngine } from "@/lib/queries";
import { getLocale, getPersona } from "@/lib/session";

export default async function EngineLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [persona, locale] = await Promise.all([getPersona(), getLocale()]);
  const found = await getEngine(id, persona);
  if (!found) notFound();
  return (
    <>
      <EngineNav id={id} locale={locale} />
      {children}
    </>
  );
}
