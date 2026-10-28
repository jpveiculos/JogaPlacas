import { AreaShell } from "@/components/area-shell";
import { PlayerPurchaseForm } from "@/components/player/player-purchase-form";
import { PlayerRecentResults } from "@/components/player/player-recent-results";
import { PlayerBetHistory } from "@/components/player/player-bet-history";
import { PlayerWalletWithdrawals } from "@/components/player/player-wallet-withdrawals";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function PlayerPage() {
  const user = await requireRole("PLAYER");
  return (
    <AreaShell title="Área do jogador" username={user.username} compact logoOnlyHeader logoutAtBottom>
      <PlayerPurchaseForm />
      <PlayerWalletWithdrawals />
      <PlayerBetHistory />
      <PlayerRecentResults />
    </AreaShell>
  );
}
