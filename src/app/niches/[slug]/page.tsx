import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { NichePage } from "./_components/niche-page";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const niche = await api.catalog.nicheBySlug({ slug });
    return { title: niche.name, description: niche.tagline ?? undefined };
  } catch {
    return { title: "Nicho" };
  }
}

export default async function NicheRoute({ params }: Props) {
  const { slug } = await params;
  try {
    const niche = await api.catalog.nicheBySlug({ slug });
    return <NichePage niche={niche} />;
  } catch (e) {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}
