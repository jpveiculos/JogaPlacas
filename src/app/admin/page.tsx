import { AreaShell } from "@/components/area-shell";
import { requireRole } from "@/lib/auth/require-role";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const user = await requireRole("ADMIN");
  return <AreaShell title="Administração" username={user.username} description="Configuração e supervisão da plataforma.">
    <article className="feature-card"><span className="feature-label">Acesso restrito</span><h2>Painel administrativo</h2><p>Esta área exige uma sessão ativa com papel de administrador, verificada no servidor. As ferramentas de configuração, rodadas, resultados e auditoria serão liberadas individualmente após a implementação de suas permissões e testes.</p><p className="note-inline">O administrador não vende nem realiza apostas nesta área.</p></article>
  </AreaShell>;
}