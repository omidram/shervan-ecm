import { notFound } from "next/navigation";
import { DeskModule } from "@/components/desk-module";
import { deskModule, type DeskDomain } from "@/lib/modules";

export default async function ModuleRoute({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ engine?: string; item?: string; ok?: string; err?: string }>;
}) {
  const { domain } = await params;
  if (!deskModule(domain)) notFound();
  return <DeskModule domain={domain as DeskDomain} searchParams={searchParams} />;
}
