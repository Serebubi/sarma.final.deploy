import type { Metadata } from "next";

import { PickupPointsPage } from "@/components/pickup-points-page";

export const metadata: Metadata = {
  title: "Пункты выдачи | Сарма Экспресс",
  description: "Карта и список пунктов выдачи Сарма Экспресс с выбором адреса на карте.",
};

export default function PickupPointsRoutePage() {
  return <PickupPointsPage />;
}
