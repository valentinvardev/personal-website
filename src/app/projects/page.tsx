import type { Metadata } from "next";

import { api } from "~/trpc/server";
import { ProjectsPage } from "./_components/projects-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proyectos",
  description: "Una selección de plataformas que diseñé y construí de punta a punta.",
};

export default async function Projects() {
  const [projects, niches] = await Promise.all([
    api.catalog.projects(),
    api.catalog.niches(),
  ]);
  return <ProjectsPage projects={projects} niches={niches} />;
}
