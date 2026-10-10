"use client";

import { useSyncExternalStore } from "react";
import {
  readApprovedMetaSnapshot,
  subscribeApprovedMeta,
  type ScheduleApprovedMeta,
} from "@/lib/scheduler/scheduleApprovedMeta";

const SERVER_SNAPSHOT: ScheduleApprovedMeta[] = [];

function getServerSnapshot(): ScheduleApprovedMeta[] {
  return SERVER_SNAPSHOT;
}

export function useApprovedScheduleMetas(): ScheduleApprovedMeta[] {
  return useSyncExternalStore(subscribeApprovedMeta, readApprovedMetaSnapshot, getServerSnapshot);
}
