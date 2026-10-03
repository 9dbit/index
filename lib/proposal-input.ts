import { z } from "zod";

export const proposalInput = z.object({
  site_id: z.uuid(),
  title: z.string().trim().min(5).max(240),
  rationale: z.string().trim().min(10).max(4000),
  target_keyword: z.string().trim().max(200).nullable().optional(),
});

export const proposalDecisionInput = z.object({
  status: z.enum(["approved", "rejected"]),
  decision_note: z.string().trim().max(2000).nullable().optional(),
});
