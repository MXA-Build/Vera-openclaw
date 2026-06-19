import { z } from "zod";

const ServeSchema = z
  .object({
    port: z.number().int().positive().default(3335),
    bind: z.string().default("127.0.0.1"),
    path: z.string().min(1).default("/reply"),
  })
  .default({ port: 3335, bind: "127.0.0.1", path: "/reply" });

const VoiceReplyConfigSchema = z.object({
  enabled: z.boolean().default(true),
  serve: ServeSchema,
  // per-phone: caller's memory persists across calls (mirrors voice-call's scope).
  // per-call: fresh conversation each call. Phase: per-phone now -> user id later.
  sessionScope: z.enum(["per-phone", "per-call"]).default("per-phone"),
});

export type VoiceReplyConfig = z.infer<typeof VoiceReplyConfigSchema>;

export function resolveVoiceReplyConfig(value: unknown): VoiceReplyConfig {
  return VoiceReplyConfigSchema.parse(value ?? {});
}
