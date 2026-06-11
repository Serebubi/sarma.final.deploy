import type { Metadata } from "next";
import { Suspense } from "react";

import { SuperboxApp } from "@/components/superbox-app";

export const metadata: Metadata = {
  title: "Отмена заказа | Сарма Экспресс",
  description: "Проверка и отмена активного заказа Сарма Экспресс по номеру.",
};

export default function CancelOrderPage() {
  return (
    <Suspense fallback={null}>
      <SuperboxApp initialFlow="cancel_order" />
    </Suspense>
  );
}
