import { TransferClient } from "@/components/TransferClient";

export default async function TransferPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  return <TransferClient code={c ?? null} />;
}
