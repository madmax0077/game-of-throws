import { requireOrganizer } from "@/lib/roles";

export default async function ScoreLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireOrganizer();
  return <>{children}</>;
}
