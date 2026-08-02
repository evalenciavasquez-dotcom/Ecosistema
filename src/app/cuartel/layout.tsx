import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Work_Sans } from "next/font/google";
import "./cuartel.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "El Cuartel de mis Decisiones",
  description: "Ningún escenario se decide sin ver las 3 rutas completas.",
};

export default function CuartelLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${fraunces.variable} ${workSans.variable} ${plexMono.variable}`}>{children}</div>;
}
