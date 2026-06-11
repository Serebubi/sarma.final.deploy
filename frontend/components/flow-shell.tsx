import type { ReactNode } from "react";

interface FlowShellProps {
  eyebrow: string;
  title: string;
  description: string;
  stepLabel?: string;
  notice?: ReactNode;
  actions?: ReactNode;
  align?: "left" | "center";
  className?: string;
  children: ReactNode;
}

export function FlowShell({
  eyebrow,
  title,
  description,
  stepLabel,
  notice,
  actions,
  align = "left",
  className,
  children,
}: FlowShellProps) {
  const centered = align === "center";

  return (
    <section className={`flow-surface float-in rounded-[32px] p-6 sm:p-8 ${className ?? ""}`}>
      <div
        className={`mb-6 flex flex-col gap-4 border-b border-[color:var(--line)] pb-5 ${
          centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"
        }`}
      >
        <div className={`space-y-2 ${centered ? "max-w-3xl" : ""}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent-strong)]">{eyebrow}</p>
          <div className="space-y-2">
            <h2 className="font-[family-name:var(--font-display)] text-4xl leading-none text-[color:var(--foreground)] sm:text-5xl">
              {title}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[color:var(--muted)] sm:text-base">{description}</p>
          </div>
        </div>
        {(stepLabel || notice || actions) && (
          <div className={`flex flex-col gap-3 ${centered ? "items-center" : "sm:items-end"}`}>
            {notice ? (
              <div className="w-full rounded-[14px] border border-[color:rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.07)] px-3 py-2.5 text-[11px] font-medium leading-[1.65] text-[color:var(--foreground)]">
                {notice}
              </div>
            ) : null}
            {stepLabel ? (
              <span className="rounded-full bg-[color:var(--surface-soft)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
                {stepLabel}
              </span>
            ) : null}
            {actions}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
