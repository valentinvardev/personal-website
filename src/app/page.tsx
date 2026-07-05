import { api } from "~/trpc/server";
import { HomePage } from "./_components/home-page";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [projects, niches] = await Promise.all([
    api.catalog.featuredProjects(),
    api.catalog.niches(),
  ]);
  return <HomePage projects={projects} niches={niches} />;
}
