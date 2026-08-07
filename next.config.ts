import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Sprite GIFs never change once uploaded — cache them at the CDN
        // edge and in the browser for a year so repeat views (switching
        // between Pokemon, re-opening a battle) never re-hit origin.
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
