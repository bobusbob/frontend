"use client";

import { useSyncExternalStore } from "react";
import {
  getHistorySnapshot,
  getServerHistorySnapshot,
  subscribeHistory,
} from "@/lib/storage";

export function useHistory() {
  return useSyncExternalStore(subscribeHistory, getHistorySnapshot, getServerHistorySnapshot);
}
