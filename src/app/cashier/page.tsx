import { AreaShell } from "@/components/area-shell";
import { requireRole } from "@/lib/auth/require-role";
import { CashierSaleForm } from "@/components/cashier/cashier-sale-form";
import { PlayerRecentResults } from "@/components/player/player-recent-results";
import { CashierSalesSummary } from "@/components/cashier/cashier-sales-summary";

export const dynamic = "force-dynamic";

export default async function CashierPage() {
  const user = await requireRole("CASHIER");
  return (
    <AreaShell title="Área do cambista" username={user.username} compact footerContent={<CashierSalesSummary />}>
      <CashierSaleForm />
      <details className="player-collapsible-section">
        <summary>
          <span className="player-collapsible-label">Resultados</span>
          <span className="player-collapsible-title">Últimos resultados</span>
          <span className="player-collapsible-hint">Toque para consultar os sorteios publicados</span>
        </summary>
        <PlayerRecentResults />
      </details>
    </AreaShell>
  );
}
