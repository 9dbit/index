import { z } from "zod";

export const networkEdgeInput = z
  .object({
    source_site_id: z.uuid(),
    target_site_id: z.uuid(),
    anchor_text: z.string().trim().max(200).default(""),
    target_path: z.string().trim().max(500).default("/"),
    status: z.enum(["planned", "active", "paused"]).default("planned"),
    notes: z.string().trim().max(1000).default(""),
  })
  .refine((value) => value.source_site_id !== value.target_site_id, {
    message: "Source and target websites must be different",
  });
