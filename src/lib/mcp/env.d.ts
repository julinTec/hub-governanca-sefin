// The MCP tool files are bundled into a Deno Edge Function at build time.
// The Vite frontend never imports them, but tsgo still typechecks them.
// Declare the Node/Deno-style `process.env` used inside tool handlers.
declare const process: {
  env: Record<string, string | undefined>;
};
