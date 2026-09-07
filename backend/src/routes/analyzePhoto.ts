import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { analyzePhotoLimiter } from "../middleware/rateLimit.js";
import { detectImageMime, normalizeImage, MAX_UPLOAD_BYTES } from "../services/imageProcessing.js";
import { analyzeDocumentImage, type SupportedLang } from "../services/gemini.js";

const SUPPORTED_LANGS: SupportedLang[] = ["en", "ru", "kk"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

export const analyzePhotoRouter = Router();

analyzePhotoRouter.post(
  "/analyze-photo",
  requireAuth,
  analyzePhotoLimiter,
  upload.single("photo"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded" });
    }

    const mime = detectImageMime(req.file.buffer);
    if (!mime) {
      return res.status(400).json({ error: "Unsupported or unrecognized image format" });
    }

    const lang: SupportedLang = SUPPORTED_LANGS.includes(req.body.lang) ? req.body.lang : "ru";
    let knownVins: string[] = [];
    try {
      knownVins = JSON.parse(req.body.knownVins ?? "[]");
    } catch {
      knownVins = [];
    }

    try {
      const { base64, mediaType } = await normalizeImage(req.file.buffer);
      const extracted = await analyzeDocumentImage(base64, mediaType, lang, knownVins);
      res.json(extracted);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      // Full error (may include upstream provider detail) stays server-side
      // only — never forwarded to the client as-is.
      console.error("analyze-photo failed:", message);

      const isQuotaExceeded = /RESOURCE_EXHAUSTED|quota/i.test(message);
      const isServiceUnavailable = /"code":503|UNAVAILABLE|overloaded|high demand/i.test(message);
      res.status(502).json({
        error: isQuotaExceeded
          ? "quota_exceeded"
          : isServiceUnavailable
            ? "service_unavailable"
            : "ai_analysis_failed",
      });
    }
  },
);
