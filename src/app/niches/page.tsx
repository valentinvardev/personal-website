import type { Metadata } from "next";

import { api } from "~/trpc/server";
import { NichesPage } from "./_components/niches-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nichos",
  description: "Cada nicho reúne los proyectos, aprendizajes y material de un mismo terreno.",
};

export default async function Niches() {
  const niches = await api.catalog.niches();
  return <NichesPage niches={niches} />;
}
