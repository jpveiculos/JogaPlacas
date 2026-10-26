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

### Atualização após implementação do teste de migração histórica

- Foi criado `scripts/test-dual-plate-migration.mjs`, adicionado `npm run test:migration-backfill` e integrado o comando ao job `migration-test` do workflow. O teste cria bancos descartáveis, verifica o backfill LEGACY/MERCOSUR e exige falha explícita para uma placa não classificável.
- A alteração está versionada; o CI do commit que contém a nova etapa ainda precisa ser consultado antes de considerar o teste aprovado.
- Próximas ações: (1) verificar o resultado do workflow; corrigir falhas se houver; (2) resolver a diferença de patch Next.js/ESLint com lockfile regenerado e pipeline completo; (3) só depois iniciar o próximo módulo funcional, mantendo as regras financeiras pendentes bloqueadas até decisão explícita.


### Evidência após adicionar o teste de backfill — 2026-10-25

O teste de migração histórica foi adicionado ao repositório e ao workflow, mas não foi executado localmente nesta sessão. Seu resultado deve ser tratado como pendente até que a execução GitHub Actions do commit correspondente termine com sucesso. O script cria bancos temporários no PostgreSQL configurado, portanto deve ser executado apenas em ambiente de teste descartável com permissão de criação/remoção de bancos.


### Resultado da primeira execução do teste histórico — 2026-10-25
A CI falhou no seed de dados, não na migração dual-plate: `scripts/test-dual-plate-migration.mjs` referenciava `Purchase.updatedAt`, inexistente na migração inicial. Corrigido no commit `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8`. O teste precisa ser reexecutado na CI; aprovação permanece pendente até o resultado do novo commit.


### CI do teste histórico após correção — 2026-10-25
O workflow completo do commit `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8` terminou com `success`, incluindo `migration-test`, `postgres-concurrency-test` e `verify`: https://github.com/jpveiculos/JogaPlacas/actions/runs/40147585024. A fixture corrigida agora alcança os cenários de backfill válido e bloqueio de dados inválidos. Isso não substitui a validação posterior após resolver a diferença de versão Next.js/ESLint. A versão `eslint-config-next@16.4.3` existe; a revisão recomenda alinhar os pacotes na mesma versão de patch, mas a atualização precisa incluir lockfile gerado de modo reproduzível e nova CI.


### Revisão adicional de schema e regras — 2026-10-25
- As migrações declaram PKs, FKs e índices únicos, mas não impõem por `CHECK` constraints os limites monetários (não negativos), soma de alocações, mínimo de R$ 1,00 por linha/participação ou consistência de `Purchase.totalCents` com suas participações/linhas. Hoje essas invariantes dependem dos serviços; isso é um risco se surgir outro caminho de escrita ou manutenção SQL.
- O schema permite que `Round` tenha apenas um resultado, ou status `COMPLETED` sem os dois resultados. `drawRoundResults`/`settleRoundPrizes` fazem validações de aplicação, mas não há constraint/triggers que protejam contra escrita direta. Avaliar restrições sem impedir estados legítimos de migração/reconciliação.
- `settleRoundPrizes` grava crédito de prêmio no `LedgerEntry` para jogadores; linhas de venda de cambista ficam como pagamento manual pendente, coerente com a ausência de carteira para `Customer`, mas o fluxo de pagamento manual/auditoria ainda precisa ser implementado.
- A confirmação de Pix e a reconciliação com provedor continuam fora do serviço de criação de compra pendente. A participação só pode ser confirmada por um fluxo de pagamento que valide confirmação até o cutoff; esse fluxo não deve ser inferido como existente por causa do modelo `Payment`.

Esses são achados de revisão, não decisões de negócio nem alterações de schema. Antes de novos fluxos financeiros, especificar e testar os invariantes e os estados de cancelamento/expiração/reembolso.


## Complemento de auditoria — fluxo de saques e estados legados — 2026-10-26

### Alterações documentadas na branch de desenvolvimento

- O fluxo administrativo novo oferece apenas as ações **Pagar** e **Rejeitar** para saques PENDING. Pagar registra o pagamento Pix manual realizado fora da plataforma e encerra em PAID; rejeitar encerra em REJECTED e lança uma entrada compensatória WITHDRAWAL_RELEASE para devolver o valor reservado.
- A API bloqueia ações em estados encerrados e usa transação serializável com bloqueio da linha de saque. Os lançamentos de pagamento (auditoria de valor zero) e liberação usam chaves de idempotência por saque.
- A revisão da interface encontrou um problema de visibilidade: os estados antigos APPROVED/PROCESSING eram excluídos tanto da lista pendente quanto do histórico administrativo. A interface administrativa foi ajustada para mantê-los visíveis no histórico como registros legados que precisam de conferência; a carteira do jogador também os identifica como estados antigos e orienta contato com o administrador.
- Os estados APPROVED/PROCESSING permanecem no enum Prisma e na migração inicial por compatibilidade com dados persistidos. Não remover esses estados sem inventariar os registros existentes e planejar migração segura. A regra funcional está registrada em docs/PRODUCT_SPEC.md.

### Limites da validação

- Os commits da revisão de interface e documentação estão na branch feature/dual-plate-draw; main não foi alterada.
- A consulta ao GitHub Actions para os commits recentes não retornou execuções de workflow nem status de CI. Portanto, essas alterações ainda não têm validação automatizada confirmada nesta revisão.
- Próximas verificações: inspecionar testes e mocks do endpoint de saques; verificar transições e histórico; confirmar a aritmética de saldo derivada do livro-razão e idempotência; executar lint, typecheck, testes e build no pipeline; só então decidir se os estados legados podem ser removidos em uma migração futura.


### Testes adicionais do fluxo de saques — 2026-10-26

- Os testes unitários do endpoint administrativo foram fortalecidos para verificar explicitamente que a rejeição grava o estado REJECTED, registra a transição PENDING → REJECTED no histórico e lança WITHDRAWAL_RELEASE com o valor integral e chave idempotente esperada.
- Foi adicionado teste para confirmar que a consulta administrativa continua incluindo APPROVED/PROCESSING no conjunto de estados retornados para reconciliação histórica.
- A interface do jogador também foi ajustada para explicar os dois resultados possíveis: pagamento confirmado ou rejeição com devolução do valor reservado.
- O PR #2 continua aberto como rascunho e sem merge. A verificação mais recente ainda não retornou status ou execuções do GitHub Actions para o HEAD consultado; os testes foram editados, mas sua execução não está comprovada. A API e os testes devem ser validados por CI antes de qualquer merge.


## Reconciliação do estado atual — 2026-10-26

A auditoria anterior contém itens de verificação datados de commits passados; não interpretar seus estados pendentes como automaticamente atuais nem seus sucessos como prova do HEAD atual.

### Código localizado nesta branch
- Existem páginas e APIs para login/troca de senha, jogador, cambista, administrador, compra/histórico/recibo, resultados, rodadas, webhook Mercado Pago, reconciliação de prêmios e saques.
- Existem migrações versionadas para sessões, limite de tentativas, dois resultados de placa, recibo após confirmação, verificações de integridade e campos do checkout Pix.
- Existem serviços transacionais para compra pendente, confirmação de pagamento, sorteio dos dois resultados, apuração idempotente e saques com reserva/liberação.
- A implementação do checkout/webhook Mercado Pago é incremental, não prova integração pronta: validação com credenciais de teste, formato real das notificações, eventos fora de ordem, pagamento após cutoff e política de estorno/reconciliação continuam gates.
- Ações administrativas de saque são somente **Pagar** (registrar transferência Pix manual já realizada fora da plataforma) e **Rejeitar** (liberar reserva via `WITHDRAWAL_RELEASE` idempotente). `APPROVED`/`PROCESSING` são estados legados que precisam permanecer visíveis para reconciliação; não converter nem remover automaticamente.

### Limites de validação nesta reconciliação
- A API de status do commit consultado `ab3a24fa9ed07e02b11f8601d13b7210a13614f9` retornou lista vazia de checks/status. A CI do HEAD atual não está confirmada por essa evidência.
- Testes escritos e sucessos de CI em commits anteriores são evidências úteis, mas não substituem executar a pipeline no HEAD exato nem testes ponta a ponta do provedor.
- Continuam necessários testes PostgreSQL para aritmética e concorrência do livro-razão de saques, confirmação idempotente, migrações e reconciliação; validar também falhas transacionais e auditoria.
- A gestão administrativa completa, vendas em espécie pelo cambista, impressão/QR testados fisicamente e operação do scheduler hospedado não podem ser considerados concluídos apenas pela existência de componentes/rotas.
- Nenhuma alteração em `main`, deploy, migração em produção ou pagamento real foi realizada ou autorizada por esta auditoria.
