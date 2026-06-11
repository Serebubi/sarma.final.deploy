import fs from "node:fs/promises";
import path from "node:path";

import { orderSchema, type OrderRecord } from "shared";

import { config } from "../config.js";

interface OrderDatabase {
  orders: OrderRecord[];
}

function normalizeDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function pickNewestOrder(orders: OrderRecord[]) {
  return [...orders].sort((left, right) => Number(right.orderNumber) - Number(left.orderNumber))[0] ?? null;
}

async function ensureDatabase() {
  await fs.mkdir(path.dirname(config.dataFile), { recursive: true });

  try {
    await fs.access(config.dataFile);
  } catch {
    await fs.writeFile(config.dataFile, JSON.stringify({ orders: [] }, null, 2), "utf8");
  }
}

async function readDatabase(): Promise<OrderDatabase> {
  await ensureDatabase();
  const raw = await fs.readFile(config.dataFile, "utf8");
  const parsed = JSON.parse(raw) as OrderDatabase;
  return {
    orders: parsed.orders.map((entry) => orderSchema.parse(entry)),
  };
}

async function writeDatabase(data: OrderDatabase) {
  await ensureDatabase();
  await fs.writeFile(config.dataFile, JSON.stringify(data, null, 2), "utf8");
}

export class FileOrderRepository {
  async listOrders() {
    const data = await readDatabase();
    return data.orders;
  }

  async findByOrderNumber(orderNumber: string) {
    const data = await readDatabase();
    return data.orders.find((order) => order.orderNumber === orderNumber) ?? null;
  }

  async findByTrackingReference(query: string) {
    const data = await readDatabase();
    const normalizedQuery = normalizeText(query);
    const normalizedDigits = normalizeDigits(query);

    return (
      data.orders.find((order) => {
        const tracking = normalizeText(order.trackingNumber);
        const shipment = normalizeText(order.shipmentNumber);
        const trackingDigits = normalizeDigits(order.trackingNumber);
        const shipmentDigits = normalizeDigits(order.shipmentNumber);

        return (
          tracking === normalizedQuery ||
          shipment === normalizedQuery ||
          (normalizedDigits.length > 0 && (trackingDigits === normalizedDigits || shipmentDigits === normalizedDigits))
        );
      }) ?? null
    );
  }

  async findLatestByPhone(phone: string) {
    const data = await readDatabase();
    const digits = normalizeDigits(phone);
    if (!digits) {
      return null;
    }

    const comparableDigits = digits.length >= 10 ? digits.slice(-10) : digits;
    return pickNewestOrder(
      data.orders.filter((order) => {
        const orderDigits = normalizeDigits(order.customer.phone);
        return orderDigits === digits || orderDigits.endsWith(comparableDigits);
      }),
    );
  }

  async findAllByPhone(phone: string) {
    const data = await readDatabase();
    const digits = normalizeDigits(phone);
    if (!digits) {
      return [];
    }

    const comparableDigits = digits.length >= 10 ? digits.slice(-10) : digits;
    return [...data.orders]
      .filter((order) => {
        const orderDigits = normalizeDigits(order.customer.phone);
        return orderDigits === digits || orderDigits.endsWith(comparableDigits);
      })
      .sort((left, right) => Number(right.orderNumber) - Number(left.orderNumber));
  }

  async saveOrder(order: OrderRecord) {
    const data = await readDatabase();
    const nextOrders = data.orders.filter((entry) => entry.id !== order.id);
    nextOrders.push(orderSchema.parse(order));
    await writeDatabase({ orders: nextOrders.sort((left, right) => Number(left.orderNumber) - Number(right.orderNumber)) });
    return order;
  }
}
