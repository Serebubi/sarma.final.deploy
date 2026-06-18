"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

type NavigationItem = {
  key: string;
  label: string;
  href: string;
  icon?: () => ReactNode;
};

const primaryNavigationItems: NavigationItem[] = [
  { key: "calculator", label: "Калькулятор", href: "/calculator" },
  { key: "tracking", label: "Отслеживание", href: "/sarma-express?flow=order_lookup" },
];

const serviceNavigationItems: NavigationItem[] = [
  { key: "internet-delivery", label: "Доставка из интернет-магазинов РФ", href: "/sarma-express?flow=pickup_paid", icon: CartIcon },
  { key: "russia", label: "Отправления в РФ", href: "/sarma-express?flow=ship_russia", icon: BoxIcon },
  { key: "cancel-order", label: "Отмена заказа", href: "/cancel-order", icon: CancelOrderIcon },
  { key: "ltl", label: "Сборные грузы (LTL)", href: "/ltl", icon: StackIcon },
  { key: "ftl", label: "Полная загрузка (FTL)", href: "/ftl", icon: TruckIcon },
];

const secondaryNavigationItems: NavigationItem[] = [
  { key: "business", label: "Бизнесу", href: "/sarma-express?flow=business" },
  { key: "pickup-points", label: "Пункты выдачи", href: "/pickup-points" },
];

const mobileNavigationItems = [...primaryNavigationItems, ...serviceNavigationItems, ...secondaryNavigationItems];

export function SarmaExpressHeader({
  activeItem,
  onNavigate,
}: {
  activeItem?: string;
  onNavigate?: (href: string, key: string) => void;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isServicesActive = serviceNavigationItems.some((item) => item.key === activeItem);
  const renderNavigationLink = (item: { key: string; label: string; href: string }) => {
    const isActive = item.key === activeItem;

    return (
      <Link
        key={item.key}
        href={item.href}
        onClick={(event) => {
          if (!onNavigate) return;
          event.preventDefault();
          onNavigate(item.href, item.key);
        }}
        className={`rounded-full px-4 py-2 transition-all duration-200 ${
          isActive
            ? "bg-[#edf4ff] text-[#2c6ed3] shadow-[inset_0_0_0_1px_rgba(44,110,211,0.08)]"
            : "hover:bg-[#f6f9ff] hover:text-[#2c6ed3]"
        }`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="sticky top-3 z-50 px-3 pt-3 sm:px-4 lg:px-5">
      <header className="mx-auto w-full max-w-[1240px] overflow-visible rounded-[18px] border border-[#d9e1ef] bg-white/95 shadow-[0_18px_44px_rgba(16,45,88,0.08)] backdrop-blur-xl">
        <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 lg:hidden">
          <Link href="/" className="min-w-0 shrink-0" onClick={() => setIsMobileMenuOpen(false)}>
            <SarmaExpressLogo compact />
          </Link>

          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d7e5fb] bg-[#f6f9ff] text-[#123763] shadow-[0_10px_22px_rgba(16,45,88,0.08)]"
            aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
          >
            {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        <nav
          className={`grid gap-2 border-t border-[#edf1f7] px-4 pb-4 text-sm font-bold text-[#12243f] transition-all lg:hidden ${
            isMobileMenuOpen ? "max-h-[640px] pt-2 opacity-100" : "max-h-0 overflow-hidden border-t-transparent pb-0 opacity-0"
          }`}
        >
          {mobileNavigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeItem;

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={(event) => {
                  setIsMobileMenuOpen(false);

                  if (!onNavigate) return;
                  event.preventDefault();
                  onNavigate(item.href, item.key);
                }}
                className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 transition-all ${
                  isActive
                    ? "bg-[#edf4ff] text-[#2c6ed3] shadow-[inset_0_0_0_1px_rgba(44,110,211,0.08)]"
                    : "bg-[#f8fbff] text-[#24324f] hover:bg-[#f1f7ff] hover:text-[#2c6ed3]"
                }`}
              >
                {Icon ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[#2c6ed3]">
                    {Icon()}
                  </span>
                ) : null}
                <span className="min-w-0 leading-5">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-auto hidden w-full gap-3 px-5 py-3 lg:flex lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <Link href="/" className="shrink-0">
            <SarmaExpressLogo />
          </Link>

          <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] font-semibold text-[#12243f] lg:flex-nowrap lg:justify-end">
            {primaryNavigationItems.map(renderNavigationLink)}

            <div className="group relative">
              <button
                type="button"
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 transition-all duration-200 ${
                  isServicesActive
                    ? "bg-[#edf4ff] text-[#2c6ed3] shadow-[inset_0_0_0_1px_rgba(44,110,211,0.08)]"
                    : "hover:bg-[#f6f9ff] hover:text-[#2c6ed3]"
                }`}
                aria-haspopup="menu"
              >
                Услуги
                <ChevronDownIcon />
              </button>

              <div className="pointer-events-none absolute right-0 top-full z-[80] w-[392px] translate-y-2 overflow-hidden rounded-b-[18px] border border-[#e1e8f4] bg-white opacity-0 shadow-[0_22px_48px_rgba(16,45,88,0.14)] transition-all duration-200 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 max-sm:fixed max-sm:left-6 max-sm:right-6 max-sm:top-[136px] max-sm:w-auto" role="menu">
                <div className="h-1 bg-[#2c72d8]" />
                <div className="py-2">
                  {serviceNavigationItems.map(({ key, label, href, icon: Icon }) => {
                    const isActive = key === activeItem;

                    return (
                      <Link
                        key={key}
                        href={href}
                        onClick={(event) => {
                          if (!onNavigate) return;
                          event.preventDefault();
                          onNavigate(href, key);
                        }}
                        className={`flex min-h-[64px] items-center gap-5 border-b border-[#edf1f7] px-7 text-[15px] font-bold transition-colors last:border-b-0 ${
                          isActive ? "bg-[#f3f8ff] text-[#2c6ed3]" : "text-[#31405d] hover:bg-[#f7fbff] hover:text-[#2c6ed3]"
                        }`}
                        role="menuitem"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[#2c6ed3]">
                          {Icon?.()}
                        </span>
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {secondaryNavigationItems.map(renderNavigationLink)}
          </nav>
        </div>
      </header>
    </div>
  );
}

export function SarmaExpressLogo({ compact = false, onTruck = false }: { compact?: boolean; onTruck?: boolean }) {
  if (onTruck) {
    return (
      <div className="relative h-[56px] w-[258px] overflow-hidden">
        <Image
          src="/brand/sarma-express-logo-cropped.png"
          alt="Сарма Экспресс"
          fill
          sizes="258px"
          className="object-contain object-left scale-[1.02]"
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${compact ? "h-[38px] w-[190px]" : "h-[44px] w-[220px] sm:h-[48px] sm:w-[240px]"}`}>
      <Image
        src="/brand/sarma-express-logo-header-final.png"
        alt="Сарма Экспресс"
        fill
        priority
        sizes={compact ? "190px" : "(max-width: 640px) 220px, 240px"}
        className="object-contain object-left"
      />
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current transition-transform duration-200 group-hover:rotate-180" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 8 5 5 5-5" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h3l3 15h13l3-10H9" />
      <path d="M11 26a1.8 1.8 0 1 0 0-.01V26Zm11 0a1.8 1.8 0 1 0 0-.01V26Z" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 10 10-5 10 5v12l-10 5-10-5Z" />
      <path d="m6 10 10 5 10-5M16 15v12" />
      <path d="m11 7.5 10 5" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 5h6v8h-6zM5 19h8v8H5zm14 0h8v8h-8z" />
      <path d="M16 13v4m-7 2v-2h14v2" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9h14v11H4z" />
      <path d="M18 13h6l4 4v3H18z" />
      <path d="M9 25a2.5 2.5 0 1 0 0-.01V25Zm14 0a2.5 2.5 0 1 0 0-.01V25Z" />
    </svg>
  );
}

function CancelOrderIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 7h16v20H8z" />
      <path d="M11 7V5h10v2M12 13h8M12 18h5" />
      <path d="m21 18 5 5m0-5-5 5" />
    </svg>
  );
}
