import { requireOrganizer } from "@/lib/roles";

export default async function NewTournamentLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireOrganizer();
  return <>{children}</>;
}
