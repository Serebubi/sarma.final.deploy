"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { SarmaExpressHeader } from "@/components/sarma-express-header";
import {
  cities,
  cityPickupPoints,
  courierTariffs,
  getCityLabel,
  getRouteTerm,
  getTariffBand,
  routeCoefficients,
  type CityKey,
  type CityPickupPoint,
  type CourierTariff,
  type TariffBand,
} from "@/lib/delivery-tariffs";

type AddressType = "apartment" | "private";
type DeliveryMode = "pvz" | "courier";
type CalculatorDialog = "order" | "request" | "phones" | null;
type DeliveryLegResolution =
  | {
      kind: "pickup";
      label: "ПВЗ" | "Склад";
      point: CityPickupPoint;
      note?: string;
    }
  | {
      kind: "courier";
      label: "Курьер";
      note?: string;
    };

type CalculatorState = {
  from: CityKey;
  to: CityKey;
  fromMode: DeliveryMode;
  toMode: DeliveryMode;
  fromPickupPoint: string;
  toPickupPoint: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  addressType: AddressType;
  floor: string;
  hasElevator: boolean;
  needLoaders: boolean;
  privateCarryDistance: string;
};

type CalculationResult =
  | { status: "same-route" | "no-route" }
  | { status: "empty"; coefficient?: number; term?: string }
  | {
      status: "moscow-special";
      actualWeight: number;
      volumeWeight: number;
      chargeableWeight: number;
      term: string;
    }
  | {
      status: "special";
      actualWeight: number;
      volumeWeight: number;
      chargeableWeight: number;
      coefficient: number;
      term: string;
    }
  | {
      status: "ready";
      actualWeight: number;
      volumeWeight: number;
      chargeableWeight: number;
      coefficient: number;
      term: string;
      band: TariffBand;
      courier: CourierTariff;
      courierLegs: number;
      fromLeg: DeliveryLegResolution;
      toLeg: DeliveryLegResolution;
      transportCost: number;
      courierCost: number;
      loadersCost: number;
      elevatorCost: number;
      stairsCost: number;
      privateCarryCost: number;
      total: number;
    };

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

const cityOptions: Array<SelectOption<CityKey>> = cities.map((city) => ({
  label: city.label,
  value: city.key,
}));

const addressTypeOptions: Array<SelectOption<AddressType>> = [
  { label: "Многоквартирный дом", value: "apartment" },
  { label: "Частный дом", value: "private" },
];

const mainContactPhone = {
  label: "Единый номер",
  phone: "+7 (989) 500-00-38",
  href: "tel:+79895000038",
};

const initialState: CalculatorState = {
  from: "rostov",
  to: "donetsk",
  fromMode: "pvz",
  toMode: "pvz",
  fromPickupPoint: "",
  toPickupPoint: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  addressType: "apartment",
  floor: "1",
  hasElevator: true,
  needLoaders: false,
  privateCarryDistance: "25",
};

const fieldClassName =
  "calculator-field-input mt-1.5 w-full appearance-none border-none bg-transparent p-0 text-base font-bold text-[#173862] shadow-none outline-none ring-0 placeholder:text-[#8aa2c8] focus:border-none focus:outline-none focus:ring-0 focus-visible:outline-none";

const rubleFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "RUB",
});

const numberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
});

function parsePositiveNumber(value: string) {
  const normalized = value.replace(",", ".").replace(/\s+/g, "");
  const number = Number(normalized);

  return Number.isFinite(number) && number > 0 ? number : 0;
}

function formatMoney(value: number) {
  return rubleFormatter.format(value).replace(",00", "");
}

function getDeliveryModeAvailability(city: CityKey, mode: DeliveryMode, chargeableWeight: number) {
  if (mode === "courier") {
    return { available: true, reason: "" };
  }

  const points = cityPickupPoints[city] ?? [];
  const availablePoints = getAvailablePickupPoints(city, chargeableWeight);

  if (!points.length) {
    return { available: false, reason: `Пунктов выдачи в городе ${getCityLabel(city)} нет.` };
  }

  if (!availablePoints.length) {
    const maxThreshold = Math.max(...points.map((point) => point.thresholdKg ?? 0));

    return {
      available: false,
      reason: maxThreshold
        ? `Пункты выдачи в городе ${getCityLabel(city)} принимают до ${formatKg(maxThreshold)}. Доступен курьер.`
        : `Пункт выдачи в городе ${getCityLabel(city)} сейчас недоступен.`,
    };
  }

  return { available: true, reason: "" };
}

function getDefaultDeliveryMode(city: CityKey, preferred: DeliveryMode | undefined, chargeableWeight: number) {
  if (preferred && getDeliveryModeAvailability(city, preferred, chargeableWeight).available) {
    return preferred;
  }

  if (getDeliveryModeAvailability(city, "pvz", chargeableWeight).available) {
    return "pvz";
  }

  return "courier";
}

function formatKg(value: number) {
  return `${numberFormatter.format(value)} кг`;
}

function getPickupPointKey(point: CityPickupPoint) {
  return `${point.type}:${point.address}`;
}

function getPickupPointTypeLabel(point: CityPickupPoint) {
  return point.type === "warehouse" ? "СКЛАД" : "ПВЗ";
}

function getPickupPointLimitLabel(point: CityPickupPoint) {
  return point.thresholdKg ? `до ${formatKg(point.thresholdKg)}` : "без ограничений по весу";
}

function isPickupPointAvailable(point: CityPickupPoint, chargeableWeight: number) {
  return !point.thresholdKg || chargeableWeight <= point.thresholdKg;
}

function getAvailablePickupPoints(city: CityKey, chargeableWeight: number) {
  return (cityPickupPoints[city] ?? []).filter((point) => isPickupPointAvailable(point, chargeableWeight));
}

function getSelectedPickupPoint(city: CityKey, selectedKey: string, chargeableWeight: number) {
  const points = cityPickupPoints[city] ?? [];
  const selectedPoint = points.find((point) => getPickupPointKey(point) === selectedKey);

  if (selectedPoint && isPickupPointAvailable(selectedPoint, chargeableWeight)) {
    return selectedPoint;
  }

  return points.find((point) => isPickupPointAvailable(point, chargeableWeight)) ?? null;
}

function phoneHref(phone: string) {
  return `tel:+${phone.replace(/\D/g, "")}`;
}

function getRoutePhoneOptions(from: CityKey, to: CityKey) {
  const contacts = [mainContactPhone];

  for (const city of [from, to]) {
    for (const point of cityPickupPoints[city] ?? []) {
      contacts.push({
        label: `${getCityLabel(city)} · ${point.label}`,
        phone: point.contact.startsWith("+") ? point.contact : `+${point.contact}`,
        href: phoneHref(point.contact),
      });
    }
  }

  return contacts.filter(
    (contact, index, list) => list.findIndex((candidate) => candidate.href === contact.href) === index,
  );
}

function createDisplayOrderNumber() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 90) + 10);

  return `#${month}${day}-${suffix}`;
}

function resolveDeliveryLeg(
  city: CityKey,
  requestedMode: DeliveryMode,
  chargeableWeight: number,
  pickupPointKey: string,
): DeliveryLegResolution {
  const actualMode = getDefaultDeliveryMode(city, requestedMode, chargeableWeight);

  if (actualMode === "courier") {
    return { kind: "courier", label: "Курьер" };
  }

  const point = getSelectedPickupPoint(city, pickupPointKey, chargeableWeight);

  if (point) {
    const label = point.type === "warehouse" ? "Склад" : "ПВЗ";

    return {
      kind: "pickup",
      label,
      point,
      note: `${label}: ${getPickupPointLimitLabel(point)}.`,
    };
  }

  return { kind: "courier", label: "Курьер", note: "В городе нет доступных пунктов выдачи." };
}

export function DeliveryCalculatorPage() {
  const [state, setState] = useState<CalculatorState>(initialState);
  const previewActualWeight = parsePositiveNumber(state.weight);
  const previewLength = parsePositiveNumber(state.length);
  const previewWidth = parsePositiveNumber(state.width);
  const previewHeight = parsePositiveNumber(state.height);
  const previewVolumeWeight =
    previewLength && previewWidth && previewHeight ? (previewLength * previewWidth * previewHeight) / 5000 : 0;
  const previewChargeableWeight = Math.max(previewActualWeight, previewVolumeWeight);
  const previewFromLeg = resolveDeliveryLeg(state.from, state.fromMode, previewChargeableWeight, state.fromPickupPoint);
  const previewToLeg = resolveDeliveryLeg(state.to, state.toMode, previewChargeableWeight, state.toPickupPoint);
  const hasCourierMode = previewFromLeg.kind === "courier" || previewToLeg.kind === "courier";

  useEffect(() => {
    setState((current) => {
      const actualWeight = parsePositiveNumber(current.weight);
      const length = parsePositiveNumber(current.length);
      const width = parsePositiveNumber(current.width);
      const height = parsePositiveNumber(current.height);
      const volumeWeight = length && width && height ? (length * width * height) / 5000 : 0;
      const chargeableWeight = Math.max(actualWeight, volumeWeight);
      const fromMode = getDefaultDeliveryMode(current.from, current.fromMode, chargeableWeight);
      const toMode = getDefaultDeliveryMode(current.to, current.toMode, chargeableWeight);

      if (fromMode === current.fromMode && toMode === current.toMode) {
        return current;
      }

      return { ...current, fromMode, toMode };
    });
  }, [state.from, state.to, state.weight, state.length, state.width, state.height]);

  const result = useMemo<CalculationResult>(() => {
    const actualWeight = parsePositiveNumber(state.weight);
    const length = parsePositiveNumber(state.length);
    const width = parsePositiveNumber(state.width);
    const height = parsePositiveNumber(state.height);
    const volumeWeight = length && width && height ? (length * width * height) / 5000 : 0;
    const chargeableWeight = Math.max(actualWeight, volumeWeight);
    const coefficient = routeCoefficients[state.from][state.to];
    const floor = Math.max(1, Math.floor(parsePositiveNumber(state.floor) || 1));
    const carryDistance = parsePositiveNumber(state.privateCarryDistance);

    if (state.from === state.to) {
      return { status: "same-route" as const };
    }

    if (state.from === "moscow" || state.to === "moscow") {
      return {
        status: "moscow-special" as const,
        actualWeight,
        volumeWeight,
        chargeableWeight,
        term: "Только грузы от 500 кг",
      };
    }

    if (!coefficient) {
      return { status: "no-route" as const };
    }

    if (!actualWeight && !volumeWeight) {
      return {
        status: "empty" as const,
        coefficient,
        term: getRouteTerm(state.from, state.to),
      };
    }

    if (chargeableWeight > 499.9) {
      return {
        status: "special" as const,
        actualWeight,
        volumeWeight,
        chargeableWeight,
        coefficient,
        term: getRouteTerm(state.from, state.to),
      };
    }

    const band = getTariffBand(chargeableWeight);

    if (!band) {
      return { status: "empty" as const, coefficient, term: getRouteTerm(state.from, state.to) };
    }

    const courier = courierTariffs[band.category];
    const extraEligible = band.category !== "Малая" && band.category !== "Стандартная";
    const fromLeg = resolveDeliveryLeg(state.from, state.fromMode, chargeableWeight, state.fromPickupPoint);
    const toLeg = resolveDeliveryLeg(state.to, state.toMode, chargeableWeight, state.toPickupPoint);
    const courierLegs = Number(fromLeg.kind === "courier") + Number(toLeg.kind === "courier");
    const transportCost = Math.round(band.baseTariff * coefficient);
    const courierCost = courier.fixed * courierLegs;
    const hasCourierService = courierLegs > 0;
    const loadersCost = extraEligible && hasCourierService && state.needLoaders ? courier.loaders : 0;
    const elevatorCost =
      extraEligible && hasCourierService && state.addressType === "apartment" && state.hasElevator && floor >= 2 ? courier.elevatorFee : 0;
    const stairsCost =
      extraEligible && hasCourierService && state.addressType === "apartment" && !state.hasElevator && floor >= 2
        ? (floor - 1) * courier.stairPerFloor
        : 0;
    const privateCarryCost =
      hasCourierService && state.addressType === "private" && carryDistance > 25 ? Math.ceil((carryDistance - 25) / 10) * 50 : 0;
    const total = transportCost + courierCost + loadersCost + elevatorCost + stairsCost + privateCarryCost;

    return {
      status: "ready" as const,
      actualWeight,
      volumeWeight,
      chargeableWeight,
      coefficient,
      term: getRouteTerm(state.from, state.to),
      band,
      courier,
      courierLegs,
      fromLeg,
      toLeg,
      transportCost,
      courierCost,
      loadersCost,
      elevatorCost,
      stairsCost,
      privateCarryCost,
      total,
    };
  }, [state]);

  const setField = <K extends keyof CalculatorState>(key: K, value: CalculatorState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const setCityField = (key: "from" | "to", value: CityKey) => {
    setState((current) => {
      const next: CalculatorState = { ...current, [key]: value };
      const oppositeKey = key === "from" ? "to" : "from";

      if (value === "moscow") {
        next[oppositeKey] = "donetsk";
      } else if (next[oppositeKey] === "moscow" && value !== "donetsk") {
        next[oppositeKey] = "donetsk";
      }

      const actualWeight = parsePositiveNumber(next.weight);
      const length = parsePositiveNumber(next.length);
      const width = parsePositiveNumber(next.width);
      const height = parsePositiveNumber(next.height);
      const volumeWeight = length && width && height ? (length * width * height) / 5000 : 0;
      const chargeableWeight = Math.max(actualWeight, volumeWeight);

      next.fromMode = getDefaultDeliveryMode(next.from, next.fromMode, chargeableWeight);
      next.toMode = getDefaultDeliveryMode(next.to, next.toMode, chargeableWeight);

      return next;
    });
  };

  return (
    <main className="min-h-screen bg-[#edf2f8] text-[#12243f]">
      <SarmaExpressHeader activeItem="calculator" />

      <section
        className="relative overflow-x-hidden bg-[#4a8de7] bg-cover bg-[position:72%_center] bg-no-repeat"
        style={{ backgroundImage: "url('/brand/hero-background.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(51,114,214,0.96)_0%,rgba(86,148,232,0.82)_34%,rgba(150,198,248,0.26)_64%,rgba(255,255,255,0)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(255,255,255,0.6),transparent_17%),linear-gradient(90deg,rgba(255,255,255,0)_46%,rgba(255,255,255,0.74)_100%)]" />
        <div className="absolute -left-28 top-1/2 h-[580px] w-[580px] -translate-y-1/2 rounded-full border border-white/18" />
        <div className="absolute -left-10 bottom-[-180px] h-[440px] w-[440px] rounded-full border border-white/18" />
        <div className="absolute left-[5%] top-[34%] hidden h-36 w-44 opacity-35 lg:block">
          <DotPattern />
        </div>

        <div className="relative mx-auto min-h-[calc(100vh-121px)] w-full max-w-[1320px] box-border px-4 py-8 lg:px-6 lg:py-2">
          <div className="relative z-10 w-full max-w-[860px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/36 bg-white/12 px-4 py-2 text-sm font-semibold text-white/92 backdrop-blur-sm lg:hidden">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9fd0ff]" />
              Предварительный расчёт
            </div>

            <h1 className="mt-3 max-w-[760px] text-4xl font-extrabold leading-[1.05] text-white drop-shadow-[0_16px_34px_rgba(20,56,120,0.22)] sm:text-5xl lg:mt-0 lg:text-[2.55rem]">
              Калькулятор доставки
            </h1>

            <p className="mt-1.5 max-w-[760px] text-base leading-7 text-white/88 sm:text-lg lg:text-sm lg:leading-6">
              Рассчитайте предварительную стоимость доставки по направлению, весу и габаритам груза. Итоговая сумма может измениться после проверки веса, объёма и дополнительных услуг.
            </p>
          </div>

          <div className="relative z-10 mt-4 grid gap-4 text-[#173862] lg:mt-2 lg:grid-cols-[minmax(0,1fr)_380px]">
            <form
              className="rounded-[32px] border border-white/62 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(235,244,255,0.9)_100%)] p-4 shadow-[0_28px_80px_rgba(28,78,160,0.2)] backdrop-blur-[20px] lg:p-5"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <div className="grid items-start gap-3 lg:grid-cols-2">
                <FieldShell icon={<PinIcon />} label="Откуда">
                  <ModernSelect options={cityOptions} value={state.from} onChange={(value) => setCityField("from", value)} />
                  <DeliveryModeSelector
                    chargeableWeight={previewChargeableWeight}
                    city={state.from}
                    selectedPickupPoint={state.fromPickupPoint}
                    value={state.fromMode}
                    onChange={(value) => setField("fromMode", value)}
                    onPickupPointChange={(value) => setField("fromPickupPoint", value)}
                  />
                </FieldShell>

                <FieldShell icon={<PinIcon />} label="Куда">
                  <ModernSelect options={cityOptions} value={state.to} onChange={(value) => setCityField("to", value)} />
                  <DeliveryModeSelector
                    chargeableWeight={previewChargeableWeight}
                    city={state.to}
                    selectedPickupPoint={state.toPickupPoint}
                    value={state.toMode}
                    onChange={(value) => setField("toMode", value)}
                    onPickupPointChange={(value) => setField("toPickupPoint", value)}
                  />
                </FieldShell>

                <div className="grid gap-3 md:grid-cols-2 lg:col-span-2">
                  <FieldShell icon={<WeightIcon />} label="Вес груза, кг">
                    <input
                      aria-label="Вес груза, кг"
                      placeholder="Например, 120"
                      inputMode="decimal"
                      value={state.weight}
                      className={fieldClassName}
                      onChange={(event) => setField("weight", event.target.value)}
                    />
                  </FieldShell>

                  <FieldShell icon={<VolumeIcon />} label="Длина, см">
                    <input
                      aria-label="Длина, см"
                      placeholder="Например, 60"
                      inputMode="decimal"
                      value={state.length}
                      className={fieldClassName}
                      onChange={(event) => setField("length", event.target.value)}
                    />
                  </FieldShell>

                  <FieldShell icon={<VolumeIcon />} label="Ширина, см">
                    <input
                      aria-label="Ширина, см"
                      placeholder="Например, 40"
                      inputMode="decimal"
                      value={state.width}
                      className={fieldClassName}
                      onChange={(event) => setField("width", event.target.value)}
                    />
                  </FieldShell>

                  <FieldShell icon={<VolumeIcon />} label="Высота, см">
                    <input
                      aria-label="Высота, см"
                      placeholder="Например, 50"
                      inputMode="decimal"
                      value={state.height}
                      className={fieldClassName}
                      onChange={(event) => setField("height", event.target.value)}
                    />
                  </FieldShell>
                </div>

                <div
                  aria-hidden={!hasCourierMode}
                  className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out lg:col-span-2 ${
                    hasCourierMode ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0">
                    <div className="grid gap-3">
                      <FieldShell icon={<HomeIcon />} label="Адрес для курьера">
                        <ModernSelect
                          disabled={!hasCourierMode}
                          options={addressTypeOptions}
                          value={state.addressType}
                          onChange={(value) => setField("addressType", value)}
                        />
                      </FieldShell>

                      {state.addressType === "apartment" ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <FieldShell icon={<StairsIcon />} label="Этаж">
                            <input
                              aria-label="Этаж"
                              placeholder="Например, 5"
                              inputMode="numeric"
                              value={state.floor}
                              className={fieldClassName}
                              tabIndex={hasCourierMode ? undefined : -1}
                              onChange={(event) => setField("floor", event.target.value)}
                            />
                          </FieldShell>

                          <ToggleField
                            checked={state.hasElevator}
                            disabled={!hasCourierMode}
                            icon={<LiftIcon />}
                            label="Лифт"
                            offText="Нет лифта"
                            onText="Есть лифт"
                            onChange={(value) => setField("hasElevator", value)}
                          />
                        </div>
                      ) : (
                        <FieldShell icon={<RouteIcon />} label="Занос от парковки, м">
                          <input
                            aria-label="Занос от парковки, м"
                            placeholder="Например, 35"
                            inputMode="decimal"
                            value={state.privateCarryDistance}
                            className={fieldClassName}
                            tabIndex={hasCourierMode ? undefined : -1}
                            onChange={(event) => setField("privateCarryDistance", event.target.value)}
                          />
                        </FieldShell>
                      )}

                      <ToggleField
                        checked={state.needLoaders}
                        disabled={!hasCourierMode}
                        icon={<CargoIcon />}
                        label="Грузчики"
                        offText="Не нужны"
                        onText="Нужны"
                        onChange={(value) => setField("needLoaders", value)}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </form>

            <ResultPanel
              from={state.from}
              fromLeg={result.status === "ready" ? result.fromLeg : previewFromLeg}
              result={result}
              to={state.to}
              toLeg={result.status === "ready" ? result.toLeg : previewToLeg}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function ResultPanel({
  from,
  fromLeg,
  to,
  toLeg,
  result,
}: {
  from: CityKey;
  fromLeg: DeliveryLegResolution;
  to: CityKey;
  toLeg: DeliveryLegResolution;
  result: CalculationResult;
}) {
  const [activeDialog, setActiveDialog] = useState<CalculatorDialog>(null);
  const routePhones = useMemo(() => getRoutePhoneOptions(from, to), [from, to]);
  const specialDetails =
    result.status === "special"
      ? {
          title: `Расчётный вес ${numberFormatter.format(result.chargeableWeight)} кг`,
          text: "Для отправлений от 500 кг в тарифной таблице указан спецтариф. Стоимость и условия нужно согласовать с менеджером.",
          badge: "Спецтариф",
          chargeableWeight: result.chargeableWeight,
        }
      : result.status === "moscow-special"
        ? {
            title: "Направление Москва ↔ Донецк",
            text: "Для Москвы стандартный расчёт не применяется. Доступно согласование заявки и консультация по телефону.",
            badge: "Только по заявке",
            chargeableWeight: result.chargeableWeight,
          }
        : null;

  if (activeDialog === "order" && result.status === "ready") {
    return (
      <aside className="h-fit rounded-[32px] border border-white/62 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(235,244,255,0.92)_100%)] p-4 text-[#173862] shadow-[0_28px_80px_rgba(28,78,160,0.2)] backdrop-blur-[20px]">
        <OrderRequestDialog from={from} onClose={() => setActiveDialog(null)} result={result} to={to} />
      </aside>
    );
  }

  if (activeDialog === "request" && specialDetails) {
    return (
      <aside className="h-fit rounded-[32px] border border-white/62 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(235,244,255,0.92)_100%)] p-4 text-[#173862] shadow-[0_28px_80px_rgba(28,78,160,0.2)] backdrop-blur-[20px]">
        <RequestDialog from={from} onClose={() => setActiveDialog(null)} result={result} to={to} />
      </aside>
    );
  }

  return (
    <aside className="h-fit rounded-[32px] border border-white/62 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(235,244,255,0.92)_100%)] p-4 text-[#173862] shadow-[0_28px_80px_rgba(28,78,160,0.2)] backdrop-blur-[20px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4d78b8]">Итого к оплате</p>
          <h2 className="mt-1.5 text-3xl font-black text-[#173862]">
            {result.status === "ready" ? formatMoney(result.total) : "—"}
          </h2>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f0ff] text-[#3f74cb]">
          <ReceiptIcon />
        </span>
      </div>

      <div className="mt-3 rounded-2xl bg-white/70 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
        <div className="text-sm font-bold text-[#6f87ac]">Маршрут</div>
        <div className="mt-1 text-lg font-black text-[#173862]">
          {getCityLabel(from)} → {getCityLabel(to)}
        </div>
        {"term" in result && result.term ? (
          <div className="mt-2 inline-flex rounded-full bg-[#e8f2ff] px-3 py-1 text-sm font-bold text-[#356fcb]">
            {result.term}
          </div>
        ) : null}
        <div className="mt-3 grid gap-2 text-sm font-bold text-[#587295]">
          <SelectedDeliveryLine label="Откуда" leg={fromLeg} />
          <SelectedDeliveryLine label="Куда" leg={toLeg} />
        </div>
      </div>

      {result.status === "ready" ? (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
            <Metric label="Расчётный вес" value={`${numberFormatter.format(result.chargeableWeight)} кг`} />
            <Metric label="Категория" value={result.band.category} />
            <Metric label="Тариф" value={result.band.label} />
          </div>

          <div className="mt-3 space-y-3">
            <PriceLine label="Перевозка" value={result.transportCost} />
            <PriceLine
              label={`Курьер ${result.courier.destination}${result.courierLegs > 1 ? ` × ${result.courierLegs}` : ""}`}
              value={result.courierCost}
            />
            <PriceLine label="Грузчики" value={result.loadersCost} />
            <PriceLine label="Провоз в лифте" value={result.elevatorCost} />
            <PriceLine label="Подъём пешком" value={result.stairsCost} />
            <PriceLine label="Занос в частном доме" value={result.privateCarryCost} />
          </div>
          <button
            type="button"
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#4f8fe8_0%,#356fcb_100%)] px-5 text-sm font-black text-white shadow-[0_16px_30px_rgba(46,90,175,0.24)] transition hover:-translate-y-0.5"
            onClick={() => setActiveDialog("order")}
          >
            <FormIcon />
            Оформить заказ
          </button>
        </>
      ) : result.status === "empty" || result.status === "same-route" || result.status === "no-route" ? (
        <ResultMessage status={result.status} />
      ) : null}

      {specialDetails ? (
        <HeavyCargoActions
          details={specialDetails}
          from={from}
          onOpenPhones={() => setActiveDialog("phones")}
          onOpenRequest={() => setActiveDialog("request")}
          result={result}
          to={to}
        />
      ) : null}

      {activeDialog === "phones" ? <PhonesDialog onClose={() => setActiveDialog(null)} phones={routePhones} /> : null}
    </aside>
  );
}

function HeavyCargoActions({
  details,
  from,
  onOpenPhones,
  onOpenRequest,
  result,
  to,
}: {
  details: { title: string; text: string; badge: string; chargeableWeight: number };
  from: CityKey;
  onOpenPhones: () => void;
  onOpenRequest: () => void;
  result: CalculationResult;
  to: CityKey;
}) {
  const term = "term" in result ? result.term : "Срок уточняется";

  return (
    <div className="mt-5 overflow-hidden rounded-[24px] border border-[#bcd3f4] bg-[linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)] shadow-[0_18px_42px_rgba(35,83,164,0.14)]">
      <div className="border-b border-[#d7e6f8] p-4">
        <div className="inline-flex rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#356fcb]">
          {details.badge}
        </div>
        <h3 className="mt-3 text-xl font-black leading-tight text-[#173862]">{details.title}</h3>
        <p className="mt-2 text-sm font-bold leading-6 text-[#587295]">{details.text}</p>
      </div>

      <div className="grid gap-3 p-4 text-sm font-bold text-[#587295]">
        <div>
          Маршрут:{" "}
          <span className="text-[#173862]">
            {getCityLabel(from)} → {getCityLabel(to)}
          </span>
        </div>
        <div>
          Срок: <span className="text-[#173862]">{term}</span>
        </div>
        {details.chargeableWeight ? (
          <div>
            Вес для заявки: <span className="text-[#173862]">{formatKg(details.chargeableWeight)}</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 border-t border-[#d7e6f8] p-4 sm:grid-cols-2">
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#4f8fe8_0%,#356fcb_100%)] px-4 text-sm font-black text-white shadow-[0_16px_30px_rgba(46,90,175,0.24)] transition hover:-translate-y-0.5"
          onClick={onOpenRequest}
        >
          <FormIcon />
          Заполнить заявку
        </button>
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#c7daf6] bg-white/74 px-4 text-sm font-black text-[#356fcb] transition hover:bg-white"
          onClick={onOpenPhones}
        >
          <PhoneIcon />
          Позвонить нам
        </button>
      </div>
    </div>
  );
}

function OrderRequestDialog({
  from,
  onClose,
  result,
  to,
}: {
  from: CityKey;
  onClose: () => void;
  result: Extract<CalculationResult, { status: "ready" }>;
  to: CityKey;
}) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderNumber] = useState(createDisplayOrderNumber);
  const hasCourier = result.courierLegs > 0;
  const deliveryType = hasCourier ? `Курьер ${result.courier.destination}` : `${result.toLeg.label}`;

  return (
    <InlinePanelShell title="Оформление заказа" onClose={onClose}>
      {isSubmitted ? (
        <OrderSuccess
          message={
            hasCourier
              ? "Курьер свяжется с отправителем для согласования времени забора груза."
              : `${result.toLeg.label} получения: ${result.toLeg.kind === "pickup" ? result.toLeg.point.address : getCityLabel(to)}`
          }
          number={orderNumber}
          title="Заказ оформлен"
          total={formatMoney(result.total)}
        />
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setIsSubmitted(true);
          }}
        >
          <div className="rounded-2xl border border-[#cfe0f7] bg-white/72 p-4 text-sm font-bold leading-6 text-[#587295]">
            <span className="text-[#173862]">
              {getCityLabel(from)} → {getCityLabel(to)}
            </span>
            <span className="block">
              {deliveryType}, сумма {formatMoney(result.total)}
            </span>
          </div>

          <DialogInput label="Контактное лицо" placeholder="Имя и фамилия" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <DialogInput label="Телефон" placeholder="+7 999 000-00-00" inputMode="tel" required />
            <DialogInput label="Электронная почта" placeholder="mail@example.ru" type="email" />
          </div>

          {hasCourier ? (
            <>
              <DialogInput label="Адрес отправителя" placeholder="Город, улица, дом" required />
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#4d78b8]">Комментарий</span>
                <textarea
                  className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-[#cfe0f7] bg-white/82 px-4 py-3 text-sm font-bold text-[#173862] outline-none placeholder:text-[#8aa2c8] focus:border-[#7aa5e6]"
                  placeholder="Удобное время, подъезд, ориентиры, дополнительные детали"
                />
              </label>
            </>
          ) : null}

          <button
            type="submit"
            className="mt-2 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#4f8fe8_0%,#356fcb_100%)] px-5 text-sm font-black text-white shadow-[0_16px_30px_rgba(46,90,175,0.24)]"
          >
            Подтвердить заказ
          </button>
        </form>
      )}
    </InlinePanelShell>
  );
}

function RequestDialog({
  from,
  onClose,
  result,
  to,
}: {
  from: CityKey;
  onClose: () => void;
  result: CalculationResult;
  to: CityKey;
}) {
  const routeWeight = "chargeableWeight" in result && result.chargeableWeight ? numberFormatter.format(result.chargeableWeight) : "";
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [requestNumber] = useState(createDisplayOrderNumber);
  const [transportType, setTransportType] = useState("");
  const [transportError, setTransportError] = useState("");

  return (
    <InlinePanelShell title="Заявка на прямую машину" onClose={onClose}>
      {isSubmitted ? (
        <OrderSuccess
          message="Экспедитор подбирает транспорт под ваш груз. Мы свяжемся с вами в течение 30 минут."
          number={requestNumber}
          showTrackingLine={false}
          title="Заявка отправлена"
        />
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!transportType) {
              setTransportError("Выберите тип транспорта");
              return;
            }
            setIsSubmitted(true);
          }}
        >
          <div className="rounded-2xl border border-[#cfe0f7] bg-white/72 p-4 text-sm font-bold leading-6 text-[#587295]">
            <span className="text-[#173862]">
              {getCityLabel(from)} → {getCityLabel(to)}
            </span>
            <span className="block">Расчётный вес: {routeWeight ? `${routeWeight} кг` : "от 500 кг"}</span>
          </div>

          <DialogInput label="Наименование груза" placeholder="Например, оборудование" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <DialogInput label="Вес, кг" defaultValue={routeWeight} inputMode="decimal" required />
            <DialogInput label="Объём, м³" placeholder="Например, 8" inputMode="decimal" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DialogInput label="Количество мест" placeholder="Например, 12" inputMode="numeric" required />
            <TransportSelect
              error={transportError}
              value={transportType}
              onChange={(value) => {
                setTransportType(value);
                setTransportError("");
              }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DialogInput label="Адрес загрузки" placeholder="Город, улица, дом" required />
            <DialogInput label="Адрес выгрузки" placeholder="Город, улица, дом" required />
          </div>

          <div className="rounded-2xl border border-[#cfe0f7] bg-white/68 p-4">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-[#4d78b8]">Особые свойства</span>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {["Опасный", "Хрупкий", "Скоропортящийся", "Негабарит"].map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm font-bold text-[#173862]">
                  <input type="checkbox" className="h-4 w-4 accent-[#3f74cb]" />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <DialogInput label="Контактное лицо" placeholder="Имя и фамилия" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <DialogInput label="Телефон" placeholder="+7 999 000-00-00" inputMode="tel" required />
            <DialogInput label="Электронная почта" placeholder="mail@example.ru" type="email" required />
          </div>
          <DialogInput label="Карточка предприятия" type="file" />
          <button
            type="submit"
            className="mt-2 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#4f8fe8_0%,#356fcb_100%)] px-5 text-sm font-black text-white shadow-[0_16px_30px_rgba(46,90,175,0.24)]"
          >
            Отправить заявку
          </button>
        </form>
      )}
    </InlinePanelShell>
  );
}

function OrderSuccess({
  message,
  number,
  showTrackingLine = true,
  title,
  total,
}: {
  message: string;
  number: string;
  showTrackingLine?: boolean;
  title: string;
  total?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#cfe0f7] bg-[#f4f9ff] p-5">
      <p className="text-lg font-black text-[#173862]">{title}</p>
      <div className="mt-3 grid gap-2 text-sm font-bold leading-6 text-[#587295]">
        <span>
          Номер заявки: <span className="text-[#173862]">{number}</span>
        </span>
        {total ? (
          <span>
            Сумма: <span className="text-[#173862]">{total}</span>
          </span>
        ) : null}
        <span>{message}</span>
        {showTrackingLine ? <span>Трек-номер придёт на телефон и email после передачи груза в доставку.</span> : null}
        <span>
          По вопросам: <span className="text-[#173862]">{mainContactPhone.phone}</span>
        </span>
      </div>
    </div>
  );
}

function PhonesDialog({
  onClose,
  phones,
}: {
  onClose: () => void;
  phones: Array<{ label: string; phone: string; href: string }>;
}) {
  return (
    <ModalShell title="Позвонить нам" onClose={onClose}>
      <div className="grid gap-3">
        {phones.map((contact) => (
          <a
            key={contact.href}
            href={contact.href}
            className="flex items-center justify-between gap-3 rounded-2xl border border-[#cfe0f7] bg-white/82 px-4 py-3 text-left transition hover:border-[#9ec0f0] hover:bg-white"
          >
            <span>
              <span className="block text-sm font-black text-[#173862]">{contact.label}</span>
              <span className="mt-1 block text-sm font-bold text-[#587295]">{contact.phone}</span>
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f2ff] text-[#356fcb]">
              <PhoneIcon />
            </span>
          </a>
        ))}
      </div>
    </ModalShell>
  );
}

function InlinePanelShell({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4d78b8]">Сарма Экспресс</p>
          <h2 className="mt-1 text-2xl font-black text-[#173862]">{title}</h2>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[#d7e5fb] bg-white/78 px-4 text-xs font-black uppercase tracking-[0.12em] text-[#3f74cb] transition hover:bg-white"
          onClick={onClose}
        >
          Расчёт
        </button>
      </div>
      <div className="rounded-[24px] border border-[#d7e6f8] bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] sm:p-5">
        {children}
      </div>
    </div>
  );
}

function ModalShell({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08214d]/48 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[calc(100vh-32px)] w-full max-w-[560px] overflow-y-auto rounded-[28px] border border-white/72 bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-5 shadow-[0_30px_90px_rgba(8,33,77,0.34)] sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4d78b8]">Сарма Экспресс</p>
            <h3 className="mt-1 text-2xl font-black text-[#173862]">{title}</h3>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d7e5fb] bg-white/78 text-[#3f74cb] transition hover:bg-white"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogInput({
  defaultValue,
  inputMode,
  label,
  placeholder,
  required,
  type = "text",
}: {
  defaultValue?: string;
  inputMode?: "decimal" | "numeric" | "tel";
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "email" | "file" | "text";
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-[#4d78b8]">{label}</span>
      <input
        className="mt-2 min-h-12 w-full rounded-2xl border border-[#cfe0f7] bg-white/82 px-4 text-sm font-bold text-[#173862] outline-none placeholder:text-[#8aa2c8] focus:border-[#7aa5e6]"
        defaultValue={defaultValue}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function TransportSelect({
  error,
  onChange,
  value,
}: {
  error?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options = ["Тент", "Рефрижератор", "Изотерм", "Газель", "Спецтехника"];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-[#4d78b8]">Тип транспорта</span>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border bg-white/82 px-4 text-left text-sm font-black outline-none transition ${
          error ? "border-[#e38b8b] text-[#173862]" : isOpen ? "border-[#7aa5e6] text-[#173862] shadow-[0_14px_26px_rgba(47,96,184,0.14)]" : "border-[#cfe0f7] text-[#173862]"
        }`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={value ? "" : "text-[#8aa2c8]"}>{value || "Выберите"}</span>
        <span className={`text-[#356fcb] transition ${isOpen ? "rotate-180" : ""}`}>
          <ChevronDownIcon />
        </span>
      </button>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+8px)] z-40 origin-top overflow-hidden rounded-[20px] border border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(237,246,255,0.98)_100%)] p-2 shadow-[0_24px_48px_rgba(24,66,140,0.2)] backdrop-blur-xl transition duration-150 ${
          isOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="grid gap-1" role="listbox">
          {options.map((option) => {
            const selected = option === value;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-[14px] px-3 text-left text-sm font-black transition ${
                  selected
                    ? "bg-[linear-gradient(135deg,#4f8fe8_0%,#356fcb_100%)] text-white shadow-[0_12px_20px_rgba(46,90,175,0.2)]"
                    : "text-[#173862] hover:bg-white hover:shadow-[0_10px_18px_rgba(34,78,154,0.1)]"
                }`}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                <span>{option}</span>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-white/35 bg-white/18 text-white" : "border-[#d7e4f7] bg-white/76 text-[#7e95ba]"
                  }`}
                >
                  {selected ? <CheckIcon /> : <DotIcon />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="mt-2 text-xs font-bold text-[#c65d5d]">{error}</p> : null}
    </div>
  );
}

function DeliveryModeSelector({
  chargeableWeight,
  city,
  selectedPickupPoint,
  value,
  onChange,
  onPickupPointChange,
}: {
  chargeableWeight: number;
  city: CityKey;
  selectedPickupPoint: string;
  value: DeliveryMode;
  onChange: (value: DeliveryMode) => void;
  onPickupPointChange: (value: string) => void;
}) {
  const options: Array<{ value: DeliveryMode; label: string; available: boolean; reason: string }> = [
    { value: "pvz", label: "Пункт выдачи", ...getDeliveryModeAvailability(city, "pvz", chargeableWeight) },
    { value: "courier", label: "Курьер", ...getDeliveryModeAvailability(city, "courier", chargeableWeight) },
  ];
  const unavailableReasons = options.filter((option) => !option.available).map((option) => option.reason);
  const showPickupPointSelector = value === "pvz" && getDeliveryModeAvailability(city, "pvz", chargeableWeight).available;

  return (
    <div className="mt-3">
      <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
        {options.map((option) => {
          const isSelected = value === option.value && option.available;

          return (
            <button
              key={option.value}
              type="button"
              disabled={!option.available}
              className={`min-h-10 min-w-0 rounded-2xl border px-3 text-sm font-black transition ${
                isSelected
                  ? "border-[#3f74cb] bg-[#3f74cb] text-white shadow-[0_12px_22px_rgba(46,90,175,0.22)]"
                  : option.available
                    ? "border-[#cfe0f7] bg-white/68 text-[#356fcb] hover:bg-white"
                    : "cursor-not-allowed border-[#d9e2ef] bg-[#edf2f8]/70 text-[#9aacc7]"
              }`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {showPickupPointSelector ? (
        <PickupPointSelector
          chargeableWeight={chargeableWeight}
          city={city}
          value={selectedPickupPoint}
          onChange={onPickupPointChange}
        />
      ) : null}
      {unavailableReasons.length ? (
        <p className="mt-2 text-xs font-bold leading-5 text-[#7891b5]">{unavailableReasons.join(" ")}</p>
      ) : null}
    </div>
  );
}

function PickupPointSelector({
  chargeableWeight,
  city,
  value,
  onChange,
}: {
  chargeableWeight: number;
  city: CityKey;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const points = cityPickupPoints[city] ?? [];
  const availablePoints = getAvailablePickupPoints(city, chargeableWeight);
  const selectedPoint = getSelectedPickupPoint(city, value, chargeableWeight);
  const selectedKey = selectedPoint ? getPickupPointKey(selectedPoint) : "";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!selectedPoint) {
    return null;
  }

  if (availablePoints.length <= 1) {
    return (
      <div className="mt-2 rounded-2xl border border-[#cfe0f7] bg-white/68 px-3 py-2.5 text-sm font-bold text-[#173862]">
        <span className="block truncate">{selectedPoint.address}</span>
        <span className="block text-xs font-black uppercase tracking-[0.08em] text-[#7891b5]">
          {getPickupPointTypeLabel(selectedPoint)} · {getPickupPointLimitLabel(selectedPoint)}
        </span>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative mt-2 min-w-0">
      <button
        type="button"
        className="flex min-w-0 w-full items-center justify-between gap-3 rounded-2xl border border-[#cfe0f7] bg-white/68 px-3 py-2.5 text-left text-sm font-bold text-[#173862] transition hover:bg-white"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="min-w-0">
          <span className="block truncate">{selectedPoint.address}</span>
          <span className="block text-xs font-black uppercase tracking-[0.08em] text-[#7891b5]">
            {getPickupPointTypeLabel(selectedPoint)} · {getPickupPointLimitLabel(selectedPoint)}
          </span>
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d7e5fb] bg-[linear-gradient(180deg,#f8fbff_0%,#ebf3ff_100%)] text-[#3f74cb] transition ${isOpen ? "rotate-180 border-[#bfd5f7]" : ""}`}
        >
          <ChevronDownIcon />
        </span>
      </button>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+10px)] z-30 origin-top rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(235,244,255,0.96)_100%)] p-2 shadow-[0_30px_55px_rgba(24,66,140,0.2)] backdrop-blur-xl transition duration-200 ${isOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}
      >
        <div className="max-h-72 space-y-1 overflow-y-auto pr-1" role="listbox">
          {points.map((point) => {
            const pointKey = getPickupPointKey(point);
            const selected = pointKey === selectedKey;
            const available = isPickupPointAvailable(point, chargeableWeight);

            return (
              <button
                key={pointKey}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={!available}
                className={`flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-3 text-left transition ${
                  selected
                    ? "bg-[linear-gradient(135deg,#4f8fe8_0%,#3e76cf_100%)] text-white shadow-[0_16px_28px_rgba(46,90,175,0.24)]"
                    : available
                      ? "bg-white/55 text-[#173862] hover:bg-white/92 hover:shadow-[0_12px_22px_rgba(34,78,154,0.12)]"
                      : "cursor-not-allowed bg-[#edf2f8]/74 text-[#9aacc7]"
                }`}
                onClick={() => {
                  if (!available) {
                    return;
                  }

                  onChange(pointKey);
                  setIsOpen(false);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{point.address}</span>
                  <span className={`block text-xs font-black uppercase tracking-[0.08em] ${selected ? "text-white/78" : "text-[#7891b5]"}`}>
                    {getPickupPointTypeLabel(point)} · {getPickupPointLimitLabel(point)}
                  </span>
                </span>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                    selected ? "border-white/35 bg-white/18 text-white" : "border-[#d7e4f7] bg-white/72 text-[#7e95ba]"
                  }`}
                >
                  {selected ? <CheckIcon /> : <DotIcon />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SelectedDeliveryLine({
  label,
  leg,
}: {
  label: string;
  leg: DeliveryLegResolution;
}) {
  const modeLabel = leg.label;

  return (
    <div>
      {label}: <span className="text-[#173862]">{modeLabel}</span>
      {leg.kind === "pickup" ? (
        <>
          <span className="block text-xs font-semibold leading-5 text-[#7891b5]">{leg.point.address}</span>
          {leg.note ? <span className="block text-xs font-semibold leading-5 text-[#7891b5]">{leg.note}</span> : null}
        </>
      ) : leg.note ? (
        <span className="block text-xs font-semibold leading-5 text-[#7891b5]">{leg.note}</span>
      ) : null}
    </div>
  );
}

function ResultMessage({ status }: { status: "empty" | "same-route" | "no-route" }) {
  const message =
    status === "same-route"
      ? "Выберите разные города отправления и назначения."
      : status === "no-route"
        ? "Для выбранного направления нет коэффициента в тарифной матрице."
        : "Введите вес или габариты, чтобы увидеть расчёт.";

  return <div className="mt-3 rounded-2xl bg-white/70 p-3 text-sm font-bold leading-6 text-[#587295]">{message}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/70 p-3">
      <div className="truncate text-xs font-black uppercase tracking-[0.14em] text-[#7891b5]">{label}</div>
      <div className="mt-1 break-words text-base font-black text-[#173862]">{value}</div>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: number }) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-[#d8e6f8] pb-3 last:border-b-0 last:pb-0">
      <span className="min-w-0 text-sm font-bold text-[#587295]">{label}</span>
      <span className="shrink-0 text-base font-black text-[#173862]">{formatMoney(value)}</span>
    </div>
  );
}

function ModernSelect<T extends string>({
  disabled = false,
  options,
  value,
  onChange,
}: {
  disabled?: boolean;
  options: Array<SelectOption<T>>;
  value: T;
  onChange: (value: T) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen || disabled) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [disabled, isOpen]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  return (
    <div ref={rootRef} className="relative mt-1.5 min-w-0">
      <button
        type="button"
        disabled={disabled}
        className="flex min-w-0 w-full items-center justify-between gap-3 rounded-[18px] bg-transparent text-left text-base font-bold text-[#173862] outline-none disabled:pointer-events-none"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="truncate">{selectedOption.label}</span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d7e5fb] bg-[linear-gradient(180deg,#f8fbff_0%,#ebf3ff_100%)] text-[#3f74cb] shadow-[0_8px_18px_rgba(47,96,184,0.12)] transition ${isOpen ? "rotate-180 border-[#bfd5f7]" : ""}`}
        >
          <ChevronDownIcon />
        </span>
      </button>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+12px)] z-30 origin-top rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(235,244,255,0.94)_100%)] p-2.5 shadow-[0_30px_55px_rgba(24,66,140,0.2)] backdrop-blur-xl transition duration-200 ${isOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}
      >
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1" role="listbox">
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex w-full items-center justify-between gap-3 rounded-[16px] px-4 py-3 text-left transition ${
                  selected
                    ? "bg-[linear-gradient(135deg,#4f8fe8_0%,#3e76cf_100%)] text-white shadow-[0_16px_28px_rgba(46,90,175,0.24)]"
                    : "bg-white/55 text-[#173862] hover:bg-white/92 hover:shadow-[0_12px_22px_rgba(34,78,154,0.12)]"
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span className="truncate text-[15px] font-semibold">{option.label}</span>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                    selected ? "border-white/35 bg-white/18 text-white" : "border-[#d7e4f7] bg-white/72 text-[#7e95ba]"
                  }`}
                >
                  {selected ? <CheckIcon /> : <DotIcon />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ToggleField({
  checked,
  disabled = false,
  icon,
  label,
  offText,
  onText,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  offText: string;
  onText: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="calculator-field-shell flex min-w-0 items-center gap-3 rounded-[22px] border border-white/58 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(240,246,255,0.9)_100%)] px-4 py-2.5 text-[#173862] shadow-[0_16px_30px_rgba(28,78,160,0.12),inset_0_1px_0_rgba(255,255,255,0.75)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#edf5ff_0%,#dce9ff_100%)] text-[#3c75d0] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#17212f]">{label}</span>
        <button
          type="button"
          disabled={disabled}
          className="mt-1.5 flex w-full items-center justify-between gap-3 text-left text-base font-bold text-[#173862]"
          onClick={() => onChange(!checked)}
        >
          <span>{checked ? onText : offText}</span>
          <span
            className={`flex h-8 w-14 items-center rounded-full p-1 transition ${checked ? "bg-[#4f8fe8]" : "bg-[#d9e6f7]"}`}
          >
            <span className={`h-6 w-6 rounded-full bg-white shadow transition ${checked ? "translate-x-6" : ""}`} />
          </span>
        </button>
      </div>
    </div>
  );
}

function FieldShell({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="calculator-field-shell flex min-w-0 items-center gap-3 rounded-[22px] border border-white/58 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(240,246,255,0.9)_100%)] px-4 py-2.5 text-[#173862] shadow-[0_16px_30px_rgba(28,78,160,0.12),inset_0_1px_0_rgba(255,255,255,0.75)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#edf5ff_0%,#dce9ff_100%)] text-[#3c75d0] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#17212f]">{label}</span>
        {children}
      </div>
    </div>
  );
}

function DotPattern() {
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

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">
      <path d="M12 21s6-5.7 6-10.3A6 6 0 1 0 6 10.7C6 15.3 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

function WeightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">
      <path d="M8.4 7.4 10.2 4h3.6l1.8 3.4" />
      <path d="M6 8h12l1 10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L6 8Z" />
      <path d="M12 11.5v4" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">
      <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function CargoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">
      <path d="M3.5 8.2 12 3l8.5 5.2v7.6L12 21l-8.5-5.2V8.2Z" />
      <path d="M12 3v18" />
      <path d="m3.5 8.2 8.5 5.1 8.5-5.1" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 9.5V20h11V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

function StairsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">
      <path d="M4 19h5v-4h5v-4h6" />
      <path d="M4 15h5v-4h5V7h6" />
    </svg>
  );
}

function LiftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M10 8h4" />
      <path d="M12 11v5" />
      <path d="m9.8 13.2 2.2-2.2 2.2 2.2" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">
      <path d="M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M18 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M8.6 13.4 15.4 9" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" aria-hidden="true">
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function FormIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 12h7" />
      <path d="M8.5 16h5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.2 19.2 0 0 1-5.9-5.9A19.7 19.7 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" aria-hidden="true">
      <path d="m5 12.5 4.2 4.2L19 7.8" />
    </svg>
  );
}

function DotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
    </svg>
  );
}
