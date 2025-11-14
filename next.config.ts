import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Desactivar ESLint durante el build en producción
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Desactivar verificación de tipos durante el build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
