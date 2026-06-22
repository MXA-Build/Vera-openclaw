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

// Amazon Polly's synchronous SynthesizeSpeech rejects input over 3000 characters
// (TextLengthExceededException). The router voices spokenText directly, so cap it
// here with headroom. Summarisation is intentionally OFF (VC-4 — an LLM round-trip
// adds latency); an over-long reply is truncated at a clause boundary instead.
const MAX_SPOKEN_CHARS = 2900;

/**
 * Turn a persona reply (markdown, written to be *read*) into speech-shaped text
 * for Polly. Reuses OpenClaw's stripMarkdown for markdown formatting and adds the
 * three things it does not handle but that break TTS (Follow-up A):
 *   1. markdown links -> their label (drop the URL),
 *   2. emoji/pictographs -> removed,
 *   3. bare "/" -> space (so "and/or" is spoken, not "and slash or").
 * Finally truncates to maxChars so Polly never sees an over-limit string (VC-4).
 */
export function toSpokenText(text: string, maxChars: number = MAX_SPOKEN_CHARS): string {
  let out = text.replace(MD_LINK, "$1");
  out = stripMarkdown(out);
  out = out.replace(KEYCAP, "");
  out = out.replace(EMOJI, "");
  out = out.replace(/\s*\/\s*/g, " ");
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  return truncateForSpeech(out.trim(), maxChars);
}

/**
 * Cap text at maxChars, cutting at the nearest sentence end (. ! ?) or newline so
 * the caller doesn't hear a mid-word stop. Falls back to the last word boundary if
 * no sentence break sits within the budget. Summarisation is OFF by design (VC-4).
 */
function truncateForSpeech(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  const slice = text.slice(0, maxChars);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("\n"),
  );
  if (sentenceEnd >= maxChars * 0.5) {
    return text.slice(0, sentenceEnd + 1).trim();
  }
  const wordEnd = slice.lastIndexOf(" ");
  return (wordEnd > 0 ? slice.slice(0, wordEnd) : slice).trim();
}
