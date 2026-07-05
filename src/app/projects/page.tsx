import type { Metadata } from "next";

import { ProjectsPage } from "./_components/projects-page";

export const metadata: Metadata = {
  title: "Proyectos",
  description: "Una selección de plataformas que diseñé y construí de punta a punta.",
};

export default function Projects() {
  return <ProjectsPage />;
}
