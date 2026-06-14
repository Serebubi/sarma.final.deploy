export type CityKey =
  | "rostov"
  | "donetsk"
  | "mariupol"
  | "volnovakha"
  | "makeevka"
  | "gorlovka"
  | "lugansk"
  | "berdyansk"
  | "melitopol"
  | "genichesk"
  | "moscow";

export type PickupPointType = "pvz" | "warehouse";

export type CargoCategory =
  | "Малая"
  | "Стандартная"
  | "Средняя"
  | "Крупная"
  | "Тяжёлая"
  | "Сверхтяжёлая";

export type TariffBand = {
  min: number;
  max: number;
  label: string;
  baseTariff: number;
  category: CargoCategory;
};

export type CourierTariff = {
  fixed: number;
  loaders: number;
  stairPerFloor: number;
  elevatorFee: number;
  destination: string;
};

export type CityPickupPoint = {
  type: PickupPointType;
  label: string;
  address: string;
  thresholdKg?: number;
  hours: string;
  contact: string;
};

export const cities: Array<{ key: CityKey; label: string; matrixLabel: string }> = [
  { key: "rostov", label: "Ростов-на-Дону", matrixLabel: "Ростов" },
  { key: "donetsk", label: "Донецк", matrixLabel: "Донецк" },
  { key: "mariupol", label: "Мариуполь", matrixLabel: "Мариуполь" },
  { key: "volnovakha", label: "Волноваха", matrixLabel: "Волноваха" },
  { key: "makeevka", label: "Макеевка", matrixLabel: "Макеевка" },
  { key: "gorlovka", label: "Горловка", matrixLabel: "Горловка" },
  { key: "lugansk", label: "Луганск", matrixLabel: "Луганск" },
  { key: "berdyansk", label: "Бердянск", matrixLabel: "Бердянск" },
  { key: "melitopol", label: "Мелитополь", matrixLabel: "Мелитополь" },
  { key: "genichesk", label: "Геническ", matrixLabel: "Геническ" },
  { key: "moscow", label: "Москва", matrixLabel: "Москва" },
];

export const pickupPointTypeLabels: Record<PickupPointType, string> = {
  pvz: "ПВЗ",
  warehouse: "Склад",
};

export const cityPickupPoints: Partial<Record<CityKey, CityPickupPoint[]>> = {
  donetsk: [
    {
      type: "pvz",
      label: "ПВЗ",
      address: "ул. Челюскинцев, 184",
      thresholdKg: 30,
      hours: "Пн–Пт 09:00–18:00, Сб 10:00–15:00, Вс — выходной",
      contact: "7 (949) 539-60-30",
    },
    {
      type: "warehouse",
      label: "Склад",
      address: "ул. Куйбышева, 70/13 (Стройдеревня, 8 склад)",
      hours: "Пн–Пт 08:00–17:00, Сб 10:00–15:00, Вс — выходной",
      contact: "7 (949) 050-22-48",
    },
  ],
  volnovakha: [
    {
      type: "pvz",
      label: "ПВЗ",
      address: "ул. Менделеева, 14",
      thresholdKg: 100,
      hours: "Пн 10:00–18:00, Вт–Сб 09:00–18:00, Вс — выходной",
      contact: "7 (949) 619-66-42",
    },
  ],
  makeevka: [
    {
      type: "pvz",
      label: "ПВЗ",
      address: "ул. Островского, 3/18",
      thresholdKg: 15,
      hours: "Вт–Пт 09:00–18:00, Сб 09:00–15:00",
      contact: "7 (949) 435-16-70",
    },
  ],
  gorlovka: [
    {
      type: "pvz",
      label: "ПВЗ",
      address: "пр. Победы, 16",
      thresholdKg: 30,
      hours: "Пн–Пт 09:00–16:00, Сб–Вс 09:00–15:00",
      contact: "7 (949) 854-25-63",
    },
    {
      type: "warehouse",
      label: "Склад",
      address: "ул. Интернациональная, 76",
      hours: "Пн–Пт 09:00–17:00, Сб 10:00–14:00, Вс — выходной",
      contact: "7 (949) 053-62-63",
    },
  ],
  melitopol: [
    {
      type: "pvz",
      label: "ПВЗ",
      address: "ул. Горького, 55",
      thresholdKg: 25,
      hours: "Пн–Пт 09:30–17:00, перерыв 13:00–13:30; Сб 09:30–14:30, Вс — выходной",
      contact: "7 (990) 000-42-81",
    },
  ],
  rostov: [
    {
      type: "warehouse",
      label: "Склад",
      address: "ул. Арсенальная 1, Вавилова (71Ж/2)",
      hours: "Ежедневно, 10:00–19:00",
      contact: "7 (989) 500-00-38",
    },
  ],
  mariupol: [
    {
      type: "pvz",
      label: "ПВЗ",
      address: "60 лет СССР, дом 8",
      thresholdKg: 50,
      hours: "Пн–Сб, 10:00–19:00",
      contact: "7 (949) 513-48-48",
    },
  ],
};

export const tariffBands: TariffBand[] = [
  { min: 0, max: 1, label: "до 1 кг", baseTariff: 350, category: "Малая" },
  { min: 1.000001, max: 1.9, label: "от 1 до 1,9 кг", baseTariff: 450, category: "Малая" },
  { min: 1.900001, max: 2.9, label: "от 2 до 2,9 кг", baseTariff: 550, category: "Малая" },
  { min: 2.900001, max: 4.9, label: "от 3 до 4,9 кг", baseTariff: 650, category: "Стандартная" },
  { min: 4.900001, max: 6.9, label: "от 5 до 6,9 кг", baseTariff: 750, category: "Стандартная" },
  { min: 6.900001, max: 7.9, label: "от 7 до 7,9 кг", baseTariff: 850, category: "Стандартная" },
  { min: 7.900001, max: 9.9, label: "от 8 до 9,9 кг", baseTariff: 950, category: "Стандартная" },
  { min: 9.900001, max: 11.9, label: "от 10 до 11,9 кг", baseTariff: 1150, category: "Стандартная" },
  { min: 11.900001, max: 14.9, label: "от 12 до 14,9 кг", baseTariff: 1350, category: "Стандартная" },
  { min: 14.900001, max: 15.9, label: "от 15 до 15,9 кг", baseTariff: 1450, category: "Средняя" },
  { min: 15.900001, max: 19.9, label: "от 16 до 19,9 кг", baseTariff: 1650, category: "Средняя" },
  { min: 19.900001, max: 24.9, label: "от 20 до 24,9 кг", baseTariff: 1750, category: "Средняя" },
  { min: 24.900001, max: 29.9, label: "от 25 до 29,9 кг", baseTariff: 1950, category: "Крупная" },
  { min: 29.900001, max: 39.9, label: "от 30 до 39,9 кг", baseTariff: 2150, category: "Крупная" },
  { min: 39.900001, max: 49.9, label: "от 40 до 49,9 кг", baseTariff: 2300, category: "Крупная" },
  { min: 49.900001, max: 59.9, label: "от 50 до 59,9 кг", baseTariff: 2500, category: "Крупная" },
  { min: 59.900001, max: 79.9, label: "от 60 до 79,9 кг", baseTariff: 2700, category: "Крупная" },
  { min: 79.900001, max: 99.9, label: "от 80 до 99,9 кг", baseTariff: 3000, category: "Тяжёлая" },
  { min: 99.900001, max: 149.9, label: "от 100 до 149,9 кг", baseTariff: 3500, category: "Тяжёлая" },
  { min: 149.900001, max: 199.9, label: "от 150 до 199,9 кг", baseTariff: 4200, category: "Сверхтяжёлая" },
  { min: 199.900001, max: 299.9, label: "от 200 до 299,9 кг", baseTariff: 5200, category: "Сверхтяжёлая" },
  { min: 299.900001, max: 399.9, label: "от 300 до 399,9 кг", baseTariff: 6500, category: "Сверхтяжёлая" },
  { min: 399.900001, max: 499.9, label: "от 400 до 499,9 кг", baseTariff: 7800, category: "Сверхтяжёлая" },
];

export const routeCoefficients: Record<CityKey, Partial<Record<CityKey, number>>> = {
  rostov: { donetsk: 1, mariupol: 1, volnovakha: 0.9, makeevka: 1, gorlovka: 1, lugansk: 1, berdyansk: 1.6, melitopol: 2, genichesk: 2.3 },
  donetsk: { rostov: 1, mariupol: 0.6, volnovakha: 0.5, makeevka: 0.5, gorlovka: 0.5, lugansk: 0.8, berdyansk: 1, melitopol: 1.4, genichesk: 1.7 },
  mariupol: { rostov: 1, donetsk: 0.6, volnovakha: 0.5, makeevka: 0.6, gorlovka: 0.7, lugansk: 1.2, berdyansk: 0.5, melitopol: 0.8, genichesk: 1 },
  volnovakha: { rostov: 0.9, donetsk: 0.5, mariupol: 0.5, makeevka: 0.5, gorlovka: 0.5, lugansk: 1, berdyansk: 0.7, melitopol: 1, genichesk: 1.4 },
  makeevka: { rostov: 1, donetsk: 0.5, mariupol: 0.6, volnovakha: 0.5, gorlovka: 0.5, lugansk: 0.9, berdyansk: 1, melitopol: 1.4, genichesk: 1.8 },
  gorlovka: { rostov: 1, donetsk: 0.5, mariupol: 0.7, volnovakha: 0.5, makeevka: 0.5, lugansk: 0.7, berdyansk: 1.2, melitopol: 1.5, genichesk: 1.9 },
  lugansk: { rostov: 1, donetsk: 0.8, mariupol: 1.2, volnovakha: 1, makeevka: 0.9, gorlovka: 0.7, berdyansk: 1.8, melitopol: 2.1, genichesk: 2.5 },
  berdyansk: { rostov: 1.6, donetsk: 1, mariupol: 0.5, volnovakha: 0.7, makeevka: 1, gorlovka: 1.2, lugansk: 1.8, melitopol: 0.6, genichesk: 0.9 },
  melitopol: { rostov: 2, donetsk: 1.4, mariupol: 0.8, volnovakha: 1, makeevka: 1.4, gorlovka: 1.5, lugansk: 2.1, berdyansk: 0.6, genichesk: 0.5 },
  genichesk: { rostov: 2.3, donetsk: 1.7, mariupol: 1, volnovakha: 1.4, makeevka: 1.8, gorlovka: 1.9, lugansk: 2.5, berdyansk: 0.9, melitopol: 0.5 },
  moscow: {},
};

export const routeTerms: Record<string, string> = {
  "rostov->donetsk": "1-2 дня",
  "rostov->mariupol": "1-2 дня",
  "rostov->volnovakha": "1-2 дня",
  "rostov->makeevka": "2–3 дня",
  "rostov->gorlovka": "2 раза в неделю",
  "rostov->lugansk": "2 раза в неделю",
  "rostov->berdyansk": "1 раз в неделю",
  "rostov->melitopol": "1 раз в неделю",
  "rostov->genichesk": "1 раз в неделю",
  "donetsk->rostov": "1-2 дня",
  "donetsk->mariupol": "1-2 дня",
  "donetsk->volnovakha": "1-2 дня",
  "donetsk->makeevka": "2–3 дня",
  "donetsk->gorlovka": "2 раза в неделю",
  "donetsk->lugansk": "2 раза в неделю",
  "donetsk->berdyansk": "1 раз в неделю",
  "donetsk->melitopol": "1 раз в неделю",
  "donetsk->genichesk": "1 раз в неделю",
  "mariupol->rostov": "1-2 дня",
  "mariupol->donetsk": "1-2 дня",
  "mariupol->volnovakha": "1-2 дня",
  "mariupol->makeevka": "2–3 дня",
  "mariupol->gorlovka": "2 раза в неделю",
  "mariupol->lugansk": "2 раза в неделю",
  "mariupol->berdyansk": "1 раз в неделю",
  "mariupol->melitopol": "1 раз в неделю",
  "mariupol->genichesk": "1 раз в неделю",
  "volnovakha->rostov": "1-2 дня",
  "volnovakha->donetsk": "1-2 дня",
  "volnovakha->mariupol": "2–3 дня",
  "volnovakha->makeevka": "2–3 дня",
  "volnovakha->gorlovka": "2 раза в неделю",
  "volnovakha->lugansk": "2 раза в неделю",
  "volnovakha->berdyansk": "1 раз в неделю",
  "volnovakha->melitopol": "1 раз в неделю",
  "volnovakha->genichesk": "1 раз в неделю",
  "gorlovka->rostov": "2 раза в неделю",
  "gorlovka->donetsk": "2 раза в неделю",
  "gorlovka->mariupol": "2–3 дня",
  "gorlovka->makeevka": "2–3 дня",
  "gorlovka->volnovakha": "2 раза в неделю",
  "gorlovka->lugansk": "2 раза в неделю",
  "gorlovka->berdyansk": "1 раз в неделю",
  "gorlovka->melitopol": "1 раз в неделю",
  "gorlovka->genichesk": "1 раз в неделю",
  "makeevka->rostov": "2–3 дня",
  "makeevka->donetsk": "2–3 дня",
  "makeevka->mariupol": "2–3 дня",
  "makeevka->gorlovka": "2–3 дня",
  "makeevka->volnovakha": "2–3 дня",
  "makeevka->lugansk": "1 раз в неделю",
  "makeevka->berdyansk": "1 раз в неделю",
  "makeevka->melitopol": "1 раз в неделю",
  "makeevka->genichesk": "1 раз в неделю",
  "lugansk->rostov": "2 раза в неделю",
  "lugansk->donetsk": "2 раза в неделю",
  "lugansk->mariupol": "2 раза в неделю",
  "lugansk->gorlovka": "2 раза в неделю",
  "lugansk->volnovakha": "2 раза в неделю",
  "lugansk->makeevka": "2 раза в неделю",
  "lugansk->berdyansk": "2 раза в неделю",
  "lugansk->melitopol": "2 раза в неделю",
  "lugansk->genichesk": "2 раза в неделю",
  "berdyansk->rostov": "1 раз в неделю",
  "berdyansk->donetsk": "1 раз в неделю",
  "berdyansk->mariupol": "1 раз в неделю",
  "berdyansk->gorlovka": "1 раз в неделю",
  "berdyansk->volnovakha": "1 раз в неделю",
  "berdyansk->makeevka": "1 раз в неделю",
  "berdyansk->lugansk": "1 раз в неделю",
  "berdyansk->melitopol": "1 раз в неделю",
  "berdyansk->genichesk": "1 раз в неделю",
  "melitopol->rostov": "1 раз в неделю",
  "melitopol->donetsk": "1 раз в неделю",
  "melitopol->mariupol": "1 раз в неделю",
  "melitopol->gorlovka": "1 раз в неделю",
  "melitopol->volnovakha": "1 раз в неделю",
  "melitopol->makeevka": "1 раз в неделю",
  "melitopol->lugansk": "1 раз в неделю",
  "melitopol->berdyansk": "1 раз в неделю",
  "melitopol->genichesk": "1 раз в неделю",
  "genichesk->rostov": "1 раз в неделю",
  "genichesk->donetsk": "1 раз в неделю",
  "genichesk->mariupol": "1 раз в неделю",
  "genichesk->gorlovka": "1 раз в неделю",
  "genichesk->volnovakha": "1 раз в неделю",
  "genichesk->makeevka": "1 раз в неделю",
  "genichesk->lugansk": "1 раз в неделю",
  "genichesk->berdyansk": "1 раз в неделю",
  "genichesk->melitopol": "1 раз в неделю",
};

export const courierTariffs: Record<CargoCategory, CourierTariff> = {
  Малая: { fixed: 300, loaders: 0, stairPerFloor: 0, elevatorFee: 0, destination: "до двери" },
  Стандартная: { fixed: 400, loaders: 0, stairPerFloor: 0, elevatorFee: 0, destination: "до двери" },
  Средняя: { fixed: 700, loaders: 500, stairPerFloor: 50, elevatorFee: 0, destination: "до подъезда" },
  Крупная: { fixed: 1000, loaders: 1000, stairPerFloor: 100, elevatorFee: 0, destination: "до подъезда" },
  Тяжёлая: { fixed: 1500, loaders: 1000, stairPerFloor: 350, elevatorFee: 0, destination: "до подъезда" },
  Сверхтяжёлая: { fixed: 2000, loaders: 2000, stairPerFloor: 500, elevatorFee: 0, destination: "до подъезда" },
};

export function getCityLabel(key: CityKey) {
  return cities.find((city) => city.key === key)?.label ?? key;
}

export function getAvailablePickupPointTypes(city: CityKey) {
  return Array.from(new Set((cityPickupPoints[city] ?? []).map((point) => point.type)));
}

export function getPickupPoint(city: CityKey, type: PickupPointType | null) {
  if (!type) {
    return undefined;
  }

  return cityPickupPoints[city]?.find((point) => point.type === type);
}

export function getTariffBand(weight: number) {
  return tariffBands.find((band) => weight >= band.min && weight <= band.max);
}

export function getRouteTerm(from: CityKey, to: CityKey) {
  return routeTerms[`${from}->${to}`] ?? "Срок уточняется";
}
