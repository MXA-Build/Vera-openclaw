import { stripMarkdown } from "../runtime-api.js";

// Markdown links [label](url) -> label. OpenClaw's stripMarkdown does NOT handle
// these, so without this the URL (and its slashes) would be read aloud.
const MD_LINK = /\[([^\]]*)\]\([^)]*\)/g;

// Keycap emoji (e.g. 1️⃣ = digit + VS16 + combining keycap): strip the whole
// sequence including the base digit, before the general emoji pass leaves "1".
const KEYCAP = /[0-9#*]\u{FE0F}?\u{20E3}/gu;

// Emoji / pictographs (incl. flags, variation selectors, ZWJ). stripMarkdown
// leaves these in, so Polly would read them aloud.
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{20E3}\u{200D}]/gu;

/**
 * Turn a persona reply (markdown, written to be *read*) into speech-shaped text
 * for Polly. Reuses OpenClaw's stripMarkdown for markdown formatting and adds the
 * three things it does not handle but that break TTS (Follow-up A):
 *   1. markdown links -> their label (drop the URL),
 *   2. emoji/pictographs -> removed,
 *   3. bare "/" -> space (so "and/or" is spoken, not "and slash or").
 */
export function toSpokenText(text: string): string {
  let out = text.replace(MD_LINK, "$1");
  out = stripMarkdown(out);
  out = out.replace(KEYCAP, "");
  out = out.replace(EMOJI, "");
  out = out.replace(/\s*\/\s*/g, " ");
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  return out.trim();
}
