"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function RouteFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const isFirstPath = useRef(true);

  useLayoutEffect(() => {
    if (isFirstPath.current) {
      isFirstPath.current = false;
      return;
    }
    const node = ref.current;
    if (!node) return;
    node.classList.remove("page-fade-in");
    void node.offsetWidth;
    node.classList.add("page-fade-in");
  }, [pathname]);

  return (
    <div ref={ref} className="page-fade-in">
      {children}
    </div>
  );
}
