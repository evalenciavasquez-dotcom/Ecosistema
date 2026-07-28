import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El indicador flotante de dev tapa la barra de navegación móvil en pruebas.
  devIndicators: false,
  // Se inlinean en el build para mostrar en Configuración qué versión está
  // corriendo realmente — VERCEL_GIT_COMMIT_SHA lo pone Vercel automáticamente
  // en cada deploy, sin ningún paso manual.
  env: {
    NEXT_PUBLIC_BUILD_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Sistema de un solo usuario: nunca debe cargarse dentro de un
          // iframe ajeno (clickjacking), ni dejar que el navegador adivine
          // el tipo de contenido, ni filtrar la URL completa al navegar
          // hacia afuera.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
