// Private runtime barrel for the bundled voice-reply extension.
// Keep this thin and aligned with the local extension surface (cross-boundary
// imports go through here, mirroring extensions/voice-call/runtime-api.ts).

export { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
export type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
export { getReplyFromConfig } from "openclaw/plugin-sdk/reply-runtime";
export { normalizeOptionalString } from "openclaw/plugin-sdk/string-coerce-runtime";
