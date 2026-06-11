import type { Metadata } from "next";
import { Suspense } from "react";

import { SuperboxApp } from "@/components/superbox-app";

export const metadata: Metadata = {
  title: "SUPERBOX",
  description: "Сервис оформления заказов SUPERBOX",
};

export default function SuperboxPage() {
  return (
    <Suspense fallback={null}>
      <SuperboxApp />
    </Suspense>
  );
}
