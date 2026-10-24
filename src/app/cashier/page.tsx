import { AreaShell } from "@/components/area-shell";
import { requireRole } from "@/lib/auth/require-role";
export const dynamic = "force-dynamic";
export default async function CashierPage() {
  const user = await requireRole("CASHIER");
  return <AreaShell title="Área do cambista" username={user.username} description="Área de trabalho do cambista, separada da conta do jogador e da administração.">
    <article className="feature-card"><span className="feature-label">Preparação da plataforma</span><h2>Área de vendas e comissões</h2><p>O acesso já é restrito ao papel de cambista. Vendas, clientes, recibos e apuração de comissões serão habilitados após a implementação e validação dos respectivos fluxos.</p><p className="note-inline">Esta área não terá carteira própria nem botão de saque.</p></article>
  </AreaShell>;
}