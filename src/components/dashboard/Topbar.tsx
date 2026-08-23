import type { ReactNode } from "react";

export function Topbar({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="px-4 pt-5 sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {typeof title === "string" ? (
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
          ) : (
            title
          )}
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="w-full shrink-0 sm:w-auto">{actions}</div> : null}
      </div>
    </div>
  );
}
