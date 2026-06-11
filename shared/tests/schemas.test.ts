import { describe, expect, it } from "vitest";

import {
  buildManualPreview,
  createHomeDeliveryOrderSchema,
  createPaidPickupOrderSchema,
  createPickupStandardOrderSchema,
  isSupportedDomainForMarketplace,
  marketplaceExampleUrls,
  previewLinkSchema,
} from "../src/index";

describe("shared schemas", () => {
  it("validates pickup order input", () => {
    const result = createPickupStandardOrderSchema.parse({
      orderType: "pickup_standard",
      marketplace: "wildberries",
      pickupPoint: "mendeleeva_volnovakha",
      firstName: "Сергей",
      lastName: "Иванов",
      phone: "+79997776655",
      itemCount: 2,
      totalAmount: 3500,
      sourceUrl: "https://www.wildberries.ru/catalog/123/detail.aspx",
    });

    expect(result.marketplace).toBe("wildberries");
    expect(result.pickupPoint).toBe("mendeleeva_volnovakha");
  });

  it("validates cdek paid pickup input", () => {
    const result = createPaidPickupOrderSchema.parse({
      orderType: "pickup_paid",
      marketplace: "cdek",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79997776655",
      trackingNumber: "12345678901",
    });

    expect(result.marketplace).toBe("cdek");
    expect(result.trackingNumber).toBe("12345678901");
  });

  it("validates cdek paid pickup input with shipment number only", () => {
    const result = createPaidPickupOrderSchema.parse({
      orderType: "pickup_paid",
      marketplace: "cdek",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79997776655",
      shipmentNumber: "CN0016355297RU9",
    });

    expect(result.marketplace).toBe("cdek");
    expect(result.shipmentNumber).toBe("CN0016355297RU9");
  });

  it("validates 5post paid pickup input", () => {
    const result = createPaidPickupOrderSchema.parse({
      orderType: "pickup_paid",
      marketplace: "5post",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79997776655",
      trackingNumber: "5POST-123456",
      pickupCode: "4455",
    });

    expect(result.marketplace).toBe("5post");
    expect(result.pickupCode).toBe("4455");
  });

  it("validates dpd paid pickup input", () => {
    const result = createPaidPickupOrderSchema.parse({
      orderType: "pickup_paid",
      marketplace: "dpd",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79997776655",
      trackingNumber: "DPD-123456",
      pickupCode: "5566",
    });

    expect(result.marketplace).toBe("dpd");
    expect(result.trackingNumber).toBe("DPD-123456");
  });

  it("validates avito paid pickup input", () => {
    const result = createPaidPickupOrderSchema.parse({
      orderType: "pickup_paid",
      marketplace: "avito",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79997776655",
      trackingNumber: "AVITO-123456",
      pickupCode: "6677",
    });

    expect(result.marketplace).toBe("avito");
    expect(result.pickupCode).toBe("6677");
  });

  it("validates detmir paid pickup input", () => {
    const result = createPaidPickupOrderSchema.parse({
      orderType: "pickup_paid",
      marketplace: "detmir",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79997776655",
      trackingNumber: "DM-123456",
      pickupCode: "8899",
      itemCount: 2,
      totalAmount: 3500,
    });

    expect(result.marketplace).toBe("detmir");
    expect(result.trackingNumber).toBe("DM-123456");
    expect(result.pickupCode).toBe("8899");
  });

  it("validates goldapple paid pickup input", () => {
    const result = createPaidPickupOrderSchema.parse({
      orderType: "pickup_paid",
      marketplace: "goldapple",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79997776655",
      trackingNumber: "GA-123456",
      itemCount: 2,
      totalAmount: 3500,
    });

    expect(result.marketplace).toBe("goldapple");
    expect(result.trackingNumber).toBe("GA-123456");
  });

  it("validates letual paid pickup input", () => {
    const result = createPaidPickupOrderSchema.parse({
      orderType: "pickup_paid",
      marketplace: "letual",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79997776655",
      trackingNumber: "LET-123456",
      itemCount: 2,
      totalAmount: 3500,
    });

    expect(result.marketplace).toBe("letual");
    expect(result.trackingNumber).toBe("LET-123456");
  });

  it("validates wildberries premium paid pickup input", () => {
    const result = createPaidPickupOrderSchema.parse({
      orderType: "pickup_paid",
      marketplace: "wildberries_premium",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79997776655",
      totalAmount: 25000,
    });

    expect(result.marketplace).toBe("wildberries_premium");
    expect(result.totalAmount).toBe(25000);
  });

  it("validates bulky paid pickup input", () => {
    const result = createPaidPickupOrderSchema.parse({
      orderType: "pickup_paid",
      marketplace: "bulky",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79997776655",
      senderName: "OZON",
      trackingNumber: "BULKY-42",
      pickupCode: "7788",
    });

    expect(result.marketplace).toBe("bulky");
    expect(result.senderName).toBe("OZON");
  });

  it("validates courier paid pickup input", () => {
    const result = createPaidPickupOrderSchema.parse({
      orderType: "pickup_paid",
      marketplace: "courier",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79997776655",
      senderName: "Ривгош",
      trackingNumber: "COURIER-42",
      pickupCode: "4455",
      itemCount: 2,
      totalAmount: 3500,
    });

    expect(result.marketplace).toBe("courier");
    expect(result.senderName).toBe("Ривгош");
    expect(result.itemCount).toBe(2);
  });

  it("validates home delivery input", () => {
    const result = createHomeDeliveryOrderSchema.parse({
      orderType: "home_delivery",
      orderNumbers: ["669281", "669282"],
      deliveryAddress: "Мариуполь, Ленина 1",
      deliveryDate: "2026-03-28",
      deliveryTimeSlot: "12:00-15:00",
    });

    expect(result.orderNumbers).toHaveLength(2);
    expect(result.deliveryTimeSlot).toBe("12:00-15:00");
  });

  it("rejects unsupported preview link format", () => {
    expect(() =>
      previewLinkSchema.parse({
        marketplace: "ozon",
        url: "bad-link",
      }),
    ).toThrow();
  });

  it("matches a supported marketplace domain", () => {
    expect(isSupportedDomainForMarketplace("https://www.wildberries.ru/catalog/1/detail.aspx", "wildberries")).toBe(true);
    expect(isSupportedDomainForMarketplace("https://example.com/item", "wildberries")).toBe(false);
  });

  it("builds manual fallback preview", () => {
    const preview = buildManualPreview("https://example.com/item/super-box-pro", "avito");

    expect(preview.title).toContain("super box pro");
    expect(preview.parserMode).toBe("fallback");
  });

  it("provides example links for all marketplaces", () => {
    expect(marketplaceExampleUrls.wildberries).toContain("wildberries.ru");
    expect(marketplaceExampleUrls.ozon).toContain("ozon.ru");
    expect(Object.keys(marketplaceExampleUrls)).toHaveLength(13);
  });
});
