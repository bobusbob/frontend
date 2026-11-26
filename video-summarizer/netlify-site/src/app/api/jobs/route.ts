import { SummarizeError } from "@/lib/errors";
import type { SummarizeFailureCode } from "@/lib/types";
import { extractYoutubeId } from "@/lib/youtube";
import { writeJob } from "@/server/jobs";
import { runJob } from "@/server/run-job";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readBody(request);
  const url = typeof body?.url === "string" ? body.url : "";
  const videoId = extractYoutubeId(url);

  if (!videoId) {
    return Response.json(errorBody("invalid-url"), { status: 400 });
  }

  const jobId = crypto.randomUUID();
  const canonical = `https://www.youtube.com/watch?v=${videoId}`;
  await writeJob(jobId, { status: "queued", step: 0 });

  if (process.env.NETLIFY === "true") {
    const triggered = await triggerBackground(jobId, canonical);
    if (!triggered) {
      await writeJob(jobId, {
        status: "error",
        step: 0,
        code: "network",
        message:
          "Фоновая обработка не запустилась. Сайт нужно собрать на Netlify с функциями, а не загрузить как статическую папку.",
      });
    }
  } else {
    void runJob(jobId, canonical);
  }

  return Response.json({ jobId }, { headers: { "Cache-Control": "no-store" } });
}

async function triggerBackground(jobId: string, url: string) {
  const origin = process.env.DEPLOY_PRIME_URL || process.env.URL || process.env.DEPLOY_URL;
  if (!origin) return false;

  try {
    const response = await fetch(new URL("/.netlify/functions/summarize-background", origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, url }),
    });
    return response.status === 202 || response.ok;
  } catch (error) {
    console.error("background-trigger", error instanceof Error ? error.name : "unknown");
    return false;
  }
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as { url?: unknown } | null;
  } catch {
    return null;
  }
}

function errorBody(code: SummarizeFailureCode) {
  return { code, message: new SummarizeError(code).message };
}
