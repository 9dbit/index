import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export const isDemo = () => process.env.INDEX_DEMO_MODE === "true";
export const configured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
export async function supabase() {
  if (!configured()) throw new Error("Supabase is not configured");
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server component; proxy handles refresh. */
          }
        },
      },
    },
  );
}
