import type { Config } from "@netlify/functions";
import { runJob } from "../../src/server/run-job";

// Синхронная функция Netlify обрывается через 60 секунд.
// Supadata может опрашивать транскрипт до 70 секунд, затем Gemini отвечает до 30 секунд.
// Фоновая функция живёт до 15 минут и пишет карточку в Netlify Blobs, а страница её опрашивает.
const summarizeBackground = async (request: Request) => {
  const payload = await readPayload(request);
  if (!payload) return;

  await runJob(payload.jobId, payload.url);
};

export default summarizeBackground;

export const config: Config = {
  background: true,
};

async function readPayload(request: Request) {
  try {
    const body = (await request.json()) as { jobId?: unknown; url?: unknown };
    if (typeof body.jobId !== "string" || typeof body.url !== "string") return null;
    return { jobId: body.jobId, url: body.url };
  } catch {
    return null;
  }
}
