import type { Metadata } from "next";

import { api } from "~/trpc/server";
import { WritingPage } from "./_components/writing-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Escritos",
  description:
    "Apuntes en tiempo real: lo que estoy construyendo, decisiones y aprendizajes.",
};

export default async function Writing() {
  const posts = await api.posts.list();
  return <WritingPage posts={posts} />;
}
