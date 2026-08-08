import type { MetadataRoute } from "next";

// Next.js App Router convention: this file is automatically served at
// /manifest.webmanifest and linked from the document head — no manual
// <link rel="manifest"> needed. Icon paths point at the derived Mocal
// icon set in public/images/logo/ (see that directory's README-style
// comment in the icon source task for how each size was generated from
// the single supplied source asset — no fabricated artwork).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mocal",
    short_name: "Mocal",
    description: "Your Financial Operating System",
    start_url: "/",
    display: "standalone",
    // Matches globals.css's --background / --primary — this app has a
    // single dark "mission control" theme, no light-mode variant exists
    // to pick a second color pair from.
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [
      { src: "/images/logo/mocal-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/images/logo/mocal-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/images/logo/mocal-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
