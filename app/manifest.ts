import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ascension",
    short_name: "Ascension",
    description: "Simulateur de carrière de football narratif.",
    start_url: "/",
    display: "standalone",
    background_color: "#060a0d",
    theme_color: "#060a0d",
    orientation: "portrait-primary",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
