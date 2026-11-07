import type { NextConfig } from 'next';

const config: NextConfig = {
  // This folder sits inside the library's repository: treat it as its own project root.
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,
};

export default config;
