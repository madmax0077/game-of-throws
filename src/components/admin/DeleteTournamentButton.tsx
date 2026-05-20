"use client";

import { AdminDeleteButton } from "@/components/admin/AdminDeleteButton";

export function DeleteTournamentButton({
  tournamentId,
  tournamentName,
  size = "md"
}: {
  tournamentId: string;
  tournamentName: string;
  size?: "sm" | "md";
}) {
  return (
    <AdminDeleteButton
      deleteUrl={`/api/admin/tournaments/${tournamentId}`}
      itemName={tournamentName}
      size={size}
    />
  );
}
