import { redirect } from "next/navigation";

export default async function LlpAlias({ searchParams }: { searchParams: Promise<{ engine?: string; item?: string }> }) {
  const sp = await searchParams;
  const query = new URLSearchParams();
  if (sp.engine) query.set("engine", sp.engine);
  if (sp.item) query.set("item", sp.item);
  const suffix = query.toString();
  redirect(suffix ? `/m/llp?${suffix}` : "/m/llp");
}
