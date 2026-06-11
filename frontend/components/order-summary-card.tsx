import { humanizeMarketplace, type OrderRecord } from "shared";

const statusLabels: Record<OrderRecord["status"], string> = {
  CREATED: "Создан",
  PROCESSING: "В обработке",
  READY_FOR_PICKUP: "Готов к выдаче",
  OUT_FOR_DELIVERY: "Доставляется",
  COMPLETED: "Завершен",
  CANCELLED: "Отменен",
};

interface OrderSummaryCardProps {
  order: OrderRecord;
  compact?: boolean;
  hideSensitiveDetails?: boolean;
}

export function OrderSummaryCard({ order, compact = false, hideSensitiveDetails = false }: OrderSummaryCardProps) {
  const primaryStatusLabel = order.crmStageName ?? statusLabels[order.status];
  const showLocalStatus = Boolean(order.crmStageName);
  const customerName = [order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ") || "Клиент";
  const isTrackingPickupOrder =
    order.orderType === "pickup_paid" &&
    (order.marketplace === "cdek" || order.marketplace === "5post" || order.marketplace === "dpd" || order.marketplace === "avito");
  const isHomeDelivery = order.orderType === "home_delivery";
  const trackingPickupLabel =
    order.marketplace === "cdek"
      ? "Получение CDEK"
      : order.marketplace === "5post"
        ? "Получение 5POST"
        : order.marketplace === "dpd"
          ? "Получение DPD"
          : "Получение Avito";

  return (
    <article className="rounded-[32px] border border-[color:var(--line)] bg-white/96 p-6 shadow-[0_24px_44px_rgba(68,42,112,0.08)]">
      {order.crmSyncState === "failed" ? (
        <div className="mb-5 rounded-[22px] border border-[rgba(220,38,38,0.14)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-sm font-medium text-[color:var(--danger)]">
          Заказ сохранен локально, но Bitrix24 сейчас недоступен. До восстановления CRM показываем локальный статус.
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex rounded-full bg-[color:var(--surface-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-strong)]">
            Заказ №{order.orderNumber}
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-3xl leading-none text-[color:var(--foreground)]">
            {primaryStatusLabel}
          </h3>
          <p className="text-sm leading-7 text-[color:var(--muted)]">
            {order.orderType === "home_delivery" ? "Курьерская доставка до двери" : "Самовывоз через пункт выдачи"}
          </p>
          {showLocalStatus ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-strong)]">
              Локальный статус: {statusLabels[order.status]}
            </p>
          ) : null}
        </div>
        <div className="rounded-full bg-[color:var(--surface-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-strong)]">
          {humanizeMarketplace(order.marketplace)}
        </div>
      </div>

      <dl className={`mt-5 grid gap-4 ${hideSensitiveDetails ? "" : compact ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {hideSensitiveDetails ? null : (
          <div className="rounded-[24px] bg-[color:var(--surface-subtle)] p-4">
            <dt className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">Клиент</dt>
            <dd className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">{customerName}</dd>
            <dd className="mt-1 text-sm text-[color:var(--muted)]">{order.customer.phone}</dd>
          </div>
        )}
        <div className="rounded-[24px] bg-[color:var(--surface-subtle)] p-4">
          <dt className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">Логистика</dt>
          <dd className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">{order.deliveryAddress ?? order.pickupAddress}</dd>
        </div>
        {hideSensitiveDetails ? null : (
          <div className="rounded-[24px] bg-[color:var(--surface-subtle)] p-4">
            <dt className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
              {isTrackingPickupOrder ? trackingPickupLabel : isHomeDelivery ? "Дата и слот" : "Сумма и товары"}
            </dt>
            <dd className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
              {isTrackingPickupOrder
                ? order.trackingNumber ?? order.shipmentNumber ?? "Уточняется"
                : isHomeDelivery
                  ? order.deliveryDate ?? "Уточняется"
                  : order.totalAmount
                    ? `${order.totalAmount.toLocaleString("ru-RU")} ₽`
                    : "По ссылке"}
            </dd>
            <dd className="mt-1 text-sm text-[color:var(--muted)]">
              {isTrackingPickupOrder
                ? `Код: ${order.pickupCode ?? "не указан"}`
                : isHomeDelivery
                  ? order.deliveryTimeSlot ?? "Интервал не выбран"
                  : order.itemCount
                    ? `${order.itemCount} шт.`
                    : "Уточняется"}
            </dd>
          </div>
        )}
      </dl>

      {!hideSensitiveDetails && isHomeDelivery && order.relatedOrderNumbers.length > 0 ? (
        <div className="mt-5 rounded-[26px] bg-[color:var(--surface-subtle)] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">Номера заказов</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">{order.relatedOrderNumbers.join(", ")}</p>
        </div>
      ) : null}

      {!hideSensitiveDetails && order.productPreview ? (
        <div className="mt-5 rounded-[26px] border border-[color:var(--line)] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">Распознанный товар</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">{order.productPreview.title}</p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{order.productPreview.parserMessage}</p>
        </div>
      ) : null}

      {!hideSensitiveDetails && order.sourceUrl ? (
        <div className="mt-5 rounded-[26px] bg-[color:var(--surface-subtle)] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted)]">Ссылка на товар</p>
          <a href={order.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm font-semibold text-[color:var(--accent-strong)]">
            {order.sourceUrl}
          </a>
        </div>
      ) : null}
    </article>
  );
}
