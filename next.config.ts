import type { NextConfig } from "next";

const useStandalone = process.env.NEXT_DISABLE_STANDALONE !== "1";

const nextConfig: NextConfig = useStandalone
  ? {
      output: "standalone",
      images: {
        remotePatterns: [
          {
            protocol: "https",
            hostname: "github.com",
          },
        ],
      },
    }
  : {
      images: {
        remotePatterns: [
          {
            protocol: "https",
            hostname: "github.com",
          },
        ],
      },
    };

export default nextConfig;
