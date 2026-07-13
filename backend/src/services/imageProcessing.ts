import sharp from "sharp";

const MAX_DIMENSION = 1568;
const JPEG_QUALITY = 87;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB hard cap

const ALLOWED_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

export function detectImageMime(buffer: Buffer): string | null {
  for (const sig of ALLOWED_SIGNATURES) {
    if (sig.bytes.every((byte, i) => buffer[i] === byte)) return sig.mime;
  }
  return null;
}

export async function normalizeImage(buffer: Buffer): Promise<{ base64: string; mediaType: string }> {
  const resized = await sharp(buffer)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return { base64: resized.toString("base64"), mediaType: "image/jpeg" };
}
