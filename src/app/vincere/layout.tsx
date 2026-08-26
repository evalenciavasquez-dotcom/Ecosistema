import type { Metadata } from "next";
import { Archivo, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import "./vincere.css";

// Tres tipografías con oficio, no tres tipografías por gusto.
//
// Archivo es la grotesca del cromo: rótulos, botones, encabezados de tabla.
// En un formulario la grotesca se lee de un vistazo, que es lo contrario de
// lo que se le pide a un párrafo.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Source Serif carga la prosa analítica —lecturas, veredictos, diagnósticos—,
// que es la mayor parte del texto de esta app. Una serif a 16px se lee mejor
// en párrafo largo, y es lo que hace que esto parezca un documento y no una
// aplicación de música.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
});

// Toda cifra va en monoespaciada. Es lo que permite bajar por una columna de
// números sin que bailen.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "VINCERE Intelligence Platform",
  description: "Plataforma de inteligencia y dirección estratégica musical con interpretación VINCERE.",
};

export default function VincereLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${archivo.variable} ${sourceSerif.variable} ${plexMono.variable}`}>{children}</div>
  );
}
