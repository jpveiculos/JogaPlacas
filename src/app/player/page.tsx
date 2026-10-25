import { AreaShell } from "@/components/area-shell";
import { PlayerPurchaseForm } from "@/components/player/player-purchase-form";
import { PlayerRecentResults } from "@/components/player/player-recent-results";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function PlayerPage() {
  const user = await requireRole("PLAYER");
  return (
    <AreaShell title="Área do jogador" username={user.username} description="Registre uma aposta, acompanhe o rateio e veja os resultados em plaquinhas.">
      <PlayerPurchaseForm />
      <PlayerRecentResults />
    </AreaShell>
  );
}
