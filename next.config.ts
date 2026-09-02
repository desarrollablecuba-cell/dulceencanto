import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Permitir recursos dev desde el dominio de preview del sandbox
  allowedDevOrigins: ['**.space-z.ai', 'preview-chat-0f2f3481-060b-4bd6-8878-8c15a6f2a434.space-z.ai'],
  images: {
    unoptimized: true,
  },
  // Permite bodies grandes cuando se guardan productos con muchas imágenes
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Headers para PWA (manifest + service worker)
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
