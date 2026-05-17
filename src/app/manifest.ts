import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ilannatek — Studio Boutique",
    short_name: "Ilannatek",
    description: "Réservez vos cours de yoga, pilates et danse au studio boutique Ilannatek.",
    theme_color: "#1C1C1A",
    background_color: "#F7F3EC",
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    start_url: "/schedule",
    categories: ["fitness", "lifestyle"],
    icons: [
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
