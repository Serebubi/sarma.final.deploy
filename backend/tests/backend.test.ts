import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { parseCorsOrigins } from "../src/config.js";
import { mapOrderToBitrixPayload } from "../src/services/bitrix-service.js";
import { previewMarketplaceLink } from "../src/services/parser-service.js";

function createBitrixResponse(result: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ result }),
  } satisfies Partial<Response> as Response;
}

function readFormBody(body: RequestInit["body"] | null | undefined) {
  if (body instanceof URLSearchParams) {
    return body;
  }

  if (typeof body === "string") {
    return new URLSearchParams(body);
  }

  throw new Error("Unexpected request body");
}

const bitrixDealCategories = [
  { id: 1, name: "СДЭК" },
  { id: 2, name: "Внешние заборы" },
  { id: 3, name: "Ozon 68" },
  { id: 4, name: "Ozon 23" },
  { id: 5, name: "WB 68" },
  { id: 6, name: "WB 23" },
  { id: 7, name: "Склад Ростов" },
  { id: 8, name: "Курьерская доставка" },
  { id: 9, name: "Отправки и перемещения" },
  { id: 10, name: "Выкуп товаров" },
  { id: 11, name: "Экспедирование" },
];

function createBitrixCategoryResponse() {
  return createBitrixResponse({ categories: bitrixDealCategories });
}

function createCapturingBitrixFetch(dealPayloads: URLSearchParams[]) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);

    if (url.includes("crm.duplicate.findbycomm")) {
      return createBitrixResponse({});
    }

    if (url.includes("crm.contact.add")) {
      return createBitrixResponse(321);
    }

    if (url.includes("crm.category.list")) {
      return createBitrixCategoryResponse();
    }

    if (url.includes("crm.deal.add")) {
      dealPayloads.push(readFormBody(init?.body));
      return createBitrixResponse(600 + dealPayloads.length);
    }

    throw new Error(`Unexpected fetch ${url}`);
  });
}

describe("backend api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns fallback preview for unsupported domain", async () => {
    const result = await previewMarketplaceLink("wildberries", "https://example.com/item/test-item");
    expect(result.mode).toBe("fallback");
  });

  it("parses multiple cors origins from env format", () => {
    expect(parseCorsOrigins("https://site-1.example, https://site-2.example/ , https://site-3.example")).toEqual([
      "https://site-1.example",
      "https://site-2.example",
      "https://site-3.example",
    ]);
  });

  it("allows the production Sarma Express origin", async () => {
    const app = createApp();

    const response = await request(app).options("/orders/lookup").set("Origin", "http://sarma-express.ru");

    expect(response.headers["access-control-allow-origin"]).toBe("http://sarma-express.ru");
  });

  it("creates an order, syncs it to Bitrix, and refreshes status from the deal stage", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(321);
      }

      if (url.includes("crm.category.list")) {
        return createBitrixCategoryResponse();
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(654);
      }

      if (url.includes("crm.deal.get")) {
        return createBitrixResponse({
          ID: 654,
          CONTACT_ID: 321,
          STAGE_ID: "C7:S06_KURER_PEREME",
        });
      }

      if (url.includes("crm.status.list")) {
        const body = readFormBody(init?.body);
        expect(body.get("filter[ENTITY_ID]")).toBe("DEAL_STAGE_7");
        return createBitrixResponse([
          {
            STATUS_ID: "C7:S06_KURER_PEREME",
            NAME: "Передан курьеру",
          },
        ]);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_standard")
      .field("marketplace", "wildberries")
      .field("firstName", "Сергей")
      .field("lastName", "Иванов")
      .field("phone", "+79997776655")
      .field("itemCount", "2")
      .field("totalAmount", "4300")
      .field("sourceUrl", "https://www.wildberries.ru/catalog/123/detail.aspx");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.crmSyncState).toBe("synced");
    expect(createResponse.body.order.crmContactId).toBe("321");
    expect(createResponse.body.order.crmDealId).toBe("654");
    expect(createResponse.body.order.crmStageId).toBe("C10:NEW");
    expect(createResponse.body.order.crmStageName).toBe("Новые заказы");

    const orderNumber = createResponse.body.order.orderNumber as string;

    const fetchResponse = await request(app).get(`/orders/${orderNumber}`);
    expect(fetchResponse.status).toBe(200);
    expect(fetchResponse.body.order.marketplace).toBe("wildberries");
    expect(fetchResponse.body.order.status).toBe("PROCESSING");
    expect(fetchResponse.body.order.crmStageId).toBe("C7:S06_KURER_PEREME");
    expect(fetchResponse.body.order.crmStageName).toBe("Передан курьеру");
  });

  it("keeps the local order when Bitrix is unavailable during creation", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new Error("Bitrix unavailable");
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_standard")
      .field("marketplace", "wildberries")
      .field("firstName", "Анна")
      .field("lastName", "Петрова")
      .field("phone", "+79990001122")
      .field("itemCount", "1")
      .field("totalAmount", "1500")
      .field("sourceUrl", "https://www.wildberries.ru/catalog/456/detail.aspx");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.crmSyncState).toBe("failed");
    expect(createResponse.body.order.crmDealId).toBeNull();
    expect(createResponse.body.order.status).toBe("CREATED");
  });

  it("maps configured order fields to Bitrix custom deal fields", async () => {
    vi.stubEnv("BITRIX_DEAL_FIELD_ORDER_NUMBER", "UF_CRM_ORDER_NUMBER");
    vi.stubEnv("BITRIX_DEAL_FIELD_CUSTOMER_NAME", "UF_CRM_CUSTOMER_NAME");
    vi.stubEnv("BITRIX_DEAL_FIELD_CUSTOMER_PHONE", "UF_CRM_CUSTOMER_PHONE");
    vi.stubEnv("BITRIX_DEAL_FIELD_SOURCE_URL", "UF_CRM_SOURCE_URL");

    const dealPayloads: URLSearchParams[] = [];

    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(321);
      }

      if (url.includes("crm.category.list")) {
        return createBitrixCategoryResponse();
      }

      if (url.includes("crm.deal.add")) {
        dealPayloads.push(readFormBody(init?.body));
        return createBitrixResponse(654);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_standard")
      .field("marketplace", "wildberries")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("itemCount", "2")
      .field("totalAmount", "4300")
      .field("sourceUrl", "https://www.wildberries.ru/catalog/123/detail.aspx");

    expect(createResponse.status).toBe(201);
    const dealPayload = dealPayloads[0];
    expect(dealPayload?.get("fields[CATEGORY_ID]")).toBe("10");
    expect(dealPayload?.get("fields[STAGE_ID]")).toBe("C10:NEW");
    expect(dealPayload?.get("fields[UF_CRM_ORDER_NUMBER]")).toBe(createResponse.body.order.orderNumber);
    expect(dealPayload?.get("fields[UF_CRM_CUSTOMER_NAME]")).toBe("Ivan Ivanov");
    expect(dealPayload?.get("fields[UF_CRM_CUSTOMER_PHONE]")).toBe("+79997776655");
    expect(dealPayload?.get("fields[UF_CRM_SOURCE_URL]")).toBe("https://www.wildberries.ru/catalog/123/detail.aspx");
    expect(dealPayload?.get("fields[COMMENTS]")).not.toContain("+79997776655");
    expect(dealPayload?.get("fields[COMMENTS]")).not.toContain("https://www.wildberries.ru/catalog/123/detail.aspx");
  });

  it("keeps pickup standard item count and total amount empty in Bitrix when they are not part of the form", async () => {
    const dealPayloads: URLSearchParams[] = [];

    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(321);
      }

      if (url.includes("crm.category.list")) {
        return createBitrixCategoryResponse();
      }

      if (url.includes("crm.deal.add")) {
        dealPayloads.push(readFormBody(init?.body));
        return createBitrixResponse(654);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_standard")
      .field("marketplace", "wildberries")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("size", "42")
      .field("sourceUrl", "https://www.wildberries.ru/catalog/123/detail.aspx");

    expect(createResponse.status).toBe(201);
    const dealPayload = dealPayloads[0];
    expect(dealPayload?.get("fields[CATEGORY_ID]")).toBe("10");
    expect(dealPayload?.get("fields[STAGE_ID]")).toBe("C10:NEW");
    expect(dealPayload?.get("fields[UF_CRM_1774909222920]")).toBe(createResponse.body.order.orderNumber);
    expect(dealPayload?.get("fields[UF_CRM_1774909231523]")).toBe("Самовывоз");
    expect(dealPayload?.get("fields[UF_CRM_1774909238633]")).toBe("WILDBERRIES");
    expect(dealPayload?.get("fields[UF_CRM_1774909246381]")).toBe("CREATED");
    expect(dealPayload?.get("fields[UF_CRM_1774909256492]")).toBe(createResponse.body.order.pickupAddress);
    expect(dealPayload?.get("fields[UF_CRM_1774908835361]")).toBeNull();
    expect(dealPayload?.get("fields[UF_CRM_1774908871627]")).toBeNull();
    expect(createResponse.body.order.size).toBe("42");
    expect(dealPayload?.get("fields[COMMENTS]")).toContain("42");
  });

  it("creates pickup standard order without item count and total amount", async () => {
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_standard")
      .field("marketplace", "wildberries")
      .field("firstName", "Сергей")
      .field("lastName", "Иванов")
      .field("phone", "+79997776655")
      .field("size", "M")
      .field("sourceUrl", "https://www.wildberries.ru/catalog/123/detail.aspx");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.itemCount).toBeNull();
    expect(createResponse.body.order.totalAmount).toBeNull();
    expect(createResponse.body.order.size).toBe("M");
  });

  it("stores the selected pickup point in the order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new Error("Bitrix unavailable");
      }),
    );

    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_standard")
      .field("marketplace", "wildberries")
      .field("pickupPoint", "chelyuskintsev_donetsk")
      .field("firstName", "Иван")
      .field("lastName", "Иванов")
      .field("phone", "+79997776655")
      .field("size", "42")
      .field("sourceUrl", "https://www.wildberries.ru/catalog/123/detail.aspx");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.pickupPoint).toBe("chelyuskintsev_donetsk");
    expect(createResponse.body.order.pickupAddress).toBe("Донецк, ПВЗ");
  });

  it("routes every available order form to the expected Bitrix funnel", async () => {
    const dealPayloads: URLSearchParams[] = [];
    vi.stubGlobal("fetch", createCapturingBitrixFetch(dealPayloads));
    const app = createApp();

    const paidBaseFields = {
      orderType: "pickup_paid",
      pickupPoint: "chelyuskintsev_donetsk",
      firstName: "Ivan",
      lastName: "Ivanov",
      phone: "+79997776655",
    };
    const cases = [
      {
        name: "cdek",
        fields: { ...paidBaseFields, marketplace: "cdek", trackingNumber: "12345678901" },
        expectedCategoryId: "1",
      },
      {
        name: "5post",
        fields: { ...paidBaseFields, marketplace: "5post", trackingNumber: "5POST-123456", pickupCode: "4455" },
        expectedCategoryId: "2",
      },
      {
        name: "dpd",
        fields: { ...paidBaseFields, marketplace: "dpd", trackingNumber: "DPD-123456", pickupCode: "5566" },
        expectedCategoryId: "2",
      },
      {
        name: "wildberries",
        fields: { ...paidBaseFields, marketplace: "wildberries", pickupCode: "WB-7788" },
        attachment: "wildberries-qr.png",
        expectedCategoryId: "5",
      },
      {
        name: "ozon",
        fields: { ...paidBaseFields, marketplace: "ozon", pickupCode: "OZON-7788" },
        attachment: "ozon-qr.png",
        expectedCategoryId: "4",
      },
      {
        name: "yandex_market",
        fields: { ...paidBaseFields, marketplace: "yandex_market", pickupCode: "YM-7788" },
        attachment: "yandex-market-qr.png",
        expectedCategoryId: "3",
      },
      {
        name: "avito",
        fields: { ...paidBaseFields, marketplace: "avito", pickupCode: "AVITO-7788" },
        attachment: "avito-qr.png",
        expectedCategoryId: "3",
      },
      {
        name: "lamoda",
        fields: { ...paidBaseFields, marketplace: "lamoda", pickupCode: "LAMODA-7788" },
        attachment: "lamoda-qr.png",
        expectedCategoryId: "2",
      },
      {
        name: "goldapple",
        fields: { ...paidBaseFields, marketplace: "goldapple", trackingNumber: "GA-123456", pickupCode: "GA-7788" },
        attachment: "goldapple-order.png",
        expectedCategoryId: "7",
      },
      {
        name: "letual",
        fields: { ...paidBaseFields, marketplace: "letual", trackingNumber: "LET-123456", pickupCode: "LET-7788" },
        attachment: "letual-order.png",
        expectedCategoryId: "7",
      },
      {
        name: "detmir",
        fields: { ...paidBaseFields, marketplace: "detmir", trackingNumber: "DM-123456", pickupCode: "DM-7788" },
        attachment: "detmir-order.png",
        expectedCategoryId: "2",
      },
      {
        name: "bulky",
        fields: { ...paidBaseFields, marketplace: "bulky", transportCompany: "delovye_linii", trackingNumber: "BULKY-42" },
        bulkyAttachments: ["bulky-order.png"],
        expectedCategoryId: "2",
      },
      {
        name: "courier",
        fields: { ...paidBaseFields, marketplace: "courier", senderName: "Ozon", trackingNumber: "COURIER-42" },
        attachment: "courier-order.png",
        expectedCategoryId: "7",
      },
      {
        name: "link order",
        fields: {
          orderType: "pickup_standard",
          marketplace: "wildberries",
          pickupPoint: "chelyuskintsev_donetsk",
          firstName: "Ivan",
          lastName: "Ivanov",
          phone: "+79997776655",
          sourceUrl: "https://www.wildberries.ru/catalog/123/detail.aspx",
        },
        expectedCategoryId: "10",
      },
    ];

    let linkOrderNumber = "";

    for (const scenario of cases) {
      let createRequest = request(app).post("/orders/create");
      for (const [key, value] of Object.entries(scenario.fields)) {
        createRequest = createRequest.field(key, value);
      }
      if ("attachment" in scenario && scenario.attachment) {
        createRequest = createRequest.attach("attachment", Buffer.from(`${scenario.name} file`), scenario.attachment);
      }
      if ("bulkyAttachments" in scenario && scenario.bulkyAttachments) {
        for (const fileName of scenario.bulkyAttachments) {
          createRequest = createRequest.attach("bulkyAttachments", Buffer.from(`${scenario.name} file`), fileName);
        }
      }

      const createResponse = await createRequest;
      const dealPayload = dealPayloads.at(-1);

      expect(createResponse.status, scenario.name).toBe(201);
      expect(createResponse.body.order.crmSyncState, scenario.name).toBe("synced");
      expect(dealPayload?.get("fields[CATEGORY_ID]"), scenario.name).toBe(scenario.expectedCategoryId);
      expect(dealPayload?.get("fields[STAGE_ID]"), scenario.name).toBe(`C${scenario.expectedCategoryId}:NEW`);

      if (scenario.name === "link order") {
        linkOrderNumber = createResponse.body.order.orderNumber;
      }
    }

    let deliveryRequest = request(app)
      .post("/orders/create")
      .field("orderType", "home_delivery")
      .field("orderNumbers", JSON.stringify([linkOrderNumber]))
      .field("deliveryAddress", "Mariupol, Lenina 1")
      .field("deliveryDate", "2026-06-15")
      .field("deliveryTimeSlot", "12:00-15:00");

    const deliveryResponse = await deliveryRequest;
    const deliveryDealPayload = dealPayloads.at(-1);

    expect(deliveryResponse.status, "home_delivery").toBe(201);
    expect(deliveryResponse.body.order.crmSyncState, "home_delivery").toBe("synced");
    expect(deliveryDealPayload?.get("fields[CATEGORY_ID]"), "home_delivery").toBe("8");
    expect(deliveryDealPayload?.get("fields[STAGE_ID]"), "home_delivery").toBe("C8:NEW");
  });

  it("creates a home delivery request from existing order numbers", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(333);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(701);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const baseOrderResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_standard")
      .field("marketplace", "wildberries")
      .field("firstName", "Сергей")
      .field("lastName", "Иванов")
      .field("phone", "+79997776655")
      .field("itemCount", "2")
      .field("totalAmount", "4300")
      .field("sourceUrl", "https://www.wildberries.ru/catalog/123/detail.aspx");

    expect(baseOrderResponse.status).toBe(201);

    const deliveryResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "home_delivery")
      .field("orderNumbers", JSON.stringify([baseOrderResponse.body.order.orderNumber]))
      .field("deliveryAddress", "Мариуполь, Ленина 1")
      .field("deliveryDate", "2026-03-28")
      .field("deliveryTimeSlot", "12:00-15:00");

    expect(deliveryResponse.status).toBe(201);
    expect(deliveryResponse.body.order.marketplace).toBe("home_delivery");
    expect(deliveryResponse.body.order.relatedOrderNumbers).toEqual([baseOrderResponse.body.order.orderNumber]);
    expect(deliveryResponse.body.order.deliveryTimeSlot).toBe("12:00-15:00");
  });


  it("creates a paid cdek order without attachment", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(333);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(777);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_paid")
      .field("marketplace", "cdek")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("trackingNumber", "12345678901")
      .field("pickupCode", "7788");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.marketplace).toBe("cdek");
    expect(createResponse.body.order.trackingNumber).toBe("12345678901");
    expect(createResponse.body.order.pickupCode).toBe("7788");
    expect(createResponse.body.order.attachment).toBeNull();
  });

  it("creates a cdek paid order with shipment number only", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(334);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(779);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_paid")
      .field("marketplace", "cdek")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("shipmentNumber", "CN0016355297RU9");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.marketplace).toBe("cdek");
    expect(createResponse.body.order.trackingNumber).toBeNull();
    expect(createResponse.body.order.shipmentNumber).toBe("CN0016355297RU9");
    expect(createResponse.body.order.pickupCode).toBeNull();
  });

  it("creates a paid 5post order without attachment", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(333);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(778);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_paid")
      .field("marketplace", "5post")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("trackingNumber", "5POST-123456")
      .field("pickupCode", "4455");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.marketplace).toBe("5post");
    expect(createResponse.body.order.trackingNumber).toBe("5POST-123456");
    expect(createResponse.body.order.pickupCode).toBe("4455");
    expect(createResponse.body.order.attachment).toBeNull();
  });

  it("creates a paid dpd order without attachment", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(333);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(779);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_paid")
      .field("marketplace", "dpd")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("trackingNumber", "DPD-123456")
      .field("pickupCode", "5566");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.marketplace).toBe("dpd");
    expect(createResponse.body.order.trackingNumber).toBe("DPD-123456");
    expect(createResponse.body.order.pickupCode).toBe("5566");
    expect(createResponse.body.order.attachment).toBeNull();
  });

  it("creates a paid avito order without attachment", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(333);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(780);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_paid")
      .field("marketplace", "avito")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("itemCount", "1")
      .field("totalAmount", "1200")
      .field("trackingNumber", "AVITO-123456")
      .field("pickupCode", "6677")
      .attach("attachment", Buffer.from("barcode file"), "avito-qr.png");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.marketplace).toBe("avito");
    expect(createResponse.body.order.itemCount).toBe(1);
    expect(createResponse.body.order.totalAmount).toBe(1200);
    expect(createResponse.body.order.trackingNumber).toBe("AVITO-123456");
    expect(createResponse.body.order.pickupCode).toBe("6677");
    expect(createResponse.body.order.attachment.fileName).toBe("avito-qr.png");
  });

  it("creates a paid detmir order with order number and optional pickup code", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(335);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(781);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_paid")
      .field("marketplace", "detmir")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("trackingNumber", "DM-123456")
      .field("pickupCode", "8899")
      .field("itemCount", "2")
      .field("totalAmount", "3500")
      .attach("attachment", Buffer.from("test file"), "detmir-order.png");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.marketplace).toBe("detmir");
    expect(createResponse.body.order.trackingNumber).toBe("DM-123456");
    expect(createResponse.body.order.pickupCode).toBe("8899");
    expect(createResponse.body.order.itemCount).toBe(2);
    expect(createResponse.body.order.totalAmount).toBe(3500);
  });

  it("creates a paid goldapple order with required order number", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(336);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(782);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_paid")
      .field("marketplace", "goldapple")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("trackingNumber", "GA-123456")
      .field("itemCount", "2")
      .field("totalAmount", "3500")
      .attach("attachment", Buffer.from("test file"), "goldapple-order.png");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.marketplace).toBe("goldapple");
    expect(createResponse.body.order.trackingNumber).toBe("GA-123456");
    expect(createResponse.body.order.itemCount).toBe(2);
    expect(createResponse.body.order.totalAmount).toBe(3500);
  });

  it("creates a paid letual order with required order number", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(338);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(784);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_paid")
      .field("marketplace", "letual")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("trackingNumber", "LET-123456")
      .field("itemCount", "2")
      .field("totalAmount", "3500")
      .attach("attachment", Buffer.from("test file"), "letual-order.png");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.marketplace).toBe("letual");
    expect(createResponse.body.order.trackingNumber).toBe("LET-123456");
    expect(createResponse.body.order.itemCount).toBe(2);
    expect(createResponse.body.order.totalAmount).toBe(3500);
  });

  it("creates a wildberries premium paid order with two attachments", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(340);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(786);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_paid")
      .field("marketplace", "wildberries")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("itemCount", "1")
      .field("totalAmount", "25000")
      .attach("productAttachment", Buffer.from("product file"), "wb-premium-product.png")
      .attach("attachment", Buffer.from("barcode file"), "wb-premium-qr.png");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.marketplace).toBe("wildberries");
    expect(createResponse.body.order.itemCount).toBe(1);
    expect(createResponse.body.order.totalAmount).toBe(25000);
    expect(createResponse.body.order.productAttachment.fileName).toBe("wb-premium-product.png");
    expect(createResponse.body.order.attachment.fileName).toBe("wb-premium-qr.png");
  });

  it("creates a bulky paid order with sender name and optional codes", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(337);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(783);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_paid")
      .field("marketplace", "bulky")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("transportCompany", "delovye_linii")
      .field("trackingNumber", "BULKY-42")
      .field("pickupCode", "7788")
      .attach("bulkyAttachments", Buffer.from("test file"), "bulky-order.png")
      .attach("bulkyAttachments", Buffer.from("second test file"), "bulky-order-2.png");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.marketplace).toBe("bulky");
    expect(createResponse.body.order.transportCompany).toBe("delovye_linii");
    expect(createResponse.body.order.trackingNumber).toBe("BULKY-42");
    expect(createResponse.body.order.pickupCode).toBe("7788");
    expect(createResponse.body.order.bulkyAttachments).toHaveLength(2);
    expect(createResponse.body.order.bulkyAttachments[0].fileName).toBe("bulky-order.png");
    expect(createResponse.body.order.bulkyAttachments[1].fileName).toBe("bulky-order-2.png");
  });

  it("creates a courier paid order with sender name and totals", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);

      if (url.includes("crm.duplicate.findbycomm")) {
        return createBitrixResponse({});
      }

      if (url.includes("crm.contact.add")) {
        return createBitrixResponse(339);
      }

      if (url.includes("crm.deal.add")) {
        return createBitrixResponse(785);
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    const app = createApp();

    const createResponse = await request(app)
      .post("/orders/create")
      .field("orderType", "pickup_paid")
      .field("marketplace", "courier")
      .field("firstName", "Ivan")
      .field("lastName", "Ivanov")
      .field("phone", "+79997776655")
      .field("senderName", "Ривгош")
      .field("trackingNumber", "COURIER-42")
      .field("pickupCode", "4455")
      .field("itemCount", "2")
      .field("totalAmount", "3500")
      .attach("attachment", Buffer.from("test file"), "courier-order.png");

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.order.marketplace).toBe("courier");
    expect(createResponse.body.order.senderName).toBe("Ривгош");
    expect(createResponse.body.order.trackingNumber).toBe("COURIER-42");
    expect(createResponse.body.order.pickupCode).toBe("4455");
    expect(createResponse.body.order.itemCount).toBe(2);
    expect(createResponse.body.order.totalAmount).toBe(3500);
  });

  it("maps an order to bitrix payload", () => {
    const payload = mapOrderToBitrixPayload({
      id: "5fb3108c-8ed0-4eaf-9271-fcd0f463b812",
      orderNumber: "123456",
      orderType: "home_delivery",
      marketplace: "home_delivery",
      status: "CREATED",
      pickupAddress: "Грушевского, 8",
      pickupPoint: null,
      customer: {
        firstName: "Ирина",
        lastName: null,
        phone: "+79997776655",
      },
      relatedOrderNumbers: ["669281", "669282"],
      itemCount: null,
      totalAmount: null,
      trackingNumber: null,
      senderName: null,
      shipmentNumber: null,
      transportCompany: null,
      pickupCode: null,
      size: null,
      sourceUrl: null,
      additionalInfo: null,
      deliveryAddress: "Мариуполь, Ленина 1",
      deliveryDate: "2026-03-28",
      deliveryTimeSlot: "12:00-15:00",
      productPreview: null,
      attachment: null,
      productAttachment: null,
      bulkyAttachments: [],
      crmSyncState: "pending",
      crmContactId: null,
      crmDealId: null,
      crmStageId: null,
      crmStageName: null,
      events: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(payload.pricing.deliveryFee).toBe(300);
    expect(payload.customer.fullName).toBe("Ирина");
  });
});
