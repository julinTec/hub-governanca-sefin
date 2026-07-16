/// <reference types="vite/client" />

// The MCP tool files under src/lib/mcp/tools/ are bundled into a Deno Edge
// Function at build time. They reference `process.env` (which exists in Deno),
// but the Vite/browser tsconfig would otherwise flag it as undefined.
declare const process: {
  env: Record<string, string | undefined>;
};
