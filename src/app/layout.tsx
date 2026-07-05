import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Footer } from "~/components/site/footer";
import { PrefsProvider, THEME_INIT_SCRIPT } from "~/components/site/prefs";
import { TopNav } from "~/components/site/top-nav";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: {
    default: "Valentín Varela — Desarrollador de sistemas y diseñador visual",
    template: "%s — Valentín Varela",
  },
  description:
    "Diseño y construyo plataformas web completas —de la base de datos al último pixel— para negocios que quieren lanzar rápido y crecer.",
  metadataBase: new URL("https://valentinvarela.cloud"),
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <TRPCReactProvider>
          <PrefsProvider>
            <TopNav />
            <main>{children}</main>
            <Footer />
          </PrefsProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
