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

  const detailCardClass = "rounded-[20px] bg-[linear-gradient(180deg,#f8fbff_0%,#edf5ff_100%)] p-4 ring-1 ring-[#dce6f4]";

  return (
    <article className="rounded-[24px] border border-[#dce6f4] bg-white p-6 text-[#173862] shadow-[0_24px_50px_rgba(16,45,88,0.1)]">
      {order.crmSyncState === "failed" ? (
        <div className="mb-5 rounded-[18px] border border-[#f0b6b6] bg-[#fff1f1] px-4 py-3 text-sm font-bold leading-6 text-[#d33434]">
          Заказ сохранен локально, но Bitrix24 сейчас недоступен. До восстановления CRM показываем локальный статус.
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex rounded-full bg-[#edf5ff] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#356ac8]">
            Заказ №{order.orderNumber}
          </div>
          <h3 className="text-3xl font-extrabold leading-none text-[#102a4e]">
            {primaryStatusLabel}
          </h3>
          <p className="text-sm font-semibold leading-7 text-[#58739d]">
            {order.orderType === "home_delivery" ? "Курьерская доставка до двери" : "Самовывоз через пункт выдачи"}
          </p>
        </div>
        <div className="rounded-full bg-[#edf5ff] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#356ac8]">
          {humanizeMarketplace(order.marketplace)}
        </div>
      </div>

      <dl className={`mt-5 grid gap-4 ${hideSensitiveDetails ? "" : compact ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {hideSensitiveDetails ? null : (
          <div className={detailCardClass}>
            <dt className="text-xs font-black uppercase tracking-[0.24em] text-[#7a92b7]">Клиент</dt>
            <dd className="mt-2 text-sm font-extrabold text-[#173862]">{customerName}</dd>
            <dd className="mt-1 text-sm font-semibold text-[#7d91b2]">{order.customer.phone}</dd>
          </div>
        )}
      </dl>

      {!hideSensitiveDetails && isHomeDelivery && order.relatedOrderNumbers.length > 0 ? (
        <div className={`mt-5 ${detailCardClass}`}>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7a92b7]">Номера заказов</p>
          <p className="mt-2 text-sm font-extrabold text-[#173862]">{order.relatedOrderNumbers.join(", ")}</p>
        </div>
      ) : null}

      {!hideSensitiveDetails && order.productPreview ? (
        <div className="mt-5 rounded-[20px] border border-[#dce6f4] bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7a92b7]">Распознанный товар</p>
          <p className="mt-2 text-lg font-extrabold text-[#173862]">{order.productPreview.title}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#58739d]">{order.productPreview.parserMessage}</p>
        </div>
      ) : null}

      {!hideSensitiveDetails && order.sourceUrl ? (
        <div className={`mt-5 ${detailCardClass}`}>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7a92b7]">Ссылка на товар</p>
          <a href={order.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm font-extrabold text-[#356ac8]">
            {order.sourceUrl}
          </a>
        </div>
      ) : null}
    </article>
  );
}
