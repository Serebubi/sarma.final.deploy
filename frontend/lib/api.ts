import type { HomeDeliveryTimeSlot, OrderRecord, TransportCompanyId } from "shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as { message?: string } & T;
  if (!response.ok) {
    throw new Error(data.message ?? "Запрос не выполнен");
  }

  return data;
}

export async function createPickupOrder(payload: {
  orderType: "pickup_standard" | "pickup_paid";
  marketplace: string;
  pickupPoint?: string;
  firstName: string;
  lastName?: string;
  phone: string;
  size?: string;
  itemCount?: string;
  totalAmount?: string;
  trackingNumber?: string;
  shipmentNumber?: string;
  senderName?: string;
  transportCompany?: TransportCompanyId;
  pickupCode?: string;
  sourceUrl?: string;
  additionalInfo?: string;
  attachment?: File;
  bulkyAttachments?: File[];
  productAttachment?: File;
}) {
  const formData = new FormData();
  formData.set("orderType", payload.orderType);
  formData.set("marketplace", payload.marketplace);
  if (payload.pickupPoint) {
    formData.set("pickupPoint", payload.pickupPoint);
  }
  formData.set("firstName", payload.firstName);
  if (payload.lastName) {
    formData.set("lastName", payload.lastName);
  }
  formData.set("phone", payload.phone);
  if (payload.size) {
    formData.set("size", payload.size);
  }
  if (payload.itemCount) {
    formData.set("itemCount", payload.itemCount);
  }
  if (payload.totalAmount) {
    formData.set("totalAmount", payload.totalAmount);
  }
  if (payload.trackingNumber) {
    formData.set("trackingNumber", payload.trackingNumber);
  }
  if (payload.shipmentNumber) {
    formData.set("shipmentNumber", payload.shipmentNumber);
  }
  if (payload.senderName) {
    formData.set("senderName", payload.senderName);
  }
  if (payload.transportCompany) {
    formData.set("transportCompany", payload.transportCompany);
  }
  if (payload.pickupCode) {
    formData.set("pickupCode", payload.pickupCode);
  }
  if (payload.sourceUrl) {
    formData.set("sourceUrl", payload.sourceUrl);
  }
  if (payload.additionalInfo) {
    formData.set("additionalInfo", payload.additionalInfo);
  }
  if (payload.attachment) {
    formData.set("attachment", payload.attachment);
  }
  if (payload.bulkyAttachments) {
    for (const file of payload.bulkyAttachments) {
      formData.append("bulkyAttachments", file);
    }
  }
  if (payload.productAttachment) {
    formData.set("productAttachment", payload.productAttachment);
  }

  const response = await fetch(`${API_BASE_URL}/orders/create`, {
    method: "POST",
    body: formData,
  });

  return parseResponse<{ order: OrderRecord; message: string }>(response);
}

export async function createHomeDeliveryOrder(payload: {
  orderNumbers: string[];
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTimeSlot: HomeDeliveryTimeSlot;
}) {
  const formData = new FormData();
  formData.set("orderType", "home_delivery");
  formData.set("orderNumbers", JSON.stringify(payload.orderNumbers));
  formData.set("deliveryAddress", payload.deliveryAddress);
  formData.set("deliveryDate", payload.deliveryDate);
  formData.set("deliveryTimeSlot", payload.deliveryTimeSlot);

  const response = await fetch(`${API_BASE_URL}/orders/create`, {
    method: "POST",
    body: formData,
  });

  return parseResponse<{ order: OrderRecord; message: string }>(response);
}

export async function fetchOrder(orderNumber: string) {
  const response = await fetch(`${API_BASE_URL}/orders/${orderNumber}`);
  return parseResponse<{ order: OrderRecord }>(response);
}

export async function lookupOrder(query: string) {
  const params = new URLSearchParams({ query });
  const response = await fetch(`${API_BASE_URL}/orders/lookup?${params.toString()}`);
  return parseResponse<{ orders: OrderRecord[] }>(response);
}

export async function cancelOrder(orderNumber: string) {
  const response = await fetch(`${API_BASE_URL}/orders/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderNumber }),
  });

  return parseResponse<{ order: OrderRecord; message: string }>(response);
}
