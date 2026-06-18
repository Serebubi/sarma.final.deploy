import Image from "next/image";
import Script from "next/script";

import { homeDeliveryMarketplaceId, humanizeMarketplace, marketplaces, type OrderRecord } from "shared";

import { OrderSummaryCard } from "@/components/order-summary-card";

const sampleOrder: OrderRecord = {
  id: "87dc2d49-2c2d-48b5-9e81-a30f26bd4511",
  orderNumber: "669281",
  orderType: "pickup_standard",
  marketplace: "wildberries",
  status: "CREATED",
  pickupAddress: "Грушевского, 8",
  pickupPoint: "grushevskogo_mariupol",
  customer: {
    firstName: "Серебан",
    lastName: "К.",
    phone: "+79997776655",
  },
  relatedOrderNumbers: [],
  itemCount: 1,
  totalAmount: 1000,
  trackingNumber: null,
  shipmentNumber: null,
  senderName: null,
  transportCompany: null,
  pickupCode: null,
  size: null,
  sourceUrl: "https://www.wildberries.ru/catalog/12473723/detail.aspx",
  additionalInfo: null,
  deliveryAddress: null,
  deliveryDate: null,
  deliveryTimeSlot: null,
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
};

const deliveryOrder: OrderRecord = {
  ...sampleOrder,
  orderNumber: "669282",
  orderType: "home_delivery",
  marketplace: homeDeliveryMarketplaceId,
  pickupPoint: null,
  relatedOrderNumbers: ["669281", "669283"],
  deliveryAddress: "Мариуполь, проспект Ленина, 11",
  sourceUrl: null,
  deliveryDate: "2026-03-28",
  deliveryTimeSlot: "12:00-15:00",
  productPreview: null,
};

function ShowcaseCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-[30px] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">{eyebrow}</p>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[color:var(--foreground)]">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--muted)]">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function DesignCapturePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" />

      <section className="glass-panel rounded-[34px] px-6 py-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative h-20 w-20 overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#ff2d7a,#7a00ff)] p-1 shadow-[0_20px_40px_rgba(122,0,255,0.18)]">
              <Image src="/brand/sarma-express-logo-cropped.png" alt="Сарма Экспресс" fill className="rounded-[24px] object-contain" priority />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">Сарма Экспресс design capture</p>
              <h1 className="font-[family-name:var(--font-display)] text-4xl text-[color:var(--foreground)]">Коммерческий UI handoff для MVP</h1>
              <p className="max-w-3xl text-sm leading-7 text-[color:var(--muted)]">
                Один длинный холст с ключевыми состояниями интерфейса: домашний экран, карточки маркетплейсов, заказ по ссылке, самостоятельный заказ через QR, доставка на дом и status/cancel flow.
              </p>
            </div>
          </div>
          <div className="rounded-[26px] bg-white/88 px-5 py-4 shadow-[0_18px_40px_rgba(122,0,255,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]">Пункт выдачи</p>
            <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">Грушевского, 8</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">Docs-first логика, Bitrix-ready contracts, mobile-first UI.</p>
          </div>
        </div>
      </section>

      <ShowcaseCard eyebrow="Home" title="Главный экран и вход в сценарии" description="Все действия собраны в одной панели: пользователь сразу видит адрес, шесть основных действий и ориентиры по продукту.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Сделать заказ по ссылке", "Новый заказ с отправкой ссылки на товар."],
            ["Найти заказ", "Проверка по numeric order number."],
            ["Самостоятельный заказ", "QR/штрих-код и предупреждение по сроку действия."],
            ["Доставка на дом", "Номера заказов, адрес, дата и выбор временного интервала для курьера."],
            ["Отменить заказ", "Проверка перед сменой статуса."],
            ["Поддержка", "Переход в Telegram без поиска контакта."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[24px] border border-[color:var(--line)] bg-white/88 p-5">
              <p className="text-xl font-semibold text-[color:var(--foreground)]">{title}</p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{text}</p>
            </div>
          ))}
        </div>
      </ShowcaseCard>

      <ShowcaseCard eyebrow="Marketplace cards" title="Нормализованные карточки маркетплейсов" description="Одинаковые контейнеры, единая высота и визуальное разделение smart/fallback сценариев.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {marketplaces.map((marketplace) => (
            <div key={marketplace.id} className="rounded-[24px] border border-[color:var(--line)] bg-white/88 p-4">
              <div className="flex h-16 items-center justify-center rounded-[18px] bg-[color:var(--surface-soft)] px-3">
                <Image src={`/marketplaces/${marketplace.asset}`} alt={humanizeMarketplace(marketplace.id)} width={132} height={40} className="max-h-10 w-auto object-contain" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[color:var(--foreground)]">{humanizeMarketplace(marketplace.id)}</p>
                <span className="rounded-full bg-[color:var(--surface-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--muted)]">
                  {marketplace.parserMode === "supported" ? "smart" : "manual"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ShowcaseCard>

      <div className="grid gap-8 xl:grid-cols-2">
        <ShowcaseCard eyebrow="Pickup standard" title="Сделать заказ по ссылке" description="Обновленный flow: стандартный заказ теперь принимает ссылку на товар вместо QR.">
          <div className="rounded-[28px] border border-[color:var(--line)] bg-white/90 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[20px] bg-[color:var(--surface-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">Шаг 1</p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">Выбор маркетплейса</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">Карточка Wildberries выбрана и подсвечена.</p>
              </div>
              <div className="rounded-[20px] bg-[color:var(--surface-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">Шаг 2</p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">Форма + URL</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">Имя, фамилия, телефон, количество, сумма и ссылка на карточку товара.</p>
              </div>
            </div>
            <OrderSummaryCard order={sampleOrder} />
          </div>
        </ShowcaseCard>

        <ShowcaseCard eyebrow="Paid order" title="Самостоятельный заказ" description="Сценарий самостоятельного заказа сохраняет предупреждение по времени действия QR и file-upload состояние.">
          <div className="space-y-4 rounded-[28px] border border-[color:var(--line)] bg-white/90 p-5">
            <div className="rounded-[24px] border border-[color:rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.08)] p-5 text-sm leading-7 text-[color:var(--foreground)]">
              QR/штрих-код действует 24 часа. Не отправляйте код с 18:00 до 01:00.
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[20px] bg-[color:var(--surface-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">Upload state</p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">QR-файл прикреплен</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">Используется отдельный input с валидацией JPG/PNG/PDF до 10 MB.</p>
              </div>
              <div className="rounded-[20px] bg-[color:var(--surface-soft)] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">Result state</p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">Заказ создан</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">Показывается номер заказа и статус сразу после submit.</p>
              </div>
            </div>
          </div>
        </ShowcaseCard>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <ShowcaseCard eyebrow="Home delivery" title="Доставка на дом по существующим заказам" description="Курьерский сценарий собирает номера заказов, адрес, дату и выбранный интервал доставки без ссылки на товар.">
          <div className="space-y-4 rounded-[28px] border border-[color:var(--line)] bg-white/90 p-5">
            <OrderSummaryCard order={deliveryOrder} />
          </div>
        </ShowcaseCard>

        <ShowcaseCard eyebrow="Status & cancel" title="Поиск, статусы и отмена" description="Поиск по order number и отдельное подтверждение на отмену собраны в самостоятельные панели.">
          <div className="space-y-4 rounded-[28px] border border-[color:var(--line)] bg-white/90 p-5">
            <div className="rounded-[20px] bg-[color:var(--surface-soft)] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">Статусы</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["CREATED", "PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"].map((status) => (
                  <span key={status} className="rounded-full border border-[color:var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--foreground)]">
                    {status}
                  </span>
                ))}
              </div>
            </div>
            <OrderSummaryCard order={{ ...sampleOrder, status: "CANCELLED", orderNumber: "669283" }} compact />
          </div>
        </ShowcaseCard>
      </div>
    </main>
  );
}
