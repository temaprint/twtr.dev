import { redirect } from "next/navigation";
import { getSession, peekQrLogin } from "@/lib/session";
import { ApproveQrLogin } from "@/components/ApproveQrLogin";

export default async function ApproveTransferPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/connect?mode=login");

  const { r } = await searchParams;
  const info = r ? await peekQrLogin(r) : null;

  return (
    <ApproveQrLogin
      code={r ?? null}
      device={info?.device ?? null}
      domains={session.domains.map((d) => d.name)}
    />
  );
}
