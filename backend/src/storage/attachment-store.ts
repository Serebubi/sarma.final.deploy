import fs from "node:fs/promises";
import path from "node:path";

import type { Request } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";

import { attachmentMimeTypes } from "shared";

import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";

async function ensureUploadDir() {
  await fs.mkdir(config.uploadsDir, { recursive: true });
}

export const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        await ensureUploadDir();
        cb(null, config.uploadsDir);
      } catch (error) {
        cb(error as Error, config.uploadsDir);
      }
    },
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname) || ".bin";
      cb(null, `${uuid()}${extension}`);
    },
  }),
  limits: {
    fileSize: config.maxAttachmentBytes,
  },
  fileFilter: (_req, file, cb) => {
    if (attachmentMimeTypes.includes(file.mimetype as (typeof attachmentMimeTypes)[number])) {
      cb(null, true);
      return;
    }

    cb(new HttpError(400, "Разрешены только JPG, PNG или PDF"));
  },
});

export function toAttachmentRecord(file?: Express.Multer.File | null) {
  if (!file) {
    return null;
  }

  return {
    fileName: file.originalname,
    filePath: path.relative(process.cwd(), file.path).replaceAll("\\", "/"),
    mimeType: file.mimetype as (typeof attachmentMimeTypes)[number],
    size: file.size,
  };
}

export function toAttachmentRecords(files?: Express.Multer.File[] | null) {
  return (files ?? []).map((file) => toAttachmentRecord(file)).filter((file) => file !== null);
}

export function getAttachmentUrl(request: Request, filePath: string | null) {
  if (!filePath) {
    return null;
  }

  return `${request.protocol}://${request.get("host")}/${filePath.replace(/^storage\//, "storage/")}`;
}
