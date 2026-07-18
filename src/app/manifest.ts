import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "C.C.O. E.V. — Centro de Control Operativo y Estratégico",
    short_name: "C.C.O. E.V.",
    description: "Tu realidad analizada. Tus decisiones con dirección.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0e13",
    theme_color: "#0c0e13",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/bandeja",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  } as MetadataRoute.Manifest;
}
