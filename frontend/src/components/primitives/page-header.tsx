import * as React from "react";
import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bordered?: boolean;
};

export function PageHeader({ title, description, breadcrumb, actions, children, className, bordered = false }: PageHeaderProps) {
  return (
    <header className={cn("space-y-2", bordered && "border-b border-border pb-5", className)}>
      {breadcrumb && (
        <div className="flex items-center gap-1 text-xs text-fg-muted">
          {breadcrumb}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-fg">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
