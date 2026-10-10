"use client";

import { useSyncExternalStore } from "react";
import { readScheduleJob, subscribeScheduleJob, type ScheduleJob } from "@/lib/scheduler/scheduleJob";

function getServerSnapshot(): ScheduleJob | null {
  return null;
}

export function useScheduleJob(): ScheduleJob | null {
  return useSyncExternalStore(subscribeScheduleJob, readScheduleJob, getServerSnapshot);
}
