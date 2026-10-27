import type { MetadataRoute } from "next";

// App instalable (PWA). Instalada en el celular o la laptop, el veterinario
// recibe los avisos de nuevas consultas aunque el navegador esté cerrado.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Videollamada Animal",
    short_name: "Videollamada Animal",
    description: "Teleasesoramiento veterinario por video.",
    start_url: "/panel-veterinario",
    scope: "/",
    display: "standalone",
    background_color: "#f6f0e4",
    theme_color: "#0a6b52",
    lang: "es-AR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
