import { z } from "zod";

export const RecipientSchema = z.object({
  address: z.string().min(1, "address required"),
  sharePct: z.number().positive().max(100),
  label: z.string().optional(),
});

export const PolicySchema = z.object({
  name: z.string().min(1),
  recipients: z.array(RecipientSchema).min(1),
  reservePct: z.number().min(0).max(100).default(0),
  holdPct: z.number().min(0).max(100).default(0),
  unlockAt: z.string().optional(),  // ISO-8601 date
  trigger: z.enum(["deposit", "manual"]).default("deposit"),
  maxPerExecution: z.bigint().optional(),
  maxPerDay: z.bigint().optional(),
}).superRefine((p, ctx) => {
  const total =
    p.recipients.reduce((s, r) => s + r.sharePct, 0) +
    p.reservePct +
    p.holdPct;
  if (Math.abs(total - 100) > 0.001) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `sharePct + reservePct + holdPct must sum to 100, got ${total}`,
    });
  }
  if (p.reservePct > 0 && !p.unlockAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "unlockAt is required when reservePct > 0",
    });
  }
});

export type Recipient = z.infer<typeof RecipientSchema>;
export type Policy = z.infer<typeof PolicySchema>;
