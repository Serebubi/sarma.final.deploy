import { v4 as uuid } from "uuid";

import {
  cancelOrderSchema,
  createOrderSchema,
  homeDeliveryMarketplaceId,
  humanizePickupPoint,
  orderSchema,
  pickupAddress,
  type OrderRecord,
} from "shared";

import { HttpError } from "../lib/http-error.js";
import { FileOrderRepository } from "../storage/order-repository.js";
import { BitrixService, BitrixSyncError, type BitrixSyncSnapshot } from "./bitrix-service.js";

type CreateOrderPayload = ReturnType<typeof createOrderSchema.parse>;

function nowIso() {
  return new Date().toISOString();
}

function appendEvent(order: OrderRecord, event: OrderRecord["events"][number]) {
  return [...order.events, event];
}

function normalizeLookupDigits(value: string) {
  return value.replace(/\D/g, "");
}

export class OrderService {
  constructor(
    private repository: FileOrderRepository,
    private bitrixService = new BitrixService(),
  ) {}

  async createOrder(
    payload: CreateOrderPayload,
    attachment: OrderRecord["attachment"],
    attachmentUrl: string | null,
    productAttachment: OrderRecord["productAttachment"] = null,
    productAttachmentUrl: string | null = null,
    bulkyAttachments: OrderRecord["bulkyAttachments"] = [],
  ) {
    const orders = await this.repository.listOrders();
    const nextNumber = String(
      Math.max(
        669280,
        ...orders.map((order) => Number.parseInt(order.orderNumber, 10)).filter(Number.isFinite),
      ) + 1,
    );
    const createdAt = nowIso();
    const linkedOrders =
      payload.orderType === "home_delivery"
        ? await Promise.all(payload.orderNumbers.map(async (orderNumber) => this.repository.findByOrderNumber(orderNumber)))
        : null;

    if (payload.orderType === "home_delivery") {
      if (!linkedOrders || linkedOrders.some((order) => !order)) {
        throw new HttpError(400, "Не удалось найти один или несколько номеров заказов.");
      }

      const primaryOrder = linkedOrders[0];
      if (!primaryOrder) {
        throw new HttpError(400, "Не удалось определить заказ для доставки на дом.");
      }

      const sameCustomer = linkedOrders.every(
        (order) =>
          order &&
          order.customer.phone === primaryOrder.customer.phone &&
          order.customer.firstName === primaryOrder.customer.firstName &&
          order.customer.lastName === primaryOrder.customer.lastName,
      );

      if (!sameCustomer) {
        throw new HttpError(400, "Номера заказов должны принадлежать одному получателю.");
      }
    }

    const homeDeliveryCustomer = linkedOrders?.[0]?.customer ?? null;
    const lastName = payload.orderType === "home_delivery" ? homeDeliveryCustomer?.lastName : "lastName" in payload ? payload.lastName : undefined;
    const baseOrder: OrderRecord = orderSchema.parse({
      id: uuid(),
      orderNumber: nextNumber,
      orderType: payload.orderType,
      marketplace: payload.orderType === "home_delivery" ? homeDeliveryMarketplaceId : payload.marketplace,
      status: "CREATED",
      pickupAddress: "pickupPoint" in payload ? humanizePickupPoint(payload.pickupPoint) : pickupAddress,
      pickupPoint: "pickupPoint" in payload ? payload.pickupPoint : null,
      customer: {
        firstName: payload.orderType === "home_delivery" ? homeDeliveryCustomer?.firstName ?? "Клиент" : payload.firstName,
        lastName: lastName ?? null,
        phone: payload.orderType === "home_delivery" ? homeDeliveryCustomer?.phone ?? "+79990000000" : payload.phone,
      },
      relatedOrderNumbers: "orderNumbers" in payload ? payload.orderNumbers : [],
      itemCount: "itemCount" in payload ? payload.itemCount : null,
      totalAmount: "totalAmount" in payload ? payload.totalAmount : null,
      trackingNumber: "trackingNumber" in payload ? payload.trackingNumber ?? null : null,
      shipmentNumber: "shipmentNumber" in payload ? payload.shipmentNumber ?? null : null,
      senderName: "senderName" in payload ? payload.senderName ?? null : null,
      transportCompany: "transportCompany" in payload ? payload.transportCompany ?? null : null,
      pickupCode: "pickupCode" in payload ? payload.pickupCode ?? null : null,
      size: "size" in payload ? payload.size ?? null : null,
      sourceUrl: "sourceUrl" in payload ? payload.sourceUrl : null,
      additionalInfo: "additionalInfo" in payload ? payload.additionalInfo ?? null : null,
      deliveryAddress: "deliveryAddress" in payload ? payload.deliveryAddress : null,
      deliveryDate: "deliveryDate" in payload ? payload.deliveryDate : null,
      deliveryTimeSlot: "deliveryTimeSlot" in payload ? payload.deliveryTimeSlot : null,
      productPreview: "productPreview" in payload ? payload.productPreview : null,
      attachment,
      productAttachment,
      bulkyAttachments,
      inspectionRequired: "inspectionRequired" in payload ? payload.inspectionRequired : false,
      inspectionCount: "inspectionCount" in payload ? payload.inspectionCount ?? null : null,
      crmSyncState: "pending",
      crmContactId: null,
      crmDealId: null,
      crmStageId: null,
      crmStageName: null,
      events: [
        {
          type: "created",
          at: createdAt,
        },
      ],
      createdAt,
      updatedAt: createdAt,
    });

    const savedOrder = await this.repository.saveOrder(baseOrder);

    try {
      const snapshot = await this.bitrixService.syncOrder(savedOrder, attachmentUrl, productAttachmentUrl);
      const syncedOrder = this.applyBitrixSnapshot(savedOrder, snapshot, true);
      return this.repository.saveOrder(syncedOrder);
    } catch (error) {
      const failedOrder = this.applyBitrixFailure(savedOrder, error);
      return this.repository.saveOrder(failedOrder);
    }
  }

  async getOrder(orderNumber: string) {
    const validated = cancelOrderSchema.parse({ orderNumber });
    const order = await this.repository.findByOrderNumber(validated.orderNumber);
    if (!order) {
      throw new HttpError(404, "Р—Р°РєР°Р· РЅРµ РЅР°Р№РґРµРЅ. РџСЂРѕРІРµСЂСЊС‚Рµ РїСЂР°РІРёР»СЊРЅРѕСЃС‚СЊ РІРІРµРґРµРЅРЅРѕРіРѕ РЅРѕРјРµСЂР°.");
    }

    if (!order.crmDealId) {
      return order;
    }

    try {
      const snapshot = await this.bitrixService.refreshOrder(order);
      const refreshedOrder = this.applyBitrixSnapshot(order, snapshot, false);

      if (this.hasBitrixChanges(order, refreshedOrder)) {
        return this.repository.saveOrder(refreshedOrder);
      }

      return refreshedOrder;
    } catch (error) {
      if (error instanceof BitrixSyncError) {
        return order;
      }

      throw error;
    }
  }

  async lookupOrder(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new HttpError(400, "Введите номер заказа, трек-номер или телефон.");
    }

    const digits = normalizeLookupDigits(trimmed);
    const orderByNumber = digits ? await this.repository.findByOrderNumber(digits) : null;
    if (orderByNumber) {
      return [await this.getOrder(orderByNumber.orderNumber)];
    }

    const orderByTracking = await this.repository.findByTrackingReference(trimmed);
    if (orderByTracking) {
      const order = orderByTracking.crmDealId ? await this.getOrder(orderByTracking.orderNumber) : orderByTracking;
      return [order];
    }

    if (digits.length >= 10) {
      const ordersByPhone = await this.repository.findAllByPhone(trimmed);
      if (ordersByPhone.length > 0) {
        return Promise.all(
          ordersByPhone.map(async (order) => (order.crmDealId ? this.getOrder(order.orderNumber) : order)),
        );
      }
    }

    throw new HttpError(404, "Заказ не найден. Проверьте номер заказа, трек-номер или телефон.");
  }

  async cancelOrder(orderNumber: string) {
    const validated = cancelOrderSchema.parse({ orderNumber });
    const existing = await this.repository.findByOrderNumber(validated.orderNumber);

    if (!existing) {
      throw new HttpError(404, "Р—Р°РєР°Р· РЅРµ РЅР°Р№РґРµРЅ. РџСЂРѕРІРµСЂСЊС‚Рµ РїСЂР°РІРёР»СЊРЅРѕСЃС‚СЊ РІРІРµРґРµРЅРЅРѕРіРѕ РЅРѕРјРµСЂР°.");
    }

    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      throw new HttpError(409, "Р­С‚РѕС‚ Р·Р°РєР°Р· СѓР¶Рµ Р·Р°РІРµСЂС€РµРЅ Рё РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РѕС‚РјРµРЅРµРЅ.");
    }

    const cancelledAt = nowIso();
    const updated = orderSchema.parse({
      ...existing,
      status: "CANCELLED",
      crmSyncState: "queued",
      updatedAt: cancelledAt,
      events: appendEvent(existing, {
        type: "cancelled",
        at: cancelledAt,
      }),
    });

    return this.repository.saveOrder(updated);
  }

  private applyBitrixSnapshot(order: OrderRecord, snapshot: BitrixSyncSnapshot, forceAuditEvent: boolean) {
    const syncedAt = nowIso();
    const nextEvents = [...order.events];
    const changed =
      order.status !== snapshot.status ||
      order.crmSyncState !== snapshot.crmSyncState ||
      order.crmContactId !== snapshot.crmContactId ||
      order.crmDealId !== snapshot.crmDealId ||
      order.crmStageId !== snapshot.crmStageId ||
      order.crmStageName !== snapshot.crmStageName;

    if (forceAuditEvent || changed) {
      nextEvents.push({
        type: "bitrix_synced",
        at: syncedAt,
        payload: {
          crmContactId: snapshot.crmContactId,
          crmDealId: snapshot.crmDealId,
          crmStageId: snapshot.crmStageId,
        },
      });
    }

    if (order.status !== snapshot.status) {
      nextEvents.push({
        type: "status_changed",
        at: syncedAt,
        payload: {
          from: order.status,
          to: snapshot.status,
          source: "bitrix",
        },
      });
    }

    return orderSchema.parse({
      ...order,
      status: snapshot.status,
      crmSyncState: snapshot.crmSyncState,
      crmContactId: snapshot.crmContactId,
      crmDealId: snapshot.crmDealId,
      crmStageId: snapshot.crmStageId,
      crmStageName: snapshot.crmStageName,
      updatedAt: forceAuditEvent || changed ? syncedAt : order.updatedAt,
      events: nextEvents,
    });
  }

  private applyBitrixFailure(order: OrderRecord, error: unknown) {
    const failedAt = nowIso();
    const message =
      error instanceof BitrixSyncError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Не удалось выполнить синхронизацию с Bitrix24.";

    return orderSchema.parse({
      ...order,
      crmSyncState: "failed",
      updatedAt: failedAt,
      events: appendEvent(order, {
        type: "bitrix_sync_failed",
        at: failedAt,
        payload: {
          message,
        },
      }),
    });
  }

  private hasBitrixChanges(current: OrderRecord, next: OrderRecord) {
    return (
      current.status !== next.status ||
      current.crmSyncState !== next.crmSyncState ||
      current.crmContactId !== next.crmContactId ||
      current.crmDealId !== next.crmDealId ||
      current.crmStageId !== next.crmStageId ||
      current.crmStageName !== next.crmStageName ||
      current.events.length !== next.events.length
    );
  }
}
