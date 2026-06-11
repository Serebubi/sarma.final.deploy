import Image from "next/image";
import type { ReactNode } from "react";

import { humanizeMarketplace, marketplaceById, marketplaces, type MarketplaceId } from "shared";

interface MarketplaceGridProps {
  value: MarketplaceId | "";
  onSelect: (marketplace: MarketplaceId) => void;
  filter?: MarketplaceId[];
  children?: ReactNode;
}

export function MarketplaceGrid({ value, onSelect, filter, children }: MarketplaceGridProps) {
  const visibleMarketplaces = filter ? marketplaces.filter((m) => filter.includes(m.id)) : marketplaces;
  return (
    <div
      className={`grid gap-4 ${
        filter ? "mx-auto w-full max-w-5xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      }`}
    >
      {visibleMarketplaces.map((marketplace, index) => {
        const active = value === marketplace.id;

        return (
          <button
            key={marketplace.id}
            type="button"
            onClick={() => onSelect(marketplace.id)}
            className={`stagger-in marketplace-tile group relative flex min-h-[152px] flex-col items-center justify-center overflow-hidden rounded-[28px] border px-5 py-5 text-center ${
              active
                ? "border-[color:rgba(196,46,160,0.32)] bg-white shadow-[0_20px_44px_rgba(123,77,255,0.18)]"
                : "border-[color:var(--line)] bg-white/88 hover:-translate-y-1 hover:border-[color:rgba(123,77,255,0.16)] hover:shadow-[0_16px_32px_rgba(59,26,110,0.08)]"
            }`}
            style={{ animationDelay: `${index * 55}ms` }}
          >
            {active ? (
              <span className="absolute right-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c42ea0,#7c33ff)] text-xs font-bold text-white shadow-[0_10px_18px_rgba(123,77,255,0.22)]">
                ✓
              </span>
            ) : null}
            <span className="flex h-20 w-24 items-center justify-center rounded-[22px] bg-[color:var(--surface-subtle)] px-3">
              <Image
                src={`/marketplaces/${marketplace.asset}`}
                alt={humanizeMarketplace(marketplace.id)}
                width={120}
                height={40}
                className={`h-10 w-[120px] object-contain transition duration-200 ${
                  active ? "" : "grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100"
                }`}
              />
            </span>
            <span className="mt-4 flex flex-col items-center gap-2">
              <span className="text-base font-semibold leading-6 text-[color:var(--foreground)]">{humanizeMarketplace(marketplace.id)}</span>
              <span className="rounded-full bg-[color:var(--surface-subtle)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--muted)]">
                {marketplaceById[marketplace.id].parserMode === "supported" ? "smart" : "manual"}
              </span>
            </span>
          </button>
        );
      })}
      {children}
    </div>
  );
}
