import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

function keyByUserOrIp(req: Request): string {
  return req.userId ?? ipKeyGenerator(req.ip ?? "unknown");
}

export const analyzePhotoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: "Too many requests, please try again later" },
});

export const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: "Too many invitations sent, please try again later" },
});

export const backupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: "Too many backup requests, please try again later" },
});
