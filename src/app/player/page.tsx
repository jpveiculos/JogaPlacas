import { AreaShell } from "@/components/area-shell";
import { requireRole } from "@/lib/auth/require-role";
export const dynamic = "force-dynamic";
export default async function PlayerPage() {
  const user = await requireRole("PLAYER");
  return <AreaShell title="Área do jogador" username={user.username} description="Acompanhe sua conta e, nas próximas etapas, suas apostas, recibos e resultados.">
    <article className="feature-card"><span className="feature-label">Preparação da plataforma</span><h2>Seu espaço está sendo preparado</h2><p>Esta área já exige uma sessão válida de jogador. Apostas, carteira e pagamentos permanecerão indisponíveis até que seus fluxos transacionais e testes sejam concluídos.</p></article>
  </AreaShell>;
}