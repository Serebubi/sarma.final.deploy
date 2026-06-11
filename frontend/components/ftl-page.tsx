"use client";

import Image from "next/image";
import { useState } from "react";

import { SarmaExpressHeader } from "@/components/sarma-express-header";

const comparisonRows = [
  ["Тип машины", "Отдельная под вас", "Общая с другими грузами"],
  ["Время в пути", "Напрямую, без заездов", "С заездами на догруз/выгрузку"],
  ["Перегрузки", "Нет", "1-2 на терминалах"],
  ["Риск порчи", "Минимальный", "Есть при перегрузках"],
  ["Цена", "За рейс", "За кг"],
  ["Ставка", "Фиксирована до погрузки", "Может меняться"],
];

const vehicleRows = [
  ["Газель (тент)", "до 1.5 тонн", "15-22 м3", "6-8", "Малый FTL, до 1.5 т"],
  ["Газель (фургон)", "до 1.5 тонн", "15-22 м3", "6-8", "Ценный груз, защита от осадков"],
  ["5-тонник (тент)", "5 тонн", "32-38 м3", "12-14", "Средний FTL"],
  ["10-тонник (тент)", "10 тонн", "52-58 м3", "18-20", "Крупный FTL"],
  ["Еврофура (тент)", "20 тонн", "82-90 м3", "32-33", "Максимальный FTL"],
  ["Рефрижератор", "20 тонн", "82-90 м3", "32-33", "Скоропорт, температурный режим"],
  ["Изотерм", "20 тонн", "82-90 м3", "32-33", "Термочувствительный груз"],
  ["Спецтехника", "Под запрос", "-", "-", "Негабарит, особые условия"],
];

const includedItems = [
  "Отдельная машина под ваш груз",
  "Подача по адресу загрузки",
  "Доставка до адреса выгрузки",
  "Оформление транспортной накладной",
  "Фиксированная ставка на весь рейс",
  "Отслеживание машины в пути",
];

const excludedItems = [
  "Погрузка и выгрузка - на стороне отправителя и получателя",
  "Страхование с объявленной ценностью - по запросу",
  "Простой сверх нормы - по договору",
];

const rateSteps = [
  "Вы оставляете заявку с параметрами груза и адресами.",
  "Экспедитор проверяет свободный транспорт на маршруте.",
  "Вы получаете фиксированную ставку за рейс.",
  "Подписываем договор-заявку - цена зафиксирована.",
  "Машина подаётся в оговорённое время.",
];

const transportTypes = ["Тент", "Рефрижератор", "Изотерм", "Газель", "Спецтехника"];
const specialCargo = ["Опасный", "Хрупкий", "Скоропортящийся", "Негабарит"];

type FormMode = "request" | "consultation";

export function FtlPage() {
  const [formMode, setFormMode] = useState<FormMode>("request");
  const [transportType, setTransportType] = useState("Тент");
  const [submittedMode, setSubmittedMode] = useState<FormMode | null>(null);

  return (
    <main className="min-h-screen bg-[#edf2f8] text-[#12243f]">
      <SarmaExpressHeader activeItem="ftl" />

      <section
        className="relative overflow-hidden bg-[#3f84e6] bg-cover bg-[position:74%_center] bg-no-repeat"
        style={{ backgroundImage: "url('/brand/hero-background.png')" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(43,107,210,0.96)_0%,rgba(65,136,229,0.78)_38%,rgba(170,210,250,0.36)_72%,rgba(255,255,255,0.05)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.5),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]" />

        <div className="relative mx-auto grid min-h-[650px] w-full max-w-[1240px] gap-10 px-4 pb-20 pt-12 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:px-6 lg:pb-28 lg:pt-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/34 bg-white/12 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9fd0ff]" />
              Полная загрузка отдельной машины
            </div>
            <h1 className="mt-6 max-w-[720px] text-4xl font-extrabold leading-[1.06] text-white drop-shadow-[0_16px_34px_rgba(20,56,120,0.24)] sm:text-5xl lg:text-[4.5rem]">
              FTL - Полная загрузка
            </h1>
            <p className="mt-5 max-w-[680px] text-xl font-semibold leading-8 text-white/92">
              Груз на целую машину? Отправьте отдельным транспортом без посредников и лишних перегрузок. Фиксированная
              ставка за рейс, а не за килограмм.
            </p>
            <p className="mt-4 max-w-[600px] text-base leading-7 text-white/84">
              Ваш груз едет один в машине - быстрее, безопаснее и дешевле сборных схем. Оставьте заявку - подберём транспорт
              за 30 минут.
            </p>
            <a
              href="#ftl-form"
              className="mt-8 inline-flex min-h-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2f57c0_0%,#2245a9_100%)] px-8 text-lg font-extrabold text-white shadow-[0_16px_35px_rgba(24,60,142,0.28)] transition hover:-translate-y-0.5"
            >
              Рассчитать рейс
            </a>
          </div>

          <div className="relative mx-auto w-full max-w-[410px] rounded-[34px] border border-white/54 bg-white/90 p-7 shadow-[0_28px_70px_rgba(22,65,142,0.24)] backdrop-blur-xl">
            <div className="relative flex aspect-square items-center justify-center rounded-[28px] bg-[radial-gradient(circle_at_50%_35%,rgba(108,169,255,0.22),transparent_45%),linear-gradient(180deg,#fafdff_0%,#eef4ff_100%)]">
              <div className="relative h-[250px] w-[250px]">
                <Image src="/services/ftl-full-load.png" alt="FTL полная загрузка" fill priority sizes="250px" className="object-contain" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <MiniMetric value="30 мин" label="на ставку" />
              <MiniMetric value="20 т" label="до фуры" />
              <MiniMetric value="0" label="перегрузок" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1240px] gap-6 px-4 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:px-6 lg:py-16">
        <article className="rounded-[28px] bg-white p-7 shadow-[0_24px_50px_rgba(16,45,88,0.1)] ring-1 ring-[#dce6f4]">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#356ac8]">Что такое FTL</p>
          <h2 className="mt-3 text-3xl font-extrabold text-[#102a4e]">Машина целиком под ваш груз</h2>
          <p className="mt-4 text-base leading-8 text-[#58739d]">
            FTL (Full Truck Load) - это доставка груза отдельной машиной от двери до двери. Ваш груз не смешивается с
            другими, не перегружается на складах, не ждёт попутной загрузки. Вы арендуете машину целиком - платите за рейс,
            а не за килограмм.
          </p>
        </article>

        <ComparisonTable />
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 pb-12 lg:px-6 lg:pb-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#356ac8]">Автопарк</p>
            <h2 className="mt-2 text-4xl font-extrabold text-[#102a4e]">Какие машины подаём</h2>
          </div>
          <p className="max-w-[430px] text-sm font-semibold leading-6 text-[#58739d]">
            Подбираем транспорт под вес, объём, паллеты и требования к грузу.
          </p>
        </div>

        <div className="mt-7 overflow-hidden rounded-[28px] bg-white shadow-[0_24px_50px_rgba(16,45,88,0.1)] ring-1 ring-[#dce6f4]">
          <div className="grid grid-cols-[1.05fr_0.75fr_0.65fr_0.55fr_1.15fr] bg-[#eaf3ff] px-5 py-4 text-xs font-black uppercase tracking-[0.12em] text-[#356ac8]">
            <span>Тип транспорта</span>
            <span>Грузоподъёмность</span>
            <span>Объём</span>
            <span>Паллеты</span>
            <span>Когда нужен</span>
          </div>
          {vehicleRows.map((row) => (
            <div key={row[0]} className="grid grid-cols-1 gap-2 border-t border-[#dce6f4] px-5 py-4 text-sm font-semibold text-[#173862] md:grid-cols-[1.05fr_0.75fr_0.65fr_0.55fr_1.15fr]">
              {row.map((cell, index) => (
                <span key={`${row[0]}-${index}`} className={index === 0 ? "font-black" : "text-[#58739d]"}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1240px] gap-6 px-4 pb-12 lg:grid-cols-2 lg:px-6 lg:pb-16">
        <ChecklistCard title="Что входит в рейс" tone="positive" items={includedItems} />
        <ChecklistCard title="Что не входит по умолчанию" tone="negative" items={excludedItems} />
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 pb-12 lg:px-6 lg:pb-16">
        <div className="rounded-[32px] bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-6 shadow-[0_24px_50px_rgba(16,45,88,0.1)] ring-1 ring-[#dce6f4] sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#356ac8]">Ставка</p>
          <h2 className="mt-2 text-4xl font-extrabold text-[#102a4e]">Как мы считаем ставку</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-5">
            {rateSteps.map((step, index) => (
              <article key={step} className="rounded-[22px] border border-[#d7e4f7] bg-white/80 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3f74cb] text-sm font-black text-white">
                  {index + 1}
                </span>
                <p className="mt-4 text-sm font-bold leading-6 text-[#173862]">{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="ftl-form" className="mx-auto w-full max-w-[1240px] px-4 pb-12 lg:px-6 lg:pb-16">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[32px] bg-[#123763] p-7 text-white shadow-[0_24px_50px_rgba(16,45,88,0.16)]">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#9fd0ff]">Заявка</p>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight">Рассчитать рейс за 30 минут</h2>
            <p className="mt-4 text-base font-semibold leading-7 text-white/82">
              Выберите удобный способ. В любом случае - расчёт бесплатный и ни к чему вас не обязывает.
            </p>
            <div className="mt-6 grid gap-3">
              <FormModeButton active={formMode === "request"} label="Заполнить заявку онлайн" onClick={() => setFormMode("request")} />
              <FormModeButton active={formMode === "consultation"} label="Получить консультацию" onClick={() => setFormMode("consultation")} />
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-[0_24px_50px_rgba(16,45,88,0.1)] ring-1 ring-[#dce6f4] sm:p-7">
            {submittedMode ? (
              <SuccessState mode={submittedMode} onReset={() => setSubmittedMode(null)} />
            ) : formMode === "request" ? (
              <RequestForm transportType={transportType} setTransportType={setTransportType} onSubmit={() => setSubmittedMode("request")} />
            ) : (
              <ConsultationForm onSubmit={() => setSubmittedMode("consultation")} />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 pb-20 lg:px-6 lg:pb-28">
        <div className="rounded-[28px] bg-white p-7 shadow-[0_24px_50px_rgba(16,45,88,0.1)] ring-1 ring-[#dce6f4]">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#356ac8]">Важно</p>
          <h2 className="mt-2 text-3xl font-extrabold text-[#102a4e]">Важные условия</h2>
          <div className="mt-5 grid gap-3 text-sm font-semibold leading-6 text-[#58739d] md:grid-cols-2">
            <p>Все цены указаны в рублях. Тарифы действуют для физических и юридических лиц.</p>
            <p>Итоговая ставка фиксируется в договоре-заявке и не меняется после погрузки.</p>
            <p>Сроки доставки согласовываются индивидуально и указываются в договоре-заявке.</p>
            <p>Нормативное время погрузки/выгрузки - 24 часа, простой сверх нормы оплачивается отдельно.</p>
            <p>Хрупкие, опасные и скоропортящиеся грузы - только по предварительному согласованию.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#eef6ff] px-3 py-3">
      <div className="text-lg font-black text-[#173862]">{value}</div>
      <div className="text-xs font-bold text-[#58739d]">{label}</div>
    </div>
  );
}

function ComparisonTable() {
  return (
    <article className="overflow-hidden rounded-[28px] bg-white shadow-[0_24px_50px_rgba(16,45,88,0.1)] ring-1 ring-[#dce6f4]">
      <div className="bg-[#eaf3ff] px-5 py-4">
        <h2 className="text-2xl font-extrabold text-[#102a4e]">FTL против сборного груза</h2>
      </div>
      {comparisonRows.map((row) => (
        <div key={row[0]} className="grid gap-2 border-t border-[#dce6f4] px-5 py-4 text-sm md:grid-cols-[0.8fr_1fr_1fr]">
          <span className="font-black text-[#173862]">{row[0]}</span>
          <span className="rounded-2xl bg-[#edf6ff] px-3 py-2 font-bold text-[#245da9]">{row[1]}</span>
          <span className="rounded-2xl bg-[#f6f8fb] px-3 py-2 font-semibold text-[#58739d]">{row[2]}</span>
        </div>
      ))}
    </article>
  );
}

function ChecklistCard({ items, title, tone }: { items: string[]; title: string; tone: "positive" | "negative" }) {
  return (
    <article className="rounded-[28px] bg-white p-7 shadow-[0_24px_50px_rgba(16,45,88,0.1)] ring-1 ring-[#dce6f4]">
      <h2 className="text-3xl font-extrabold text-[#102a4e]">{title}</h2>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-2xl bg-[#f6f9ff] px-4 py-3 text-sm font-bold leading-6 text-[#173862]">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-white ${tone === "positive" ? "bg-[#3f74cb]" : "bg-[#8aa2c8]"}`}>
              {tone === "positive" ? "✓" : "×"}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function FormModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`min-h-12 rounded-2xl px-5 text-left text-sm font-black transition ${active ? "bg-white text-[#173862] shadow-[0_14px_28px_rgba(0,0,0,0.14)]" : "border border-white/26 bg-white/10 text-white hover:bg-white/18"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function RequestForm({
  onSubmit,
  setTransportType,
  transportType,
}: {
  onSubmit: () => void;
  setTransportType: (value: string) => void;
  transportType: string;
}) {
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h3 className="text-2xl font-extrabold text-[#102a4e]">Заявка онлайн</h3>
      <FtlInput label="Наименование груза" placeholder="Например, оборудование" required />
      <div className="grid gap-4 sm:grid-cols-3">
        <FtlInput label="Вес, кг" type="number" placeholder="800" required />
        <FtlInput label="Объём, м3" type="number" placeholder="12" required />
        <FtlInput label="Количество мест" type="number" placeholder="8" required />
      </div>
      <FtlInput label="Адрес загрузки" placeholder="Город, улица, дом" required />
      <FtlInput label="Дата и время готовности" type="datetime-local" required />
      <FtlInput label="Адрес выгрузки" placeholder="Город, улица, дом" required />

      <div>
        <span className="text-xs font-black uppercase tracking-[0.16em] text-[#4d78b8]">Тип транспорта</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {transportTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`min-h-11 rounded-2xl border px-3 text-sm font-black transition ${transportType === type ? "border-[#3f74cb] bg-[#3f74cb] text-white shadow-[0_12px_24px_rgba(45,90,175,0.18)]" : "border-[#cfe0f7] bg-white text-[#356fcb] hover:bg-[#f5f9ff]"}`}
              onClick={() => setTransportType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#cfe0f7] bg-[#f8fbff] p-4">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-[#4d78b8]">Особые свойства</span>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {specialCargo.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm font-bold text-[#173862]">
              <input type="checkbox" className="h-4 w-4 accent-[#3f74cb]" />
              {option}
            </label>
          ))}
        </div>
      </div>

      <FtlInput label="Контактное лицо" placeholder="Имя и фамилия" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <FtlInput label="Телефон" type="tel" placeholder="+7 999 000-00-00" required />
        <FtlInput label="Электронная почта" type="email" placeholder="mail@example.ru" required />
      </div>
      <FtlInput label="Карточка предприятия" type="file" />
      <button type="submit" className="min-h-13 rounded-2xl bg-[linear-gradient(180deg,#4f8fe8_0%,#356fcb_100%)] px-6 py-4 text-base font-black text-white shadow-[0_16px_30px_rgba(46,90,175,0.24)]">
        Отправить заявку
      </button>
      <p className="text-sm font-semibold text-[#58739d]">С вами свяжется менеджер в течение 30 минут. Расчёт бесплатный и ни к чему вас не обязывает.</p>
    </form>
  );
}

function ConsultationForm({ onSubmit }: { onSubmit: () => void }) {
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h3 className="text-2xl font-extrabold text-[#102a4e]">Получить консультацию</h3>
      <p className="text-sm font-semibold leading-6 text-[#58739d]">
        Не хотите заполнять заявку сами? Сбросьте данные менеджеру. Перезвоним, уточним детали и пришлём расчёт.
      </p>
      <FtlInput label="Контактное лицо" placeholder="Имя и фамилия" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <FtlInput label="Телефон" type="tel" placeholder="+7 999 000-00-00" required />
        <FtlInput label="Электронная почта" type="email" placeholder="mail@example.ru" required />
      </div>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-[#4d78b8]">Краткое описание</span>
        <textarea className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-[#cfe0f7] bg-white px-4 py-3 text-sm font-bold text-[#173862] outline-none placeholder:text-[#8aa2c8] focus:border-[#7aa5e6]" placeholder="Например: Нужно отвезти станок, ~800 кг, Донецк -> Ростов" />
      </label>
      <FtlInput label="Прикрепить файл" type="file" />
      <button type="submit" className="min-h-13 rounded-2xl bg-[linear-gradient(180deg,#4f8fe8_0%,#356fcb_100%)] px-6 py-4 text-base font-black text-white shadow-[0_16px_30px_rgba(46,90,175,0.24)]">
        Жду звонка
      </button>
      <p className="text-sm font-semibold text-[#58739d]">Менеджер свяжется с вами в течение 30 минут. Консультация бесплатная.</p>
    </form>
  );
}

function FtlInput({
  label,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-[#4d78b8]">{label}</span>
      <input
        className="mt-2 min-h-12 w-full rounded-2xl border border-[#cfe0f7] bg-white px-4 text-sm font-bold text-[#173862] outline-none placeholder:text-[#8aa2c8] focus:border-[#7aa5e6]"
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function SuccessState({ mode, onReset }: { mode: FormMode; onReset: () => void }) {
  return (
    <div className="rounded-[24px] border border-[#cfe0f7] bg-[#f4f9ff] p-6">
      <p className="text-2xl font-black text-[#173862]">Заявка отправлена</p>
      <p className="mt-3 text-sm font-bold leading-6 text-[#58739d]">
        {mode === "request"
          ? "Экспедитор подбирает транспорт под ваш груз. Мы свяжемся с вами в течение 30 минут."
          : "Менеджер свяжется с вами в течение 30 минут."}
      </p>
      <button
        type="button"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#3f74cb] px-6 text-sm font-black text-white"
        onClick={onReset}
      >
        Заполнить ещё раз
      </button>
    </div>
  );
}
