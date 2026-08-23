"use client";

import { useEffect, useRef, useState } from "react";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function NextUpCountdown({ offsetMs }: { offsetMs: number }) {
  const targetRef = useRef<number | null>(null);
  const [remaining, setRemaining] = useState(offsetMs);

  useEffect(() => {
    targetRef.current = Date.now() + offsetMs;
    function tick() {
      setRemaining(Math.max(0, (targetRef.current ?? 0) - Date.now()));
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [offsetMs]);

  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return (
    <p className="font-display text-lg font-semibold tracking-wide text-foreground sm:text-xl">
      {pad(hours)} HOURS {pad(minutes)} MINS {pad(seconds)} SECS
    </p>
  );
}
