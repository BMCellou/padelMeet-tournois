import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Un vieux package-lock.json à la racine de $HOME fait hésiter Next.js
  // sur la racine du workspace ; on la fixe explicitement.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
