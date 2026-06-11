import type { Metadata } from "next";

import { SarmaExpressPage } from "@/components/sarma-express-page";

export const metadata: Metadata = {
  title: "Сарма Экспресс",
  description: "Отдельная промо-страница Сарма Экспресс для ежедневной доставки на Новые Территории.",
};

export default function SarmaExpressRoutePage() {
  return <SarmaExpressPage />;
}
