import { describe, expect, it } from "vitest";
import { toSpokenText } from "./spoken-text.js";

describe("toSpokenText", () => {
  it("strips markdown formatting", () => {
    expect(toSpokenText("**Hi** _there_ `code` ~~no~~")).toBe("Hi there code no");
    expect(toSpokenText("# Heading\n\nbody")).toBe("Heading\n\nbody");
  });

  it("reduces markdown links to their label (drops the URL)", () => {
    expect(toSpokenText("see [the docs](https://example.com/a/b) now")).toBe("see the docs now");
  });

  it("removes emoji and pictographs", () => {
    expect(toSpokenText("Hello 👋 world 🎉")).toBe("Hello world");
    expect(toSpokenText("flags 🇦🇺 and keycaps 1️⃣ gone")).toBe("flags and keycaps gone");
  });

  it("turns bare slashes into spaces so they are not read as 'slash'", () => {
    expect(toSpokenText("open and/or closed")).toBe("open and or closed");
    expect(toSpokenText("available 24/7")).toBe("available 24 7");
  });

  it("collapses leftover whitespace and trims", () => {
    expect(toSpokenText("  spaced   out  ")).toBe("spaced out");
  });

  it("leaves clean prose untouched", () => {
    expect(toSpokenText("Your appointment is on Tuesday at noon.")).toBe(
      "Your appointment is on Tuesday at noon.",
    );
  });

  it("leaves text under the cap unchanged", () => {
    const short = "This is a sentence. ".repeat(3).trim();
    expect(toSpokenText(short, 100)).toBe(short);
  });

  it("truncates over-long text at a sentence boundary under the cap", () => {
    const long = "This is a sentence. ".repeat(50); // ~1000 chars
    const out = toSpokenText(long, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith(".")).toBe(true);
  });

  it("falls back to a word boundary when no sentence break fits the budget", () => {
    const out = toSpokenText("supercalifragilistic expialidocious antidisestablishment", 30);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.endsWith(" ")).toBe(false); // trimmed, no mid-word cut trailing space
  });
});
