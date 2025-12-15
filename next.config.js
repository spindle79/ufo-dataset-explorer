/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Increase body size limit for large HTML snippets
    },
  },
  // Turbopack configuration: Externalize pdfjs-dist to prevent bundling issues
  // This is equivalent to the webpack externals configuration below
  serverExternalPackages: ["pdfjs-dist", "pdfjs-dist/legacy/build/pdf.mjs"],
  // Turbopack config (required when webpack config is present)
  // serverExternalPackages handles pdfjs-dist externalization for Turbopack
  turbopack: {},
  // Webpack configuration (fallback when using --webpack flag)
  // Keep this for backward compatibility if needed
  webpack: (config, { isServer, webpack }) => {
    // Handle pdfjs-dist for server-side rendering
    if (isServer) {
      // Externalize pdfjs-dist legacy build on server
      // This prevents webpack bundling issues
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push("pdfjs-dist/legacy/build/pdf.mjs");
      } else if (typeof config.externals === "object") {
        config.externals["pdfjs-dist/legacy/build/pdf.mjs"] =
          "commonjs pdfjs-dist/legacy/build/pdf.mjs";
      }

      // Also ignore worker files
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^pdfjs-dist\/build\/pdf\.worker\.(mjs|min\.mjs)$/,
        })
      );
    }
    return config;
  },
};

export default nextConfig;
