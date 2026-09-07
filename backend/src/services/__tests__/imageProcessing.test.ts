import { describe, expect, it, vi, beforeEach } from "vitest";
import sharp from "sharp";

const heicConvertMock = vi.fn();
vi.mock("heic-convert", () => ({ default: heicConvertMock }));

const { detectImageMime, normalizeImage } = await import("../imageProcessing.js");

async function makeTestJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .jpeg()
    .toBuffer();
}

// Real HEIC/HEIF files are an ISOBMFF container: bytes 4-8 spell "ftyp" and
// bytes 8-12 carry a 4-char brand (e.g. "heic" for the format iPhones use).
// This builds a minimal buffer with that exact layout without needing a
// real HEVC-encoded photo.
function makeFakeHeicHeader(brand = "heic"): Buffer {
  const buf = Buffer.alloc(20);
  buf.write("ftyp", 4, "ascii");
  buf.write(brand, 8, "ascii");
  return buf;
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

  it.each(["heic", "heix", "hevc", "mif1"])("recognizes the %s HEIC/HEIF brand", (brand) => {
    expect(detectImageMime(makeFakeHeicHeader(brand))).toBe("image/heic");
  });

  it("does not misclassify an unrelated ISOBMFF brand as HEIC", () => {
    // e.g. "isom"/"mp42" for MP4 video — same container family, different format.
    expect(detectImageMime(makeFakeHeicHeader("isom"))).toBeNull();
  });
});

describe("normalizeImage", () => {
  beforeEach(() => {
    heicConvertMock.mockClear();
  });

  it("routes HEIC input through heic-convert before handing it to sharp", async () => {
    const decodedJpeg = await makeTestJpeg(100, 80);
    heicConvertMock.mockResolvedValue(decodedJpeg);

    const heicInput = makeFakeHeicHeader("heic");
    const { base64, mediaType } = await normalizeImage(heicInput);

    expect(heicConvertMock).toHaveBeenCalledWith(
      expect.objectContaining({ buffer: heicInput, format: "JPEG" }),
    );
    expect(mediaType).toBe("image/jpeg");

    const meta = await sharp(Buffer.from(base64, "base64")).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(100);
  });

  it("does not call heic-convert for a regular JPEG", async () => {
    const jpeg = await makeTestJpeg(50, 50);
    await normalizeImage(jpeg);
    expect(heicConvertMock).not.toHaveBeenCalled();
  });

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
