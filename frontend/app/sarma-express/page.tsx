import type { Metadata } from "next";
import { Suspense } from "react";

import { SarmaExpressApp } from "@/components/sarma-express-app";

export const metadata: Metadata = {
  title: "Сарма Экспресс",
  description: "Сервис оформления и отслеживания заказов Сарма Экспресс.",
};

export default function SarmaExpressRoutePage() {
  return (
    <Suspense fallback={null}>
      <SarmaExpressApp />
    </Suspense>
  );
}
