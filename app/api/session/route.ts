import { destroySession, getSession, switchActiveDomain } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE() {
  await destroySession();
  return Response.json({ ok: true });
}

/** Switch the active domain of this browser session. */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const domain = (body as { domain?: string })?.domain;
  if (typeof domain !== "string") {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const ok = await switchActiveDomain(domain);
  if (!ok) return Response.json({ error: "not_in_session" }, { status: 400 });
  return Response.json({ ok: true });
}
