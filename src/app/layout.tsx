import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import PwaSetup from "@/components/PwaSetup";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jbMono = JetBrains_Mono({
  variable: "--font-mono-jb",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "C.C.O. E.V. — Centro de Control Operativo y Estratégico",
  description: "Tu realidad analizada. Tus decisiones con dirección.",
  appleWebApp: {
    capable: true,
    title: "C.C.O. E.V.",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e13" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Aplica el tema guardado ANTES del primer paint, para que no haya un
// parpadeo del tema equivocado al cargar. No usa React porque un efecto
// correría después de pintar la página.
const THEME_INIT_SCRIPT = `
  try {
    var t = localStorage.getItem("cco-theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jbMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <PwaSetup />
        {children}
      </body>
    </html>
  );
}
