import type { Metadata } from "next";

import { DeliveryCalculatorPage } from "@/components/delivery-calculator-page";

export const metadata: Metadata = {
  title: "Калькулятор доставки | Сарма Экспресс",
  description: "Страница калькулятора доставки Сарма Экспресс с формой маршрута и параметров груза.",
};

export default function CalculatorRoutePage() {
  return <DeliveryCalculatorPage />;
}
