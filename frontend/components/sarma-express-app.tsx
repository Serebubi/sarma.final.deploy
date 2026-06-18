"use client";
/* eslint-disable react/no-unescaped-entities */

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  startTransition,
  useDeferredValue,
  useState,
  useTransition,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

import {
  bulkyAttachmentLimit,
  createHomeDeliveryOrderSchema,
  homeDeliveryTimeSlotValues,
  createPaidPickupOrderSchema,
  createPickupStandardOrderSchema,
  marketplaces,
  pickupPointOptions,
  humanizeMarketplace,
  marketplaceExampleUrls,
  numericIdSchema,
  pickupAddress,
  supportTelegramUrl,
  type HomeDeliveryTimeSlot,
  type MarketplaceId,
  type OrderRecord,
  type PickupPointId,
  type TransportCompanyId,
} from "shared";

import { ApiError, cancelOrder, createHomeDeliveryOrder, createPickupOrder, fetchOrder, lookupOrder as lookupTrackedOrder } from "@/lib/api";
import { SarmaExpressHeader, SarmaExpressLogo } from "@/components/sarma-express-header";

import { FlowShell } from "./flow-shell";
import { OrderSummaryCard } from "./order-summary-card";

type FlowId =
  | "overview"
  | "business"
  | "pickup_standard"
  | "order_lookup"
  | "pickup_paid"
  | "home_delivery"
  | "ship_russia"
  | "cancel_order"
  | "support";

function resolveFlowFromSearchParam(flow: string | null): FlowId {
  if (
    flow === "business" ||
    flow === "pickup_standard" ||
    flow === "order_lookup" ||
    flow === "pickup_paid" ||
    flow === "home_delivery" ||
    flow === "ship_russia" ||
    flow === "cancel_order" ||
    flow === "support"
  ) {
    return flow;
  }

  return "overview";
}

type SpecialPickupId = "courier" | "bulky";

type PickupState = {
  step: 1 | 2 | 3;
  marketplace: MarketplaceId | SpecialPickupId | "";
  pickupPoint: PickupPointId | "";
  firstName: string;
  lastName: string;
  phone: string;
  size: string;
  itemCount: string;
  totalAmount: string;
  trackingNumber: string;
  shipmentNumber: string;
  senderName: string;
  transportCompany: TransportCompanyId | "";
  pickupCode: string;
  sourceUrl: string;
  additionalInfo: string;
  attachment: File | null;
  bulkyAttachments: File[];
  productAttachment: File | null;
  termsAccepted: boolean;
  result: OrderRecord | null;
  errors: Record<string, string>;
};

type DeliveryState = {
  step: 1 | 2;
  orderNumbers: string[];
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTimeSlot: HomeDeliveryTimeSlot | "";
  result: OrderRecord | null;
  errors: Record<string, string>;
};

type PaidFieldCopy = {
  itemCountLabel: string;
  totalAmountLabel: string;
  attachmentLabel: string;
  attachmentHint: string;
  attachmentRequiredError: string;
};

const defaultPaidFieldCopy: PaidFieldCopy = {
  itemCountLabel: "Количество товаров",
  totalAmountLabel: "Итоговая цена всех товаров",
  attachmentLabel: "QR / штрих-код заказа",
  attachmentHint: "PNG, JPG или PDF до 10 MB.",
  attachmentRequiredError: "Прикрепите QR или штрих-код.",
};

const paidFieldCopyByMarketplace: Partial<Record<MarketplaceId | SpecialPickupId, PaidFieldCopy>> = {
  wildberries: {
    itemCountLabel: "Количество товаров",
    totalAmountLabel: "Итоговая цена всех товаров",
    attachmentLabel: "QR-код / штрих-код заказа (нажмите для загрузки)",
    attachmentHint: "Сделайте скриншот QR-кода или штрих-кода в приложении Wildberries и загрузите его сюда.",
    attachmentRequiredError: "Прикрепите QR-код или штрих-код заказа.",
  },
  ozon: {
    itemCountLabel: "Количество товаров",
    totalAmountLabel: "Итоговая цена всех товаров",
    attachmentLabel: "QR-код / штрих-код заказа (нажмите для загрузки)",
    attachmentHint: "Сделайте скриншот QR-кода или штрих-кода в приложении Ozon и загрузите его сюда.",
    attachmentRequiredError: "Прикрепите QR-код или штрих-код заказа.",
  },
  yandex_market: {
    itemCountLabel: "Количество товаров",
    totalAmountLabel: "Итоговая цена всех товаров",
    attachmentLabel: "QR-код / штрих-код заказа (нажмите для загрузки)",
    attachmentHint: "Сделайте скриншот QR-кода или штрих-кода в приложении Яндекс Маркета и загрузите его сюда.",
    attachmentRequiredError: "Прикрепите QR-код или штрих-код заказа.",
  },
  lamoda: {
    itemCountLabel: "Количество товаров",
    totalAmountLabel: "Итоговая цена всех товаров",
    attachmentLabel: "QR-код / штрих-код заказа (нажмите для загрузки)",
    attachmentHint: "Сделайте скриншот QR-кода или штрих-кода в приложении Lamoda и загрузите его сюда.",
    attachmentRequiredError: "Прикрепите QR-код или штрих-код заказа.",
  },
  avito: {
    itemCountLabel: "Количество товаров",
    totalAmountLabel: "Итоговая цена всех товаров",
    attachmentLabel: "QR-код / штрих-код заказа (нажмите для загрузки)",
    attachmentHint: "Сделайте скриншот QR-кода или штрих-кода в приложении Авито и загрузите его сюда.",
    attachmentRequiredError: "Прикрепите QR-код или штрих-код заказа.",
  },
  cdek: {
    itemCountLabel: "Введите общее количество товаров для получения:",
    totalAmountLabel: "Укажите, пожалуйста, общую сумму всех товаров в заказе:",
    attachmentLabel: "Штрих-код или QR код для получения (Сделайте скриншот и приложите его)",
    attachmentHint: "PNG, JPG или PDF до 10 MB.",
    attachmentRequiredError: "Приложите штрих-код или QR код для получения.",
  },
  "5post": {
    itemCountLabel: "Укажите трек-номер",
    totalAmountLabel: "Код получения",
    attachmentLabel: "Скриншот отправления (можно пропустить)",
    attachmentHint: "PNG, JPG или PDF до 10 MB.",
    attachmentRequiredError: "",
  },
  dpd: {
    itemCountLabel: "Укажите трек-номер",
    totalAmountLabel: "Код получения",
    attachmentLabel: "Скриншот отправления (можно пропустить)",
    attachmentHint: "PNG, JPG или PDF до 10 MB.",
    attachmentRequiredError: "",
  },
  goldapple: {
    itemCountLabel: "Количество товаров",
    totalAmountLabel: "Итоговая цена всех товаров",
    attachmentLabel: "Скриншот заказа или QR-код / штрих-код",
    attachmentHint: "Загрузите скриншот заказа, QR-код или штрих-код из Золотого Яблока.",
    attachmentRequiredError: "Прикрепите скриншот заказа, QR-код или штрих-код.",
  },
  letual: {
    itemCountLabel: "Количество товаров",
    totalAmountLabel: "Итоговая цена всех товаров",
    attachmentLabel: "Скриншот заказа или QR-код / штрих-код",
    attachmentHint: "Загрузите скриншот заказа, QR-код или штрих-код из Лэтуаль.",
    attachmentRequiredError: "Прикрепите скриншот заказа, QR-код или штрих-код.",
  },
  detmir: {
    itemCountLabel: "Количество товаров",
    totalAmountLabel: "Итоговая цена всех товаров",
    attachmentLabel: "QR-код / штрих-код заказа (нажмите для загрузки)",
    attachmentHint: "Сделайте скриншот QR-кода или штрих-кода заказа Детского Мира и загрузите его сюда.",
    attachmentRequiredError: "Прикрепите QR-код или штрих-код заказа.",
  },
  courier: {
    itemCountLabel: "Количество товаров",
    totalAmountLabel: "Итоговая цена всех товаров",
    attachmentLabel: "QR / штрих-код заказа / скриншот товара или груза",
    attachmentHint: "PNG, JPG или PDF до 10 MB.",
    attachmentRequiredError: "Прикрепите QR, штрих-код или скриншот товара.",
  },
  bulky: {
    itemCountLabel: "Количество товаров",
    totalAmountLabel: "Итоговая цена всех товаров",
    attachmentLabel: "QR / штрих-код заказа / скриншот товара или груза",
    attachmentHint: "PNG, JPG или PDF до 10 MB. До 10 файлов.",
    attachmentRequiredError: "Прикрепите QR, штрих-код или скриншот товара.",
  },
};

function getPaidFieldCopy(marketplace: PickupState["marketplace"]) {
  if (!marketplace) {
    return defaultPaidFieldCopy;
  }

  return paidFieldCopyByMarketplace[marketplace as MarketplaceId | SpecialPickupId] ?? defaultPaidFieldCopy;
}

const actionCards: Array<{
  id: Exclude<FlowId, "overview">;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  featured?: boolean;
  accent?: "soft";
}> = [
  {
    id: "pickup_paid",
    eyebrow: "24 часа",
    title: "Самостоятельный заказ",
    description: "Загрузите QR или штрих-код и проведите уже оплаченную покупку отдельно.",
    icon: "◎",
    featured: true,
  },
  {
    id: "pickup_standard",
    eyebrow: "Пункт выдачи",
    title: "Сделать заказ по ссылке",
    description: "Оформите новую доставку со ссылкой на товар и прозрачной структурой для CRM.",
    icon: "+",
    accent: "soft",
  },
  {
    id: "order_lookup",
    eyebrow: "Track",
    title: "Отследить посылку",
    description: "Проверьте статус по номеру заказа за пару секунд.",
    icon: "⌕",
  },
  {
    id: "home_delivery",
    eyebrow: "300 ₽",
    title: "Доставка на дом",
    description: "Оформите доставку уже созданных заказов на домашний адрес.",
    icon: "⌂",
  },
  {
    id: "cancel_order",
    eyebrow: "Контроль",
    title: "Отменить заказ",
    description: "Найдите заказ, проверьте статус и отмените без лишних переписок.",
    icon: "×",
  },
];

function createPickupState(): PickupState {
  return {
    step: 1,
    marketplace: "",
    pickupPoint: "",
    firstName: "",
    lastName: "",
    phone: "",
    size: "",
    itemCount: "",
    totalAmount: "",
    trackingNumber: "",
    shipmentNumber: "",
    senderName: "",
    transportCompany: "",
    pickupCode: "",
    sourceUrl: "",
    additionalInfo: "",
    attachment: null,
    bulkyAttachments: [],
    productAttachment: null,
    termsAccepted: false,
    result: null,
    errors: {},
  };
}

function createDeliveryState(): DeliveryState {
  return {
    step: 1,
    orderNumbers: [""],
    deliveryAddress: "",
    deliveryDate: "",
    deliveryTimeSlot: "",
    result: null,
    errors: {},
  };
}

function normalizeOrderNumbersInput(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function BrandMark() {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white">
      <Image src="/brand/sarma-express-logo-cropped.png" alt="Сарма Экспресс" width={40} height={40} className="h-10 w-10 object-contain" priority />
    </span>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  const errorFieldName = htmlFor.replace(/^(pickup_paid|pickup_standard|delivery|cancel)-/, "").replace(/-modern$/, "");

  return (
    <div className="space-y-2" data-error-field={errorFieldName} data-has-error={error ? "true" : "false"}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-[color:var(--foreground)]">
        {label}
      </label>
      {children}
      {hint ? <span className="block text-xs leading-6 text-[color:var(--muted)]">{hint}</span> : null}
      {error ? <span className="block text-xs font-semibold text-[color:var(--danger)]">{error}</span> : null}
    </div>
  );
}

const fieldStateLabelClass = "whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]";

type ApiValidationIssue = {
  message?: string;
  path?: Array<string | number>;
};

function readApiValidationIssues(details: unknown): ApiValidationIssue[] {
  if (!details || typeof details !== "object") {
    return [];
  }

  if ("issues" in details && Array.isArray((details as { issues?: unknown }).issues)) {
    return (details as { issues: ApiValidationIssue[] }).issues;
  }

  if ("message" in details && typeof (details as { message?: unknown }).message === "string") {
    try {
      const parsed = JSON.parse((details as { message: string }).message);
      return Array.isArray(parsed) ? (parsed as ApiValidationIssue[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function apiValidationErrorsToFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) {
    return {};
  }

  return readApiValidationIssues(error.details).reduce<Record<string, string>>((errors, issue) => {
    const field = String(issue.path?.[0] ?? "form");
    if (!errors[field] && issue.message) {
      errors[field] = issue.message;
    }
    return errors;
  }, {});
}

function scrollToFirstPickupError(errors: Record<string, string>, activeFlow: "pickup_standard" | "pickup_paid") {
  const firstField = Object.keys(errors).find((field) => field !== "form");
  if (!firstField) {
    return;
  }

  window.requestAnimationFrame(() => {
    const target =
      document.getElementById(`${activeFlow}-${firstField}`) ??
      document.getElementById(`${activeFlow}-${firstField}-modern`) ??
      document.querySelector(`[data-error-field="${CSS.escape(firstField)}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (target instanceof HTMLElement && "focus" in target) {
      target.focus({ preventScroll: true });
    }
  });
}

const wildberriesDeliveryTerms = [
  "Никаких %. Стоимость доставки рассчитывается по общему весу заказа.",
  "QR-код / штрих-код заказа принимаем ежедневно с 01:00 до 18:00.",
  "QR-код / штрих-код меняется ежедневно. Мы можем получить ваш заказ только в день, когда вы отправили нам код.",
  "Возврат товаров осуществляется бесплатно. Невозвратные товары - только по предварительной заявке в приложении.",
] as const;

const ozonDeliveryTerms = [
  "Доставка заказов Ozon осуществляется бесплатно.",
  "QR-код / штрих-код заказа принимаем ежедневно с 01:00 до 18:00.",
  "QR-код / штрих-код меняется ежедневно. Мы можем получить ваш заказ только в день, когда вы отправили нам код.",
  "Возврат товаров осуществляется бесплатно. Невозвратные товары - только по предварительной заявке в приложении.",
] as const;

const linkOrderTerms = [
  "Комиссия за выкуп - 15% от стоимости заказа.",
  "Возврат - бесплатно.",
] as const;

const courierOrderTerms = [
  "Приём заказов - ежедневно, круглосуточно, без выходных.",
  "Стоимость доставки рассчитывается по общему весу заказа.",
  "Перед отправкой убедитесь, что заказ оформлен на адрес нашего склада и нашего получателя.",
  "Если в заказе есть наложенный платёж, мы оплатим его за вас. Стоимость услуги - 10% от суммы платежа.",
  "Хрупкий или дорогой груз можно осмотреть при получении. Стоимость услуги - 100 ₽ за единицу товара.",
] as const;

const disclaimerTitle = "Дисклеймер";
const disclaimerParagraphs = [
  "Сервис «Сарма Экспресс» является независимой службой доставки. Мы действуем исключительно как посредник, выполняя поручения клиентов по выкупу и транспортировке товаров. Мы не являемся представителем, партнером, агентом или пунктом выдачи заказов Wildberries, OZON, Яндекс Маркет, Lamoda и не аффилированы с ними.",
  "Все упомянутые на сайте товарные знаки принадлежат их законным правообладателям и используются нами только в информационных целях - для обозначения магазинов, из которых клиент может заказать выкуп товара. «Сарма Экспресс» не осуществляет розничную продажу товаров.",
] as const;

const wildberriesPickupPointByPickupPointId: Partial<Record<PickupPointId, string>> = {
  chelyuskintsev_donetsk: "ПВЗ Wildberries Ростов-на-Дону, ул. Вавилова, 68",
  kubysheva_warehouse: "ПВЗ Wildberries Ростов-на-Дону, ул. Вавилова, 68",
  mendeleeva_volnovakha: "ПВЗ Wildberries Ростов-на-Дону, ул. Вавилова, 68",
  ostrovskogo_makeevka: "ПВЗ Wildberries Ростов-на-Дону, ул. Вавилова, 68",
  pobedy_gorlovka: "ПВЗ Wildberries Ростов-на-Дону, ул. Платона Кляты, 23",
  internatsionalnaya_gorlovka_warehouse: "ПВЗ Wildberries Ростов-на-Дону, ул. Платона Кляты, 23",
  gorkogo_melitopol: "ПВЗ Wildberries Ростов-на-Дону, ул. Платона Кляты, 23",
  grushevskogo_mariupol: "ПВЗ Wildberries Ростов-на-Дону, ул. Платона Кляты, 23",
};

const marketplaceDeliveryPickupPointIds = [
  "chelyuskintsev_donetsk",
  "kubysheva_warehouse",
  "mendeleeva_volnovakha",
  "ostrovskogo_makeevka",
  "pobedy_gorlovka",
  "internatsionalnaya_gorlovka_warehouse",
  "gorkogo_melitopol",
  "grushevskogo_mariupol",
] as const satisfies readonly PickupPointId[];

function createFixedPickupTarget(target: string): Partial<Record<PickupPointId, string>> {
  return Object.fromEntries(marketplaceDeliveryPickupPointIds.map((id) => [id, target])) as Partial<Record<PickupPointId, string>>;
}

type MarketplaceInfoIcon = "cart" | "order" | "form" | "delivery";
type MarketplacePickupGuide = {
  title: string;
  subtitle: string;
  marketplaceName: string;
  siteName: string;
  targetByPickupPointId: Partial<Record<PickupPointId, string>>;
  targetLabel?: string;
  targetDescription?: string;
  terms: readonly string[];
  steps?: Array<{ title: string; description: string; icon: MarketplaceInfoIcon }>;
  inspectionOption?: string;
};

const marketplacePickupGuideById: Partial<Record<MarketplaceId, MarketplacePickupGuide>> = {
  cdek: {
    title: "Заберём посылку из СДЭК и доставим в нужный город",
    subtitle: "Отправьте посылку в СДЭК на наш адрес в Ростове-на-Дону, мы её получим и доставим в Донецк, Мариуполь, Луганск или другой населённый пункт.",
    marketplaceName: "СДЭК",
    siteName: "cdek.ru",
    targetByPickupPointId: createFixedPickupTarget("СДЭК Ростов-на-Дону, ул. Вавилова, 69"),
    targetLabel: "Адрес СДЭК для отправки",
    targetDescription: "При оформлении отправки СДЭК укажите этот адрес в Ростове-на-Дону. Мы получим посылку там и доставим её в выбранный вами пункт.",
    terms: [
      "Оплатите доставку при отправке посылки в СДЭК. Если есть наложенный платёж или доставка не оплачена - оплатите.",
      "Можем оплатить за вас. В этом случае стоимость услуг СДЭК увеличивается на 10% к стоимости наложенного платежа.",
      "Не знаете сумму оплаты? Обратитесь в пункт выдачи СДЭК: +7 (909) 436-02-28.",
    ],
    steps: [
      { title: "Оформите отправку", description: "Оформите отправку СДЭК на наш адрес: город Ростов-на-Дону, улица Вавилова, 69.", icon: "cart" },
      { title: "Укажите получателя", description: "Если есть СДЭК ID, отправляйте на свои данные. Если нет СДЭК ID, получатель: Пинчук Мария Евгеньевна, +7 (949) 513-48-48.", icon: "order" },
      { title: "После отправления", description: "Получите трек-номер или номер заказа интернет-магазина и код получения, если он есть.", icon: "form" },
      { title: "Заполните форму ниже", description: "Укажите данные, мы заберём посылку и доставим в нужный город.", icon: "delivery" },
    ],
  },
  wildberries: {
    title: "Заберём посылку из Wildberries и доставим в нужный населённый пункт",
    subtitle: "Отправьте посылку в Wildberries на наш адрес в Ростове-на-Дону. Мы её получим и доставим в Донецк, Мариуполь, Луганск или другой населённый пункт.",
    marketplaceName: "Wildberries",
    siteName: "wildberries.ru",
    targetByPickupPointId: wildberriesPickupPointByPickupPointId,
    terms: wildberriesDeliveryTerms,
  },
  ozon: {
    title: "Заберём посылку из Ozon и доставим в нужный населённый пункт",
    subtitle: "Отправьте посылку в Ozon на наш адрес в Ростове-на-Дону. Мы её получим и доставим в Донецк, Мариуполь, Луганск или другой населённый пункт.",
    marketplaceName: "Ozon",
    siteName: "ozon.ru",
    targetByPickupPointId: createFixedPickupTarget("ПВЗ Ozon Ростов-на-Дону, ул. Платона Кляты, 23"),
    terms: ozonDeliveryTerms,
  },
  yandex_market: {
    title: "Заберём посылку из Яндекс Маркета и доставим в нужный населённый пункт",
    subtitle: "Отправьте посылку в Яндекс Маркет на наш адрес в Ростове-на-Дону. Мы её получим и доставим в Донецк, Мариуполь, Луганск или другой населённый пункт.",
    marketplaceName: "Яндекс Маркет",
    siteName: "market.yandex.ru",
    targetByPickupPointId: createFixedPickupTarget("ПВЗ Яндекс Маркет Ростов-на-Дону, ул. Вавилова, 68"),
    terms: wildberriesDeliveryTerms,
  },
  lamoda: {
    title: "Заберём посылку из Lamoda и доставим в нужный город",
    subtitle: "Отправьте посылку в Lamoda на наш адрес в Ростове-на-Дону. Мы её получим и доставим в Донецк, Мариуполь, Луганск или другой населённый пункт.",
    marketplaceName: "Lamoda",
    siteName: "lamoda.ru",
    targetByPickupPointId: createFixedPickupTarget("ПВЗ Lamoda Ростов-на-Дону, ул. Таганрогская, 86"),
    terms: [
      "Никаких %. Стоимость доставки рассчитывается по общему весу заказа.",
      "QR-код / штрих-код заказа принимаем пн-пт с 01:00 до 11:00.",
      "QR-код / штрих-код меняется ежедневно.",
      "Возврат товаров осуществляется бесплатно. Невозвратные товары - только по предварительной заявке в приложении.",
    ],
    inspectionOption: "Хрупкое / Дорогой груз. Важно осмотреть при получении (услуга оплачивается)",
  },
  goldapple: {
    title: "Передайте нам ваш заказ из Золотого Яблока",
    subtitle: "Отправьте курьера на наш склад, заполните данные заказа, мы заберём его и доставим в Донецк, Мариуполь, Луганск или другой населённый пункт.",
    marketplaceName: "Золотое Яблоко",
    siteName: "goldapple.ru",
    targetByPickupPointId: createFixedPickupTarget("Склад Сарма Экспресс Ростов-на-Дону, ул. Арсенальная, 1"),
    targetLabel: "Адрес склада для заказа из Золотого Яблока",
    targetDescription: "На сайте Золотого Яблока или при оформлении доставки курьером укажите этот склад в Ростове-на-Дону. Мы получим заказ и доставим его в выбранный вами пункт.",
    terms: [
      "Стоимость доставки рассчитывается по общему весу заказа.",
      "Приём заказов - ежедневно, без выходных.",
      "Убедитесь, что ваш заказ оформлен на наш адрес склада. После отправки заполните форму.",
    ],
    steps: [
      { title: "Оформите заказ", description: "Сделайте заказ на goldapple.ru или оформите доставку на наш склад: Ростов-на-Дону, ул. Арсенальная, 1.", icon: "cart" },
      { title: "Укажите получателя", description: "Получателем укажите себя: имя, фамилию и номер телефона.", icon: "order" },
      { title: "Заполните форму ниже", description: "Укажите данные заказа и загрузите информацию об отправлении. Сохраните номер заказа или трек-номер.", icon: "form" },
      { title: "Доставка в ваш город", description: "Мы получим заказ и доставим его в выбранный вами населённый пункт.", icon: "delivery" },
    ],
  },
  letual: {
    title: "Передайте нам ваш заказ из Лэтуаль",
    subtitle: "Отправьте курьера на наш склад, заполните данные заказа, мы заберём его и доставим в Донецк, Мариуполь, Луганск или другой населённый пункт.",
    marketplaceName: "Лэтуаль",
    siteName: "letu.ru",
    targetByPickupPointId: createFixedPickupTarget("Склад Сарма Экспресс Ростов-на-Дону, ул. Арсенальная, 1"),
    targetLabel: "Адрес склада для заказа из Лэтуаль",
    targetDescription: "На сайте Лэтуаль или при оформлении доставки курьером укажите этот склад в Ростове-на-Дону. Мы получим заказ и доставим его в выбранный вами пункт.",
    terms: [
      "Приём заказов - ежедневно, круглосуточно, без выходных.",
      "Стоимость доставки рассчитывается по общему весу заказа.",
      "Убедитесь, что ваш заказ оформлен на наш адрес склада. После отправки заполните форму.",
    ],
    steps: [
      { title: "Оформите заказ", description: "Сделайте заказ на letu.ru или оформите доставку на наш склад: Ростов-на-Дону, ул. Арсенальная, 1.", icon: "cart" },
      { title: "Укажите получателя", description: "Получателем укажите себя: имя, фамилию и номер телефона.", icon: "order" },
      { title: "Заполните форму ниже", description: "Укажите данные заказа и загрузите информацию об отправлении. Сохраните номер заказа или трек-номер.", icon: "form" },
      { title: "Доставка в ваш город", description: "Мы получим заказ и доставим его в выбранный вами населённый пункт.", icon: "delivery" },
    ],
  },
  avito: {
    title: "Заберём посылку из Авито и доставим в нужный населённый пункт",
    subtitle: "Отправьте посылку в Авито на наш адрес в Ростове-на-Дону. Мы её получим и доставим в Донецк, Мариуполь, Луганск или другой населённый пункт.",
    marketplaceName: "Авито",
    siteName: "avito.ru",
    targetByPickupPointId: createFixedPickupTarget("ПВЗ Авито Ростов-на-Дону, ул. Вавилова, 68"),
    terms: [
      "Никаких %. Стоимость доставки рассчитывается по общему весу заказа.",
      "QR-код / штрих-код заказа принимаем ежедневно с 01:00 до 18:00.",
      "QR-код / штрих-код меняется ежедневно.",
      "Хрупкий / дорогой груз (осмотр при получении): +100 ₽ к стоимости заказа за единицу товара.",
    ],
    inspectionOption: "Хрупкое / Дорогой груз. Важно осмотреть при получении (услуга оплачивается)",
  },
  "5post": {
    title: "Заберём посылку из 5Post и доставим в нужный населённый пункт",
    subtitle: "Отправьте посылку в 5Post на наш адрес в Ростове-на-Дону. Мы её получим и доставим в Донецк, Мариуполь, Луганск или другой населённый пункт.",
    marketplaceName: "5Post",
    siteName: "5Post",
    targetByPickupPointId: createFixedPickupTarget("Терминал 5Post Ростов-на-Дону, ул. Таганрогская, 118"),
    terms: [
      "Стоимость доставки рассчитывается по общему весу заказа.",
      "QR-код / штрих-код заказа принимаем пн-пт с 01:00 до 11:00.",
      "QR-код / штрих-код / код получения меняется ежедневно. Мы можем получить ваш заказ только в день, когда вы отправили нам код.",
    ],
    steps: [
      { title: "Оформите заказ", description: "Отправителю нужно указать правильный адрес терминала 5Post: Ростов-на-Дону, ул. Таганрогская, 118.", icon: "cart" },
      { title: "Укажите получателя", description: "Получатель: ваше ФИО и ваш телефон.", icon: "order" },
      { title: "Заполните форму ниже", description: "Укажите данные заказа и загрузите информацию об отправлении. Сохраните номер заказа или трек-номер.", icon: "form" },
      { title: "Доставка в ваш город", description: "Мы получим заказ и доставим его в выбранный вами населённый пункт.", icon: "delivery" },
    ],
  },
  dpd: {
    title: "Заберём посылку из DPD и доставим в нужный населённый пункт",
    subtitle: "Отправьте посылку в DPD на наш адрес в Ростове-на-Дону. Мы её получим и доставим в Донецк, Мариуполь, Луганск или другой населённый пункт.",
    marketplaceName: "DPD",
    siteName: "DPD",
    targetByPickupPointId: createFixedPickupTarget("DPD Ростов-на-Дону, ул. Таганрогская, 132/3"),
    terms: [
      "Стоимость доставки рассчитывается по общему весу заказа.",
      "QR-код / штрих-код заказа принимаем ежедневно с 01:00 до 11:00.",
    ],
    steps: [
      { title: "Оформите отправку DPD", description: "Укажите адрес DPD: Ростов-на-Дону, ул. Таганрогская, 132/3.", icon: "cart" },
      { title: "Укажите получателя", description: "Получатель: ваше ФИО и телефон.", icon: "order" },
      { title: "После отправления", description: "Получите трек-номер или номер заказа и код для получения, если он есть.", icon: "form" },
      { title: "Доставка в ваш город", description: "Мы получим заказ и доставим его в выбранный вами пункт выдачи или доставим курьером.", icon: "delivery" },
    ],
  },
  detmir: {
    title: "Заберём посылку из Детского Мира и доставим в нужный город",
    subtitle: "Отправьте посылку в Детский Мир на наш адрес в Ростове-на-Дону. Мы её получим и доставим в Донецк, Мариуполь, Луганск или другой населённый пункт.",
    marketplaceName: "Детский Мир",
    siteName: "detmir.ru",
    targetByPickupPointId: createFixedPickupTarget("ПВЗ Детский Мир Ростов-на-Дону, ул. Таганрогская, 114И, ТЦ «Джанфида»"),
    terms: [
      "Приём заказов: пн-пт с 01:00 до 11:00.",
      "Стоимость доставки рассчитывается по общему весу заказа.",
    ],
  },
};

function MarketplaceStepIcon({ icon }: { icon: MarketplaceInfoIcon }) {
  const iconClass = "h-9 w-9 fill-none stroke-[#2f7eea]";

  if (icon === "cart") {
    return (
      <svg viewBox="0 0 32 32" className={iconClass} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 8h3l2.2 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 1.9-1.4l2.2-7.2H11" />
        <path d="M15 26.5h.1M24 26.5h.1" />
      </svg>
    );
  }

  if (icon === "order") {
    return (
      <svg viewBox="0 0 32 32" className={iconClass} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 16a5.3 5.3 0 1 0 0-10.6A5.3 5.3 0 0 0 16 16Z" />
        <path d="M6.5 27c1.5-5.2 5-8 9.5-8s8 2.8 9.5 8" />
      </svg>
    );
  }

  if (icon === "form") {
    return (
      <svg viewBox="0 0 32 32" className={iconClass} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 7.5h12a2.5 2.5 0 0 1 2.5 2.5v14a2.5 2.5 0 0 1-2.5 2.5H10A2.5 2.5 0 0 1 7.5 24V10A2.5 2.5 0 0 1 10 7.5Z" />
        <path d="M12 13h8M12 17h6M12 21h4" />
        <path d="m21 22.5 4.5-4.5 2 2-4.5 4.5-2.6.6.6-2.6Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className={iconClass} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 10.5h13v12h-13z" />
      <path d="M17.5 14h4.8l4.2 4.2v4.3h-9" />
      <path d="M8.5 25.5a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8ZM23.5 25.5a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z" />
      <path d="M7 15h-3M9 19h-5" />
    </svg>
  );
}

function InstructionPanel({ title, steps }: { title: string; steps: readonly string[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-[22px] border border-[#d7e4f7] bg-white/92 text-[#173862] shadow-[0_18px_38px_rgba(35,88,160,0.1)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#b9d6ff] bg-[#eef6ff] text-base font-black text-[#2f72d8]">
            i
          </span>
          <span>
            <span className="block text-xs font-black uppercase tracking-[0.2em] text-[#4677cf]">Инструкция</span>
            <span className="mt-1 block text-base font-extrabold leading-6 text-[#173862]">{title}</span>
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1474ef] text-lg font-black text-white shadow-[0_10px_20px_rgba(20,116,239,0.22)]">
          {expanded ? "⌃" : "⌄"}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-[#dfe9f8] px-5 pb-5 pt-4">
          <ol className="grid gap-3">
            {steps.map((detail, index) => (
              <li key={detail} className="flex gap-3 text-sm font-bold leading-6 text-[#58739d]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf4ff] text-xs font-black text-[#2f72d8]">
                  {index + 1}
                </span>
                <span>{detail}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function MarketplaceInfoBlock({ guide }: { guide: MarketplacePickupGuide }) {
  const steps =
    guide.steps ?? [
      {
        title: "Выберите пункт выдачи",
        description: `Выберите ваш город и адрес получения, затем на ${guide.siteName} укажите подходящий ПВЗ в Ростове-на-Дону.`,
        icon: "cart" as const,
      },
      {
        title: "Оформите заказ",
        description: `Ознакомьтесь с ассортиментом, выберите товары и оформите заказ в приложении или на сайте ${guide.marketplaceName}.`,
        icon: "order" as const,
      },
      {
        title: "Заполните форму ниже",
        description: `Когда заказ поступит в ПВЗ ${guide.marketplaceName}, найдите QR-код или штрих-код, сделайте скриншот и загрузите его в форму.`,
        icon: "form" as const,
      },
      {
        title: "Доставка в ваш город",
        description: "Мы получим заказ и доставим его в выбранный вами пункт выдачи или передадим курьером.",
        icon: "delivery" as const,
      },
    ];

  return (
    <InstructionPanel
      title={`Как оформить получение через ${guide.marketplaceName}`}
      steps={steps.map((step) => `${step.title}: ${step.description}`)}
    />
  );
}

function CourierAddressInfoPanel() {
  return (
    <InstructionPanel
      title="Как передать заказ"
      steps={[
        "Загрузите QR-код, штрих-код или скриншот заказа.",
        "Укажите отправителя или интернет-магазин.",
        "Если есть номер заказа или код получения, заполните эти поля.",
        "Выберите пункт выдачи, куда доставить заказ.",
      ]}
    />
  );
}

function TransportCompanyInstructionPanel() {
  return (
    <InstructionPanel
      title="Как отправить груз через транспортную компанию"
      steps={[
        "Выберите транспортную компанию: Деловые Линии или ПЭК.",
        "Оформите отправку на наш терминал в Ростове-на-Дону.",
        "Укажите получателя: ИП Пинчук Мария Евгеньевна, ИНН 614063174962, +7 949 513-48-48.",
        "Заполните форму ниже и прикрепите накладную, QR-код или штрих-код.",
      ]}
    />
  );
}

const transportCompanyDetails: Record<
  TransportCompanyId,
  {
    label: string;
    title: string;
    terminalLabel: string;
    terminalAddress: string;
    recipient: string;
    inn: string;
    phone: string;
  }
> = {
  delovye_linii: {
    label: "Деловые Линии",
    title: "Данные для отправки через Деловые Линии",
    terminalLabel: "Адрес терминала Деловые Линии:",
    terminalAddress: "г. Ростов-на-Дону, ул. Доватора, 142И",
    recipient: "ИП Пинчук Мария Евгеньевна",
    inn: "614063174962",
    phone: "+7 949 513-48-48",
  },
  pek: {
    label: "ПЭК",
    title: "Данные для отправки через ПЭК",
    terminalLabel: "Адрес терминала ПЭК:",
    terminalAddress: "г. Ростов-на-Дону, ул. Доватора, 154/3",
    recipient: "ИП Пинчук Мария Евгеньевна",
    inn: "614063174962",
    phone: "+7 949 513-48-48",
  },
};

function TransportCompanyInfoBlock({ company }: { company: TransportCompanyId }) {
  const details = transportCompanyDetails[company];

  return (
    <div className="rounded-[22px] border border-[#cfe0fb] bg-[linear-gradient(180deg,#f7fbff_0%,#eef5ff_100%)] px-5 py-4 text-[#173862] shadow-[0_14px_28px_rgba(39,77,146,0.08)]">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#9cc2ff] bg-white text-sm font-black text-[#3578e5]">
          i
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black leading-5 text-[#13345f]">{details.title}</p>
          <div className="mt-2 space-y-1 text-sm leading-6 text-[#496995]">
            <p>
              <span className="font-bold text-[#173862]">{details.terminalLabel}</span> {details.terminalAddress}
            </p>
            <p>
              <span className="font-bold text-[#173862]">Получатель:</span> {details.recipient}
            </p>
            <p>
              <span className="font-bold text-[#173862]">ИНН:</span> {details.inn}
            </p>
            <p>
              <span className="font-bold text-[#173862]">Телефон:</span> {details.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisclaimerSummaryBlock({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="mt-8 rounded-[28px] border border-[#d7e4f7] bg-white/86 px-5 py-5 text-[#173862] shadow-[0_14px_28px_rgba(39,77,146,0.08)] sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#4677cf]">{disclaimerTitle}</p>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[#58739d]">
        {disclaimerParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 text-sm font-extrabold text-[#2c6ed3] underline underline-offset-4"
      >
        Открыть дисклеймер
      </button>
    </div>
  );
}

function DisclaimerModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#12315b]/44 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="disclaimer-modal-title">
      <div className="w-full max-w-[640px] rounded-[28px] border border-[#d7e4f7] bg-[linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)] p-5 text-[#173862] shadow-[0_30px_90px_rgba(8,33,77,0.34)] sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-[#d7e4f7] pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#4677cf]">Информационное окно</p>
            <h2 id="disclaimer-modal-title" className="mt-2 text-2xl font-extrabold text-[#13345f]">{disclaimerTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c7daf5] bg-white text-xl font-bold text-[#3f74cb] shadow-[0_10px_20px_rgba(39,77,146,0.08)]"
            aria-label="Закрыть дисклеймер"
          >
            ×
          </button>
        </div>
        <div className="mt-5 space-y-4 text-sm leading-7 text-[#58739d]">
          {disclaimerParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <PrimaryButton
            type="button"
            onClick={onClose}
            className="rounded-[20px] bg-[linear-gradient(180deg,#4c8ce6_0%,#3b74cf_100%)] px-7 text-sm font-extrabold shadow-[0_16px_28px_rgba(43,92,180,0.2)]"
          >
            Понятно
          </PrimaryButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-full border border-[color:var(--line)] bg-white px-5 py-3.5 text-base text-[color:var(--foreground)] shadow-[0_10px_24px_rgba(84,58,128,0.05)] placeholder:text-[color:rgba(44,47,48,0.28)] ${className ?? ""}`}
    />
  );
}

function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none rounded-[24px] border border-[color:var(--line)] bg-white px-5 py-3.5 pr-12 text-base text-[color:var(--foreground)] shadow-[0_10px_24px_rgba(84,58,128,0.05)] ${className ?? ""}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
        ▼
      </span>
    </div>
  );
}

function PickupPointSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  variant = "default",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
  placeholder: string;
  variant?: "default" | "sarma";
}) {
  const [open, setOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<"bottom" | "top">("bottom");
  const [menuMaxHeight, setMenuMaxHeight] = useState(288);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const updateMenuPosition = () => {
      if (!rootRef.current) {
        return;
      }

      const rect = rootRef.current.getBoundingClientRect();
      const viewportPadding = 16;
      const gap = 12;
      const availableBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
      const availableAbove = rect.top - viewportPadding - gap;
      const shouldOpenUpward = availableBelow < 260 && availableAbove > availableBelow;
      const availableSpace = shouldOpenUpward ? availableAbove : availableBelow;

      setMenuPlacement(shouldOpenUpward ? "top" : "bottom");
      setMenuMaxHeight(Math.max(140, Math.min(320, availableSpace)));
    };

    updateMenuPosition();

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? placeholder;
  const sarma = variant === "sarma";

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-4 rounded-[24px] border px-5 py-3.5 text-left text-base transition ${
          sarma
            ? open
              ? "border-[#8cb7ff] bg-[linear-gradient(180deg,#ffffff_0%,#edf5ff_100%)] text-[#173862] shadow-[0_18px_34px_rgba(39,77,146,0.16)]"
              : "border-white/58 bg-[linear-gradient(180deg,#ffffff_0%,#f2f7ff_100%)] text-[#173862] shadow-[0_14px_28px_rgba(39,77,146,0.1)] hover:border-[#bfd5f7]"
            : open
              ? "border-[rgba(196,46,160,0.3)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,244,255,0.96))] shadow-[0_18px_38px_rgba(123,77,255,0.12)]"
              : "border-[color:var(--line)] bg-white shadow-[0_10px_24px_rgba(84,58,128,0.05)] hover:border-[rgba(196,46,160,0.18)]"
        }`}
      >
        <span className={value ? (sarma ? "font-semibold text-[#173862]" : "text-[color:var(--foreground)]") : (sarma ? "text-[#8ea4c6]" : "text-[color:rgba(44,47,48,0.42)]")}>{selectedLabel}</span>
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition ${
            sarma
              ? `border ${open ? "rotate-180 border-[#bfd5f7] bg-[linear-gradient(180deg,#eef5ff_0%,#dfeafb_100%)] text-[#3970cf]" : "border-[#dce8f8] bg-[linear-gradient(180deg,#f7fbff_0%,#eaf2ff_100%)] text-[#5d7fae]"}`
              : `bg-[color:var(--surface-soft)] text-[color:var(--muted)] ${open ? "rotate-180 bg-[linear-gradient(135deg,rgba(196,46,160,0.14),rgba(124,51,255,0.16))] text-[color:var(--accent-strong)]" : ""}`
          }`}
        >
          ▼
        </span>
      </button>
      {open ? (
        <div className={`absolute left-0 right-0 z-30 overflow-hidden rounded-[28px] p-3 backdrop-blur ${
          menuPlacement === "top" ? "bottom-[calc(100%+12px)]" : "top-[calc(100%+12px)]"
        } ${
          sarma
            ? "border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(235,244,255,0.96))] shadow-[0_28px_48px_rgba(39,77,146,0.18)]"
            : "border border-[rgba(196,46,160,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(250,246,255,0.98))] shadow-[0_24px_60px_rgba(84,58,128,0.18)]"
        }`}>
          <div role="listbox" aria-labelledby={id} className="space-y-1 overflow-y-auto pr-1" style={{ maxHeight: `${menuMaxHeight}px` }}>
            {options.map((option) => {
              const active = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-4 rounded-[20px] px-4 py-3 text-left text-[15px] transition ${
                    sarma
                      ? active
                        ? "bg-[linear-gradient(180deg,#4c8ce6_0%,#3b74cf_100%)] font-semibold text-white shadow-[0_12px_24px_rgba(43,92,180,0.18)]"
                        : "text-[#173862] hover:bg-white/90 hover:shadow-[0_10px_20px_rgba(39,77,146,0.08)]"
                      : active
                        ? "bg-[linear-gradient(135deg,rgba(196,46,160,0.12),rgba(124,51,255,0.12))] font-semibold text-[color:var(--foreground)] shadow-[0_10px_24px_rgba(123,77,255,0.08)]"
                        : "text-[color:var(--foreground)] hover:bg-[color:var(--surface-soft)]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold leading-6">{option.label}</span>
                    {option.description ? (
                      <span className={`mt-1 block text-sm font-medium leading-5 ${active ? "text-white/82" : sarma ? "text-[#6c83aa]" : "text-[color:var(--muted)]"}`}>
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {active ? (
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                      sarma
                        ? "bg-white/18 shadow-[0_10px_18px_rgba(18,61,130,0.16)]"
                        : "bg-[linear-gradient(135deg,#c42ea0,#7c33ff)] shadow-[0_10px_18px_rgba(123,77,255,0.2)]"
                    }`}>
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InputWithSuffix({
  suffix,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  suffix: string;
}) {
  const hasValue = props.value != null && String(props.value).trim().length > 0;

  return (
    <div className="relative">
      <Input {...props} className={`pr-16 ${className ?? ""}`} />
      {hasValue ? (
        <span className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-sm font-semibold text-[color:var(--muted)]">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function FileUploadCard({
  id,
  file,
  accept,
  onChange,
  variant = "default",
}: {
  id: string;
  file: File | null;
  accept?: string;
  onChange: (file: File | null) => void;
  variant?: "default" | "sarma";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sarma = variant === "sarma";

  const openFilePicker = () => inputRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if (event.target === inputRef.current) {
          return;
        }

        event.preventDefault();
        openFilePicker();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openFilePicker();
        }
      }}
      className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[28px] px-6 py-8 text-center ${
        sarma
          ? "border border-dashed border-[#c7dbf7] bg-[linear-gradient(180deg,#fbfdff_0%,#f0f6ff_100%)] shadow-[0_14px_28px_rgba(39,77,146,0.08)]"
          : "border border-dashed border-[color:var(--line)] bg-[color:var(--surface-subtle)]"
      }`}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <span className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
        sarma
          ? "bg-[linear-gradient(180deg,#eef5ff_0%,#dfeafb_100%)] text-[#3b74cf]"
          : "bg-[linear-gradient(135deg,rgba(196,46,160,0.14),rgba(124,51,255,0.16))] text-[color:var(--accent-strong)]"
      }`}>
        ⬆
      </span>
      <span className="mt-5 text-lg font-semibold text-[color:var(--foreground)]">
        {file ? file.name : "Нажмите для загрузки"}
      </span>
      <span className="mt-2 text-sm text-[color:var(--muted)]">
        {file ? "Файл прикреплён. Можно продолжать." : "Поддерживаются изображения и PDF."}
      </span>
    </div>
  );
}

function HeroDeliveryVisual() {
  return (
    <div aria-hidden="true" className="relative w-[min(44rem,44vw)] max-w-full pr-2">
      <Image
        src="/hero-home-replacement.png"
        alt=""
        width={1536}
        height={1024}
        sizes="(min-width: 1280px) 42vw, (min-width: 1024px) 38vw, 0px"
        className="h-auto w-full object-contain [filter:drop-shadow(0_28px_44px_rgba(181,151,232,0.24))]"
        priority
      />
    </div>
  );
}

function MultiFileUploadCard({
  id,
  files,
  accept,
  maxFiles,
  onChange,
  variant = "default",
}: {
  id: string;
  files: File[];
  accept?: string;
  maxFiles: number;
  onChange: (files: File[]) => void;
  variant?: "default" | "sarma";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sarma = variant === "sarma";
  const remaining = Math.max(maxFiles - files.length, 0);
  const summary =
    files.length === 0
      ? "Поддерживаются изображения и PDF."
      : remaining > 0
        ? `Загружено ${files.length} из ${maxFiles}. Можно добавить ещё ${remaining}.`
        : `Загружено ${files.length} из ${maxFiles}. Лимит достигнут.`;
  const previewNames =
    files.length > 0
      ? files
          .slice(0, 3)
          .map((file) => file.name)
          .join(", ")
      : null;

  const openFilePicker = () => inputRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if (event.target === inputRef.current) {
          return;
        }

        event.preventDefault();
        openFilePicker();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openFilePicker();
        }
      }}
      className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[28px] px-6 py-8 text-center ${
        sarma
          ? "border border-dashed border-[#c7dbf7] bg-[linear-gradient(180deg,#fbfdff_0%,#f0f6ff_100%)] shadow-[0_14px_28px_rgba(39,77,146,0.08)]"
          : "border border-dashed border-[color:var(--line)] bg-[color:var(--surface-subtle)]"
      }`}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          onChange(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />
      <span className={`absolute right-5 top-5 rounded-full px-3 py-1 text-[11px] font-semibold ${
        sarma
          ? "bg-white text-[#3b74cf] shadow-[0_10px_24px_rgba(39,77,146,0.08)]"
          : "bg-white text-[color:var(--accent-strong)] shadow-[0_10px_24px_rgba(84,58,128,0.08)]"
      }`}>
        {files.length}/{maxFiles}
      </span>
      <span className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
        sarma
          ? "bg-[linear-gradient(180deg,#eef5ff_0%,#dfeafb_100%)] text-[#3b74cf]"
          : "bg-[linear-gradient(135deg,rgba(196,46,160,0.14),rgba(124,51,255,0.16))] text-[color:var(--accent-strong)]"
      }`}>
        ↑
      </span>
      <span className="mt-5 text-lg font-semibold text-[color:var(--foreground)]">
        {files.length > 0 ? `Загружено ${files.length} файлов` : "Нажмите для загрузки"}
      </span>
      <span className="mt-2 text-sm text-[color:var(--muted)]">{summary}</span>
      {previewNames ? (
        <span className="mt-3 max-w-full truncate text-xs text-[color:var(--muted)]">
          {previewNames}
          {files.length > 3 ? ` и ещё ${files.length - 3}` : ""}
        </span>
      ) : null}
    </div>
  );
}

function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-32 w-full rounded-[28px] border border-[color:var(--line)] bg-white px-5 py-4 text-base text-[color:var(--foreground)] shadow-[0_10px_24px_rgba(84,58,128,0.05)] placeholder:text-[color:rgba(44,47,48,0.28)] ${className ?? ""}`}
    />
  );
}

function PrimaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const usesCustomBackground = className?.includes("bg-");

  return (
    <button
      {...props}
      className={`${usesCustomBackground ? "" : "primary-cta"} inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function FloatingContinueBar({
  selectedLabel,
  onContinue,
}: {
  selectedLabel: string;
  onContinue: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:px-6 sm:pb-5"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto mx-auto max-w-[1020px] rounded-[30px] border border-white/80 bg-white/94 p-4 shadow-[0_24px_60px_rgba(39,77,146,0.22)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6d88b2]">Выбранный сценарий</p>
            <p className="mt-2 truncate text-2xl font-extrabold leading-tight text-[#13345f]">{selectedLabel}</p>
          </div>

          <PrimaryButton
            onClick={onContinue}
            className="min-h-14 w-full rounded-[22px] bg-[linear-gradient(180deg,#4c8ce6_0%,#3b74cf_100%)] text-base font-extrabold shadow-[0_20px_36px_rgba(43,92,180,0.24)] sm:w-[350px]"
          >
            Продолжить
          </PrimaryButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SecondaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-full border border-[color:var(--line)] bg-white px-7 py-3.5 text-sm font-semibold text-[color:var(--foreground)] shadow-[0_10px_24px_rgba(84,58,128,0.04)] ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  centered = false,
  titleClassName,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  centered?: boolean;
  titleClassName?: string;
}) {
  const shouldRenderDescription = description && !description.startsWith("Откуда нужно забрать товар?");

  return (
    <div className={`${centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"} space-y-3`}>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent-strong)]">{eyebrow}</p> : null}
      <h1
        className={`font-[family-name:var(--font-display)] text-5xl leading-[0.95] text-[color:var(--foreground)] sm:text-6xl${
          titleClassName ? ` ${titleClassName}` : ""
        }`}
      >
        {title}
      </h1>
      {shouldRenderDescription ? <p className="text-base leading-8 text-[color:var(--muted)]">{description}</p> : null}
    </div>
  );
}

function LookupDotPattern() {
  return (
    <svg viewBox="0 0 176 144" className="h-full w-full fill-white/45" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 11 }).map((_, column) => (
          <circle key={`${row}-${column}`} cx={12 + column * 15} cy={12 + row * 15} r={row > 5 && column > 8 ? 0 : 4.2} />
        )),
      )}
    </svg>
  );
}

function LookupLensIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.8" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

function ActionCard({
  title,
  eyebrow,
  description,
  icon,
  featured = false,
  accent,
  active = false,
  className,
  onClick,
}: {
  title: string;
  eyebrow: string;
  description: string;
  icon: string;
  featured?: boolean;
  accent?: "soft";
  active?: boolean;
  className?: string;
  onClick: () => void;
}) {
  const softAccent = accent === "soft";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[30px] text-left ${
        featured
          ? "min-h-[210px] bg-[linear-gradient(135deg,#b61f8f_0%,#9227dd_100%)] p-8 text-white shadow-[0_24px_54px_rgba(146,39,221,0.24)] hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(146,39,221,0.28)] lg:row-span-2"
          : active
            ? softAccent
              ? "border border-[rgba(109,40,217,0.26)] bg-[linear-gradient(135deg,#8b4fd0_0%,#6d28d9_100%)] p-7 text-white shadow-[0_22px_42px_rgba(109,40,217,0.22)]"
              : "soft-card border border-[color:var(--line-strong)] p-7 shadow-[0_18px_36px_rgba(157,76,255,0.14)]"
            : softAccent
              ? "border border-[rgba(109,40,217,0.2)] bg-[linear-gradient(135deg,#9b5de5_0%,#7c3aed_100%)] p-7 text-white shadow-[0_18px_38px_rgba(109,40,217,0.16)] hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(109,40,217,0.2)]"
              : "soft-card p-7 hover:-translate-y-1"
      } ${className ?? ""}`}
    >
      <div
        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-semibold ${
          featured
            ? "bg-white/16 text-white"
            : active
              ? softAccent
                ? "bg-white/18 text-white"
                : "bg-[linear-gradient(135deg,rgba(196,46,160,0.16),rgba(124,51,255,0.18))] text-[color:var(--accent-strong)]"
              : softAccent
                ? "bg-white/16 text-white"
                : "bg-[color:var(--surface-soft)] text-[color:var(--accent)]"
        }`}
      >
        {icon}
      </div>
      <div className={`${featured ? "mt-16" : "mt-8"} space-y-2`}>
        <h2 className={`${featured ? "text-4xl" : "text-2xl"} font-[family-name:var(--font-display)] leading-none`}>{title}</h2>
        <p className={`${featured ? "text-white/78" : softAccent ? "text-white/82" : "text-[color:var(--muted)]"} text-sm leading-7`}>{description}</p>
      </div>
    </button>
  );
}

function ShipRussiaVisualPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="relative h-full min-h-[230px] overflow-hidden rounded-[30px] border border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(246,241,255,0.92))] p-5 shadow-[0_18px_40px_rgba(84,58,128,0.08)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(196,46,160,0.1),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(124,51,255,0.12),transparent_42%)]" />
      <div className="relative flex h-full flex-col justify-between rounded-[24px] border border-dashed border-[rgba(123,77,255,0.24)] bg-white/72 p-6 backdrop-blur-sm">
        <span className="inline-flex w-fit rounded-full bg-[rgba(196,46,160,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-strong)]">
          Заглушка
        </span>
        <div>
          <p className="text-2xl font-[family-name:var(--font-display)] leading-none text-[color:var(--foreground)]">{title}</p>
          <p className="mt-3 max-w-sm text-sm leading-7 text-[color:var(--muted)]">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SuccessState({
  order,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  order: OrderRecord;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const syncOk = order.crmSyncState !== "failed";

  return (
    <section className="relative overflow-hidden bg-[#edf2f8] text-[#12243f]">
      <div
        className="relative overflow-visible bg-[#3f84e6] bg-cover bg-[position:72%_center] bg-no-repeat"
        style={{ backgroundImage: "url('/brand/hero-background.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(40,106,208,0.96)_0%,rgba(58,132,228,0.84)_40%,rgba(139,194,248,0.34)_72%,rgba(255,255,255,0.06)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.44),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(10,47,112,0.1))]" />
        <div className="absolute -left-28 top-1/2 h-[560px] w-[560px] -translate-y-1/2 rounded-full border border-white/18" />
        <div className="absolute left-[5%] top-[38%] hidden h-36 w-44 bg-[radial-gradient(circle,rgba(255,255,255,0.34)_2px,transparent_2px)] [background-size:18px_18px] opacity-35 lg:block" />

        <div className="relative mx-auto w-full max-w-[1240px] px-4 pb-16 pt-12 lg:px-6 lg:pt-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_390px] lg:items-end">
            <div className="max-w-[760px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/34 bg-white/14 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#2f72d8]">✓</span>
                Заказ №{order.orderNumber}
              </div>

              <h1 className="mt-6 max-w-[760px] text-4xl font-extrabold leading-[1.04] text-white drop-shadow-[0_16px_34px_rgba(20,56,120,0.24)] sm:text-5xl lg:text-[4rem]">
                {title}
              </h1>
              <p className="mt-5 max-w-[680px] text-lg font-bold leading-8 text-white/92">{description}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onPrimary}
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-white px-7 text-base font-extrabold text-[#173862] shadow-[0_16px_34px_rgba(16,45,88,0.18)] transition hover:-translate-y-0.5"
                >
                  {primaryLabel}
                </button>
                {secondaryLabel && onSecondary ? (
                  <button
                    type="button"
                    onClick={onSecondary}
                    className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2f57c0_0%,#2245a9_100%)] px-7 text-base font-extrabold text-white shadow-[0_16px_35px_rgba(24,60,142,0.3)] transition hover:-translate-y-0.5"
                  >
                    {secondaryLabel}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[26px] border border-white/66 bg-white/94 p-6 text-[#173862] shadow-[0_26px_70px_rgba(16,45,88,0.18)] backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#356ac8]">Статус</p>
              <p className="mt-3 text-2xl font-extrabold text-[#102a4e]">{syncOk ? "Принят в работу" : "Сохранён локально"}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#58739d]">
                {syncOk
                  ? "Заявка создана и передана в CRM. Статус можно проверить по номеру заказа."
                  : "Bitrix24 сейчас недоступен, поэтому временно показываем локальный статус заказа."}
              </p>
              <div className="mt-5 rounded-[18px] bg-[#edf5ff] px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6d88b2]">Направление</p>
                <p className="mt-1 text-base font-extrabold text-[#173862]">{humanizeMarketplace(order.marketplace)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-8 lg:px-6">
        <div className="grid items-start gap-5 lg:grid-cols-[0.95fr_1.4fr]">
          <article className="rounded-[24px] border border-[#dce6f4] bg-white p-6 shadow-[0_24px_50px_rgba(16,45,88,0.1)]">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#356ac8]">
              {syncOk ? "Ваш заказ в обработке" : "CRM временно недоступна"}
            </p>
            <p className="mt-4 text-base font-semibold leading-8 text-[#58739d]">
              {syncOk
                ? "Мы уже приняли данные и подготовили заказ к следующему этапу. Менеджер увидит заявку в системе."
                : "Заказ сохранён локально, но сделка в Bitrix24 пока не создана. Проверьте статус позже или свяжитесь с оператором."}
            </p>
          </article>

          <OrderSummaryCard order={order} hideSensitiveDetails />
        </div>
      </div>
    </section>
  );
}

function isPhoneLookupQuery(query: string) {
  const trimmed = query.trim();
  const digits = trimmed.replace(/\D/g, "");
  return /^[+\d\s()-]+$/.test(trimmed) && (digits.length === 10 || digits.length === 11);
}

export function SarmaExpressApp({ initialFlow = "overview" }: { initialFlow?: FlowId } = {}) {
  const searchParams = useSearchParams();
  const requestedFlow = searchParams.get("flow");
  const [activeFlow, setActiveFlow] = useState<FlowId>(() => requestedFlow ? resolveFlowFromSearchParam(requestedFlow) : initialFlow);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [pickupStandard, setPickupStandard] = useState(createPickupState);
  const [pickupPaid, setPickupPaid] = useState(createPickupState);
  const [delivery, setDelivery] = useState(createDeliveryState);
  const [lookupNumber, setLookupNumber] = useState("");
  const [lookupOrders, setLookupOrders] = useState<OrderRecord[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [cancelNumber, setCancelNumber] = useState("");
  const [cancelCandidate, setCancelCandidate] = useState<OrderRecord | null>(null);
  const [cancelResult, setCancelResult] = useState<OrderRecord | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSupportNoticeVisible, setCancelSupportNoticeVisible] = useState(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [pending, startUiTransition] = useTransition();
  const lastScrollYRef = useRef(0);

  const deferredLookupNumber = useDeferredValue(lookupNumber);
  const deferredCancelNumber = useDeferredValue(cancelNumber);
  const activePickup = activeFlow === "pickup_paid" ? pickupPaid : pickupStandard;
  const setActivePickup = activeFlow === "pickup_paid" ? setPickupPaid : setPickupStandard;
  const lockMainHeaderVisible = activeFlow === "pickup_paid" && activePickup.step === 1;
  const useSarmaMarketplaceChrome =
    (activeFlow === "pickup_paid" || activeFlow === "pickup_standard") &&
    (activePickup.step <= 2 || Boolean(activePickup.result));
  const useSarmaResultChrome = Boolean(activePickup.result || delivery.result);
  const useSarmaLookupChrome = activeFlow === "order_lookup";
  const useSarmaCancelChrome = activeFlow === "cancel_order";
  const useSarmaBusinessChrome = activeFlow === "business";
  const useSarmaShipRussiaChrome = activeFlow === "ship_russia";
  const useSarmaChrome = useSarmaMarketplaceChrome || useSarmaResultChrome || useSarmaLookupChrome || useSarmaCancelChrome || useSarmaBusinessChrome || useSarmaShipRussiaChrome;
  const activePickupSourceUrlPlaceholder =
    activePickup.marketplace && activePickup.marketplace in marketplaceExampleUrls
      ? marketplaceExampleUrls[activePickup.marketplace as MarketplaceId]
      : "https://example.com/product/...";

  const updatePickup = (patch: Partial<PickupState>) => setActivePickup((current) => ({ ...current, ...patch }));
  const setBulkyAttachments = (selectedFiles: File[]) =>
    setActivePickup((current) => {
      const combined = [...current.bulkyAttachments];

      for (const file of selectedFiles) {
        const duplicate = combined.some(
          (existing) =>
            existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified,
        );
        if (!duplicate) {
          combined.push(file);
        }
      }

      const nextFiles = combined.slice(0, bulkyAttachmentLimit);
      const nextErrors = { ...current.errors };
      if (combined.length > bulkyAttachmentLimit) {
        nextErrors.attachment = `Можно загрузить не более ${bulkyAttachmentLimit} файлов.`;
      } else {
        delete nextErrors.attachment;
      }

      return {
        ...current,
        attachment: nextFiles[0] ?? null,
        bulkyAttachments: nextFiles,
        errors: nextErrors,
      };
    });
  const removeBulkyAttachment = (index: number) =>
    setActivePickup((current) => {
      const nextFiles = current.bulkyAttachments.filter((_, fileIndex) => fileIndex !== index);
      const nextErrors = { ...current.errors };
      delete nextErrors.attachment;

      return {
        ...current,
        attachment: nextFiles[0] ?? null,
        bulkyAttachments: nextFiles,
        errors: nextErrors,
      };
    });

  useEffect(() => {
    setActiveFlow(requestedFlow ? resolveFlowFromSearchParam(requestedFlow) : initialFlow);
  }, [initialFlow, requestedFlow]);

  const openFlow = (flow: FlowId) => {
    setActiveFlow(flow);

    const url = new URL(window.location.href);
    if (flow === "overview") {
      url.searchParams.delete("flow");
    } else {
      url.searchParams.set("flow", flow);
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const handleSarmaHeaderNavigate = (href: string, key: string) => {
    if (key === "internet-delivery") {
      setPickupPaid(createPickupState());
      openFlow("pickup_paid");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (key === "tracking") {
      openFlow("order_lookup");
      return;
    }

    if (key === "business") {
      openFlow("business");
      return;
    }

    if (key === "russia") {
      openFlow("ship_russia");
      return;
    }

    window.location.href = href;
  };

  const paidMarketplaceNotices: Partial<Record<string, ReactNode>> = {
    cdek: (
      <MarketplaceInfoBlock guide={marketplacePickupGuideById.cdek!} />
    ),
    courier: (
      <CourierAddressInfoPanel />
    ),
    bulky: (
      <TransportCompanyInstructionPanel />
    ),
    "5post": (
      <MarketplaceInfoBlock guide={marketplacePickupGuideById["5post"]!} />
    ),
    dpd: (
      <MarketplaceInfoBlock guide={marketplacePickupGuideById.dpd!} />
    ),
    avito: (
      <MarketplaceInfoBlock guide={marketplacePickupGuideById.avito!} />
    ),
    wildberries: (
      <MarketplaceInfoBlock guide={marketplacePickupGuideById.wildberries!} />
    ),
    detmir: (
      <MarketplaceInfoBlock guide={marketplacePickupGuideById.detmir!} />
    ),
    letual: (
      <MarketplaceInfoBlock guide={marketplacePickupGuideById.letual!} />
    ),
    goldapple: (
      <MarketplaceInfoBlock guide={marketplacePickupGuideById.goldapple!} />
    ),
    lamoda: (
      <MarketplaceInfoBlock guide={marketplacePickupGuideById.lamoda!} />
    ),
    yandex_market: (
      <MarketplaceInfoBlock guide={marketplacePickupGuideById.yandex_market!} />
    ),
    ozon: (
      <MarketplaceInfoBlock guide={marketplacePickupGuideById.ozon!} />
    ),
  };

  const continuePickupSelection = () => {
    if (!activePickup.marketplace) {
      updatePickup({ errors: { marketplace: "Выберите маркетплейс" } });
      return;
    }
    startTransition(() => updatePickup({ step: 2, errors: {} }));
  };

  const submitPickup = async () => {
    const paidFieldCopy = getPaidFieldCopy(activePickup.marketplace);
    const isCdekPaid = activeFlow === "pickup_paid" && activePickup.marketplace === "cdek";
    const isDetmirPaid = activeFlow === "pickup_paid" && activePickup.marketplace === "detmir";
    const isGoldapplePaid = activeFlow === "pickup_paid" && activePickup.marketplace === "goldapple";
    const isLetualPaid = activeFlow === "pickup_paid" && activePickup.marketplace === "letual";
    const isCourierPaid = activeFlow === "pickup_paid" && activePickup.marketplace === "courier";
    const isBulkyPaid = activeFlow === "pickup_paid" && activePickup.marketplace === "bulky";
    const activeMarketplaceGuide =
      activeFlow === "pickup_paid" && activePickup.marketplace
        ? marketplacePickupGuideById[activePickup.marketplace as MarketplaceId]
        : null;
    const activePickupTargetGuide =
      activeMarketplaceGuide ??
      (activeFlow === "pickup_standard" && activePickup.marketplace
        ? marketplacePickupGuideById[activePickup.marketplace as MarketplaceId]
        : null);
    const usesMarketplacePickupGuide = Boolean(activeMarketplaceGuide);
    const hidesPaidItemAmountFields = usesMarketplacePickupGuide;
    const isTrackingCodePaid =
      activeFlow === "pickup_paid" &&
      (activePickup.marketplace === "5post" || activePickup.marketplace === "dpd");
    const usesTrackingPickupFields = isCdekPaid || isTrackingCodePaid;
    const parsed =
      activeFlow === "pickup_standard"
        ? createPickupStandardOrderSchema.safeParse({
            orderType: activeFlow,
            marketplace: activePickup.marketplace,
            pickupPoint: activePickup.pickupPoint || undefined,
            firstName: activePickup.firstName,
            lastName: activePickup.lastName,
            phone: activePickup.phone,
            size: activePickup.size.trim() || undefined,
            sourceUrl: activePickup.sourceUrl,
            additionalInfo: activePickup.additionalInfo.trim() || undefined,
          })
        : createPaidPickupOrderSchema.safeParse({
            orderType: activeFlow,
            marketplace: activePickup.marketplace,
            pickupPoint: activePickup.pickupPoint || undefined,
            firstName: activePickup.firstName,
            lastName: activePickup.lastName,
            phone: activePickup.phone,
            itemCount: usesTrackingPickupFields || isCourierPaid || isBulkyPaid || hidesPaidItemAmountFields ? undefined : Number(activePickup.itemCount),
            totalAmount: usesTrackingPickupFields || isCourierPaid || isBulkyPaid || hidesPaidItemAmountFields ? undefined : Number(activePickup.totalAmount),
            trackingNumber: usesTrackingPickupFields || isDetmirPaid || isGoldapplePaid || isLetualPaid || isCourierPaid || isBulkyPaid ? activePickup.trackingNumber : undefined,
            shipmentNumber: isCdekPaid ? activePickup.shipmentNumber : undefined,
            senderName: isCourierPaid || isBulkyPaid ? activePickup.senderName : undefined,
            transportCompany: isBulkyPaid ? activePickup.transportCompany || undefined : undefined,
            pickupCode: usesTrackingPickupFields || usesMarketplacePickupGuide || isDetmirPaid || isCourierPaid || isBulkyPaid ? activePickup.pickupCode : undefined,
          });

    const nextErrors: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0] ?? "form")] = issue.message;
    }
    if (!activePickup.pickupPoint) nextErrors.pickupPoint = "Выберите пункт выдачи";
    if (
      activePickupTargetGuide &&
      activePickup.pickupPoint &&
      !activePickupTargetGuide.targetByPickupPointId[activePickup.pickupPoint as PickupPointId]
    ) {
      nextErrors.pickupPoint = `Выберите пункт выдачи из списка ${activePickupTargetGuide.marketplaceName}`;
    }
    if (isBulkyPaid && activePickup.bulkyAttachments.length === 0) nextErrors.attachment = paidFieldCopy.attachmentRequiredError;
    if (activeFlow === "pickup_paid" && !usesTrackingPickupFields && !isBulkyPaid && !activePickup.attachment) nextErrors.attachment = paidFieldCopy.attachmentRequiredError;
    if ((usesMarketplacePickupGuide || isCourierPaid || activeFlow === "pickup_standard") && !activePickup.termsAccepted) {
      nextErrors.termsAccepted = "Подтвердите согласие с условиями доставки, оплаты и договором оферты";
    }
    if (Object.keys(nextErrors).length > 0) {
      const errors = {
        ...nextErrors,
        form:
          nextErrors.form ??
          "Проверьте обязательные поля выше: выберите пункт выдачи, заполните номер/код и загрузите файл, если он требуется.",
      };
      updatePickup({ errors });
      scrollToFirstPickupError(errors, activeFlow as "pickup_standard" | "pickup_paid");
      return;
    }

    startUiTransition(async () => {
      try {
        const response = await createPickupOrder({
          orderType: activeFlow as "pickup_standard" | "pickup_paid",
          marketplace: activePickup.marketplace,
          pickupPoint: activePickup.pickupPoint || undefined,
          firstName: activePickup.firstName,
          lastName: activePickup.lastName,
          phone: activePickup.phone,
          size: activeFlow === "pickup_standard" ? activePickup.size.trim() || undefined : undefined,
          additionalInfo: activeFlow === "pickup_standard" ? activePickup.additionalInfo.trim() || undefined : undefined,
          itemCount:
            activeFlow === "pickup_paid" && !usesTrackingPickupFields && !isCourierPaid && !isBulkyPaid && !hidesPaidItemAmountFields
              ? activePickup.itemCount
              : undefined,
          totalAmount:
            activeFlow === "pickup_paid" && !usesTrackingPickupFields && !isCourierPaid && !isBulkyPaid && !hidesPaidItemAmountFields
              ? activePickup.totalAmount
              : undefined,
          trackingNumber: usesTrackingPickupFields || isDetmirPaid || isGoldapplePaid || isLetualPaid || isCourierPaid || isBulkyPaid ? activePickup.trackingNumber : undefined,
          shipmentNumber: isCdekPaid ? activePickup.shipmentNumber : undefined,
          senderName: isCourierPaid || isBulkyPaid ? activePickup.senderName : undefined,
          transportCompany: isBulkyPaid ? activePickup.transportCompany || undefined : undefined,
          pickupCode: usesTrackingPickupFields || usesMarketplacePickupGuide || isDetmirPaid || isCourierPaid || isBulkyPaid ? activePickup.pickupCode : undefined,
          sourceUrl: activeFlow === "pickup_standard" ? activePickup.sourceUrl : undefined,
          attachment: activeFlow === "pickup_paid" && !isBulkyPaid ? activePickup.attachment ?? undefined : undefined,
          bulkyAttachments: activeFlow === "pickup_paid" && isBulkyPaid ? activePickup.bulkyAttachments : undefined,
        });
        setActivePickup((current) => ({ ...current, step: 3, result: response.order, errors: {} }));
      } catch (error) {
        const fieldErrors = apiValidationErrorsToFieldErrors(error);
        const errors = {
          ...fieldErrors,
          form: Object.keys(fieldErrors).length > 0 ? "Проверьте выделенные поля." : error instanceof Error ? error.message : "Не удалось создать заказ",
        };
        updatePickup({ errors });
        scrollToFirstPickupError(errors, activeFlow as "pickup_standard" | "pickup_paid");
      }
    });
  };

  const submitDeliveryOrder = async () => {
    const orderNumbers = normalizeOrderNumbersInput(delivery.orderNumbers);
    const parsed = createHomeDeliveryOrderSchema.safeParse({
      orderType: "home_delivery",
      orderNumbers,
      deliveryAddress: delivery.deliveryAddress,
      deliveryDate: delivery.deliveryDate,
      deliveryTimeSlot: delivery.deliveryTimeSlot,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0] ?? "form")] = issue.message;
      setDelivery((current) => ({ ...current, errors: nextErrors }));
      return;
    }

    startUiTransition(async () => {
      try {
        const response = await createHomeDeliveryOrder({
          orderNumbers,
          deliveryAddress: delivery.deliveryAddress,
          deliveryDate: delivery.deliveryDate,
          deliveryTimeSlot: delivery.deliveryTimeSlot as HomeDeliveryTimeSlot,
        });
        setDelivery((current) => ({ ...current, step: 2, result: response.order, errors: {} }));
      } catch (error) {
        setDelivery((current) => ({
          ...current,
          errors: { form: error instanceof Error ? error.message : "Не удалось создать доставку" },
        }));
      }
    });
  };

  const submitLookupLegacy = async () => {
    const query = deferredLookupNumber.trim();
    const parsed = {
      success: query.length > 0,
      error: { issues: [{ message: "Введите номер заказа." }] },
      data: query,
    };
    if (!parsed.success) {
      setLookupError(parsed.error.issues[0]?.message ?? "Введите корректный номер");
      return;
    }

    startUiTransition(async () => {
      try {
        const response = await lookupTrackedOrder(parsed.data);
        setLookupOrders(response.orders);
        setLookupError(null);
      } catch (error) {
        setLookupOrders([]);
        setLookupError(error instanceof Error ? error.message : "Заказ не найден");
      }
    });
  };

  const submitLookup = async () => {
    const query = deferredLookupNumber.trim();
    if (query.length === 0) {
      setLookupError("Введите номер заказа.");
      return;
    }

    if (isPhoneLookupQuery(query)) {
      setLookupError("Поиск в отслеживании доступен только по номеру заказа.");
      return;
    }

    startUiTransition(async () => {
      try {
        const response = await lookupTrackedOrder(query);
        setLookupOrders(response.orders);
        setLookupError(null);
      } catch (error) {
        setLookupOrders([]);
        setLookupError(error instanceof Error ? error.message : "Заказ не найден");
      }
    });
  };

  const submitCancelLookup = async () => {
    const parsed = numericIdSchema.safeParse(deferredCancelNumber);
    if (!parsed.success) {
      setCancelError(parsed.error.issues[0]?.message ?? "Введите корректный номер");
      setCancelSupportNoticeVisible(false);
      return;
    }

    startUiTransition(async () => {
      try {
        const response = await fetchOrder(parsed.data);
        if (response.order.status === "CANCELLED" || response.order.status === "COMPLETED") {
          setCancelCandidate(null);
          setCancelResult(null);
          setCancelError("Нет текущих заказов для отмены или неправильно введён номер. Проверьте данные.");
          setCancelSupportNoticeVisible(false);
          return;
        }
        setCancelCandidate(response.order);
        setCancelResult(null);
        setCancelError(null);
        setCancelSupportNoticeVisible(false);
      } catch (error) {
        setCancelCandidate(null);
        setCancelResult(null);
        setCancelError("Нет текущих заказов для отмены или неправильно введён номер. Проверьте данные.");
        setCancelSupportNoticeVisible(false);
      }
    });
  };

  const submitCancel = async () => {
    if (!cancelCandidate) return;

    startUiTransition(async () => {
      try {
        const response = await cancelOrder(cancelCandidate.orderNumber);
        setCancelCandidate(null);
        setCancelResult(response.order);
        setCancelError(null);
        setCancelNumber("");
      } catch (error) {
        setCancelError(error instanceof Error ? error.message : "Не удалось отменить заказ");
      }
    });
  };

  const pickupStepLabel = activePickup.step === 1 ? "Шаг 1 из 3" : activePickup.step === 2 ? "Шаг 2 из 3" : "Готово";
  const deliveryStepLabel = delivery.result ? "Готово" : "Шаг 1 из 2";
  const hasDeliveryOrders = delivery.orderNumbers.some((value) => value.trim().length > 0);

  const lookupChips = ["#SBX-2049-99", "№ 104587", deferredLookupNumber ? `№ ${deferredLookupNumber}` : null].filter(Boolean);
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    let frame = 0;

    const syncHeaderVisibility = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY <= 24) {
        setIsHeaderHidden(false);
      } else if (delta > 10) {
        setIsHeaderHidden(true);
      } else if (delta < -10) {
        setIsHeaderHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
      frame = 0;
    };

    const handleScroll = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(syncHeaderVisibility);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const renderOverview = () => (
    <>
      <section className="soft-card relative overflow-hidden rounded-[36px] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[color:var(--muted)] shadow-[0_10px_24px_rgba(84,58,128,0.05)]">
              <span className="text-[color:var(--accent)]">•</span>
              {pickupAddress}
            </div>
            <div className="mt-8">
              <SectionIntro
                eyebrow=""
                titleClassName="hero-delivery-title"
                title={
                  <>
                    Оформление доставки в <span className="text-[color:var(--accent)] italic">пару кликов</span>
                  </>
                }
                description="Оформляйте заказы с доставкой в Мариуполь с максимальным комфортом! Надежная выдача товаров из маркетплейсов и транспортных компаний. Приятный бонус - бесплатный возврат, если товар не подошел!"
              />
            </div>
          </div>
          <div className="relative hidden justify-end lg:flex">
            <HeroDeliveryVisual />
          </div>
        </div>
      </section>

      <section className="mt-8">
          <div className="grid gap-4 md:grid-cols-[1.02fr_1fr_1fr] md:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
            {actionCards.map((card) => {
              const placementClass =
                card.featured
                  ? "md:row-span-2 md:min-h-[560px]"
                  : "md:min-h-[240px]";

            return (
              <ActionCard
                key={card.id}
                title={card.title}
                eyebrow={card.eyebrow}
                description={card.description}
                icon={card.icon}
                featured={card.featured}
                accent={card.accent}
                active={activeFlow === card.id}
                className={placementClass}
                onClick={() => openFlow(card.id)}
              />
            );
          })}
        </div>
      </section>
    </>
  );

  const specialPickupLabels: Record<SpecialPickupId, string> = {
    courier: "Передать другой заказ",
    bulky: "Транспортные компании",
  };

  const specialPickupOptions: Array<{ id: SpecialPickupId; icon: string; label: string; sub: string }> = [
    { id: "courier", icon: "📦", label: "Передать другой заказ", sub: "другой заказ" },
    { id: "bulky", icon: "🚚", label: "Транспортные компании", sub: "службы перевозки" },
  ];

  const renderPickupFlow = () => {
    const paid = activeFlow === "pickup_paid";
    const isCdekPaid = paid && activePickup.marketplace === "cdek";
    const isDetmirPaid = paid && activePickup.marketplace === "detmir";
    const isGoldapplePaid = paid && activePickup.marketplace === "goldapple";
    const isLetualPaid = paid && activePickup.marketplace === "letual";
    const isCourierPaid = paid && activePickup.marketplace === "courier";
    const isBulkyPaid = paid && activePickup.marketplace === "bulky";
    const activeMarketplaceGuide =
      paid && activePickup.marketplace
        ? marketplacePickupGuideById[activePickup.marketplace as MarketplaceId]
        : null;
    const activePickupTargetGuide =
      activeMarketplaceGuide ??
      (!paid && activePickup.marketplace
        ? marketplacePickupGuideById[activePickup.marketplace as MarketplaceId]
        : null);
    const usesMarketplacePickupGuide = Boolean(activeMarketplaceGuide);
    const hidesPaidItemAmountFields = usesMarketplacePickupGuide;
    const isTrackingCodePaid =
      paid && (activePickup.marketplace === "5post" || activePickup.marketplace === "dpd");
    const usesTrackingPickupFields = isCdekPaid || isTrackingCodePaid;
    const isSpecial = paid && (activePickup.marketplace === "courier" || activePickup.marketplace === "bulky");
    const paidFieldCopy = getPaidFieldCopy(activePickup.marketplace);
    const currentMarketplace = activePickup.marketplace
      ? (activePickup.marketplace in specialPickupLabels
          ? specialPickupLabels[activePickup.marketplace as SpecialPickupId]
          : humanizeMarketplace(activePickup.marketplace as MarketplaceId))
      : "Ничего не выбрано";
    const marketplaceOrderPickupPoint =
      activePickupTargetGuide && activePickup.pickupPoint
        ? activePickupTargetGuide.targetByPickupPointId[activePickup.pickupPoint as PickupPointId]
        : null;
    const marketplacePickupPointMap = activePickupTargetGuide?.targetByPickupPointId ?? null;
    const availablePickupPointOptions = marketplacePickupPointMap
      ? pickupPointOptions.filter((pickupPoint) => pickupPoint.id in marketplacePickupPointMap)
      : pickupPointOptions;
    const pickupPointField = (
      <Field
        label="Пункт выдачи"
        htmlFor={`${activeFlow}-pickupPoint-modern`}
        error={activePickup.errors.pickupPoint}
      >
        <PickupPointSelect
          id={`${activeFlow}-pickupPoint-modern`}
          value={activePickup.pickupPoint}
          onChange={(pickupPoint) => updatePickup({ pickupPoint: pickupPoint as PickupPointId | "", errors: { ...activePickup.errors, pickupPoint: "" } })}
          placeholder="Выберите пункт выдачи"
          variant="sarma"
          options={availablePickupPointOptions.map((pickupPoint) => ({
            value: pickupPoint.id,
            label: `${pickupPoint.label}: ${pickupPoint.address}`,
            description: `${pickupPoint.hours} · ${pickupPoint.contact}`,
          }))}
        />
      </Field>
    );
    const marketplaceOrderPickupPointNotice = marketplaceOrderPickupPoint ? (
      <div className="rounded-[24px] border border-[#b8d6ff] bg-[linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)] px-5 py-4 text-[#173862] shadow-[0_14px_28px_rgba(39,77,146,0.08)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4677cf]">
          {activePickupTargetGuide?.targetLabel ?? `Пункт выдачи для заказа на ${activePickupTargetGuide?.marketplaceName}`}
        </p>
        <p className="mt-2 text-lg font-extrabold leading-7">{marketplaceOrderPickupPoint}</p>
        <p className="mt-2 text-sm leading-6 text-[#58739d]">
          {activePickupTargetGuide?.targetDescription ??
            `На сайте или в приложении ${activePickupTargetGuide?.marketplaceName} выберите этот ПВЗ в Ростове-на-Дону. Мы получим заказ там и доставим его в выбранный вами пункт.`}
        </p>
      </div>
    ) : null;

    if (activePickup.step === 1) {
      if (paid) {
        type PaidSourceOption =
          | { kind: "marketplace"; id: MarketplaceId; label: string; asset: string }
          | { kind: "special"; id: SpecialPickupId; label: string; icon: string }
          | { kind: "link"; id: "pickup_standard" | "cancel_order"; label: string; icon: string };

        const priorityMarketplaceIds = ["cdek", "5post", "dpd"] as const satisfies readonly MarketplaceId[];
        const regularMarketplaceIds = ["wildberries", "ozon", "yandex_market", "avito", "lamoda", "goldapple", "letual", "detmir"] as const satisfies readonly MarketplaceId[];
        const priorityMarketplaceIdSet = new Set<MarketplaceId>(priorityMarketplaceIds);
        const marketplaceOptionById = new Map(marketplaces.map((marketplace) => [marketplace.id, marketplace]));
        const priorityMarketplaceOptions: PaidSourceOption[] = priorityMarketplaceIds.map((id) => {
          const marketplace = marketplaces.find((item) => item.id === id)!;
          return {
            kind: "marketplace" as const,
            id: marketplace.id,
            label: humanizeMarketplace(marketplace.id),
            asset: marketplace.asset,
          };
        });
        const marketplaceSourceOptions: PaidSourceOption[] = [
          ...priorityMarketplaceOptions,
          specialPickupOptions
            .filter((option) => option.id === "bulky")
            .map((option) => ({
              kind: "special" as const,
              id: option.id,
              label: option.label,
              icon: option.icon,
            }))[0]!,
          ...regularMarketplaceIds
            .map((id) => marketplaceOptionById.get(id)!)
            .filter((marketplace) => !priorityMarketplaceIdSet.has(marketplace.id))
            .map((marketplace) => ({
              kind: "marketplace" as const,
              id: marketplace.id,
              label: humanizeMarketplace(marketplace.id),
              asset: marketplace.asset,
            })),
        ];
        const actionSourceOptions: PaidSourceOption[] = [
          ...specialPickupOptions
            .filter((option) => option.id === "courier")
            .map((option) => ({
              kind: "special" as const,
              id: option.id,
              label: option.label,
              icon: option.icon,
            })),
          { kind: "link" as const, id: "pickup_standard", label: "Заказ по ссылке", icon: "🔗" },
          { kind: "link" as const, id: "cancel_order", label: "Отмена заказа", icon: "📋" },
        ];
        const renderSourceOption = (option: PaidSourceOption) => {
          const active = option.kind !== "link" && activePickup.marketplace === option.id;

          return (
            <button
              key={`${option.kind}-${option.id}`}
              type="button"
              onClick={() => {
                if (option.kind === "link") {
                  openFlow(option.id);
                  return;
                }

                updatePickup({
                  marketplace: option.id,
                  pickupPoint: "",
                  attachment: null,
                  trackingNumber: "",
                  shipmentNumber: "",
                  pickupCode: "",
                  transportCompany: "",
                  termsAccepted: false,
                  errors: {},
                });
              }}
              className={`group relative flex min-h-[228px] flex-col items-center overflow-hidden rounded-[28px] border px-5 py-6 text-center transition-all duration-200 ${
                active
                  ? "border-[#8cb7ff] bg-[linear-gradient(180deg,#ffffff_0%,#edf5ff_100%)] shadow-[0_22px_40px_rgba(68,117,194,0.16)]"
                  : "border-[#d7e4f7] bg-white/92 hover:-translate-y-1 hover:border-[#b7cff4] hover:bg-white hover:shadow-[0_20px_34px_rgba(68,117,194,0.12)]"
              }`}
            >
              {active ? (
                <span className="absolute bottom-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#5e9df1_0%,#487dd6_100%)] text-sm font-bold text-white shadow-[0_12px_24px_rgba(45,90,175,0.22)]">
                  ✓
                </span>
              ) : null}

              <span className="flex h-28 w-28 items-center justify-center rounded-[30px] bg-[#f2f6fc] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                {option.kind === "marketplace" ? (
                  <Image
                    src={`/marketplaces/${option.asset}`}
                    alt={option.label}
                    width={156}
                    height={64}
                    className={`h-14 w-[156px] object-contain transition duration-200 ${
                      active ? "" : "grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100"
                    }`}
                  />
                ) : (
                  <span
                    className={`text-[3.25rem] transition duration-200 ${
                      active ? "" : "grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100"
                    } ${option.kind === "link" ? "text-[#3f74cb]" : ""}`}
                  >
                    {option.icon}
                  </span>
                )}
              </span>

              <div className="mt-8 flex flex-1 items-center justify-center">
                <p className="text-center text-[1.35rem] font-extrabold leading-tight text-[#123763]">{option.label}</p>
              </div>
            </button>
          );
        };

        return (
          <section
            className="relative overflow-hidden bg-[#3f84e6] bg-cover bg-[position:72%_center] bg-no-repeat"
            style={{ backgroundImage: "url('/brand/hero-background.png')" }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(43,107,210,0.9)_0%,rgba(65,136,229,0.72)_30%,rgba(90,157,239,0.28)_54%,rgba(138,190,248,0.08)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.24),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]" />
            <div className="absolute left-0 right-0 top-[66%] h-[3px] bg-[linear-gradient(90deg,rgba(255,255,255,0.1),rgba(255,255,255,0.52),rgba(255,255,255,0.14))] blur-[1px]" />

            <div className="relative mx-auto w-full max-w-[1240px] px-4 pb-28 pt-12 lg:px-6 lg:pb-36 lg:pt-16">
              <div className="rounded-[36px] border border-white/48 bg-[linear-gradient(180deg,rgba(237,244,255,0.96)_0%,rgba(227,238,252,0.9)_100%)] p-5 pb-24 text-[#12315b] shadow-[0_30px_80px_rgba(39,77,146,0.18)] backdrop-blur-[20px] sm:p-6 sm:pb-28 lg:p-8 lg:pb-32">
                <div className="flex flex-col gap-4 border-b border-[#d9e5f8] pb-6">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4677cf]">Выбор источника</p>
                    <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#13345f] sm:text-[2.5rem]">Интернет-магазины и службы доставки</h2>
                    <p className="mt-3 max-w-[780px] text-base leading-7 text-[#58739d]">
                      Выберите магазин, маркетплейс, службу доставки или транспортную компанию, откуда нужно забрать заказ.
                    </p>
                  </div>

                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {marketplaceSourceOptions.map(renderSourceOption)}
                </div>

                <div className="mx-auto mt-4 grid max-w-[860px] gap-4 sm:grid-cols-3">
                  {actionSourceOptions.map(renderSourceOption)}
                </div>

                {activePickup.marketplace ? (
                  <FloatingContinueBar selectedLabel={currentMarketplace} onContinue={continuePickupSelection} />
                ) : null}

                {activePickup.errors.marketplace ? (
                  <div className="mt-8">
                    <div className="mx-auto max-w-[780px] rounded-[20px] border border-[#f2c9cf] bg-[#fff2f4] px-4 py-3 text-sm font-semibold text-[#c25166]">
                      {activePickup.errors.marketplace}
                    </div>
                  </div>
                ) : null}

                <DisclaimerSummaryBlock onOpen={() => setIsDisclaimerOpen(true)} />
              </div>
            </div>
          </section>
        );
      }

      const standardMarketplaces = marketplaces.filter((marketplace) =>
        ["wildberries", "ozon", "yandex_market"].includes(marketplace.id),
      );

      return (
        <section
          className="relative overflow-hidden bg-[#3f84e6] bg-cover bg-[position:72%_center] bg-no-repeat"
          style={{ backgroundImage: "url('/brand/hero-background.png')" }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(43,107,210,0.9)_0%,rgba(65,136,229,0.72)_30%,rgba(90,157,239,0.28)_54%,rgba(138,190,248,0.08)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.24),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]" />
          <div className="absolute left-0 right-0 top-[66%] h-[3px] bg-[linear-gradient(90deg,rgba(255,255,255,0.1),rgba(255,255,255,0.52),rgba(255,255,255,0.14))] blur-[1px]" />

          <div className="relative mx-auto w-full max-w-[1240px] px-4 pb-28 pt-12 lg:px-6 lg:pb-36 lg:pt-16">
            <div className="rounded-[36px] border border-white/48 bg-[linear-gradient(180deg,rgba(237,244,255,0.96)_0%,rgba(227,238,252,0.9)_100%)] p-5 pb-24 text-[#12315b] shadow-[0_30px_80px_rgba(39,77,146,0.18)] backdrop-blur-[20px] sm:p-6 sm:pb-28 lg:p-8 lg:pb-32">
              <div className="flex flex-col gap-4 border-b border-[#d9e5f8] pb-6">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4677cf]">Заказ по ссылке</p>
                  <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#13345f] sm:text-[2.5rem]">Выберите маркетплейс</h2>
                  <p className="mt-3 max-w-[780px] text-base leading-7 text-[#58739d]">
                    Выберите площадку, на которой находится товар. После этого вы перейдёте к оформлению заказа по ссылке, заполнению данных и выбору пункта выдачи.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {standardMarketplaces.map((marketplace) => {
                  const active = activePickup.marketplace === marketplace.id;

                  return (
                    <button
                      key={marketplace.id}
                      type="button"
                      onClick={() =>
                        updatePickup({
                          marketplace: marketplace.id,
                          pickupPoint: "",
                          termsAccepted: false,
                          errors: {},
                        })
                      }
                      className={`group relative flex min-h-[228px] flex-col items-center overflow-hidden rounded-[28px] border px-5 py-6 text-center transition-all duration-200 ${
                        active
                          ? "border-[#8cb7ff] bg-[linear-gradient(180deg,#ffffff_0%,#edf5ff_100%)] shadow-[0_22px_40px_rgba(68,117,194,0.16)]"
                          : "border-[#d7e4f7] bg-white/92 hover:-translate-y-1 hover:border-[#b7cff4] hover:bg-white hover:shadow-[0_20px_34px_rgba(68,117,194,0.12)]"
                      }`}
                    >
                      {active ? (
                        <span className="absolute bottom-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#5e9df1_0%,#487dd6_100%)] text-sm font-bold text-white shadow-[0_12px_24px_rgba(45,90,175,0.22)]">
                          ✓
                        </span>
                      ) : null}

                      <span className="flex h-28 w-28 items-center justify-center rounded-[30px] bg-[#f2f6fc] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                        <Image
                          src={`/marketplaces/${marketplace.asset}`}
                          alt={humanizeMarketplace(marketplace.id)}
                          width={156}
                          height={64}
                          className={`h-14 w-[156px] object-contain transition duration-200 ${
                            active ? "" : "grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100"
                          }`}
                        />
                      </span>

                      <div className="mt-8 flex flex-1 items-center justify-center">
                        <p className="text-center text-[1.35rem] font-extrabold leading-tight text-[#123763]">{humanizeMarketplace(marketplace.id)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activePickup.errors.marketplace ? (
                <div className="mt-8">
                  <div className="mx-auto max-w-[780px] rounded-[20px] border border-[#f2c9cf] bg-[#fff2f4] px-4 py-3 text-sm font-semibold text-[#c25166]">
                    {activePickup.errors.marketplace}
                  </div>
                </div>
              ) : null}
            </div>

            {activePickup.marketplace ? (
              <FloatingContinueBar selectedLabel={currentMarketplace} onContinue={continuePickupSelection} />
            ) : null}
          </div>
        </section>
      );
    }

    if (activePickup.step === 2) {
      const pickupStepTitle = activeMarketplaceGuide
        ? activeMarketplaceGuide.title
        : paid
          ? isCourierPaid
            ? "Передайте данные заказа"
            : (usesTrackingPickupFields ? "Заполните данные для получения" : "Загрузите код и заполните детали")
          : "Детали заказа";
      const pickupStepDescription =
        activeMarketplaceGuide
          ? activeMarketplaceGuide.subtitle
          : paid
          ? isCourierPaid
            ? "Загрузите QR-код, штрих-код или скриншот, чтобы мы могли получить заказ за вас."
            : isCdekPaid
            ? "Укажите имя, фамилию, телефон и заполните трек-номер или номер отправления ИМ. Код получения и скриншот отправления можно добавить по желанию."
            : isTrackingCodePaid
              ? "Укажите имя, фамилию, телефон, трек-номер и код получения. Скриншот отправления можно приложить по желанию."
              : "Заполните данные клиента и загрузите QR или штрих-код. Мы сохраним заказ отдельным сценарием без смешивания со стандартной доставкой."
          : "Заполните форму ниже, чтобы мы могли обработать заказ с максимальной точностью.";

      return (
        <section
          className="relative overflow-hidden bg-[#4a8de7] bg-cover bg-[position:72%_center] bg-no-repeat"
          style={{ backgroundImage: "url('/brand/hero-background.png')" }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(51,114,214,0.96)_0%,rgba(86,148,232,0.82)_34%,rgba(150,198,248,0.26)_64%,rgba(255,255,255,0)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.6),transparent_17%),linear-gradient(90deg,rgba(255,255,255,0)_46%,rgba(255,255,255,0.74)_100%)]" />
          <div className="absolute -left-28 top-1/2 h-[580px] w-[580px] -translate-y-1/2 rounded-full border border-white/18" />
          <div className="absolute -left-10 bottom-[-180px] h-[440px] w-[440px] rounded-full border border-white/18" />

          <div className="relative mx-auto w-full max-w-[1240px] px-4 pb-20 pt-12 lg:px-6 lg:pb-24 lg:pt-16">
            <div className="mx-auto max-w-[980px] rounded-[36px] border border-white/46 bg-[linear-gradient(180deg,rgba(237,244,255,0.96)_0%,rgba(227,238,252,0.9)_100%)] p-5 text-[#12315b] shadow-[0_30px_80px_rgba(39,77,146,0.18)] backdrop-blur-[20px] sm:p-6 lg:p-8">
              <div className="flex flex-col gap-5 border-b border-[#d9e5f8] pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4677cf]">
                    {paid ? "Оформление получения" : "Заказ по ссылке"}
                  </p>
                  <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#13345f] sm:text-[2.5rem]">
                    {pickupStepTitle}
                  </h2>
                  <p className="mt-3 max-w-[760px] text-base leading-7 text-[#58739d]">
                    {pickupStepDescription}
                  </p>
                </div>

                <div className="inline-flex w-fit items-center rounded-full border border-white/60 bg-white/72 px-5 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#5b7eb4] shadow-[0_12px_24px_rgba(39,77,146,0.08)]">
                  {pickupStepLabel}
                </div>
              </div>

              {paid && activePickup.marketplace ? (
                <div
                  className="mt-6 rounded-[28px] border border-[#d7e4f7] bg-white/88 p-4 shadow-[0_18px_40px_rgba(39,77,146,0.1)]"
                >
                  {paidMarketplaceNotices[activePickup.marketplace]}
                </div>
              ) : null}

              <form
                className="sarma-pickup-form mt-8 space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitPickup();
                }}
              >
            <div className="rounded-[24px] border border-white/65 bg-[linear-gradient(180deg,#ffffff_0%,#eef5ff_100%)] px-5 py-4 text-sm leading-7 text-[#5f789d] shadow-[0_14px_28px_rgba(39,77,146,0.08)]">
              {isSpecial ? "Выбран сценарий" : "Выбран маркетплейс"}: <span className="font-semibold text-[#13345f]">{currentMarketplace}</span>
            </div>
            {usesMarketplacePickupGuide ? (
              <>
                {pickupPointField}
                {marketplaceOrderPickupPointNotice}
              </>
            ) : null}
            {usesMarketplacePickupGuide ? (
              <div className="rounded-[24px] border border-[#d7e4f7] bg-white/80 px-5 py-4 shadow-[0_14px_28px_rgba(39,77,146,0.08)]">
                <p className="text-lg font-extrabold text-[#13345f]">Укажите ваши данные для получения посылки:</p>
              </div>
            ) : null}
            <div className={`grid gap-4 ${isCourierPaid ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <Field label="Имя" htmlFor={`${activeFlow}-firstName`} error={activePickup.errors.firstName}>
                <Input id={`${activeFlow}-firstName`} autoFocus placeholder="Введите имя" value={activePickup.firstName} onChange={(event) => updatePickup({ firstName: event.target.value })} />
              </Field>
              <Field label="Фамилия" htmlFor={`${activeFlow}-lastName`} error={activePickup.errors.lastName}>
                <Input id={`${activeFlow}-lastName`} placeholder="Введите фамилию" value={activePickup.lastName} onChange={(event) => updatePickup({ lastName: event.target.value })} />
              </Field>
              {isCourierPaid ? (
                <Field label="Телефон" htmlFor={`${activeFlow}-phone`} hint="Формат: +7XXXXXXXXXX" error={activePickup.errors.phone}>
                  <Input id={`${activeFlow}-phone`} placeholder="Введите номер телефона" value={activePickup.phone} onChange={(event) => updatePickup({ phone: event.target.value })} />
                </Field>
              ) : null}
            </div>

            {!isCourierPaid ? (
              <Field label="Телефон" htmlFor={`${activeFlow}-phone`} hint="Формат +7XXXXXXXXXX" error={activePickup.errors.phone}>
                <Input id={`${activeFlow}-phone`} placeholder="+7 (___) ___-__-__" value={activePickup.phone} onChange={(event) => updatePickup({ phone: event.target.value })} />
              </Field>
            ) : null}

            {isCdekPaid ? (
              <>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start">
                  <Field
                    label="Трек-номер / номер отправления"
                    htmlFor={`${activeFlow}-trackingNumber`}
                    hint="11 цифр, не больше, не меньше"
                    error={activePickup.errors.trackingNumber}
                  >
                    <Input
                      id={`${activeFlow}-trackingNumber`}
                      inputMode="numeric"
                      maxLength={11}
                      pattern="[0-9]*"
                      placeholder="Введите трек-номер"
                      value={activePickup.trackingNumber}
                      onChange={(event) => updatePickup({ trackingNumber: event.target.value.replace(/\D/g, "").slice(0, 11) })}
                    />
                  </Field>
                  <div className="flex items-center justify-center pt-0 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)] sm:pt-11">
                    или
                  </div>
                  <Field
                    label="Номер заказа интернет-магазина"
                    htmlFor={`${activeFlow}-shipmentNumber`}
                    hint={
                      <>
                        <span className="block font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">Без маски</span>
                        <span className="block">
                          Заполните это поле, если нет трек-номера СДЭК, но есть номер заказа или отправления интернет-магазина.
                        </span>
                      </>
                    }
                    error={activePickup.errors.shipmentNumber}
                  >
                    <Input
                      id={`${activeFlow}-shipmentNumber`}
                      placeholder="Введите номер заказа интернет-магазина"
                      value={activePickup.shipmentNumber}
                      onChange={(event) => updatePickup({ shipmentNumber: event.target.value })}
                    />
                  </Field>
                </div>

                <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                  Обязательно одно из двух полей
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Код получения</span>
                        <span className={fieldStateLabelClass}>
                          Не обязательное поле
                        </span>
                      </span>
                    }
                    htmlFor={`${activeFlow}-pickupCode`}
                    hint={<span className="block">Если подключен СДЭК ID</span>}
                    error={activePickup.errors.pickupCode}
                  >
                    <Input
                      id={`${activeFlow}-pickupCode`}
                      placeholder="Введите код получения"
                      value={activePickup.pickupCode}
                      onChange={(event) => updatePickup({ pickupCode: event.target.value })}
                    />
                  </Field>
                </div>

                <Field
                  label={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Скриншот отправления</span>
                      <span className="text-sm font-semibold text-[color:var(--accent-strong)]">Можно пропустить</span>
                    </span>
                  }
                  htmlFor={`${activeFlow}-attachment`}
                  error={activePickup.errors.attachment}
                >
                  <FileUploadCard
                    id={`${activeFlow}-attachment`}
                    accept=".jpg,.jpeg,.png,.pdf"
                    file={activePickup.attachment}
                    variant="sarma"
                    onChange={(file) => updatePickup({ attachment: file })}
                  />
                </Field>
              </>
            ) : isTrackingCodePaid ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={isCdekPaid ? "Укажите трек-номер" : activePickup.marketplace === "dpd" ? "Трек-номер / номер заказа" : "Укажите трек-номер"} htmlFor={`${activeFlow}-trackingNumber`} error={activePickup.errors.trackingNumber}>
                    <Input
                      id={`${activeFlow}-trackingNumber`}
                      placeholder={activePickup.marketplace === "dpd" ? "Введите трек-номер или номер заказа" : "Введите трек-номер"}
                      value={activePickup.trackingNumber}
                      onChange={(event) => updatePickup({ trackingNumber: event.target.value })}
                    />
                  </Field>
                  <Field
                    label={
                      activePickup.marketplace === "dpd" ? (
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Код для получения</span>
                          <span className={fieldStateLabelClass}>При наличии</span>
                        </span>
                      ) : (
                        "Код получения"
                      )
                    }
                    htmlFor={`${activeFlow}-pickupCode`}
                    error={activePickup.errors.pickupCode}
                  >
                    <Input
                      id={`${activeFlow}-pickupCode`}
                      placeholder="Введите код получения"
                      value={activePickup.pickupCode}
                      onChange={(event) => updatePickup({ pickupCode: event.target.value })}
                    />
                  </Field>
                </div>

                {activePickup.marketplace === "5post" ? (
                  <Field label={paidFieldCopy.attachmentLabel} htmlFor={`${activeFlow}-attachment`} hint={paidFieldCopy.attachmentHint} error={activePickup.errors.attachment}>
                    <FileUploadCard
                      id={`${activeFlow}-attachment`}
                      accept=".jpg,.jpeg,.png,.pdf"
                      file={activePickup.attachment}
                      variant="sarma"
                      onChange={(file) => updatePickup({ attachment: file })}
                    />
                  </Field>
                ) : null}
              </>
            ) : paid ? (
              <>
                {isDetmirPaid ? (
                  <div className={usesMarketplacePickupGuide ? "mx-auto max-w-[430px]" : "grid gap-4 sm:grid-cols-2"}>
                    <Field
                      label={
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Номер заказа</span>
                          <span className={fieldStateLabelClass}>
                            Обязательное поле
                          </span>
                        </span>
                      }
                      htmlFor={`${activeFlow}-trackingNumber`}
                      error={activePickup.errors.trackingNumber}
                    >
                      <Input
                        id={`${activeFlow}-trackingNumber`}
                        placeholder="Введите номер заказа"
                        value={activePickup.trackingNumber}
                        onChange={(event) => updatePickup({ trackingNumber: event.target.value })}
                      />
                    </Field>
                    {!usesMarketplacePickupGuide ? (
                      <Field
                        label={
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>Код получения</span>
                            <span className={fieldStateLabelClass}>
                              Не обязательное поле
                            </span>
                          </span>
                        }
                        htmlFor={`${activeFlow}-pickupCode`}
                        error={activePickup.errors.pickupCode}
                      >
                        <Input
                          id={`${activeFlow}-pickupCode`}
                          placeholder="Введите код получения"
                          value={activePickup.pickupCode}
                          onChange={(event) => updatePickup({ pickupCode: event.target.value })}
                        />
                      </Field>
                    ) : null}
                  </div>
                ) : null}

                {isGoldapplePaid ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={
                        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:justify-start sm:text-left">
                          <span>Номер заказа</span>
                          <span className={fieldStateLabelClass}>
                            Если есть
                          </span>
                        </span>
                      }
                      htmlFor={`${activeFlow}-trackingNumber`}
                      error={activePickup.errors.trackingNumber}
                    >
                      <Input
                        id={`${activeFlow}-trackingNumber`}
                        placeholder="Введите номер заказа"
                        value={activePickup.trackingNumber}
                        onChange={(event) => updatePickup({ trackingNumber: event.target.value })}
                      />
                    </Field>
                    <Field
                      label={
                        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:justify-start sm:text-left">
                          <span>Код получения</span>
                          <span className={fieldStateLabelClass}>
                            Если есть
                          </span>
                        </span>
                      }
                      htmlFor={`${activeFlow}-pickupCode`}
                      error={activePickup.errors.pickupCode}
                    >
                      <Input
                        id={`${activeFlow}-pickupCode`}
                        placeholder="Введите код получения"
                        value={activePickup.pickupCode}
                        onChange={(event) => updatePickup({ pickupCode: event.target.value })}
                      />
                    </Field>
                  </div>
                ) : null}

                {isLetualPaid ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={
                        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:justify-start sm:text-left">
                          <span>Номер заказа</span>
                          <span className={fieldStateLabelClass}>
                            Если есть
                          </span>
                        </span>
                      }
                      htmlFor={`${activeFlow}-trackingNumber`}
                      error={activePickup.errors.trackingNumber}
                    >
                      <Input
                        id={`${activeFlow}-trackingNumber`}
                        placeholder="Введите номер заказа"
                        value={activePickup.trackingNumber}
                        onChange={(event) => updatePickup({ trackingNumber: event.target.value })}
                      />
                    </Field>
                    <Field
                      label={
                        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:justify-start sm:text-left">
                          <span>Код получения</span>
                          <span className={fieldStateLabelClass}>
                            Если есть
                          </span>
                        </span>
                      }
                      htmlFor={`${activeFlow}-pickupCode`}
                      error={activePickup.errors.pickupCode}
                    >
                      <Input
                        id={`${activeFlow}-pickupCode`}
                        placeholder="Введите код получения"
                        value={activePickup.pickupCode}
                        onChange={(event) => updatePickup({ pickupCode: event.target.value })}
                      />
                    </Field>
                  </div>
                ) : null}

                {isCourierPaid ? (
                  <>
                    <Field
                      label={
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Отправитель или интернет-магазин</span>
                          <span className={fieldStateLabelClass}>
                            Обязательное поле
                          </span>
                        </span>
                      }
                      htmlFor={`${activeFlow}-senderName`}
                      error={activePickup.errors.senderName}
                    >
                      <Input
                        id={`${activeFlow}-senderName`}
                        placeholder="Например: Wildberries, Ozon, ООО Ромашка, ИП Петров"
                        value={activePickup.senderName}
                        onChange={(event) => updatePickup({ senderName: event.target.value })}
                      />
                    </Field>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field
                        label={
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>Номер заказа</span>
                            <span className={fieldStateLabelClass}>
                              Не обязательно
                            </span>
                          </span>
                        }
                        htmlFor={`${activeFlow}-trackingNumber`}
                        error={activePickup.errors.trackingNumber}
                      >
                        <Input
                          id={`${activeFlow}-trackingNumber`}
                          placeholder="Введите номер заказа"
                          value={activePickup.trackingNumber}
                          onChange={(event) => updatePickup({ trackingNumber: event.target.value })}
                        />
                      </Field>
                      <Field
                        label={
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>Код получения</span>
                            <span className={fieldStateLabelClass}>
                              Не обязательно
                            </span>
                          </span>
                        }
                        htmlFor={`${activeFlow}-pickupCode`}
                        error={activePickup.errors.pickupCode}
                      >
                        <Input
                          id={`${activeFlow}-pickupCode`}
                          placeholder="Введите код получения"
                          value={activePickup.pickupCode}
                          onChange={(event) => updatePickup({ pickupCode: event.target.value })}
                        />
                      </Field>
                    </div>

                    <Field label="Скриншот заказа, QR-код или штрих-код" htmlFor={`${activeFlow}-attachment`} hint="Загрузите скриншот заказа, QR-код или штрих-код. PNG, JPG или PDF до 10 MB." error={activePickup.errors.attachment}>
                      <FileUploadCard
                        id={`${activeFlow}-attachment`}
                        accept=".jpg,.jpeg,.png,.pdf"
                        file={activePickup.attachment}
                        variant="sarma"
                        onChange={(file) => updatePickup({ attachment: file })}
                      />
                    </Field>
                  </>
                ) : isBulkyPaid ? (
                  <>
                    <Field
                      label="Транспортная компания"
                      htmlFor={`${activeFlow}-transportCompany`}
                      error={activePickup.errors.transportCompany}
                    >
                      <Select
                        id={`${activeFlow}-transportCompany`}
                        value={activePickup.transportCompany}
                        onChange={(event) =>
                          updatePickup({
                            transportCompany: event.target.value as TransportCompanyId | "",
                            errors: { ...activePickup.errors, transportCompany: "" },
                          })
                        }
                      >
                        <option value="">Выберите транспортную компанию</option>
                        <option value="delovye_linii">Деловые Линии</option>
                        <option value="pek">ПЭК</option>
                      </Select>
                    </Field>

                    {activePickup.transportCompany ? (
                      <TransportCompanyInfoBlock company={activePickup.transportCompany} />
                    ) : null}

                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <Field
                        label={
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>Номер заказа</span>
                            <span className={fieldStateLabelClass}>
                              Не обязательно
                            </span>
                          </span>
                        }
                        htmlFor={`${activeFlow}-trackingNumber`}
                        error={activePickup.errors.trackingNumber}
                      >
                        <Input
                          id={`${activeFlow}-trackingNumber`}
                          placeholder="Введите номер заказа"
                          value={activePickup.trackingNumber}
                          onChange={(event) => updatePickup({ trackingNumber: event.target.value })}
                        />
                      </Field>
                      <Field
                        label={
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>Код получения</span>
                            <span className={fieldStateLabelClass}>
                              Не обязательно
                            </span>
                          </span>
                        }
                        htmlFor={`${activeFlow}-pickupCode`}
                        error={activePickup.errors.pickupCode}
                      >
                        <Input
                          id={`${activeFlow}-pickupCode`}
                          placeholder="Введите код получения"
                          value={activePickup.pickupCode}
                          onChange={(event) => updatePickup({ pickupCode: event.target.value })}
                        />
                      </Field>
                    </div>

                    <Field
                      label="QR / штрих-код заказа / скриншоты товаров / грузов"
                      htmlFor={`${activeFlow}-attachment`}
                      hint={paidFieldCopy.attachmentHint}
                      error={activePickup.errors.attachment}
                    >
                      <MultiFileUploadCard
                        id={`${activeFlow}-attachment`}
                        accept=".jpg,.jpeg,.png,.pdf"
                        files={activePickup.bulkyAttachments}
                        maxFiles={bulkyAttachmentLimit}
                        variant="sarma"
                        onChange={setBulkyAttachments}
                      />
                      {activePickup.bulkyAttachments.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {activePickup.bulkyAttachments.map((file, index) => (
                            <button
                              key={`${file.name}-${file.lastModified}-${index}`}
                              type="button"
                              onClick={() => removeBulkyAttachment(index)}
                              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)] shadow-[0_10px_24px_rgba(84,58,128,0.05)]"
                            >
                              <span className="max-w-[220px] truncate">{file.name}</span>
                              <span className="text-[color:var(--muted)]">×</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </Field>
                  </>
                ) : (
                  <>
                    {!hidesPaidItemAmountFields ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          label={paidFieldCopy.itemCountLabel}
                          htmlFor={`${activeFlow}-count`}
                          hint="Введите общее количество товаров для получения"
                          error={activePickup.errors.itemCount}
                        >
                          <InputWithSuffix id={`${activeFlow}-count`} type="number" min="1" suffix="шт." value={activePickup.itemCount} onChange={(event) => updatePickup({ itemCount: event.target.value })} />
                        </Field>
                        <Field
                          label={paidFieldCopy.totalAmountLabel}
                          htmlFor={`${activeFlow}-amount`}
                          hint="Укажите, пожалуйста, общую сумму всех товаров в заказе"
                          error={activePickup.errors.totalAmount}
                        >
                          <InputWithSuffix id={`${activeFlow}-amount`} type="number" min="1" suffix="₽" value={activePickup.totalAmount} onChange={(event) => updatePickup({ totalAmount: event.target.value })} />
                        </Field>
                      </div>
                    ) : null}

                    <Field label={paidFieldCopy.attachmentLabel} htmlFor={`${activeFlow}-attachment`} hint={paidFieldCopy.attachmentHint} error={activePickup.errors.attachment}>
                      <FileUploadCard
                        id={`${activeFlow}-attachment`}
                        accept=".jpg,.jpeg,.png,.pdf"
                        file={activePickup.attachment}
                        variant="sarma"
                        onChange={(file) => updatePickup({ attachment: file })}
                      />
                      <div className="hidden">
                        <input
                          id={`${activeFlow}-attachment-hidden`}
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="sr-only"
                          onChange={(event) => updatePickup({ attachment: event.target.files?.[0] ?? null })}
                        />
                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(196,46,160,0.14),rgba(124,51,255,0.16))] text-2xl text-[color:var(--accent-strong)]">
                          ↑
                        </span>
                        <span className="mt-5 text-lg font-semibold text-[color:var(--foreground)]">
                          {activePickup.attachment ? activePickup.attachment.name : "Нажмите для загрузки"}
                        </span>
                        <span className="mt-2 text-sm text-[color:var(--muted)]">
                          {activePickup.attachment ? "Файл прикреплён. Можно продолжать." : "Поддерживаются изображения и PDF."}
                        </span>
                      </div>
                    </Field>
                  </>
                )}
              </>
            ) : (
              <>
                <Field
                  label={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Укажите размер</span>
                      <span className={fieldStateLabelClass}>Не обязательное поле</span>
                    </span>
                  }
                  htmlFor={`${activeFlow}-size`}
                  error={activePickup.errors.size}
                >
                  <Input
                    id={`${activeFlow}-size`}
                    placeholder="Например, S, M, 42, 42.5, 128 GB"
                    value={activePickup.size}
                    onChange={(event) => updatePickup({ size: event.target.value })}
                  />
                </Field>

                <Field label="Ссылка на товар" htmlFor={`${activeFlow}-sourceUrl`} hint="Ссылка должна соответствовать выбранному маркетплейсу." error={activePickup.errors.sourceUrl}>
                  <Input
                    id={`${activeFlow}-sourceUrl`}
                    placeholder={activePickupSourceUrlPlaceholder}
                    value={activePickup.sourceUrl}
                    onChange={(event) => updatePickup({ sourceUrl: event.target.value })}
                  />
                </Field>
              </>
            )}

            {!usesMarketplacePickupGuide ? (
              <>
                {pickupPointField}
                {!paid ? marketplaceOrderPickupPointNotice : null}
              </>
            ) : null}

            {!paid ? (
              <Field
                label={
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Дополнительная информация</span>
                    <span className={fieldStateLabelClass}>По желанию</span>
                  </span>
                }
                htmlFor={`${activeFlow}-additionalInfo`}
                error={activePickup.errors.additionalInfo}
              >
                <Textarea
                  id={`${activeFlow}-additionalInfo`}
                  placeholder="Например, цвет, комплектация, комментарий к заказу или замена, если товар закончится"
                  value={activePickup.additionalInfo}
                  onChange={(event) => updatePickup({ additionalInfo: event.target.value })}
                  rows={4}
                />
              </Field>
            ) : null}

            {usesMarketplacePickupGuide || isCourierPaid ? (
              <div className="rounded-[24px] border border-[#d7e4f7] bg-white/86 px-5 py-5 text-sm leading-7 text-[#4f6688] shadow-[0_14px_28px_rgba(39,77,146,0.08)]">
                <p className="font-extrabold text-[#13345f]">Условия доставки и оплаты:</p>
                <ul className="mt-3 space-y-2">
                  {(isCourierPaid ? courierOrderTerms : activeMarketplaceGuide?.terms ?? wildberriesDeliveryTerms).map((term) => (
                    <li key={term} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4c8ce6]" />
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
                {activeMarketplaceGuide?.inspectionOption || isCourierPaid ? (
                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[18px] border border-[#d7e4f7] bg-[#f5f9ff] px-4 py-3">
                    <input type="checkbox" className="mt-1 h-4 w-4 rounded border-[#b7cff4] text-[#3b74cf]" />
                    <span className="text-sm font-semibold leading-6 text-[#13345f]">
                      {isCourierPaid ? "Хрупкий / дорогой груз. Нужно осмотреть при получении." : activeMarketplaceGuide?.inspectionOption}
                    </span>
                  </label>
                ) : null}
                {isCourierPaid ? (
                  <Field label="Укажите количество мест для осмотра" htmlFor={`${activeFlow}-inspectionCount`}>
                    <Input id={`${activeFlow}-inspectionCount`} placeholder="Укажите количество мест" />
                  </Field>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[#3f74cb]">
                  <a href="/calculator" className="underline underline-offset-4">
                    Рассчитать стоимость доставки
                  </a>
                  <span className="text-[#9bb0cf]">/</span>
                  <a href="#" className="underline underline-offset-4">
                    Договор оферты
                  </a>
                  <span className="text-[#9bb0cf]">/</span>
                  <button
                    type="button"
                    onClick={() => setIsDisclaimerOpen(true)}
                    className="font-semibold text-[#3f74cb] underline underline-offset-4"
                  >
                    Дисклеймер
                  </button>
                </div>
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[18px] border border-[#d7e4f7] bg-[#f5f9ff] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={activePickup.termsAccepted}
                    onChange={(event) =>
                      updatePickup({
                        termsAccepted: event.target.checked,
                        errors: { ...activePickup.errors, termsAccepted: "" },
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-[#b7cff4] text-[#3b74cf]"
                  />
                  <span className="text-sm font-semibold leading-6 text-[#13345f]">
                    Я ознакомился(ась) с условиями доставки, оплаты и договором оферты
                  </span>
                </label>
                {activePickup.errors.termsAccepted ? (
                  <span className="mt-2 block text-xs font-semibold text-[color:var(--danger)]">
                    {activePickup.errors.termsAccepted}
                  </span>
                ) : null}
              </div>
            ) : null}

            {!paid ? (
              <div className="rounded-[24px] border border-[#d7e4f7] bg-white/86 px-5 py-5 text-sm leading-7 text-[#4f6688] shadow-[0_14px_28px_rgba(39,77,146,0.08)]">
                <p className="font-extrabold text-[#13345f]">Условия доставки и оплаты:</p>
                <ul className="mt-3 space-y-2">
                  {linkOrderTerms.map((term) => (
                    <li key={term} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4c8ce6]" />
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[#3f74cb]">
                  <a href="#" className="underline underline-offset-4">
                    Договор оферты
                  </a>
                  <span className="text-[#9bb0cf]">/</span>
                  <button
                    type="button"
                    onClick={() => setIsDisclaimerOpen(true)}
                    className="font-semibold text-[#3f74cb] underline underline-offset-4"
                  >
                    Дисклеймер
                  </button>
                </div>
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[18px] border border-[#d7e4f7] bg-[#f5f9ff] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={activePickup.termsAccepted}
                    onChange={(event) =>
                      updatePickup({
                        termsAccepted: event.target.checked,
                        errors: { ...activePickup.errors, termsAccepted: "" },
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-[#b7cff4] text-[#3b74cf]"
                  />
                  <span className="text-sm font-semibold leading-6 text-[#13345f]">
                    Я ознакомился(ась) с условиями доставки, оплаты и договором оферты
                  </span>
                </label>
                {activePickup.errors.termsAccepted ? (
                  <span className="mt-2 block text-xs font-semibold text-[color:var(--danger)]">
                    {activePickup.errors.termsAccepted}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* <Field
              label="Пункт выдачи"
              htmlFor={`${activeFlow}-pickupPoint`}
              error={activePickup.errors.pickupPoint}
            >
              <PickupPointSelect
                id={`${activeFlow}-pickupPoint`}
                value={activePickup.pickupPoint}
                onChange={(pickupPoint) => updatePickup({ pickupPoint: pickupPoint as PickupPointId | "", errors: { ...activePickup.errors, pickupPoint: "" } })}
                placeholder="Р’С‹Р±РµСЂРёС‚Рµ РїСѓРЅРєС‚ РІС‹РґР°С‡Рё"
                options={pickupPointOptions.map((pickupPoint) => ({
                  value: pickupPoint.id,
                  label: pickupPoint.label,
                }))}
              >
                <option value="">Выберите пункт выдачи</option>
              </PickupPointSelect>
            </Field> */}

            {activePickup.errors.form ? (
              <div className="rounded-[24px] border border-[color:rgba(220,38,38,0.16)] bg-[rgba(220,38,38,0.06)] px-5 py-4 text-sm font-semibold text-[color:var(--danger)]">
                {activePickup.errors.form}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <SecondaryButton
                type="button"
                onClick={() => updatePickup({ step: 1, errors: {} })}
                className="rounded-[22px] border-white/70 bg-white/92 px-8 text-[#173862] shadow-[0_14px_28px_rgba(39,77,146,0.08)]"
              >
                Назад
              </SecondaryButton>
              <PrimaryButton
                type="submit"
                disabled={pending}
                className="rounded-[22px] bg-[linear-gradient(180deg,#4c8ce6_0%,#3b74cf_100%)] px-8 text-base font-extrabold shadow-[0_20px_36px_rgba(43,92,180,0.24)]"
              >
                {pending ? "Создаём..." : usesMarketplacePickupGuide || isCourierPaid ? "Передать заказ" : !paid ? "Сделать заказ" : "Продолжить"}
              </PrimaryButton>
            </div>
              </form>
            </div>
          </div>
        </section>
      );
    }

    if (activePickup.result) {
      return (
        <SuccessState
          order={activePickup.result}
          title="Заказ успешно оформлен!"
          description="Мы уже приняли данные и сформировали заказ. Дальше можно создать новый заказ или сразу перейти к поиску статуса."
          primaryLabel="Создать ещё заказ"
          onPrimary={() => {
            setActivePickup(createPickupState());
          }}
          secondaryLabel="Проверить статус"
          onSecondary={() => openFlow("order_lookup")}
        />
      );
    }

    return null;
  };

  const renderDeliveryFlow = () => {
    if (delivery.result) {
      return (
        <SuccessState
          order={delivery.result}
          title="Доставка успешно оформлена!"
          description="Мы сохранили номера заказов, адрес, дату и выбранный интервал доставки. Дальше можно оформить ещё одну доставку или вернуться на главный экран."
          primaryLabel="Создать ещё доставку"
          onPrimary={() => {
            setDelivery(createDeliveryState());
          }}
          secondaryLabel="На главную"
          onSecondary={() => openFlow("overview")}
        />
      );
    }

    return (
      <FlowShell
        eyebrow=""
        title="Доставка на дом"
        description="Введите номера заказов, адрес, дату и выберите удобный интервал доставки."
        stepLabel={deliveryStepLabel}
        align="center"
        className="mx-auto max-w-[820px]"
      >
        <form
          className="mx-auto max-w-[760px] space-y-8"
          onSubmit={(event) => {
            event.preventDefault();
            void submitDeliveryOrder();
          }}
        >
          <Field
            label="Введите номера заказов для доставки на дом"
            htmlFor="delivery-orderNumbers"
            error={delivery.errors.orderNumbers}
          >
            <div className="space-y-4">
              {delivery.orderNumbers.map((orderNumber, index) => {
                const isLast = index === delivery.orderNumbers.length - 1;
                return (
                  <div key={index} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_64px] sm:items-center">
                    <Input
                      id={index === 0 ? "delivery-orderNumbers" : undefined}
                      autoFocus={index === 0}
                      inputMode="numeric"
                      placeholder={index === 0 ? "669281" : `Номер заказа ${index + 1}`}
                      value={orderNumber}
                      onChange={(event) =>
                        setDelivery((current) => ({
                          ...current,
                          orderNumbers: current.orderNumbers.map((value, valueIndex) => (valueIndex === index ? event.target.value : value)),
                          errors: { ...current.errors, orderNumbers: "" },
                        }))
                      }
                    />
                    {isLast ? (
                      <button
                        type="button"
                        onClick={() =>
                          setDelivery((current) => ({
                            ...current,
                            orderNumbers: [...current.orderNumbers, ""],
                          }))
                        }
                        className="inline-flex h-14 w-14 shrink-0 items-center justify-center self-start rounded-[22px] border border-[color:rgba(196,46,160,0.24)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,244,255,0.96))] text-[30px] font-semibold leading-none text-[color:var(--accent-strong)] shadow-[0_14px_28px_rgba(123,77,255,0.12)] transition hover:border-[color:rgba(196,46,160,0.38)] hover:shadow-[0_18px_34px_rgba(123,77,255,0.18)] sm:self-auto"
                        aria-label="Добавить ещё заказ"
                      >
                        +
                      </button>
                    ) : (
                      <div className="hidden sm:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </Field>

          {hasDeliveryOrders ? (
            <>
              <Field label="Укажите адрес доставки" htmlFor="delivery-address" error={delivery.errors.deliveryAddress}>
                <Textarea
                  id="delivery-address"
                  placeholder="Укажите полный адрес с улицей, домом и квартирой"
                  className="min-h-[128px]"
                  value={delivery.deliveryAddress}
                  onChange={(event) => setDelivery((current) => ({ ...current, deliveryAddress: event.target.value }))}
                />
              </Field>

              <Field label="Укажите желаемую дату доставки" htmlFor="delivery-date" error={delivery.errors.deliveryDate}>
                <Input
                  id="delivery-date"
                  type="date"
                  value={delivery.deliveryDate}
                  onChange={(event) => setDelivery((current) => ({ ...current, deliveryDate: event.target.value }))}
                />
              </Field>

              <Field label="Выберите промежуток времени" htmlFor="delivery-timeSlot" error={delivery.errors.deliveryTimeSlot}>
                <div id="delivery-timeSlot" className="grid gap-3 sm:grid-cols-3">
                  {homeDeliveryTimeSlotValues.map((slot) => {
                    const active = delivery.deliveryTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setDelivery((current) => ({ ...current, deliveryTimeSlot: slot, errors: { ...current.errors, deliveryTimeSlot: "" } }))}
                        className={`min-h-14 rounded-[22px] border px-4 py-4 text-sm font-semibold transition ${
                          active
                            ? "border-[color:rgba(196,46,160,0.32)] bg-white text-[color:var(--foreground)] shadow-[0_16px_32px_rgba(123,77,255,0.16)]"
                            : "border-[color:var(--line)] bg-[color:var(--surface-subtle)] text-[color:var(--muted)] hover:border-[color:rgba(123,77,255,0.18)] hover:bg-white"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </>
          ) : null}

          {delivery.errors.form ? (
            <div className="rounded-[24px] border border-[color:rgba(220,38,38,0.16)] bg-[rgba(220,38,38,0.06)] px-5 py-4 text-sm font-semibold text-[color:var(--danger)]">
              {delivery.errors.form}
            </div>
          ) : null}

          {hasDeliveryOrders ? (
            <div className="flex justify-end pt-4">
              <PrimaryButton type="submit" disabled={pending} className="min-h-14 min-w-[180px] px-6">
                {pending ? "Создаём..." : "Продолжить"}
              </PrimaryButton>
            </div>
          ) : null}
        </form>
      </FlowShell>
    );
  };

  const renderLookupFlow = () => (
    <>
      <section
        className="relative overflow-hidden bg-[#4a8de7] bg-cover bg-[position:72%_center] bg-no-repeat"
        style={{ backgroundImage: "url('/brand/hero-background.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(51,114,214,0.96)_0%,rgba(86,148,232,0.82)_34%,rgba(150,198,248,0.26)_64%,rgba(255,255,255,0)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.6),transparent_17%),linear-gradient(90deg,rgba(255,255,255,0)_46%,rgba(255,255,255,0.74)_100%)]" />
        <div className="absolute -left-28 top-1/2 h-[580px] w-[580px] -translate-y-1/2 rounded-full border border-white/18" />
        <div className="absolute -left-10 bottom-[-180px] h-[440px] w-[440px] rounded-full border border-white/18" />
        <div className="absolute left-[6%] top-[56%] hidden h-36 w-44 opacity-35 lg:block">
          <LookupDotPattern />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-92px)] w-full max-w-[1320px] items-center justify-center px-4 py-16 lg:px-6 lg:py-20">
          <div className="z-10 flex w-full max-w-[980px] flex-col items-center text-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/36 bg-white/12 px-4 py-2 text-sm font-semibold text-white/92 backdrop-blur-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9fd0ff]" />
              Отслеживание отправлений
            </div>

            <h1 className="mt-6 max-w-[760px] text-4xl font-extrabold leading-[1.05] text-white drop-shadow-[0_16px_34px_rgba(20,56,120,0.22)] sm:text-5xl lg:text-[4rem]">
              Отследить
              <br />
              посылку
            </h1>

            <p className="mt-5 max-w-[720px] text-base leading-7 text-white/86 sm:text-lg">
              Введите номер заказа, чтобы сразу увидеть текущий статус доставки и карточку найденного отправления.
            </p>

            <div className="mt-10 w-full max-w-[900px] rounded-[32px] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0.14)_100%)] p-4 shadow-[0_28px_80px_rgba(28,78,160,0.22)] backdrop-blur-[22px] sm:p-5">
              <div className="mb-3 text-center">
                <span className="inline-flex items-center rounded-full border border-white/45 bg-white/14 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-white/90">
                  Поиск по номеру заказа
                </span>
              </div>

              <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_210px]">
                <label className="flex min-h-[74px] items-center gap-4 rounded-[26px] border border-white/55 bg-white px-5 shadow-[0_16px_34px_rgba(31,74,144,0.12),inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#eef5ff_0%,#dfeafb_100%)] text-[#2d62c6] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                    <LookupLensIcon />
                  </span>
                  <div className="flex min-h-[52px] min-w-0 flex-1 items-center text-left">
                    <Input
                      id="lookup-order"
                      autoFocus
                      inputMode="text"
                      placeholder="Введите номер заказа"
                      value={lookupNumber}
                      onChange={(event) => setLookupNumber(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void submitLookup();
                        }
                      }}
                      className="h-auto !border-0 bg-transparent px-0 py-0 text-[1.15rem] font-bold leading-none !text-[#163766] !shadow-none outline-none ring-0 placeholder:text-[#a3b1c7] focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0"
                    />
                  </div>
                </label>

                <PrimaryButton
                  onClick={() => void submitLookup()}
                  disabled={pending}
                  className="min-h-[74px] w-full rounded-[26px] bg-[linear-gradient(180deg,#4c8ce6_0%,#3b74cf_100%)] px-10 text-lg font-extrabold shadow-[0_20px_36px_rgba(43,92,180,0.28)]"
                >
                  {pending ? "Ищем..." : "Поиск"}
                </PrimaryButton>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {lookupChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/55 bg-white/88 px-4 py-2 text-sm font-semibold text-[#5f789d] shadow-[0_12px_26px_rgba(24,60,130,0.08)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {lookupError ? (
                <p className="mt-4 rounded-[20px] border border-[rgba(220,38,38,0.2)] bg-[rgba(255,255,255,0.76)] px-4 py-3 text-sm font-semibold text-[#c73939]">
                  {lookupError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {lookupOrders.length > 0 ? (
      <section className="relative z-10 mx-auto -mt-10 w-full max-w-[1240px] px-4 pb-20 lg:px-6">
        <div className="rounded-[34px] border border-[#dce6f4] bg-white px-5 py-6 shadow-[0_28px_60px_rgba(16,45,88,0.12)] sm:px-7 sm:py-8">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 rounded-[28px] bg-[linear-gradient(180deg,#f6faff_0%,#eef4fe_100%)] px-5 py-5 ring-1 ring-[#dbe6f5] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#5b7eb4]">Результаты поиска</p>
                <h2 className="mt-2 text-2xl font-extrabold text-[#122b52]">Найдено заказов: {lookupOrders.length}</h2>
              </div>
              <div className="inline-flex w-fit items-center rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#396dc9] shadow-[0_12px_24px_rgba(36,78,150,0.08)]">
                № {lookupOrders[0]?.orderNumber}
              </div>
            </div>

            <div className="space-y-4">
              {lookupOrders.map((order) => (
                <OrderSummaryCard key={order.id} order={order} compact hideSensitiveDetails />
              ))}
            </div>
          </div>
        </div>
      </section>
      ) : null}
    </>
  );

  const renderCancelFlow = () => (
    <section
      className="relative overflow-hidden bg-[#4a8de7] bg-cover bg-[position:72%_center] bg-no-repeat"
      style={{ backgroundImage: "url('/brand/hero-background.png')" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(51,114,214,0.96)_0%,rgba(86,148,232,0.82)_34%,rgba(150,198,248,0.26)_64%,rgba(255,255,255,0)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.54),transparent_17%),linear-gradient(90deg,rgba(255,255,255,0)_46%,rgba(255,255,255,0.72)_100%)]" />

      <div className="relative mx-auto w-full max-w-[1240px] px-4 pb-20 pt-12 lg:px-6 lg:pb-24 lg:pt-16">
        <div className="mx-auto max-w-[980px] rounded-[36px] border border-white/46 bg-[linear-gradient(180deg,rgba(237,244,255,0.96)_0%,rgba(227,238,252,0.9)_100%)] p-5 text-[#12315b] shadow-[0_30px_80px_rgba(39,77,146,0.18)] backdrop-blur-[20px] sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 border-b border-[#d9e5f8] pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4677cf]">Форма отмены заказа</p>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[#13345f] sm:text-[2.5rem]">Отменить заказ</h1>
              <p className="mt-3 max-w-[760px] text-base leading-7 text-[#58739d]">
                Введите номер заказа, присвоенный после заполнения одной из форм. Мы проверим текущий заказ и попросим подтвердить отмену.
              </p>
            </div>

            <div className="inline-flex w-fit items-center rounded-full border border-white/60 bg-white/72 px-5 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#5b7eb4] shadow-[0_12px_24px_rgba(39,77,146,0.08)]">
              Шаг 1 из 3
            </div>
          </div>

          <div className="mt-8 grid gap-5">
            <div className="rounded-[24px] border border-white/65 bg-[linear-gradient(180deg,#ffffff_0%,#eef5ff_100%)] px-5 py-5 shadow-[0_14px_28px_rgba(39,77,146,0.08)]">
              <Field label="Номер заказа" htmlFor="cancel-order" hint="Введите номер заказа, присвоенный после заполнения одной из форм." error={cancelError ?? undefined}>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="cancel-order"
                    placeholder="669281"
                    inputMode="numeric"
                    value={cancelNumber}
                    onChange={(event) => {
                      setCancelNumber(event.target.value.replace(/[^\d]/g, ""));
                      setCancelCandidate(null);
                      setCancelResult(null);
                      setCancelError(null);
                      setCancelSupportNoticeVisible(false);
                    }}
                    className="flex-1 bg-white shadow-none"
                  />
                  <PrimaryButton
                    type="button"
                    onClick={() => {
                      const parsed = numericIdSchema.safeParse(deferredCancelNumber);
                      if (!parsed.success) {
                        setCancelError(parsed.error.issues[0]?.message ?? "Введите корректный номер");
                        return;
                      }
                      setCancelSupportNoticeVisible(true);
                      setCancelError(null);
                    }}
                    disabled={pending}
                    className="rounded-[22px] bg-[linear-gradient(180deg,#4c8ce6_0%,#3b74cf_100%)] px-8 text-base font-extrabold shadow-[0_20px_36px_rgba(43,92,180,0.24)] sm:min-w-[180px]"
                  >
                    Продолжить
                  </PrimaryButton>
                </div>
              </Field>
            </div>

            {cancelSupportNoticeVisible ? (
              <div className="rounded-[24px] border border-[#b8d6ff] bg-[linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)] px-5 py-5 text-[#173862] shadow-[0_14px_28px_rgba(39,77,146,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4677cf]">Всплывающее сообщение</p>
                <p className="mt-3 text-lg font-extrabold leading-7">Если ваш заказ оформлен на нашего получателя, обратитесь в поддержку.</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-[#3f74cb]">
                  <span>Телефон: +7 (949) 854-27-85</span>
                  <span className="text-[#9bb0cf]">/</span>
                  <a href={supportTelegramUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    Написать в поддержку
                  </a>
                </div>
                <div className="mt-5 flex justify-end">
                  <PrimaryButton
                    type="button"
                    onClick={() => void submitCancelLookup()}
                    disabled={pending}
                    className="rounded-[22px] bg-[linear-gradient(180deg,#4c8ce6_0%,#3b74cf_100%)] px-8 text-base font-extrabold shadow-[0_20px_36px_rgba(43,92,180,0.24)]"
                  >
                    {pending ? "Проверяем..." : "Продолжить"}
                  </PrimaryButton>
                </div>
              </div>
            ) : null}

            {cancelCandidate ? (
              <div className="space-y-4 rounded-[24px] border border-[#d7e4f7] bg-white/86 px-5 py-5 shadow-[0_14px_28px_rgba(39,77,146,0.08)]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4677cf]">Проверка номера</p>
                  <p className="mt-3 text-xl font-extrabold text-[#13345f]">Вы уверены, что хотите отменить заказ?</p>
                </div>
                <OrderSummaryCard order={cancelCandidate} compact />
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <SecondaryButton
                    type="button"
                    onClick={() => {
                      setCancelCandidate(null);
                      setCancelSupportNoticeVisible(false);
                    }}
                    className="rounded-[22px] border-white/70 bg-white/92 px-8 text-[#173862] shadow-[0_14px_28px_rgba(39,77,146,0.08)]"
                  >
                    Нет
                  </SecondaryButton>
                  <PrimaryButton
                    type="button"
                    onClick={() => void submitCancel()}
                    disabled={pending}
                    className="rounded-[22px] bg-[linear-gradient(180deg,#ef5353_0%,#d93636_100%)] px-8 text-base font-extrabold shadow-[0_20px_36px_rgba(220,38,38,0.22)]"
                  >
                    {pending ? "Отменяем..." : "Да"}
                  </PrimaryButton>
                </div>
              </div>
            ) : null}

            {cancelResult ? (
              <div className="space-y-4 rounded-[24px] border border-[#bde7cf] bg-[linear-gradient(180deg,#ffffff_0%,#f0fff6_100%)] px-5 py-5 text-[#173862] shadow-[0_14px_28px_rgba(39,77,146,0.08)]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f9460]">Всплывающее сообщение</p>
                  <p className="mt-3 text-xl font-extrabold text-[#13345f]">Заказ отменён.</p>
                </div>
                <OrderSummaryCard order={cancelResult} compact />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );

  const renderSupportFlow = () => (
    <FlowShell
      eyebrow="Telegram support"
      title="Поддержка Сарма Экспресс"
      description="Если вопрос касается уже созданного заказа или нестандартной ситуации, откроем диалог с оператором без лишнего поиска контактов."
      align="center"
      className="mx-auto max-w-[760px]"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] bg-[color:var(--surface-subtle)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">Перед переходом</p>
          <p className="mt-3 text-base leading-8 text-[color:var(--muted)]">Подготовьте номер заказа и короткое описание проблемы. Так ответ менеджера будет быстрее.</p>
        </div>
        <div className="rounded-[28px] bg-[color:var(--surface-subtle)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">Канал связи</p>
          <p className="mt-3 text-base leading-8 text-[color:var(--muted)]">Поддержка работает в Telegram и подключается только в тех случаях, когда self-service уже недостаточно.</p>
        </div>
      </div>
      <div className="mt-6 text-center">
        <a
          href={supportTelegramUrl}
          target="_blank"
          rel="noreferrer"
          className="primary-cta inline-flex rounded-full px-7 py-3.5 text-sm font-semibold text-white"
        >
          Открыть Telegram
        </a>
      </div>
    </FlowShell>
  );

  const shipRussiaAdvantages = [
    "Без очередей и лишних действий",
    "Упаковка на месте",
    "Отслеживание каждой посылки",
    "Страхование грузов",
    "Индивидуальный подход",
  ];

  const shipRussiaPackaging = [
    "Коробки всех размеров",
    "Пузырчатая плёнка",
    "Скотч и защита груза",
    "Помощь сотрудников",
  ];

  const shipRussiaAllowed = ["Документы", "Личные вещи", "Мелкую технику", "Подарки", "Хрупкие грузы", "Сувениры (с документами)"];

  const shipRussiaForbidden = ["Оружие и взрывчатые вещества", "Жидкости и химикаты", "Продукты питания", "Алкоголь и сигареты", "Лекарства", "Деньги"];

  const shipRussiaDeliveryControl = ["Отслеживание по трек-номеру", "Уведомления о статусе", "Доставка до пункта или курьером"];

  const shipRussiaProtection = ["Страхование посылок", "Компенсация при утере или повреждении", "Спокойствие за груз"];

  const shipRussiaPayment = ["При отправке", "При получении", "Без наложенного платежа"];

  const shipRussiaSteps = [
    "Вы приносите посылку",
    "Мы проверяем и упаковываем",
    "Оформляем отправление",
    "Вы получаете трек-номер",
    "Доставка получателю",
  ];

  const renderShipRussiaFlow = () => (
    <section
      className="relative overflow-hidden bg-[#4a8de7] bg-cover bg-[position:72%_center] bg-no-repeat"
      style={{ backgroundImage: "url('/brand/hero-background.png')" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(51,114,214,0.96)_0%,rgba(86,148,232,0.82)_34%,rgba(150,198,248,0.26)_64%,rgba(255,255,255,0)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.6),transparent_17%),linear-gradient(90deg,rgba(255,255,255,0)_46%,rgba(255,255,255,0.74)_100%)]" />
      <div className="absolute -left-28 top-1/2 h-[580px] w-[580px] -translate-y-1/2 rounded-full border border-white/18" />
      <div className="absolute -left-10 bottom-[-180px] h-[440px] w-[440px] rounded-full border border-white/18" />

      <div className="relative mx-auto w-full max-w-[1320px] px-4 pb-20 pt-12 lg:px-6 lg:pb-24 lg:pt-16">
        <div className="grid gap-6">
          <section className="rounded-[36px] border border-white/44 bg-[linear-gradient(180deg,rgba(237,244,255,0.96)_0%,rgba(227,238,252,0.9)_100%)] px-6 py-8 text-[#12315b] shadow-[0_30px_80px_rgba(39,77,146,0.18)] backdrop-blur-[20px] sm:px-8 sm:py-10 lg:px-10">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="max-w-2xl">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4677cf]">Отправка по России из ДНР</p>
                <h1 className="mt-5 text-4xl font-extrabold leading-[0.95] text-[#13345f] sm:text-5xl lg:text-[4rem]">
                  Отправка посылок по
                  <br />
                  России
                </h1>
                <p className="mt-5 text-xl font-bold text-[#173862]">Быстро. Без очередей. В одном месте.</p>
                <p className="mt-4 text-base leading-8 text-[#5d789f]">
                  Отправляйте документы, вещи и технику по всей России через удобный сервис «одного окна».
                </p>
              </div>
              <div className="relative">
                <div className="relative aspect-[1.16/1]">
                  <Image
                    src="/ship-russia-main-pastel.png"
                    alt="Доставка по России в пастельных тонах"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-white/44 bg-white/95 px-6 py-7 text-[#12315b] shadow-[0_30px_70px_rgba(39,77,146,0.16)] backdrop-blur-xl sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d88b2]">Почему выбирают нас</p>
                <h2 className="mt-4 text-3xl font-extrabold leading-none text-[#123763] sm:text-4xl">Сервис без очередей и лишней суеты</h2>
                <div className="mt-6 grid gap-3">
                  {shipRussiaAdvantages.map((item) => (
                    <div key={item} className="rounded-[22px] bg-[linear-gradient(180deg,#f6faff_0%,#edf4fe_100%)] px-4 py-3 text-base font-semibold text-[#173862] ring-1 ring-[#dbe6f5]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="relative aspect-[1.16/1]">
                  <Image
                    src="/ship-russia-pastel-packing-station.png"
                    alt="Станция упаковки в пастельных тонах"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-white/44 bg-white/95 px-6 py-7 text-[#12315b] shadow-[0_30px_70px_rgba(39,77,146,0.16)] backdrop-blur-xl sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d88b2]">Подготовка отправления</p>
                <h2 className="mt-4 text-3xl font-extrabold leading-none text-[#123763] sm:text-4xl">Мы полностью подготовим вашу посылку к отправке</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {shipRussiaPackaging.map((item) => (
                    <div key={item} className="rounded-[24px] border border-[#dce6f4] bg-[linear-gradient(180deg,#ffffff_0%,#f6faff_100%)] px-4 py-4 shadow-[0_14px_28px_rgba(39,77,146,0.08)]">
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#7a92b7]">В наличии</p>
                      <p className="mt-3 text-lg font-bold text-[#173862]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="relative aspect-[1.16/1]">
                  <Image
                    src="/ship-russia-purple-packing-materials.png"
                    alt="Упаковочные материалы с фиолетовыми акцентами"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-white/44 bg-white/95 px-6 py-7 text-[#12315b] shadow-[0_30px_70px_rgba(39,77,146,0.16)] backdrop-blur-xl sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d88b2]">Что можно отправить</p>
                <h2 className="mt-4 text-3xl font-extrabold leading-none text-[#123763] sm:text-4xl">Допустимые категории отправлений</h2>
                <div className="mt-6 grid gap-3">
                  {shipRussiaAllowed.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-[22px] bg-[linear-gradient(180deg,#f6faff_0%,#edf4fe_100%)] px-4 py-3 ring-1 ring-[#dbe6f5]">
                      <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4677cf] shadow-[0_8px_18px_rgba(39,77,146,0.08)]">
                        ✓
                      </span>
                      <span className="text-base font-semibold text-[#173862]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="relative aspect-[1.16/1]">
                  <Image
                    src="/ship-russia-allowed-items-111.png"
                    alt="Разрешённые категории отправлений"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-[rgba(239,68,68,0.2)] bg-[linear-gradient(180deg,rgba(255,248,248,0.98)_0%,rgba(255,255,255,0.95)_100%)] px-6 py-7 text-[#12315b] shadow-[0_30px_70px_rgba(140,50,66,0.12)] backdrop-blur-xl sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c2410c]">Что нельзя отправлять</p>
                <h2 className="mt-4 text-3xl font-extrabold leading-none text-[#123763] sm:text-4xl">Запрещённые категории</h2>
                <div className="mt-6 grid gap-3">
                  {shipRussiaForbidden.map((item) => (
                    <div key={item} className="rounded-[22px] border border-[rgba(239,68,68,0.14)] bg-white px-4 py-3 text-base font-semibold text-[#173862] shadow-[0_12px_24px_rgba(140,50,66,0.06)]">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="relative aspect-[1.16/1]">
                  <Image
                    src="/ship-russia-restricted-items-222.png"
                    alt="Ограничения на отправку"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-white/44 bg-white/95 px-6 py-7 text-[#12315b] shadow-[0_30px_70px_rgba(39,77,146,0.16)] backdrop-blur-xl sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d88b2]">Контроль доставки</p>
                <h2 className="mt-4 text-3xl font-extrabold leading-none text-[#123763] sm:text-4xl">Полный контроль и защита отправлений</h2>
                <div className="mt-6 grid gap-4">
                  <div className="rounded-[24px] bg-[linear-gradient(180deg,#f6faff_0%,#edf4fe_100%)] p-5 ring-1 ring-[#dbe6f5]">
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#7a92b7]">Полный контроль доставки</p>
                    <ul className="mt-4 space-y-3 text-base leading-7 text-[#173862]">
                      {shipRussiaDeliveryControl.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[24px] bg-[linear-gradient(180deg,#f6faff_0%,#edf4fe_100%)] p-5 ring-1 ring-[#dbe6f5]">
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#7a92b7]">Защита ваших отправлений</p>
                    <ul className="mt-4 space-y-3 text-base leading-7 text-[#173862]">
                      {shipRussiaProtection.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[24px] border border-[rgba(245,194,71,0.34)] bg-[rgba(255,245,215,0.9)] p-5 shadow-[0_14px_28px_rgba(39,77,146,0.06)]">
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#b45309]">Удобная оплата</p>
                    <ul className="mt-4 space-y-3 text-base leading-7 text-[#173862]">
                      {shipRussiaPayment.map((item) => (
                        <li key={item}>{item === "Без наложенного платежа" ? "❗️ Без наложенного платежа" : `• ${item}`}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="relative min-h-[320px] lg:min-h-full">
                <div className="relative h-full min-h-[320px]">
                  <Image
                    src="/ship-russia-tracking-protection.png"
                    alt="Доставка под защитой и отслеживанием"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-white/44 bg-white/95 px-6 py-7 text-[#12315b] shadow-[0_30px_70px_rgba(39,77,146,0.16)] backdrop-blur-xl sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d88b2]">Как это работает</p>
                <h2 className="mt-4 text-3xl font-extrabold leading-none text-[#123763] sm:text-4xl">Путь отправления шаг за шагом</h2>
                <div className="mt-6 grid gap-3">
                  {shipRussiaSteps.map((item, index) => (
                    <div key={item} className="flex items-center gap-4 rounded-[24px] bg-[linear-gradient(180deg,#f6faff_0%,#edf4fe_100%)] px-4 py-4 ring-1 ring-[#dbe6f5]">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4677cf] shadow-[0_10px_22px_rgba(39,77,146,0.08)]">
                        {index + 1}
                      </span>
                      <span className="text-base font-semibold text-[#173862]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex min-h-[340px] items-center justify-center lg:min-h-full">
                <div className="relative h-[360px] w-full max-w-[430px] sm:h-[390px] lg:h-[430px] lg:max-w-[470px]">
                  <Image
                    src="/ship-russia-step-by-step-photoroom.png"
                    alt="Процесс доставки шаг за шагом"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-white/44 bg-white/95 px-6 py-7 text-[#12315b] shadow-[0_30px_70px_rgba(39,77,146,0.16)] backdrop-blur-xl sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6d88b2]">Контакты</p>
                <h2 className="mt-4 text-3xl font-extrabold leading-none text-[#123763] sm:text-4xl">Остались вопросы?</h2>
                <div className="mt-6 grid gap-3">
                  <div className="rounded-[22px] bg-[linear-gradient(180deg,#f6faff_0%,#edf4fe_100%)] px-4 py-4 ring-1 ring-[#dbe6f5]">
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#7a92b7]">Написать прямо сейчас</p>
                    <p className="mt-2 text-base leading-7 text-[#173862]">Свяжитесь с нами в Telegram и получите консультацию по отправке.</p>
                  </div>
                  <div className="rounded-[22px] bg-[linear-gradient(180deg,#f6faff_0%,#edf4fe_100%)] px-4 py-4 ring-1 ring-[#dbe6f5]">
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#7a92b7]">Позвонить</p>
                    <p className="mt-2 text-xl font-bold text-[#173862]">+7 (949) 854-27-85</p>
                  </div>
                  <div className="rounded-[22px] border border-[rgba(245,194,71,0.34)] bg-[rgba(255,245,215,0.9)] px-4 py-4 shadow-[0_14px_28px_rgba(39,77,146,0.06)]">
                    <p className="text-lg font-bold text-[#173862]">Отправьте посылку уже сегодня</p>
                    <p className="mt-2 text-base leading-7 text-[#173862]">Быстро оформим, надежно упакуем и доставим по России.</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="relative aspect-[1.16/1]">
                  <Image
                    src="/ship-russia-contact-333.png"
                    alt="Контакты и доставка"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 42vw"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );

  const renderBusinessView = () => {
    const businessFeatures = [
      "Ежедневные заборы",
      "Персональный менеджер",
      "Документы для бухгалтерии",
      "Склад и пункты выдачи",
    ];

    const audienceCards = [
      {
        title: "Интернет-магазинам",
        text: "Забор заказов со склада, отправка по городам, понятные статусы и документы по итогам периода.",
      },
      {
        title: "Оптовым клиентам",
        text: "Партии от коробок до палет, сборные грузы и отдельные машины под регулярные отгрузки.",
      },
      {
        title: "Производителям",
        text: "Доставка продукции партнерам, маркетплейсам, магазинам и региональным складам.",
      },
    ];

    const connectionSteps = [
      "Оставляете заявку и параметры груза",
      "Получаете расчет и варианты доставки",
      "Согласуем договор, документы и график",
      "Забираем груз и ведем отправку",
    ];

    const businessChecklist = [
      "Сборные грузы и полная загрузка",
      "Забор со склада или производства",
      "Безналичная оплата и закрывающие",
      "Для юрлиц и ИП",
      "Персональное сопровождение",
    ];

    const conditionCards = [
      { title: "Договор", text: "Работаем с юрлицами и ИП, готовим закрывающие документы." },
      { title: "Расчет", text: "Ставка зависит от маршрута, объема, веса и частоты отправок." },
      { title: "Забор", text: "Возможен регулярный забор со склада по согласованному графику." },
      { title: "Контроль", text: "Менеджер сопровождает отправки и помогает с изменениями." },
    ];

    const inputClass =
      "min-h-12 w-full rounded-2xl border border-[#dbe6f4] bg-[#fbfdff] px-4 text-sm font-bold text-[#173862] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none placeholder:text-[#95a9c8] focus:border-[#8cb7ff] focus:ring-4 focus:ring-[#8cb7ff]/20";
    const labelClass = "mb-2 block text-xs font-black text-[#536f99]";

    return (
      <section className="relative overflow-hidden bg-[#edf2f8] text-[#12243f]">
        <div
          className="relative overflow-visible bg-[#3f84e6] bg-cover bg-[position:70%_center] bg-no-repeat"
          style={{ backgroundImage: "url('/brand/hero-background.png')" }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(40,106,208,0.96)_0%,rgba(58,132,228,0.82)_39%,rgba(139,194,248,0.38)_72%,rgba(255,255,255,0.06)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.42),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(10,47,112,0.1))]" />

          <div className="relative mx-auto w-full max-w-[1240px] px-4 pb-0 pt-12 lg:px-6 lg:pt-16">
            <div className="max-w-[760px] pb-28 sm:pb-32 lg:pb-36">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/34 bg-white/14 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-[#9fd0ff]" />
                Для интернет-магазинов, опта и регулярных отправок
              </div>

              <h1 className="mt-6 max-w-[760px] text-4xl font-extrabold leading-[1.02] text-white drop-shadow-[0_16px_34px_rgba(20,56,120,0.24)] sm:text-5xl lg:text-[4.35rem]">
                Доставка для бизнеса без лишней операционки
              </h1>
              <p className="mt-5 max-w-[660px] text-lg font-bold leading-8 text-white/92 sm:text-xl">
                Забираем партии, доставляем по России, работаем по договору и помогаем держать сроки на регулярных маршрутах.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#business-request"
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2f57c0_0%,#2245a9_100%)] px-7 text-base font-extrabold text-white shadow-[0_16px_35px_rgba(24,60,142,0.3)] transition hover:-translate-y-0.5"
                >
                  Получить условия
                </a>
                <a
                  href="#business-steps"
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-white px-7 text-base font-extrabold text-[#173862] shadow-[0_16px_34px_rgba(16,45,88,0.16)] transition hover:-translate-y-0.5"
                >
                  Как подключиться
                </a>
              </div>
            </div>

            <div className="relative z-10 -mb-14 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {businessFeatures.map((feature, index) => (
                <article
                  key={feature}
                  className="group relative flex min-h-[136px] flex-col items-center justify-center overflow-hidden rounded-[18px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-6 py-6 text-center shadow-[0_22px_46px_rgba(16,45,88,0.14)] ring-1 ring-[#dce6f4]/80"
                >
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white" />
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf4ff] text-sm font-black text-[#2c72d8] shadow-[inset_0_0_0_1px_rgba(44,114,216,0.06)]">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 max-w-[210px] text-[17px] font-extrabold leading-6 text-[#102a4e]">{feature}</h3>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-24 lg:px-6">
          <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#356ac8]">Кому подойдет</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#102a4e] sm:text-4xl">
                Логистика для компаний, которым важна регулярность
              </h2>
            </div>
          </section>

          <section className="mt-7 grid gap-5 md:grid-cols-3">
            {audienceCards.map((card) => (
              <article key={card.title} className="rounded-[8px] bg-white p-6 shadow-[0_24px_50px_rgba(16,45,88,0.1)] ring-1 ring-[#dce6f4]">
                <h3 className="text-xl font-extrabold text-[#102a4e]">{card.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-[#58739d]">{card.text}</p>
              </article>
            ))}
          </section>

          <section id="business-steps" className="mt-8 rounded-[8px] bg-[#123763] p-6 text-white shadow-[0_24px_50px_rgba(16,45,88,0.16)] lg:p-7">
            <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-stretch">
              <div className="flex flex-col justify-center">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9fd0ff]">Как подключиться</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight">Начать можно с одной отгрузки</h2>
                <p className="mt-4 text-sm font-semibold leading-7 text-white/78">
                  Проверяем маршрут, считаем ставку, согласуем график забора и закрепляем условия для повторных отправок.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {connectionSteps.map((step, index) => (
                  <article key={step} className="rounded-[8px] bg-white p-4 text-[#173862] shadow-[0_16px_34px_rgba(7,24,50,0.14)]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f72d8] text-sm font-black text-white">
                      {index + 1}
                    </span>
                    <p className="mt-4 text-sm font-extrabold leading-5">{step}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="business-request" className="mt-8 grid gap-6 lg:grid-cols-[0.94fr_1.06fr]">
            <div className="rounded-[8px] bg-[#16477f] p-7 text-white shadow-[0_24px_50px_rgba(16,45,88,0.16)]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9fd0ff]">Заявка для бизнеса</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Получите расчет и условия за 30 минут</h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-white/80">
                Опишите формат отправок: направление, примерный объем, частоту и требования к документам. Менеджер вернется с понятным вариантом работы.
              </p>

              <div className="mt-6 grid gap-3">
                {businessChecklist.map((item, index) => (
                  <div
                    key={item}
                    className={`flex min-h-12 items-center gap-3 rounded-[8px] px-4 text-sm font-bold ${
                      index < 3 ? "bg-white text-[#173862]" : "bg-white/10 text-white/88"
                    }`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${index < 3 ? "bg-[#2f72d8] text-white" : "bg-white/18 text-white"}`}>
                      ✓
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <form
              className="rounded-[8px] bg-white p-6 shadow-[0_24px_50px_rgba(16,45,88,0.1)] ring-1 ring-[#dce6f4] sm:p-7"
              onSubmit={(event) => event.preventDefault()}
            >
              <h2 className="text-3xl font-extrabold text-[#102a4e]">Заявка онлайн</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelClass}>Компания</span>
                  <input className={inputClass} type="text" placeholder="ООО Сибирь" />
                </label>
                <label>
                  <span className={labelClass}>Контакт</span>
                  <input className={inputClass} type="tel" placeholder="+7 999 000 00 00" />
                </label>
                <label>
                  <span className={labelClass}>Откуда</span>
                  <input className={inputClass} type="text" placeholder="Иркутск" />
                </label>
                <label>
                  <span className={labelClass}>Куда</span>
                  <input className={inputClass} type="text" placeholder="Москва" />
                </label>
                <label>
                  <span className={labelClass}>Формат</span>
                  <select className={inputClass} defaultValue="regular">
                    <option value="regular">Регулярные отправки</option>
                    <option value="ltl">Сборные грузы</option>
                    <option value="ftl">Полная загрузка</option>
                    <option value="marketplaces">Маркетплейсы</option>
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Частота</span>
                  <select className={inputClass} defaultValue="weekly">
                    <option value="daily">Ежедневно</option>
                    <option value="weekly">Еженедельно</option>
                    <option value="monthly">Несколько раз в месяц</option>
                    <option value="once">Разовая отправка</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 block">
                <span className={labelClass}>Комментарий</span>
                <textarea
                  className={`${inputClass} min-h-[116px] resize-none py-4`}
                  placeholder="Вес, объем, тип груза, требования к забору и документам"
                />
              </label>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2f72d8_0%,#1f58c7_100%)] px-8 text-base font-extrabold text-white shadow-[0_16px_35px_rgba(24,60,142,0.24)] transition hover:-translate-y-0.5"
                >
                  Отправить заявку
                </button>
                <p className="text-xs font-semibold leading-5 text-[#7d91b2]">
                  Нажимая кнопку, вы соглашаетесь на обработку данных для расчета перевозки.
                </p>
              </div>
            </form>
          </section>

          <section className="mt-8 rounded-[8px] bg-white p-6 shadow-[0_24px_50px_rgba(16,45,88,0.1)] ring-1 ring-[#dce6f4] lg:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#356ac8]">Важные условия</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {conditionCards.map((card) => (
                <article key={card.title} className="rounded-[8px] bg-[#f6f9ff] p-5">
                  <h3 className="text-base font-extrabold text-[#173862]">{card.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#58739d]">{card.text}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    );
  };

  const renderMainContent = () => {
    if (activeFlow === "overview") return renderOverview();
    if (activeFlow === "business") return renderBusinessView();
    if (activeFlow === "pickup_standard" || activeFlow === "pickup_paid") return renderPickupFlow();
    if (activeFlow === "home_delivery") return renderDeliveryFlow();
    if (activeFlow === "order_lookup") return renderLookupFlow();
    if (activeFlow === "cancel_order") return renderCancelFlow();
    if (activeFlow === "ship_russia") return renderShipRussiaFlow();
    return renderSupportFlow();
  };

  return (
    <main
      className={`mx-auto flex min-h-screen w-full flex-col ${
        useSarmaChrome ? "max-w-none bg-[#edf2f8] pb-12 pt-0" : "max-w-[1440px] px-4 pb-12 pt-4 sm:px-6 lg:px-8"
      }`}
    >
      {useSarmaChrome ? (
        <SarmaExpressHeader
          onNavigate={handleSarmaHeaderNavigate}
          activeItem={
            useSarmaLookupChrome
              ? "tracking"
              : useSarmaCancelChrome
                ? "cancel-order"
                : useSarmaBusinessChrome
                  ? "business"
                  : useSarmaShipRussiaChrome
                    ? "russia"
                    : "internet-delivery"
          }
        />
      ) : (
      <header
        className={`soft-card sticky top-4 z-40 rounded-[28px] px-5 py-4 backdrop-blur transition-[transform,opacity,box-shadow] duration-300 ease-out ${
          !lockMainHeaderVisible && isHeaderHidden ? "pointer-events-none opacity-0 shadow-none" : "opacity-100"
        }`}
        style={{
          transform:
            !lockMainHeaderVisible && isHeaderHidden ? "translateY(calc(-100% - 1rem)) scale(0.95)" : "translateY(0) scale(1)",
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => openFlow("overview")} className="flex items-center gap-3 rounded-full">
            <BrandMark />
            <SarmaExpressLogo compact />
            <span className="hidden">
              <span className="font-serif font-normal text-[#1a2e35]">Сарма</span>
              <span className="font-serif font-normal text-[#c0176b]">Экспресс</span>
            </span>
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => openFlow("ship_russia")}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(16,185,129,0.18)] bg-[rgba(16,185,129,0.08)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:-translate-y-0.5 hover:border-[rgba(16,185,129,0.28)] hover:shadow-[0_10px_24px_rgba(16,185,129,0.1)]"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm shadow-[0_8px_18px_rgba(84,58,128,0.08)]">
                🚚
              </span>
              <span className="hidden lg:inline">Отправить по РФ</span>
            </button>

            <button
              type="button"
              onClick={() => openFlow("order_lookup")}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:-translate-y-0.5 hover:border-[rgba(59,130,246,0.3)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.1)]"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm shadow-[0_8px_18px_rgba(84,58,128,0.08)]">
                ⌕
              </span>
              <span className="hidden sm:inline">Отследить</span>
            </button>

            <a
              href={supportTelegramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(196,46,160,0.14)] bg-[linear-gradient(135deg,rgba(212,20,124,0.12),rgba(176,23,130,0.08))] px-4 py-2 text-sm font-semibold text-[color:var(--accent-strong)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(196,46,160,0.16)]"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-base shadow-[0_8px_18px_rgba(84,58,128,0.08)]">
                ↗
              </span>
              <span className="hidden sm:inline">Поддержка</span>
            </a>
          </div>
        </div>
      </header>
      )}

      <div className={`${useSarmaChrome ? "mt-0 flex-1" : "mt-8 flex-1"}`}>{renderMainContent()}</div>

      {isDisclaimerOpen ? <DisclaimerModal onClose={() => setIsDisclaimerOpen(false)} /> : null}
    </main>
  );
}
