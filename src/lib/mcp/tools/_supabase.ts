import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

// Read env at call time (Deno runtime). Avoid direct `process` reference so the
// browser tsconfig (which doesn't include @types/node) still typechecks.
function env(name: string): string {
  const g = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
    Deno?: { env?: { get(name: string): string | undefined } };
  };
  const v = g.process?.env?.[name] ?? g.Deno?.env?.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function sbForUser(ctx: ToolContext) {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_PUBLISHABLE_KEY"), {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
