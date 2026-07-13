import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { detectImageMime, normalizeImage } from "../imageProcessing.js";

async function makeTestJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .jpeg()
    .toBuffer();
}

describe("detectImageMime", () => {
  it("recognizes JPEG magic bytes", async () => {
    const buf = await makeTestJpeg(10, 10);
    expect(detectImageMime(buf)).toBe("image/jpeg");
  });

  it("recognizes PNG magic bytes", async () => {
    const buf = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } })
      .png()
      .toBuffer();
    expect(detectImageMime(buf)).toBe("image/png");
  });

  it("returns null for non-image data", () => {
    const buf = Buffer.from("not an image, just plain text");
    expect(detectImageMime(buf)).toBeNull();
  });
});

describe("normalizeImage", () => {
  it("downsizes an oversized image to the 1568px cap", async () => {
    const big = await makeTestJpeg(3000, 2000);
    const { base64, mediaType } = await normalizeImage(big);
    expect(mediaType).toBe("image/jpeg");

    const outBuffer = Buffer.from(base64, "base64");
    const meta = await sharp(outBuffer).metadata();
    expect(meta.width).toBeLessThanOrEqual(1568);
    expect(meta.height).toBeLessThanOrEqual(1568);
  });

  it("does not upscale images already smaller than the cap", async () => {
    const small = await makeTestJpeg(400, 300);
    const { base64 } = await normalizeImage(small);
    const meta = await sharp(Buffer.from(base64, "base64")).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });
});
