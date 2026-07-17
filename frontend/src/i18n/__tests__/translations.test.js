import { describe, expect, it } from "vitest";
import { T } from "../translations";

describe("translations", () => {
  it("has both en and ru locales", () => {
    expect(Object.keys(T)).toEqual(expect.arrayContaining(["en", "ru"]));
  });

  it("has identical key sets across locales, so no UI text silently falls back to a raw key", () => {
    const enKeys = Object.keys(T.en).sort();
    const ruKeys = Object.keys(T.ru).sort();
    expect(ruKeys).toEqual(enKeys);
  });

  it("has no empty translation strings", () => {
    for (const locale of Object.keys(T)) {
      for (const [key, value] of Object.entries(T[locale])) {
        expect(value, `${locale}.${key} should not be empty`).not.toBe("");
      }
    }
  });
});
