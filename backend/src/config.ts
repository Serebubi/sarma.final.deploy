import path from "node:path";

export function parseCorsOrigins(raw: string) {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  apiOrigins: parseCorsOrigins(process.env.CORS_ORIGIN ?? "http://localhost:3000"),
  supportUrl: process.env.SUPPORT_URL ?? "https://t.me/priemzakazovsuperbox",
  storageDir: path.resolve(process.cwd(), "storage"),
  uploadsDir: path.resolve(process.cwd(), "storage", "uploads"),
  dataFile: path.resolve(process.cwd(), "storage", "data", "orders.json"),
  bitrixWebhookUrl: process.env.BITRIX_WEBHOOK_URL ?? "",
  bitrixToken: process.env.BITRIX_TOKEN ?? "",
  maxAttachmentBytes: 10 * 1024 * 1024,
};
