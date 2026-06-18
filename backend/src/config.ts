import path from "node:path";

export function parseCorsOrigins(raw: string) {
  return raw
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter((value) => value.length > 0);
}

const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://sarma-express.ru",
  "https://sarma-express.ru",
  "http://www.sarma-express.ru",
  "https://www.sarma-express.ru",
];

export const config = {
  port: Number(process.env.PORT ?? 4000),
  apiOrigins: [...new Set([...defaultCorsOrigins, ...parseCorsOrigins(process.env.CORS_ORIGIN ?? "")])],
  supportUrl: process.env.SUPPORT_URL ?? "https://t.me/priemzakazovsuperbox",
  storageDir: path.resolve(process.cwd(), "storage"),
  uploadsDir: path.resolve(process.cwd(), "storage", "uploads"),
  dataFile: path.resolve(process.cwd(), "storage", "data", "orders.json"),
  bitrixWebhookUrl: process.env.BITRIX_WEBHOOK_URL ?? "",
  bitrixToken: process.env.BITRIX_TOKEN ?? "",
  maxAttachmentBytes: 10 * 1024 * 1024,
};
