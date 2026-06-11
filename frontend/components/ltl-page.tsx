"use client";

import Image from "next/image";
import { useState } from "react";

import { SarmaExpressHeader } from "@/components/sarma-express-header";

const reasonCards = [
  {
    title: "Не «воздух»",
    text: "Автоматический тариф всегда считает по верхней планке - как будто машина загружена под завязку. Экспедитор находит транспорт точно под ваш объём. Ставка получается ниже.",
  },
  {
    title: "Не склады",
    text: "Мы не содержим терминалы в каждом городе. Машина едет прямо от двери до двери. Нет перегрузок - нет наценок за ПРР, хранение и курьерскую доставку.",
  },
  {
    title: "Не сюрпризы",
    text: "Ставка фиксируется в договоре-заявке до погрузки и не меняется. Вы знаете точную цену до отправки, а не после.",
  },
];

const comparisonRows = [
  ["Цена", "Индивидуальная, на 15-30% ниже", "По верхней планке тарифа"],
  ["Маршрут", "От двери до двери", "Терминал -> Терминал (+ курьер)"],
  ["Перегрузки", "Нет", "Минимум 1-2"],
  ["Ставка", "Фиксирована до погрузки", "Может измениться"],
  ["Сроки", "Индивидуально, без задержек на складах", "Зависят от расписания терминалов"],
];

const includedItems = [
  "Прямой транспорт без перегрузок",
  "Подача машины под погрузку по вашему адресу",
  "Доставка до адреса получателя",
  "Оформление транспортной накладной",
  "Фиксированная ставка в договоре-заявке",
];

const excludedItems = [
  "Погрузка и выгрузка - на стороне отправителя и получателя",
  "Страхование с объявленной ценностью - по запросу",
  "Простой сверх нормы - по договору",
];

const offerRows = [
  ["Номер и дата", "КП № 0425-17 от 25.04.2026"],
  ["Маршрут", "Донецк (ул. Артёма, 120) -> Москва (ул. Дорожная, 15)"],
  ["Груз", "Запчасти, 800 кг, 6 м3, 4 паллеты"],
  ["Транспорт", "Тент, 5 тонн"],
  ["Ставка", "Договорная, фиксируется в договоре-заявке"],
  ["Срок", "Согласовывается индивидуально"],
];

const transportTypes = ["Тент", "Рефрижератор", "Изотерм", "Газель", "Спецтехника"];
const specialCargo = ["Опасный", "Хрупкий", "Скоропортящийся", "Негабарит"];

type FormMode = "request" | "consultation";

export function LtlPage() {
  const [formMode, setFormMode] = useState<FormMode>("request");
  const [transportType, setTransportType] = useState("Тент");
  const [submittedMode, setSubmittedMode] = useState<FormMode | null>(null);

  return (
    <main className="min-h-screen bg-[#edf2f8] text-[#12243f]">
      <SarmaExpressHeader activeItem="ltl" />

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
              Индивидуальная ставка от 500 кг
            </div>
            <h1 className="mt-6 max-w-[780px] text-4xl font-extrabold leading-[1.06] text-white drop-shadow-[0_16px_34px_rgba(20,56,120,0.24)] sm:text-5xl lg:text-[4.25rem]">
              Сборные грузы от 500 кг - прямая машина
            </h1>
            <p className="mt-5 max-w-[680px] text-xl font-semibold leading-8 text-white/92">
              Индивидуальный подбор транспорта. Без перегрузок, без складов, без накруток. Честная ставка под ваш объём.
            </p>
            <p className="mt-4 max-w-[600px] text-base leading-7 text-white/84">
              Оставьте заявку - экспедитор подберёт машину и пришлёт фиксированную ставку за 30 минут. Бесплатно и без обязательств.
            </p>
            <a
              href="#ltl-form"
              className="mt-8 inline-flex min-h-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2f57c0_0%,#2245a9_100%)] px-8 text-lg font-extrabold text-white shadow-[0_16px_35px_rgba(24,60,142,0.28)] transition hover:-translate-y-0.5"
            >
              Получить расчёт
            </a>
          </div>

          <div className="relative mx-auto w-full max-w-[410px] rounded-[34px] border border-white/54 bg-white/90 p-7 shadow-[0_28px_70px_rgba(22,65,142,0.24)] backdrop-blur-xl">
            <div className="relative flex aspect-square items-center justify-center rounded-[28px] bg-[radial-gradient(circle_at_50%_35%,rgba(108,169,255,0.22),transparent_45%),linear-gradient(180deg,#fafdff_0%,#eef4ff_100%)]">
              <div className="relative h-[250px] w-[250px]">
                <Image src="/services/ltl-cargo.png" alt="LTL сборные грузы" fill priority sizes="250px" className="object-contain" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <MiniMetric value="500+" label="кг груза" />
              <MiniMetric value="30 мин" label="на расчёт" />
              <MiniMetric value="-30%" label="к ставке" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 py-12 lg:px-6 lg:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#356ac8]">Логика расчёта</p>
            <h2 className="mt-2 text-4xl font-extrabold text-[#102a4e]">Почему не калькулятор</h2>
          </div>
          <p className="max-w-[430px] text-sm font-semibold leading-6 text-[#58739d]">
            Для грузов от 500 кг ставка зависит от реальной машины, маршрута и объёма, поэтому её считает экспедитор.
          </p>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {reasonCards.map((card, index) => (
            <article key={card.title} className="rounded-[28px] bg-white p-6 shadow-[0_24px_50px_rgba(16,45,88,0.1)] ring-1 ring-[#dce6f4]">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf6ff] text-sm font-black text-[#356ac8]">
                {index + 1}
              </span>
              <h3 className="mt-5 text-2xl font-extrabold text-[#102a4e]">{card.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-[#58739d]">{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 pb-8 lg:px-6 lg:pb-10">
        <ComparisonTable />
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-4 pb-12 lg:px-6 lg:pb-16">
        <OfferCard />
      </section>

      <section className="mx-auto grid w-full max-w-[1240px] gap-6 px-4 pb-12 lg:grid-cols-2 lg:px-6 lg:pb-16">
        <ChecklistCard title="Что входит в услугу" tone="positive" items={includedItems} />
        <ChecklistCard title="Что не входит по умолчанию" tone="negative" items={excludedItems} />
      </section>

      <section id="ltl-form" className="mx-auto w-full max-w-[1240px] px-4 pb-12 lg:px-6 lg:pb-16">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[32px] bg-[#123763] p-7 text-white shadow-[0_24px_50px_rgba(16,45,88,0.16)]">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#9fd0ff]">Заявка</p>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight">Получить расчёт за 30 минут</h2>
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
            <p>Итоговая цена фиксируется в договоре-заявке и не меняется после погрузки.</p>
            <p>Сроки доставки согласовываются индивидуально и указываются в договоре-заявке.</p>
            <p>За простой транспорта по вине отправителя или получателя может взиматься доплата по договору.</p>
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
        <h2 className="text-2xl font-extrabold text-[#102a4e]">Прямая машина vs Терминалы</h2>
      </div>
      {comparisonRows.map((row) => (
        <div key={row[0]} className="grid gap-2 border-t border-[#dce6f4] px-5 py-4 text-sm md:grid-cols-[0.72fr_1fr_1fr]">
          <span className="font-black text-[#173862]">{row[0]}</span>
          <span className="rounded-2xl bg-[#edf6ff] px-3 py-2 font-bold text-[#245da9]">{row[1]}</span>
          <span className="rounded-2xl bg-[#f6f8fb] px-3 py-2 font-semibold text-[#58739d]">{row[2]}</span>
        </div>
      ))}
    </article>
  );
}

function OfferCard() {
  return (
    <article className="overflow-hidden rounded-[28px] bg-[#123763] shadow-[0_24px_50px_rgba(16,45,88,0.16)] ring-1 ring-[#dce6f4]">
      <div className="grid gap-6 p-6 lg:grid-cols-[0.78fr_1.22fr] lg:p-7">
        <div className="flex flex-col justify-between gap-5">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#9fd0ff]">Образец КП</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white">Как выглядит наше коммерческое предложение</h2>
          </div>
          <p className="max-w-[420px] text-sm font-semibold leading-6 text-white/72">
            После заявки экспедитор фиксирует маршрут, параметры груза и ставку в договоре-заявке.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
        {offerRows.map((row) => (
          <div key={row[0]} className="rounded-2xl border border-white/12 bg-white p-4 shadow-[0_16px_30px_rgba(7,24,50,0.12)]">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-[#6c84aa]">{row[0]}</div>
            <div className="mt-1 text-sm font-black leading-6 text-[#173862]">{row[1]}</div>
          </div>
        ))}
        </div>
      </div>
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
      <LtlInput label="Наименование груза" placeholder="Например, запчасти" required />
      <div className="grid gap-4 sm:grid-cols-3">
        <LtlInput label="Вес, кг" type="number" placeholder="800" required />
        <LtlInput label="Объём, м3" type="number" placeholder="6" required />
        <LtlInput label="Количество мест" type="number" placeholder="4" required />
      </div>
      <LtlInput label="Адрес загрузки" placeholder="Город, улица, дом" required />
      <LtlInput label="Адрес выгрузки" placeholder="Город, улица, дом" required />

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

      <LtlInput label="Контактное лицо" placeholder="Имя и фамилия" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <LtlInput label="Телефон" type="tel" placeholder="+7 999 000-00-00" required />
        <LtlInput label="Электронная почта" type="email" placeholder="mail@example.ru" required />
      </div>
      <LtlInput label="Прикрепить карточку предприятия" type="file" />
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
      <LtlInput label="Контактное лицо" placeholder="Имя и фамилия" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <LtlInput label="Телефон" type="tel" placeholder="+7 999 000-00-00" required />
        <LtlInput label="Электронная почта" type="email" placeholder="mail@example.ru" required />
      </div>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-[#4d78b8]">Краткое описание</span>
        <textarea className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-[#cfe0f7] bg-white px-4 py-3 text-sm font-bold text-[#173862] outline-none placeholder:text-[#8aa2c8] focus:border-[#7aa5e6]" placeholder="Например: Нужно отвезти станок, ~800 кг, Донецк -> Ростов" />
      </label>
      <LtlInput label="Прикрепить файл" type="file" />
      <button type="submit" className="min-h-13 rounded-2xl bg-[linear-gradient(180deg,#4f8fe8_0%,#356fcb_100%)] px-6 py-4 text-base font-black text-white shadow-[0_16px_30px_rgba(46,90,175,0.24)]">
        Жду звонка
      </button>
      <p className="text-sm font-semibold text-[#58739d]">Менеджер свяжется с вами в течение 30 минут. Консультация бесплатная.</p>
    </form>
  );
}

function LtlInput({
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
          ? "Экспедитор проверяет маршрут и подбирает машину под ваш объём. Мы свяжемся с вами в течение 30 минут."
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
