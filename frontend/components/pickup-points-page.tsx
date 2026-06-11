"use client";

import { useEffect, useRef, useState } from "react";

import { SarmaExpressHeader } from "@/components/sarma-express-header";
import { pickupPointOptions } from "shared";

type PickupPoint = {
  id: string;
  city: string;
  pointType: string;
  address: string;
  hours: string;
  contact: string;
  coordinates?: [number, number];
  geocodeQuery?: string;
};

type MapStatus = "idle" | "loading" | "ready" | "error" | "no-key";

type YMapsNamespace = {
  ready: (callback: () => void) => void;
  Map: new (
    element: HTMLElement,
    state: {
      center: [number, number];
      zoom: number;
      controls?: string[];
    },
    options?: Record<string, unknown>,
  ) => YMapInstance;
  Placemark: new (
    coordinates: [number, number],
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => YPlacemark;
  geocode: (
    request: string,
    options?: {
      results?: number;
    },
  ) => Promise<{
    geoObjects: {
      get: (index: number) => {
        geometry: {
          getCoordinates: () => [number, number];
        };
      } | null;
    };
  }>;
};

type YMapInstance = {
  destroy: () => void;
  setBounds: (bounds: [[number, number], [number, number]], options?: Record<string, unknown>) => Promise<unknown>;
  setCenter: (center: [number, number], zoom?: number, options?: Record<string, unknown>) => Promise<unknown>;
  geoObjects: {
    add: (placemark: YPlacemark) => void;
  };
};

type YPlacemark = {
  balloon: {
    open: () => void;
  };
  events: {
    add: (eventName: string, handler: () => void) => void;
  };
  options: {
    set: (key: string, value: unknown) => void;
  };
};

declare global {
  interface Window {
    ymaps?: YMapsNamespace;
    __yandexMapsLoader?: Promise<YMapsNamespace>;
  }
}

const pickupPointCoordinates: Partial<Record<(typeof pickupPointOptions)[number]["id"], [number, number]>> = {
  chelyuskintsev_donetsk: [48.0081003, 37.8078437],
  kubysheva_warehouse: [47.9949161, 37.7690267],
  mendeleeva_volnovakha: [47.5155566, 37.5341609],
  ostrovskogo_makeevka: [48.0436158, 37.965839],
  grushevskogo_mariupol: [47.120196, 37.5122688],
};

const pickupPoints: PickupPoint[] = pickupPointOptions.map((point) => ({
  id: point.id,
  city: point.city,
  pointType: point.pointType,
  address: point.address,
  hours: point.hours,
  contact: point.contact,
  coordinates: pickupPointCoordinates[point.id],
  geocodeQuery: `${point.city}, ${point.address}`,
}));

const initialPickupPointId = pickupPoints[0]?.id ?? "";
const defaultMapCenter: [number, number] = [47.9936, 37.8026];
const defaultZoom = 8;
const yandexMapsApiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

export function PickupPointsPage() {
  const [activePointId, setActivePointId] = useState(initialPickupPointId);
  const [searchValue, setSearchValue] = useState("");
  const [mapStatus, setMapStatus] = useState<MapStatus>(yandexMapsApiKey ? "idle" : "no-key");

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<YMapInstance | null>(null);
  const pointCoordsRef = useRef(new Map<string, [number, number]>());
  const placemarksRef = useRef(new Map<string, YPlacemark>());

  const filteredPoints = pickupPoints.filter((point) => {
    const search = searchValue.trim().toLowerCase();

    if (!search) {
      return true;
    }

    return `${point.city} ${point.pointType} ${point.address} ${point.hours} ${point.contact}`.toLowerCase().includes(search);
  });

  const visibleActivePointId = filteredPoints.some((point) => point.id === activePointId)
    ? activePointId
    : (filteredPoints[0]?.id ?? "");

  useEffect(() => {
    const apiKey = yandexMapsApiKey;
    const pointCoords = pointCoordsRef.current;
    const placemarks = placemarksRef.current;

    if (!apiKey) {
      return;
    }

    let isCancelled = false;

    async function initMap() {
      if (!mapContainerRef.current || !apiKey) {
        return;
      }

      try {
        setMapStatus("loading");

        const ymaps = await loadYandexMaps(apiKey);
        if (isCancelled || !mapContainerRef.current) {
          return;
        }

        const map = new ymaps.Map(
          mapContainerRef.current,
          {
            center: defaultMapCenter,
            zoom: defaultZoom,
            controls: ["zoomControl", "fullscreenControl"],
          },
          {
            suppressMapOpenBlock: true,
          },
        );

        mapRef.current = map;
        pointCoords.clear();
        placemarks.clear();

        const resolvedCoords: [number, number][] = [];

        for (const point of pickupPoints) {
          const coordinates = point.coordinates ?? (await resolvePointCoordinates(ymaps, point.geocodeQuery));

          if (!coordinates) {
            continue;
          }

          resolvedCoords.push(coordinates);
          pointCoords.set(point.id, coordinates);

          const placemark = new ymaps.Placemark(
            coordinates,
            {
              balloonContentHeader: `${point.city}, ${point.pointType}`,
              balloonContentBody: `<strong>${point.address}</strong><br/>${point.hours}<br/>${point.contact}`,
              hintContent: `${point.city}, ${point.pointType}, ${point.address}`,
            },
            {
              preset: point.id === initialPickupPointId ? "islands#darkBlueCircleDotIcon" : "islands#blueCircleDotIcon",
              hideIconOnBalloonOpen: false,
            },
          );

          placemark.events.add("click", () => {
            setActivePointId(point.id);
          });

          map.geoObjects.add(placemark);
          placemarks.set(point.id, placemark);
        }

        if (resolvedCoords.length > 1) {
          void map.setBounds(getBoundsFromCoords(resolvedCoords), { checkZoomRange: true });
        } else if (resolvedCoords.length === 1) {
          void map.setCenter(resolvedCoords[0], 14, { duration: 200 });
        }

        if (placemarks.get(initialPickupPointId)) {
          placemarks.get(initialPickupPointId)?.balloon.open();
        }

        setMapStatus("ready");
      } catch {
        if (!isCancelled) {
          setMapStatus("error");
        }
      }
    }

    void initMap();

    return () => {
      isCancelled = true;

      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }

      pointCoords.clear();
      placemarks.clear();
    };
  }, []);

  useEffect(() => {
    if (!visibleActivePointId) {
      return;
    }

    placemarksRef.current.forEach((placemark, pointId) => {
      placemark.options.set("preset", pointId === visibleActivePointId ? "islands#darkBlueCircleDotIcon" : "islands#blueCircleDotIcon");
    });

    const activeCoords = pointCoordsRef.current.get(visibleActivePointId);
    const activePlacemark = placemarksRef.current.get(visibleActivePointId);

    if (activeCoords && activePlacemark && mapRef.current) {
      void mapRef.current.setCenter(activeCoords, 14, { duration: 260, checkZoomRange: true });
      activePlacemark.balloon.open();
    }
  }, [visibleActivePointId]);

  return (
    <main className="min-h-screen bg-[#edf2f8] text-[#12243f]">
      <SarmaExpressHeader activeItem="pickup-points" />

      <section
        className="relative overflow-hidden bg-[#4a8de7] bg-cover bg-[position:70%_center] bg-no-repeat"
        style={{ backgroundImage: "url('/brand/hero-background.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(39,102,203,0.95)_0%,rgba(74,141,231,0.86)_34%,rgba(164,206,249,0.2)_66%,rgba(255,255,255,0.02)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.48),transparent_14%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]" />
        <div className="absolute -left-20 top-1/2 h-[620px] w-[620px] -translate-y-1/2 rounded-full border border-white/16" />

        <div className="relative mx-auto w-full max-w-[1320px] px-4 py-12 lg:px-6 lg:py-16">
          <div className="max-w-[760px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/36 bg-white/12 px-4 py-2 text-sm font-semibold text-white/92 backdrop-blur-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9fd0ff]" />
              Карта пунктов выдачи
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] text-white drop-shadow-[0_16px_34px_rgba(20,56,120,0.22)] sm:text-5xl lg:text-[4rem]">
              Выберите
              <br />
              ближайший пункт
            </h1>

            <p className="mt-5 max-w-[640px] text-base leading-7 text-white/86 sm:text-lg">
              Нажмите на адрес в списке, чтобы открыть точку на карте и посмотреть адрес, график работы и контакт.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <aside className="rounded-[30px] border border-white/46 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.66)_100%)] p-5 text-[#12315b] shadow-[0_28px_80px_rgba(39,77,146,0.18)] backdrop-blur-[18px] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#4677cf]">Адреса</p>
                  <h2 className="mt-2 text-3xl font-extrabold leading-tight text-[#13345f]">Пункты выдачи</h2>
                </div>
                <span className="inline-flex rounded-full bg-[#e8f1ff] px-3 py-1 text-xs font-bold text-[#3564bc]">
                  {filteredPoints.length} точек
                </span>
              </div>

              <div className="mt-5 rounded-[22px] border border-[#d9e5f8] bg-white/86 px-4 py-3">
                <label className="block text-xs font-black uppercase tracking-[0.18em] text-[#6f8db9]">Поиск по адресу</label>
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Например, Донецк"
                  className="mt-2 w-full border-none bg-transparent p-0 text-base font-semibold text-[#153964] placeholder:text-[#88a1c5] focus:outline-none"
                />
              </div>

              <div className="mt-5 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {filteredPoints.map((point) => {
                  const isActive = point.id === visibleActivePointId;

                  return (
                    <button
                      key={point.id}
                      type="button"
                      onClick={() => setActivePointId(point.id)}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all ${
                        isActive
                          ? "border-[#9ec0ff] bg-[#eef5ff] shadow-[0_18px_30px_rgba(68,117,194,0.14)]"
                          : "border-[#d7e4f7] bg-white/86 hover:border-[#b8cff3] hover:bg-white"
                      }`}
                    >
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6b8bb8]">
                        {point.city} · {point.pointType}
                      </p>
                      <p className="mt-2 text-[1.02rem] font-semibold leading-7 text-[#123763]">
                        {point.city}, {point.address}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#5b7398]">{point.hours}</p>
                      <p className="mt-1 text-sm font-bold text-[#3564bc]">{point.contact}</p>
                    </button>
                  );
                })}

                {filteredPoints.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#c8d8f3] bg-white/55 px-4 py-5 text-sm leading-6 text-[#58739d]">
                    По вашему запросу адресов не найдено.
                  </div>
                ) : null}
              </div>
            </aside>

            <div className="rounded-[32px] border border-white/46 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.66)_100%)] p-3 shadow-[0_28px_80px_rgba(39,77,146,0.18)] backdrop-blur-[18px] sm:p-4">
              <div className="relative overflow-hidden rounded-[26px] border border-[#d7e5fb] bg-[#dce9fb]">
                <div ref={mapContainerRef} className="h-[620px] w-full" />

                {mapStatus !== "ready" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,rgba(231,240,255,0.92)_0%,rgba(244,248,255,0.86)_100%)] p-6 text-center">
                    <div className="max-w-[420px]">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e7f0ff] text-[#3266bd]">
                        <MapPinIcon />
                      </div>

                      <h3 className="mt-5 text-2xl font-extrabold text-[#163963]">
                        {mapStatus === "loading" && "Загружаем карту"}
                        {mapStatus === "error" && "Карта временно недоступна"}
                        {mapStatus === "no-key" && "Подключите ключ Яндекс Карт"}
                        {mapStatus === "idle" && "Подготавливаем карту"}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-[#4d6d98]">
                        {mapStatus === "loading" && "Адреса уже доступны в списке слева. Карта появится сразу после загрузки API и инициализации точек."}
                        {mapStatus === "error" &&
                          "Список адресов продолжает работать. Проверьте корректность ключа Яндекс Карт и доступность загрузки внешнего скрипта."}
                        {mapStatus === "no-key" &&
                          "Добавьте NEXT_PUBLIC_YANDEX_MAPS_API_KEY в переменные окружения фронтенда, и карта включится на этой странице."}
                        {mapStatus === "idle" && "Инициализация интерфейса карты."}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

async function resolvePointCoordinates(ymaps: YMapsNamespace, geocodeQuery?: string) {
  if (!geocodeQuery) {
    return null;
  }

  const result = await ymaps.geocode(geocodeQuery, { results: 1 });
  const firstGeoObject = result.geoObjects.get(0);
  return firstGeoObject?.geometry.getCoordinates() ?? null;
}

function loadYandexMaps(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Yandex Maps can only be loaded in the browser."));
  }

  if (window.ymaps) {
    return new Promise<YMapsNamespace>((resolve) => {
      window.ymaps?.ready(() => resolve(window.ymaps as YMapsNamespace));
    });
  }

  if (window.__yandexMapsLoader) {
    return window.__yandexMapsLoader;
  }

  window.__yandexMapsLoader = new Promise<YMapsNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-yandex-maps="true"]');

    const onLoad = () => {
      if (!window.ymaps) {
        reject(new Error("Yandex Maps API did not initialize."));
        return;
      }

      window.ymaps.ready(() => resolve(window.ymaps as YMapsNamespace));
    };

    const onError = () => {
      reject(new Error("Failed to load Yandex Maps API."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", onLoad, { once: true });
      existingScript.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.defer = true;
    script.dataset.yandexMaps = "true";
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });

  return window.__yandexMapsLoader;
}

function getBoundsFromCoords(coords: [number, number][]): [[number, number], [number, number]] {
  const [firstLat, firstLng] = coords[0];

  let minLat = firstLat;
  let maxLat = firstLat;
  let minLng = firstLng;
  let maxLng = firstLng;

  for (const [lat, lng] of coords) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s6-5.7 6-10.3A6 6 0 1 0 6 10.7C6 15.3 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}
