import { api } from "~/trpc/server";
import { HomePage } from "./_components/home-page";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [projects, niches, posts] = await Promise.all([
    api.catalog.featuredProjects(),
    api.catalog.niches(),
    api.posts.latest(),
  ]);
  return <HomePage projects={projects} niches={niches} posts={posts} />;
}
