import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp();
}

function getBucket() {
  return getApp().storage().bucket();
}

export type MediaUploadResult = {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
};

/**
 * Download media from channel URL and upload to Firebase Storage.
 * Returns a permanent public URL.
 *
 * @param sourceUrl - URL from channel (Fonnte, Meta, FB, IG)
 * @param ticketId - For storage path organization
 * @param messageId - For storage path organization
 * @param headers - Optional headers (e.g., Meta needs Authorization)
 */
export async function downloadAndUploadMedia(
  sourceUrl: string,
  ticketId: string,
  messageId: string,
  headers: Record<string, string> = {}
): Promise<MediaUploadResult | null> {
  try {
    // Step 1: Download from source URL
    const response = await fetch(sourceUrl, { headers });
    if (!response.ok) {
      logger.error(`[downloadAndUploadMedia] Download failed: ${response.status} ${sourceUrl}`);
      return null;
    }

    const mimeType = response.headers.get("content-type") ?? "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const size = buffer.length;

    // Step 2: Generate filename
    const ext = getExtensionFromMime(mimeType);
    const timestamp = Date.now();
    const filename = `${timestamp}${ext}`;
    const storagePath = `attachments/${ticketId}/${messageId}/${filename}`;

    // Step 3: Upload to Firebase Storage
    const bucket = getBucket();
    const file = bucket.file(storagePath);
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000",
      },
    });

    // Step 4: Make public and get URL
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    logger.info(`[downloadAndUploadMedia] Uploaded ${size} bytes to ${storagePath}`);

    return {
      url: publicUrl,
      filename,
      size,
      mimeType,
    };
  } catch (err) {
    logger.error("[downloadAndUploadMedia] Error:", err);
    return null;
  }
}

function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/mpeg": ".mpeg",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/zip": ".zip",
    "text/plain": ".txt",
  };
  return map[mime.toLowerCase()] ?? "";
}

/**
 * Categorize MIME type into our attachment type enum
 */
export function categorizeMimeType(mime: string): "image" | "video" | "audio" | "document" | "sticker" | "other" {
  const m = mime.toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (
    m === "application/pdf" ||
    m.includes("word") ||
    m.includes("excel") ||
    m.includes("powerpoint") ||
    m.includes("spreadsheet") ||
    m.includes("document") ||
    m === "text/plain" ||
    m === "application/zip"
  ) return "document";
  return "other";
}