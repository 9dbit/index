import { z } from "zod";

const optionalUrl = z.union([z.literal(""), z.url()]).default("");

export const siteInput = z.object({
  name: z.string().trim().min(2).max(100),
  url: z
    .url()
    .refine(
      (s) => ["https:", "http:"].includes(new URL(s).protocol),
      "Use an HTTP or HTTPS URL",
    ),
  tier: z.coerce.number().int().min(1).max(3),
  niche: z.string().trim().min(1).max(80),
  primary_keyword: z.string().trim().max(200).default(""),
  onboarding_mode: z.enum(["create", "connect"]).default("connect"),
  platform: z.enum(["nextjs", "wordpress", "static", "webflow", "other"]).default("other"),
  hosting_provider: z.string().trim().max(80).default(""),
  repo_url: optionalUrl,
  cms_url: optionalUrl,
  build_status: z.enum(["planned", "provisioning", "connected", "live", "blocked"]).optional(),
  publisher_status: z.enum(["not_configured", "ready", "blocked"]).default("not_configured"),
  notes: z.string().trim().max(1000).default(""),
  archived: z.boolean().optional(),
});
