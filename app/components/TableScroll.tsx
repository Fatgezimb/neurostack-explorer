import type { ReactNode } from "react";

export function TableScroll({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      aria-label={label}
      className="table-scroll"
      role="region"
      tabIndex={0}
    >
      {children}
    </div>
  );
}
