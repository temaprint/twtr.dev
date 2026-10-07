import { ConnectClient } from "@/components/ConnectClient";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return <ConnectClient loginMode={mode === "login"} />;
}
