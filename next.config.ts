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
};

export default nextConfig;
