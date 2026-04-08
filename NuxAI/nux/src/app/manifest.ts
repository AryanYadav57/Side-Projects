import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nux Harm Reduction AI",
    short_name: "Nux",
    description: "Safety-first AI guidance for substance awareness and harm reduction.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1318",
    theme_color: "#0f1318",
    icons: [
      {
        src: "/next.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/next.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
