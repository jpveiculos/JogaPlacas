# Auditoria da fundação — estado verificado

> **Atualizado em 2026-10-24.** Esta auditoria descreve a branch feature/dual-plate-draw no commit d337082b2d0fa6b24db64a6839d20e24c894fb9e. As afirmações antigas sobre a ausência de autenticação, rotas de API e lockfile pertenciam a uma inspeção anterior de planning/foundation e não descrevem esta branch. Fonte funcional: docs/PRODUCT_SPEC.md; roteiro operacional: docs/TECHNICAL_ROADMAP.md.

## Escopo e limites

Inspecionados a árvore Git, arquivos relevantes, schema Prisma, migrações, package.json, documentação, PR #1 e estado da CI. Não foi executada instalação limpa ou suíte local nesta conversa; não houve acesso a banco de produção, segredos, DNS, serviço hospedado, cobranças ou webhooks reais. Nenhuma implantação ou alteração em main foi realizada.

## Identidade e estado da branch

- Repositório: jpveiculos/JogaPlacas.
- Branch inspecionada: feature/dual-plate-draw.
- HEAD: d337082b2d0fa6b24db64a6839d20e24c894fb9e (commit “Handle undefined safely in canonical JSON serializer”).
- planning/foundation HEAD consultado: a6cd47bb62c3c1cd4887ad52493f4a0756987ceb.
- Comparação: a branch de feature está 61 commits à frente e 1 atrás de planning/foundation; status diverged. Não fazer merge automático.
- PR #1 está aberto em rascunho, da branch feature/dual-plate-draw para planning/foundation; não está mergeado e não está liberado para produção.
- A execução GitHub Actions consultada para o HEAD terminou com conclusão success. A CI cobre apenas os jobs configurados e não comprova fluxos ponta a ponta nem prontidão de produção.

## Estado confirmado no código

### Fundação e qualidade
- Next.js App Router, React e TypeScript; scripts de dev/build/lint/typecheck/teste e Prisma declarados em package.json.
- package-lock.json está presente; o workflow usa instalação reproduzível com npm ci.
- Workflow .github/workflows/verify.yml inclui validação/geração Prisma, lint, typecheck, testes, build e teste de migrações/concorrência.
- Schema Prisma e migrações versionadas: inicial (20261023000000_init), sessões (20261024000000_add_sessions), limite de tentativas de login (20261024010000_login_rate_limit) e sorteio de duas placas (20261024020000_dual_plate_draw). A CI testa migrações em PostgreSQL descartável; isso não comprova aplicação em produção.
- Dependências declaradas incluem Next.js 16.4.3 e eslint-config-next 16.4.2; a diferença de patch precisa ser revisada e resolvida com lockfile/testes, sem atualização cega.

### Autenticação e rotas
- Existem rotas API de login, logout, consulta da sessão atual e alteração de senha, com testes de rota.
- Existem componentes/serviços para senha, sessão, papel de usuário, limite de tentativas e provisionamento de administrador.
- As páginas /player, /cashier e /admin chamam requireRole no servidor. Elas ainda exibem placeholders e informam que os fluxos completos estão por implementar.
- Rotas administrativas autenticadas para fechamento de rodada, geração de resultados e apuração de prêmios estão presentes, com testes de autorização/rota.

### Domínio e transações
- Normalização e validação de placas antiga e Mercosul, com formato persistido separadamente; a quinta posição Mercosul é preservada como letra A-Z.
- Gerador de placa e testes correspondentes.
- Regras de compra, cálculo em centavos inteiros e snapshots de multiplicadores.
- Serviço de compra pendente que cria compra, pagamento pendente e participações/linhas em transação, com chave idempotente e lógica de retry limitada para conflitos reconhecidos.
- Serviço de fechamento de rodada com transação e controle concorrente.
- Serviço de geração dos dois resultados independentes, com bloqueio da linha da rodada e tratamento de inconsistência/duplicidade.
- Serviço de apuração dos prêmios com seleção do resultado por formato, leitura de snapshots históricos e chaves idempotentes para lançamentos de prêmio.
- Testes unitários e suítes de integração PostgreSQL para compra concorrente, limite de login e apuração de prêmios estão versionados. A execução recente de CI foi bem-sucedida; para afirmações de cobertura específica, consultar docs/POSTGRES_CONCURRENCY_TEST_PLAN.md e o workflow do mesmo commit.

## Gaps funcionais importantes

- **Interfaces:** as três áreas autenticadas são placeholders, não fluxos de produto completos.
- **Compras:** existe serviço de persistência de compra pendente, mas não há checkout completo integrado à interface.
- **Pagamentos:** não há integração ativa com Mercado Pago, criação real de cobrança Pix, webhooks do provedor ou reconciliação de pagamentos reais.
- **Carteira/financeiro:** a existência de modelos no schema não prova serviços completos para depósitos, débitos, saldo disponível, saques, reservas, estornos e reconciliação do livro-razão.
- **Cambista:** ainda faltam fluxos completos de cliente, venda, recebimento em dinheiro, recibos, histórico e comissão.
- **Administração:** ainda faltam telas/fluxos completos para usuários, regras, recorrência de rodadas, relatórios financeiros e auditoria navegável.
- **Resultados:** os serviços de sorteio/apuração existem, mas a UI ainda não mostra claramente as duas placas; não foi comprovada fonte externa oficial nem operação completa de publicação/correção.
- **Operação:** não foi auditado deploy, hospedagem, variáveis de ambiente, backups, DNS ou produção.
- **Regras pendentes:** pagamento Pix depois do cutoff, expiração/estorno, cancelamento de rodada e fonte/processo de resultado precisam de decisões operacionais claras antes da ativação.

## Pendências priorizadas

### P0 — antes de qualquer operação real
1. Resolver as questões de regra e operação que bloqueiam pagamentos/resultados e manter os fluxos afetados desabilitados até decisão explícita.
2. Completar os serviços financeiros com invariantes transacionais, ledger append-only, reservas de saque, estornos e idempotência; adicionar testes de concorrência e reconciliação.
3. Implementar checkout/compra na interface e conectar os serviços existentes com autorização, propriedade de registros e recibos.
4. Rever autenticação e todas as operações sensíveis, incluindo sessões, alteração obrigatória de senha, provisionamento de administrador, ownership e auditoria.
5. Revisar formalmente a migração de duas placas e snapshots de regras, incluindo dados históricos; não aplicar migração de produção nesta fase.
6. Revisão de segurança e requisitos legais/regulatórios antes de disponibilização pública.

### P1 — fundação e testes
1. Reproduzir npm ci, Prisma validate/generate, lint, typecheck, testes e build no mesmo checkout limpo/commit e registrar os resultados.
2. Resolver ou documentar a diferença de patch Next.js/ESLint após verificar compatibilidade.
3. Reexecutar os testes de integração PostgreSQL no mesmo commit e verificar estabilidade de concorrência, rollback, idempotência e cutoff.
4. Conferir schema e SQL de todas as migrações num banco descartável, com foco em compatibilidade e classificação segura de dados históricos.
5. Adicionar testes ponta a ponta quando os fluxos de interface forem implementados.

### P2 — interface e operação
1. Construir as três áreas funcionais segundo docs/PRODUCT_SPEC.md.
2. Implementar consultas, recibos, notificações e relatórios de cada perfil.
3. Definir e testar fonte/fluxo de publicação dos resultados e correções auditáveis.
4. Preparar monitoramento, backup/restauração, recuperação e plano de rollback para ambiente novo, sem alterar a produção atual.
5. Atualizar documentação em cada mudança e identificar claramente documentos históricos.

## Critério de aprovação

Nenhum recurso é considerado pronto apenas porque existe no schema, arquivo ou rota. Exigir implementação completa, autorização/ownership no servidor, testes pertinentes, execução verificada no commit, documentação consistente e revisão operacional. Nenhuma cobrança, migração produtiva, alteração de domínio/DNS, deploy ou merge em main fica autorizada por esta auditoria.

## Próxima ação recomendada

1. Fazer a revisão limpa do pipeline no HEAD atual e resolver a diferença de patch de dependências se confirmada como problema.
2. Revisar o schema e as migrações, em especial a migração de duas placas e o snapshot de regras.
3. Atualizar o restante da documentação que ainda carrega estado histórico como se fosse atual.
4. Só então selecionar o próximo módulo funcional conforme a ordem do roteiro técnico.


## Complemento de auditoria — 2026-10-25, commit-base 1d37b8fc59e0c10717272b96dec1d9bd206a6819

Esta verificação posterior confirmou que o workflow **Verify** para o commit-base acima concluiu com sucesso (GitHub Actions run 40146476873). O resultado confirma somente os jobs configurados no workflow; a execução local limpa não foi realizada nesta sessão.

### Revisão adicional de dependências e migrações

- A diferença de patch continua presente: `next@16.4.3` e `eslint-config-next@16.4.2`. O pipeline verde mostra que a combinação atual passa pelos jobs configurados, mas não elimina a recomendação de alinhar versões após confirmar disponibilidade e compatibilidade. Não foi feita alteração de dependências nesta etapa.
- A migração `20261024020000_dual_plate_draw` renomeia `Round.resultPlate` para `resultMercosurPlate`, cria `resultLegacyPlate` e classifica `ParticipationLine.plateFormat` a partir de `plateDisplay`. Ela interrompe deliberadamente a migração se qualquer linha histórica não puder ser classificada.
- O job atual de migração aplica toda a cadeia num PostgreSQL novo e vazio. Isso verifica a criação do schema, mas **não exercita o backfill com linhas históricas** nem demonstra o comportamento quando há entradas antigas inválidas/ambíguas. Antes de aprovar a migração para qualquer banco com dados, criar um ensaio isolado com dados representativos de ambos os formatos e um caso inválido que confirme o bloqueio seguro.
- A inspeção foi feita nos arquivos versionados pelo conector GitHub. Não foi executado `npm ci`, testes locais ou conexão a banco nesta sessão; não foi tocada produção.

### Próximas ações, em ordem

1. Criar um teste de migração de dados históricos em PostgreSQL descartável, cobrindo placas LEGACY, MERCOSUR e registro não classificável; verificar que os registros válidos são preservados e o caso inválido interrompe a migração sem prosseguir silenciosamente.
2. Resolver a diferença de patch Next.js/ESLint com uma alteração pequena e lockfile regenerado por npm, depois de validar compatibilidade; executar pipeline completo.
3. Só depois iniciar o próximo módulo funcional, mantendo as regras financeiras pendentes bloqueadas até decisão explícita.
