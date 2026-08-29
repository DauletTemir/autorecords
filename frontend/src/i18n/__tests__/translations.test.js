import { describe, expect, it } from "vitest";
import { T, LANGUAGES, LANGUAGE_LABELS } from "../translations";

describe("translations", () => {
  it("has en, kk and ru locales, in that display order", () => {
    expect(Object.keys(T)).toEqual(expect.arrayContaining(["en", "kk", "ru"]));
    expect(LANGUAGES).toEqual(["en", "kk", "ru"]);
  });

  it("has a label for every supported language", () => {
    for (const lang of LANGUAGES) {
      expect(LANGUAGE_LABELS[lang]).toBeTruthy();
    }
  });

  it("has identical key sets across all locales, so no UI text silently falls back to a raw key", () => {
    const enKeys = Object.keys(T.en).sort();
    for (const lang of LANGUAGES) {
      expect(Object.keys(T[lang]).sort(), `T.${lang} key set`).toEqual(enKeys);
    }
  });

  it("has no empty translation strings", () => {
    for (const locale of Object.keys(T)) {
      for (const [key, value] of Object.entries(T[locale])) {
        expect(value, `${locale}.${key} should not be empty`).not.toBe("");
      }
    }
  });
});
