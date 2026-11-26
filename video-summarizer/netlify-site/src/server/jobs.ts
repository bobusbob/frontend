import { getStore } from "@netlify/blobs";
import type { SummarizeFailureCode, Summary } from "../lib/types";

export type JobStatus = "queued" | "running" | "done" | "error";

export interface JobRecord {
  status: JobStatus;
  step: 0 | 1 | 2;
  summary?: Summary;
  code?: SummarizeFailureCode;
  message?: string;
}

const globalJobs = globalThis as typeof globalThis & {
  __summaJobs?: Map<string, JobRecord>;
};

function memoryJobs() {
  if (!globalJobs.__summaJobs) globalJobs.__summaJobs = new Map();
  return globalJobs.__summaJobs;
}

function onNetlify() {
  return process.env.NETLIFY === "true";
}

function blobStore() {
  return getStore("jobs", { consistency: "strong" });
}

export async function writeJob(id: string, record: JobRecord) {
  if (!onNetlify()) {
    memoryJobs().set(id, record);
    return;
  }
  await blobStore().setJSON(id, record);
}

export async function readJob(id: string): Promise<JobRecord | null> {
  if (!onNetlify()) return memoryJobs().get(id) ?? null;
  const stored = await blobStore().get(id, { type: "json" });
  if (!stored || typeof stored !== "object") return null;
  return stored as JobRecord;
}
