import type { Request, Response } from "express";
import { Router } from "express";

import {
  bulkyAttachmentLimit,
  cancelOrderSchema,
  createOrderResponseSchema,
  createOrderSchema,
  homeDeliveryMarketplaceId,
  isAllowedDomainForMarketplace,
  previewLinkResponseSchema,
  previewLinkSchema,
} from "shared";

import { HttpError } from "../lib/http-error.js";
import { previewMarketplaceLink } from "../services/parser-service.js";
import { OrderService } from "../services/order-service.js";
import { getAttachmentUrl, toAttachmentRecord, toAttachmentRecords, upload } from "../storage/attachment-store.js";

function parseOptionalNumberField(rawValue: unknown, fieldLabel: string) {
  if (rawValue == null || rawValue === "") {
    return undefined;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, `Поле "${fieldLabel}" заполнено некорректно.`);
  }

  return parsed;
}

function getUploadedFile(files: Request["files"], fieldName: string) {
  if (!files || Array.isArray(files)) {
    return null;
  }

  return files[fieldName]?.[0] ?? null;
}

function getUploadedFiles(files: Request["files"], fieldName: string) {
  if (!files || Array.isArray(files)) {
    return [];
  }

  return files[fieldName] ?? [];
}

export function createOrderRouter(orderService: OrderService) {
  const router = Router();

  router.post("/preview-link", async (request, response, next) => {
    try {
      const input = previewLinkSchema.parse(request.body);
      const result = await previewMarketplaceLink(input.marketplace, input.url);
      response.json(previewLinkResponseSchema.parse(result));
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/create",
    upload.fields([
      { name: "attachment", maxCount: 1 },
      { name: "productAttachment", maxCount: 1 },
      { name: "bulkyAttachments", maxCount: bulkyAttachmentLimit },
    ]),
    async (request: Request, response: Response, next) => {
      try {
        const body = request.body as Record<string, string | undefined>;
        const attachmentFile = getUploadedFile(request.files, "attachment");
        const productAttachmentFile = getUploadedFile(request.files, "productAttachment");
        const bulkyAttachmentFiles = getUploadedFiles(request.files, "bulkyAttachments");
        const rawPayload =
          body.orderType === "home_delivery"
            ? {
                orderType: body.orderType,
                marketplace: homeDeliveryMarketplaceId,
                orderNumbers: body.orderNumbers ? JSON.parse(body.orderNumbers) : [],
                deliveryAddress: body.deliveryAddress,
                deliveryDate: body.deliveryDate,
                deliveryTimeSlot: body.deliveryTimeSlot,
              }
            : body.orderType === "pickup_standard"
              ? {
                  orderType: body.orderType,
                  marketplace: body.marketplace,
                  pickupPoint: body.pickupPoint,
                  firstName: body.firstName,
                  lastName: body.lastName,
                  phone: body.phone,
                  size: body.size,
                  sourceUrl: body.sourceUrl,
                  additionalInfo: body.additionalInfo,
                }
              : body.marketplace === "cdek" || body.marketplace === "5post" || body.marketplace === "dpd"
                ? {
                    orderType: body.orderType,
                    marketplace: body.marketplace,
                    pickupPoint: body.pickupPoint,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    phone: body.phone,
                    trackingNumber: body.trackingNumber,
                    shipmentNumber: body.shipmentNumber,
                    pickupCode: body.pickupCode,
                  }
                : body.marketplace === "bulky"
                    ? {
                        orderType: body.orderType,
                        marketplace: body.marketplace,
                        pickupPoint: body.pickupPoint,
                        firstName: body.firstName,
                        lastName: body.lastName,
                        phone: body.phone,
                        senderName: body.senderName,
                        transportCompany: body.transportCompany,
                        trackingNumber: body.trackingNumber,
                        pickupCode: body.pickupCode,
                      }
                    : body.marketplace === "courier"
                      ? {
                          orderType: body.orderType,
                          marketplace: body.marketplace,
                          pickupPoint: body.pickupPoint,
                          firstName: body.firstName,
                          lastName: body.lastName,
                          phone: body.phone,
                          senderName: body.senderName,
                          trackingNumber: body.trackingNumber,
                          pickupCode: body.pickupCode,
                          itemCount: parseOptionalNumberField(body.itemCount, "Количество товаров"),
                          totalAmount: parseOptionalNumberField(body.totalAmount, "Общая сумма"),
                        }
                      : {
                          orderType: body.orderType,
                          marketplace: body.marketplace,
                          pickupPoint: body.pickupPoint,
                          firstName: body.firstName,
                          lastName: body.lastName,
                          phone: body.phone,
                          itemCount: parseOptionalNumberField(body.itemCount, "Количество товаров"),
                          totalAmount: parseOptionalNumberField(body.totalAmount, "Общая сумма"),
                          trackingNumber: body.trackingNumber,
                          pickupCode: body.pickupCode,
                        };
        const payload = createOrderSchema.parse(rawPayload);

        if (payload.orderType === "pickup_paid" && payload.marketplace === "bulky" && bulkyAttachmentFiles.length === 0) {
          throw new HttpError(400, "Прикрепите QR, штрих-код или скриншот товара.");
        }

        if (
          payload.orderType === "pickup_paid" &&
          payload.marketplace !== "cdek" &&
          payload.marketplace !== "5post" &&
          payload.marketplace !== "dpd" &&
          payload.marketplace !== "bulky" &&
          !attachmentFile
        ) {
          throw new HttpError(400, "Прикрепите QR или штрих-код.");
        }

        if ("sourceUrl" in payload && !isAllowedDomainForMarketplace(payload.sourceUrl, payload.marketplace)) {
          throw new HttpError(400, "Ссылка не соответствует выбранному маркетплейсу.");
        }

        const bulkyAttachments = toAttachmentRecords(bulkyAttachmentFiles);
        const attachment = payload.orderType === "pickup_paid" && payload.marketplace === "bulky" ? bulkyAttachments[0] ?? null : toAttachmentRecord(attachmentFile);
        const productAttachment = toAttachmentRecord(productAttachmentFile);
        const attachmentUrl =
          payload.orderType === "pickup_paid" && payload.marketplace === "bulky"
            ? bulkyAttachments
                .map((file, index) => getAttachmentUrl(request, file.filePath) ?? `${index + 1}. ${file.filePath}`)
                .filter(Boolean)
                .join("\n")
            : getAttachmentUrl(request, attachment?.filePath ?? null);
        const order = await orderService.createOrder(
          payload,
          attachment,
          attachmentUrl,
          productAttachment,
          getAttachmentUrl(request, productAttachment?.filePath ?? null),
          bulkyAttachments,
        );
        response.status(201).json(
          createOrderResponseSchema.parse({
            order,
            message: "Заказ создан",
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post("/cancel", async (request, response, next) => {
    try {
      const input = cancelOrderSchema.parse(request.body);
      const order = await orderService.cancelOrder(input.orderNumber);
      response.json({
        order,
        message: "Заказ отменен",
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/lookup", async (request, response, next) => {
    try {
      const query = String(request.query.query ?? "");
      const orders = await orderService.lookupOrder(query);
      response.json({ orders });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const order = await orderService.getOrder(request.params.id);
      response.json({ order });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
