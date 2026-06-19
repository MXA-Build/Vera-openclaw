import { getReplyFromConfig } from "../runtime-api.js";
import type { ReplyHandler } from "./http-server.js";

type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

/**
 * Builds the per-request handler: derive a stable session key from `from`, ask the
 * persona via getReplyFromConfig (which loads the caller's prior session — this is
 * the server-held context, Part 2), and return the reply text. No router-side
 * history. configOverride is omitted so the running claw's runtime config is used.
 */
export function createReplyHandler(deps: { logger: Logger }): ReplyHandler {
  return async ({ text, from }) => {
    // Q-2: from -> sessionKey. Per-caller scope for now (-> user id later).
    const sessionKey = from ? `voice:${from}` : "voice:anonymous";
    try {
      const reply = await getReplyFromConfig({
        Body: text,
        CommandBody: text,
        From: from || undefined,
        SessionKey: sessionKey,
        Provider: "voice-reply",
      });
      const replyText = Array.isArray(reply)
        ? reply
            .map((part) => part.text ?? "")
            .filter((part) => part.length > 0)
            .join("\n")
        : (reply?.text ?? "");
      if (!replyText) {
        return { error: "empty reply from persona", status: 502 };
      }
      // Phase 1: spokenText omitted (server returns spokenText = text). Phase 2
      // adds the no-audio prep (stripMarkdown + [[tts:]]).
      return { text: replyText };
    } catch (err) {
      deps.logger.error(`[voice-reply] getReplyFromConfig failed: ${String(err)}`);
      return { error: "reply generation failed", status: 502 };
    }
  };
}
