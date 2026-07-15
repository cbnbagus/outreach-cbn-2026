import * as crypto from "crypto";
import { logger } from "firebase-functions/v2";
import type { Request } from "firebase-functions/v2/https";

/**
 * Verify Meta's X-Hub-Signature-256 header.
 *
 * Meta signs every webhook POST with HMAC-SHA256 of the raw request body,
 * keyed by your App Secret. We recompute the same hash and compare. If they
 * don't match, the request did not come from Meta and must be rejected.
 *
 * Applies to: WhatsApp Cloud API, Facebook Messenger, Instagram (all share
 * one Meta App → one App Secret, stored in the META_APP_SECRET env var).
 *
 * @returns true if the signature is valid, false otherwise.
 */
export function verifyMetaSignature(req: Request): boolean {
  const appSecret = process.env.META_APP_SECRET ?? "";

  // Fail closed: if no secret is configured, reject. Never accept unsigned.
  if (!appSecret) {
    logger.error("[verifyMetaSignature] META_APP_SECRET not configured — rejecting request");
    return false;
  }

  const signatureHeader = req.header("x-hub-signature-256") ?? "";
  if (!signatureHeader.startsWith("sha256=")) {
    logger.warn("[verifyMetaSignature] Missing or malformed X-Hub-Signature-256 header");
    return false;
  }

  // rawBody is the unparsed request buffer — required because the hash must be
  // computed over the exact bytes Meta sent, not a re-serialized JSON object.
  const rawBody = req.rawBody;
  if (!rawBody) {
    logger.error("[verifyMetaSignature] req.rawBody unavailable — cannot verify");
    return false;
  }

  const expected = "sha256=" + crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison to avoid timing attacks.
  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) {
    logger.warn("[verifyMetaSignature] Signature length mismatch — rejecting");
    return false;
  }

  const valid = crypto.timingSafeEqual(sigBuf, expBuf);
  if (!valid) {
    logger.warn("[verifyMetaSignature] Signature mismatch — rejecting request");
  }
  return valid;
}
