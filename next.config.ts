import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // وضع الخيار هنا مباشرة في الجذر وليس داخل experimental
  allowedDevOrigins: ['192.168.56.1'], 
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.rawg.io',
      },
    ],
  },
};

export default nextConfig;