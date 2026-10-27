import { AreaShell } from "@/components/area-shell";
import { AdminRoundManager } from "@/components/admin/admin-round-manager";
import { AdminPrizeCreditReconciliation } from "@/components/admin/admin-prize-credit-reconciliation";
import { AdminWithdrawalManager } from "@/components/admin/admin-withdrawal-manager";
import { requireRole } from "@/lib/auth/require-role";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const user = await requireRole("ADMIN");
  return <AreaShell title="Administração" username={user.username} description="Configuração e supervisão da plataforma.">
    <AdminRoundManager />
    <AdminPrizeCreditReconciliation />
    <AdminWithdrawalManager />
    <article className="feature-card"><span className="feature-label">Controles protegidos</span><h2>Próximas ferramentas administrativas</h2><p>O painel de rodadas já permite consultar o estado atual, fechar apostas após o cutoff, publicar os dois resultados independentes e executar a apuração idempotente. A recorrência de rodadas, configurações financeiras, gestão de contas e relatórios financeiros ainda exigem implementação e testes próprios. O painel de saques permite aprovar ou recusar solicitações. A aprovação não marca o saque como pago nem envia Pix: a transferência é feita manualmente fora da plataforma.</p><p className="note-inline">A integração de checkout Pix com Mercado Pago (criação de cobrança, webhook autenticado e confirmação transacional) está implementada no código. A validação ponta a ponta em homologação ainda precisa ser comprovada; não habilitar operação real até concluir os testes e a reconciliação de pagamentos tardios, duplicados, estornos e falhas.</p></article>
  </AreaShell>;
}
