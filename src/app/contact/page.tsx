import type { Metadata } from "next";

import { ContactPage } from "./_components/contact-page";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contame qué querés construir. Respondo consultas en el día.",
};

export default function Contact() {
  return <ContactPage />;
}
