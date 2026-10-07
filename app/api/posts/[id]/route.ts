import { getPostWithReplies } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getPostWithReplies(id);
  if (!result) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(result);
}
