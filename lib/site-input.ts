import { z } from "zod";
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
  archived: z.boolean().optional(),
});
