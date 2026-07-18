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
  themeColor: "#0c0e13",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jbMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-background text-foreground">
        <PwaSetup />
        {children}
      </body>
    </html>
  );
}
