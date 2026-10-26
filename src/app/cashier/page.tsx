import { AreaShell } from "@/components/area-shell";
import { requireRole } from "@/lib/auth/require-role";
import { QuickTicketCheck } from "@/components/results/quick-ticket-check";
import { CashierPurchaseHistory } from "@/components/cashier/cashier-purchase-history";
export const dynamic = "force-dynamic";
export default async function CashierPage() {
  const user = await requireRole("CASHIER");
  return <AreaShell title="Área do cambista" username={user.username} description="Área de trabalho do cambista, separada da conta do jogador e da administração.">
    <QuickTicketCheck compact />
    <CashierPurchaseHistory />
    <article className="feature-card"><span className="feature-label">Preparação da plataforma</span><h2>Área de vendas e comissões</h2><p>O histórico permite localizar compras desta operação, consultar o estado do pagamento e imprimir novamente o recibo oficial de compras confirmadas.</p><p className="note-inline">Esta área não terá carteira própria nem botão de saque.</p></article>
  </AreaShell>;
}
