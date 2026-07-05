import type { Metadata } from "next";

import { AboutPage } from "./_components/about-page";

export const metadata: Metadata = {
  title: "Sobre mí",
  description:
    "Desarrollador full-stack y diseñador. Combino ingeniería y diseño para llevar productos de una idea a producción.",
};

export default function About() {
  return <AboutPage />;
}
