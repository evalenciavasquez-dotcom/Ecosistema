import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import "./vincere.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
});

export const metadata: Metadata = {
  title: "VINCERE Intelligence Platform",
  description: "Plataforma de inteligencia y dirección estratégica musical con interpretación VINCERE.",
};

export default function VincereLayout({ children }: { children: React.ReactNode }) {
  return <div className={newsreader.variable}>{children}</div>;
}
