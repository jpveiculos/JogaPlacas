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
    <article className="feature-card"><span className="feature-label">Controles protegidos</span><h2>Próximas ferramentas administrativas</h2><p>O painel de rodadas já permite consultar o estado atual, fechar apostas após o cutoff, publicar os dois resultados independentes e executar a apuração idempotente. A recorrência de rodadas, configurações financeiras, gestão de contas e relatórios financeiros ainda exigem implementação e testes próprios. O painel de saques permite registrar pagamento manual após conferência do comprovante, com referência e auditoria; não envia Pix automaticamente.</p><p className="note-inline">Pagamentos Pix reais continuam desativados: não existe integração ativa com provedor nem confirmação financeira real nesta versão.</p></article>
  </AreaShell>;
}
