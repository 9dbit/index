import { z } from "zod";
import { CONTENT_STATES } from "@/types";
export const contentInput = z.object({
  site_id: z.uuid(),
  topic: z.string().trim().min(3).max(240),
  keyword: z.string().trim().max(200).nullable().optional(),
  author: z.string().trim().max(100).nullable().optional(),
  publish_date: z.iso.datetime({ offset: true }).nullable().optional(),
  url: z
    .url()
    .refine((s) => ["https:", "http:"].includes(new URL(s).protocol))
    .nullable()
    .optional(),
  quality_score: z.number().min(0).max(100).nullable().optional(),
  state: z.enum(CONTENT_STATES),
});
