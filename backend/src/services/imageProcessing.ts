import sharp from "sharp";
import convert from "heic-convert";

const MAX_DIMENSION = 1568;
const JPEG_QUALITY = 87;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB hard cap

// HEIC/HEIF (the default photo format on iPhone) is an ISOBMFF container:
// bytes 4-8 are always the literal string "ftyp", and bytes 8-12 are a
// 4-char "brand" identifying the specific format. There's no single fixed
// byte sequence like JPEG/PNG have — we have to read the brand and check it
// against the handful of brands Apple actually uses.
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1"];

function isHeic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.subarray(4, 8).toString("ascii") !== "ftyp") return false;
  return HEIC_BRANDS.includes(buffer.subarray(8, 12).toString("ascii"));
}

const ALLOWED_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

export function detectImageMime(buffer: Buffer): string | null {
  if (isHeic(buffer)) return "image/heic";
  for (const sig of ALLOWED_SIGNATURES) {
    if (sig.bytes.every((byte, i) => buffer[i] === byte)) return sig.mime;
  }
  return null;
}

export async function normalizeImage(buffer: Buffer): Promise<{ base64: string; mediaType: string }> {
  // sharp's underlying libvips build can encode AVIF but can't decode the
  // HEVC-coded HEIC files iPhones actually produce (a licensing limitation
  // of the build, not a missing feature) — convert those to JPEG with a
  // pure-JS decoder first, then hand the result to sharp like any other
  // image for resizing.
  const source = isHeic(buffer)
    ? Buffer.from(await convert({ buffer, format: "JPEG", quality: 1 }))
    : buffer;

  const resized = await sharp(source)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return { base64: resized.toString("base64"), mediaType: "image/jpeg" };
}
