import Link from "next/link";

import { SarmaExpressHeader } from "@/components/sarma-express-header";

const featureCards = [
  { title: "Ежедневные рейсы", icon: DeliveryIcon },
  { title: "Работаем с B2B и частными клиентами", icon: HandshakeIcon },
  { title: "Доставка от 24 часов", icon: TimeIcon },
  { title: "Склады и пункты выдачи", icon: PinIcon },
];

export function SarmaExpressPage() {
  return (
    <main className="min-h-screen bg-[#edf2f8] text-[#12243f]">
      <SarmaExpressHeader />

      <section
        className="relative overflow-hidden bg-[#3f84e6] bg-cover bg-[position:72%_center] bg-no-repeat"
        style={{ backgroundImage: "url('/brand/hero-background.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(43,107,210,0.9)_0%,rgba(65,136,229,0.72)_30%,rgba(90,157,239,0.28)_54%,rgba(138,190,248,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.24),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]" />
        <div className="absolute left-0 right-0 top-[66%] h-[3px] bg-[linear-gradient(90deg,rgba(255,255,255,0.1),rgba(255,255,255,0.52),rgba(255,255,255,0.14))] blur-[1px]" />

        <div className="relative mx-auto grid min-h-[620px] w-full max-w-[1240px] gap-12 px-4 pb-32 pt-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(500px,1.05fr)] lg:px-6 lg:pb-40 lg:pt-16">
          <div className="z-10 flex flex-col justify-center">
            <h1 className="max-w-[620px] text-4xl font-extrabold leading-[1.15] text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.16)] sm:text-5xl lg:text-[4.15rem]">
              Доставка и грузоперевозки
              <br />
              по России
            </h1>

            <p className="mt-5 inline-block w-fit max-w-[540px] bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.12)_12%,rgba(255,255,255,0.22)_86%,rgba(255,255,255,0)_100%)] px-4 py-2 text-sm font-bold text-[#0e2243] sm:text-lg">
              Доставка из интернет-магазинов, отправления по РФ, сборные грузы и полная загрузка
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/calculator"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2f57c0_0%,#2245a9_100%)] px-9 text-lg font-extrabold text-white shadow-[0_16px_35px_rgba(24,60,142,0.28)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Рассчитать доставку
              </Link>
              <Link
                href="/sarma-express?flow=order_lookup"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-white px-8 text-lg font-semibold text-[#1f2c47] shadow-[0_18px_35px_rgba(18,42,82,0.16)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                <TrackIcon />
                отследить груз
              </Link>
            </div>
          </div>
          <div aria-hidden="true" />
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-16 w-full max-w-[1240px] px-4 pb-8 lg:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map(({ title, icon: Icon }) => (
            <article
              key={title}
              className="rounded-[26px] bg-white px-6 py-7 text-center shadow-[0_24px_45px_rgba(16,45,88,0.12)] ring-1 ring-[#dce6f4]"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3f7fe] text-[#244d96]">
                <Icon />
              </div>
              <h2 className="mx-auto mt-5 max-w-[210px] text-[1.38rem] font-extrabold leading-tight text-[#0f2548]">{title}</h2>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}

function DeliveryIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 14h17v14H7z" />
      <path d="M24 19h8l5 5v4h-13z" />
      <path d="M14 36a3 3 0 1 0 0-.01V36Zm18 0a3 3 0 1 0 0-.01V36Z" />
      <path d="M7 22H3m4 5H1m8-10H4" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 15h10l4 4 4-4h8v8l-5 5-6-6-4 4-7-7-4 4V15Z" />
      <path d="M17 30v5h14v-5" />
      <path d="M21 35v3m6-3v3" />
    </svg>
  );
}

function TimeIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="24" cy="24" r="15" />
      <path d="M24 16v9l6 4" />
      <path d="M17 9l2 3m12-3-2 3" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M24 39s10-9.9 10-18a10 10 0 1 0-20 0c0 8.1 10 18 10 18Z" />
      <circle cx="24" cy="21" r="3.8" />
      <path d="M20 40h8" />
    </svg>
  );
}

function TrackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1b3157]" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="m12 8 1.5 4 4 1.5" />
    </svg>
  );
}
