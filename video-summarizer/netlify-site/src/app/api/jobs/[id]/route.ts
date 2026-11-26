import { readJob } from "@/server/jobs";

export const dynamic = "force-dynamic";

const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!JOB_ID.test(id)) {
    return Response.json({ status: "missing" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const job = await readJob(id);
  if (!job) {
    return Response.json({ status: "missing" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return Response.json(job, { headers: { "Cache-Control": "no-store" } });
}
