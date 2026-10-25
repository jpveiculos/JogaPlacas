# Joga Placas — Manual técnico de implementação

Status: manual operacional vigente, atualizado em 2026-10-25 após revisão de feature/dual-plate-draw no commit 1d37b8fc59e0c10717272b96dec1d9bd206a6819. A especificação funcional em docs/PRODUCT_SPEC.md é a fonte de verdade para comportamento; decisões arquiteturais em docs/ADR-001-FOUNDATION.md e docs/TARGET_DOMAIN_MODEL.md complementam o manual. Não presumir que planning/foundation contém as alterações da branch de feature: as branches divergem.

## Produto e navegação obrigatórios

A plataforma não deve ser concebida como um site cuja página inicial seja o produto principal. O produto consiste em três ambientes autenticados e separados:
- **Área do jogador**: apostas, pagamentos, recibos, resultados, histórico e carteira conforme a especificação.
- **Área do cambista**: vendas para clientes, recebimentos, recibos, histórico e comissões; sem carteira própria nem saques.
- **Área do administrador**: gestão de usuários, rodadas, regras, resultados, financeiro, comissões, saques e auditoria.

Pode existir uma área pública auxiliar para login, termos de uso, privacidade e outras páginas institucionais necessárias. Ela não substitui nem deve competir com os três ambientes principais. Após login compartilhado, o servidor identifica o papel e encaminha para a área permitida; toda autorização é verificada no servidor, não apenas escondida na interface.

## Decisões técnicas aprovadas

- Aplicação modular única com Next.js App Router, React e TypeScript estrito.
- PostgreSQL e Prisma ORM com migrações versionadas.
- Zod para validar entradas e configuração nos limites da aplicação.
- Vitest para testes unitários e de integração; Playwright para fluxos críticos de interface.
- ESLint, typecheck, testes, validação/geração Prisma, build e teste de migrações na CI.
- Valores monetários em centavos inteiros; nunca usar ponto flutuante para dinheiro.
- Instantes persistidos em UTC e regras/agenda apresentadas no fuso `America/Sao_Paulo`.
- Regras financeiras centralizadas no domínio; pagamentos por adaptadores para manter o domínio independente do provedor.
- Webhooks autenticados, persistidos e idempotentes; segredo apenas em variáveis de ambiente/gerenciador de segredos.
- Um checkout/compra pode conter de 1 a 10 participações de rodadas, com pagamento único antecipado; cada participação é registrada separadamente.
- Cliente atendido pelo cambista é distinto de conta de jogador, salvo criação explícita de conta.
- Livro-razão append-only, auditoria e snapshots históricos; não alterar saldos por atalhos nem reescrever condições antigas.

## Estrutura modular de destino

`src/app` contém rotas e layouts das três áreas e páginas públicas auxiliares. `src/modules` concentra casos de uso por domínio: auth, plates, rounds, bets, purchases, payments, wallet, cashiers e admin. `src/domain` contém regras puras; `src/lib` contém infraestrutura compartilhada sem regras de negócio; `prisma` contém schema e migrações. Não criar módulos vazios ou abstrações antecipadas sem necessidade demonstrada.

## Política de limpeza e substituição

- Antes de substituir ferramenta, serviço, modelo ou fluxo, localizar todas as referências e consumidores no repositório e comparar com o manual.
- Ao concluir a substituição, remover código antigo, dependências, scripts, configurações, rotas e documentação obsoletos somente depois de provar que não têm consumidores ativos.
- Não manter duas implementações concorrentes da mesma responsabilidade nem adicionar correções improvisadas sobre arquitetura incompatível.
- Não apagar histórico/auditoria financeira nem migrações já aplicadas. Migrações versionadas são histórico operacional, não lixo.
- Atualizar documentação no mesmo conjunto de mudanças; documentos de inspeções antigas devem ser corrigidos ou explicitamente identificados como registros históricos.
- Remover dependências somente após busca de uso e validação de build/testes. Não atualizar versões principais cegamente.

## Ordem obrigatória de execução

1. Auditar repositório, dependências, CI, documentação e divergências em relação ao manual.
2. Validar modelo de domínio e schema; revisar SQL de migração e testar exclusivamente em banco descartável.
3. Completar domínio puro e testes de placa, categorias, rateio, valores e janelas de rodada.
4. Implementar autenticação, sessões seguras, papéis, propriedade dos registros, limites de tentativa e auditoria.
5. Implementar compra e participações com cutoff no servidor, idempotência e concorrência real no PostgreSQL.
6. Implementar carteira/livro-razão, prêmios, saques, vendas em espécie e comissões com invariantes transacionais.
7. Implementar os três ambientes de interface e as páginas públicas auxiliares conforme a especificação.
8. **Somente na fase final**, integrar o provedor Pix/Mercado Pago, credenciais, webhooks e reconciliação. Até essa fase, não criar cobranças nem usar credenciais reais.
9. Testar ponta a ponta, segurança, concorrência, reconciliação, backup/restauração e recuperação.
10. Revisar configuração do novo servidor e variáveis de ambiente; preparar implantação e rollback sem tocar no site atual.
11. Exigir CI verde, revisão final e autorização explícita antes de qualquer mudança de produção.

## Situação atual da branch

- Existe schema Prisma refatorado para Purchase/Participation, além de módulos de domínio e serviço de criação de compra pendente.
- Existe migração inicial versionada em `prisma/migrations/20261023000000_init/migration.sql`; a CI a aplicou a um PostgreSQL descartável e verificou o status. Isso **não** significa que foi aplicada à produção ou que o domínio esteja completo.
- A CI inclui instalação reproduzível com `npm ci`, validação/geração Prisma, lint, typecheck, testes, build e teste de migração.
- A interface ainda é apenas um placeholder em `src/app/page.tsx`; as três áreas e autenticação ainda precisam ser implementadas. Não apresentar a plataforma como funcional enquanto os fluxos não existirem e passarem nos testes.
- Mercado Pago permanece deliberadamente adiado para a fase final.

## Critérios de avanço e segurança

Cada etapa precisa produzir código, testes e documentação coerentes. Não alterar `main`, site ativo, domínio/DNS ou banco de produção durante o trabalho de fundação. Não fazer cobranças reais. Não considerar build ou deploy isolado como prova de funcionamento ponta a ponta. Antes da operação comercial, validar os requisitos legais e regulatórios aplicáveis.


## Atualização de verificação — 2026-10-25

- CI `Verify` do commit `1d37b8fc59e0c10717272b96dec1d9bd206a6819`: sucesso.
- A revisão estática da migração `20261024020000_dual_plate_draw` confirmou que ela interrompe a migração se qualquer `ParticipationLine.plateDisplay` não corresponder a um formato conhecido. Preservar esse fail-closed.
- O teste de migração atual usa PostgreSQL vazio; ele não exercita a classificação de dados históricos. Antes de qualquer uso num banco com dados, criar um teste isolado de backfill LEGACY/MERCOSUR e falha segura para registro inválido/ambíguo.
- **Nota histórica superada:** naquela revisão, `next@16.4.3` e `eslint-config-next@16.4.2` estavam desalinhados. A auditoria posterior desta mesma branch confirmou que `package.json` e `package-lock.json` já declaram `next@16.4.3` e `eslint-config-next@16.4.3`; não há ação de alinhamento pendente enquanto essas versões permanecerem iguais.
- Nenhum teste local/instalação limpa, migração produtiva ou deploy foi executado nesta etapa.


## Atualização de implementação — teste de migração histórica (2026-10-25)

Foi adicionado um teste automatizado de backfill em PostgreSQL descartável: `scripts/test-dual-plate-migration.mjs`, comando `npm run test:migration-backfill`, integrado ao job `migration-test`. Ele testa classificação de registros LEGACY/MERCOSUR, preservação do resultado Mercosul e bloqueio para placa histórica não classificável. A implementação está commitada, mas a aprovação depende do resultado do workflow do commit atual. Executar somente em PostgreSQL descartável com permissão para criar/remover bancos. Nenhum banco real foi alterado.


### Correção da primeira falha do teste de backfill — 2026-10-25
A CI identificou erro na fixture de teste (`Purchase.updatedAt` inexistente na migração inicial), antes de testar o backfill em si. O campo foi removido do INSERT no commit `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8`. O status continua pendente até a CI desse commit terminar.


### CI confirmada e dependências — 2026-10-25
O workflow completo no commit `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8` concluiu com sucesso, inclusive backfill histórico e testes PostgreSQL: https://github.com/jpveiculos/JogaPlacas/actions/runs/40147585024. O pacote `eslint-config-next@16.4.3` está publicado e sua linha 16 requer ESLint >=9, compatível com a dependência atual. A diferença de patch pode ser alinhada, mas a alteração deve ser acompanhada por lockfile regenerado com npm e nova CI completa; ainda não foi feita.


### Revisão de banco e regras de negócio — 2026-10-25
A primeira revisão das migrações/schema encontrou ausência de `CHECK` constraints para valores/alocações não negativos, mínimo por linha e consistência de totais; também não há constraint que garanta dois resultados juntos quando a rodada é `COMPLETED`. Os serviços protegem partes dessas regras, mas escritas diretas/novos caminhos poderiam contorná-las. Avaliar constraints compatíveis com reconciliação histórica e adicionar testes de migração. O serviço atual cria compra e pagamento Pix pendentes; não há integração real com provedor/webhook nem confirmação financeira. Essas pendências devem ser resolvidas antes de ativar fluxos reais.

### Verificação local via GitHub Codespaces — 2026-10-25

O usuário executou manualmente no Codespaces, na branch `feature/dual-plate-draw`, os seguintes comandos e compartilhou telas do terminal:
- `npm test`: 15 arquivos aprovados, 3 ignorados; 104 testes aprovados, 17 ignorados.
- `npm run lint`: 0 erros e 2 avisos para uso de `window.location.assign()` em `src/components/auth/change-password-form.tsx:31` e `src/components/auth/logout-button.tsx:10`.
- `npm run build`: a tentativa inicial falhou porque `DATABASE_URL` não estava definido. Após criar `.env` a partir de `.env.example` e configurar valores apenas de teste, uma execução posterior exibiu a tabela de rotas de build do Next.js e retornou ao prompt sem erro visível; isso é evidência visual de conclusão bem-sucedida, não validação reproduzida por automação desta auditoria.
- Não há evidência nesta conversa de que `npm run db:validate`, `npm run db:generate` ou `npm ci` tenham sido executados no Codespaces; não afirmar que foram concluídos.
- O `.env` é arquivo local e não deve ser commitado. Os valores configurados são exemplos de teste apontando para localhost; não criam nem iniciam PostgreSQL.
- A verificação da execução GitHub Actions `40147783753` (commit `2bf9d5099fcba793108ef44c0290ce07aa282a8d`) confirma `success` em `verify`, `migration-test` e `postgres-concurrency-test`. A instalação reproduzível com `npm ci`, build, teste histórico de migração e testes PostgreSQL passaram no CI desse commit.
- **Nota histórica superada:** a divergência `next@16.4.3` / `eslint-config-next@16.4.2` foi resolvida antes desta atualização; a inspeção atual desta branch encontrou ambas em `16.4.3`. Nenhum merge para `main`, migração produtiva, deploy ou pagamento real foi realizado.

### Auditoria de CI e dependências — 2026-10-25 (atualização)

- A execução GitHub Actions #334, no commit `ca0bd28c8e92a459379e8225956241a340fd1762`, terminou com sucesso: `verify`, `migration-test` e `postgres-concurrency-test` aprovados. No job `verify`, lint, typecheck, testes unitários e build passaram.
- Correção do lint em `src/components/results/public-results-board.tsx`: a carga inicial foi agendada e os temporizadores são limpos no desmontar do componente.
- Correção de resolução de imports nos testes: `vitest.config.ts` agora define o alias `@` para `src`, mantendo o alias de `server-only`. Isso resolveu a falha de testes causada pelo alias ausente.
- Revisão das dependências na branch `feature/dual-plate-draw`: `package.json` e `package-lock.json` declaram `next@16.4.3` e `eslint-config-next@16.4.3`. A divergência de patch mencionada em notas anteriores não está presente nesta branch neste momento; não é necessário alterar versões agora. Confirmar a branch/commit antes de repetir essa verificação.
- Este CI não executa nem autoriza deploy. Nenhuma implantação ou alteração de banco de produção foi realizada.
- Próxima etapa: revisar regras de negócio e restrições de integridade do banco; conferir a especificação funcional antes de implementar novos fluxos. A interface principal ainda é descrita neste documento como placeholder e os fluxos de compra/pagamento continuam sem integração real com provedor Pix.

### Auditoria aprofundada de integridade do banco — 2026-10-25

- Confirmado no schema e na migração inicial: campos monetários em centavos são inteiros, mas ainda não têm restrições SQL explícitas para impedir valores negativos. Isso inclui totais de compras/participações, alocações das seis categorias, pagamentos, lançamentos contábeis, comissões e saques.
- A soma das seis alocações de uma ParticipationLine deve ser exatamente o valor total daquela placa. Como o total da linha não está armazenado separadamente, essa igualdade precisa ser validada pelo domínio/serviço transacional ou por um desenho SQL adicional; um CHECK simples não pode comparar outras tabelas.
- A especificação exige dois resultados independentes por rodada, mas a fixture do teste de backfill histórico cria uma rodada COMPLETED contendo apenas o antigo resultado Mercosul. Portanto, não é seguro adicionar imediatamente uma constraint que exija ambos os resultados em toda rodada concluída sem primeiro definir a política para rodadas históricas e ajustar o teste de migração.
- A migração de formato de placa já falha de modo seguro quando não consegue classificar uma linha histórica; preservar esse comportamento.
- Próxima ação técnica: adicionar constraints SQL locais e não ambíguas para valores não negativos e formato/estado de resultados, depois ampliar os testes de migração com casos válidos e inválidos. Antes de exigir dois resultados em rodadas COMPLETED, decidir e documentar como tratar rodadas históricas que só têm um resultado; não inventar nem converter um resultado para preencher o outro.
- Nenhuma alteração de banco ou deploy de produção foi realizada. A auditoria foi somente estática, lendo schema, migrações e testes no branch de trabalho.

### Restrições de integridade SQL adicionadas — 2026-10-25

- Nova migração `20261025010000_integrity_checks` adiciona `CHECK` para valor mínimo de R$ 1,00 em compra e participação, alocações/prêmio não negativos, pagamento e saque estritamente positivos, taxa/comissão dentro do intervalo válido e formatos independentes dos dois resultados.
- A migração deliberadamente não exige os dois resultados em toda rodada concluída: não há política aprovada para preencher ou classificar rodadas históricas que tenham apenas um resultado.
- A soma entre as seis alocações de uma linha e o total da participação continua precisando de validação transacional no serviço; um `CHECK` SQL de linha não pode garantir sozinho igualdade entre tabelas. Não foi inventado um total de linha adicional nesta etapa.
- A mudança está apenas na branch `feature/dual-plate-draw`; aguardar CI para confirmar a migração em PostgreSQL descartável. Nenhuma migração foi aplicada a produção.


### Revisão da consistência dos totais de compra — 2026-10-25

- Revisados `src/domain/allocate-plate-stake.ts`, `src/domain/purchase-rules.ts`, `src/modules/purchases/create-purchase.ts` e seus testes na branch `feature/dual-plate-draw`.
- A alocação automática preserva exatamente o valor informado em centavos: divide por seis e destina todo o resto à Unidade. Para R$ 1,00, o resultado é Unidade R$ 0,20 e cinco categorias de R$ 0,16.
- O serviço de compra valida o valor de cada placa antes da transação, recalcula a divisão no servidor (não confia em alocações enviadas pelo cliente), valida que cada placa totaliza pelo menos R$ 1,00 e soma os valores das linhas para obter o total da participação e da compra.
- Os totais da participação são derivados das linhas calculadas pelo servidor; o total da compra é derivado de todas as linhas e usado também no pagamento pendente. A criação de compra, participações, linhas e pagamento ocorre na mesma transação serializável.
- A soma das seis categorias por linha não é um total separado persistido; portanto, sua garantia vem da função central de rateio e da validação do serviço, não de uma constraint SQL entre tabelas. A auditoria não identificou necessidade imediata de duplicar o total da linha no schema.
- Testes existentes cobrem o rateio de R$ 1,00, preservação de centavos, rejeição de valores inválidos, mínimo por placa, validação dos totais do domínio e persistência da divisão no serviço. Ainda é recomendável ampliar testes de integração com várias placas em uma participação e múltiplas participações, verificando total da compra, total por rodada e valor do pagamento em conjunto.
- CI da migração de integridade: execução #338 concluída com sucesso; CI do commit de documentação #339 também concluída com sucesso. Nenhuma alteração foi aplicada a produção e não houve deploy.
- Próxima etapa: ampliar os testes de compra com múltiplas linhas/rodadas e depois revisar autorização e propriedade dos registros nos endpoints antes de começar os fluxos funcionais.


### Revisão inicial de autorização das rotas — 2026-10-25

- A execução #341 do workflow `Verify` passou no commit `231003c0319f89884bdff1936381c5f50fa8060b`, incluindo o novo teste de totais financeiros para compra com múltiplas placas e rodadas.
- Revisadas estaticamente as rotas de compra, histórico, resultados e rodadas do jogador, consulta pública de recibo e operações administrativas de fechar, sortear e apurar rodadas.
- Rotas do jogador verificam sessão ativa, papel `PLAYER` e bloqueio por troca obrigatória de senha; histórico filtra compras por `playerId` da sessão. A criação de compra deriva o `playerId` da sessão, rejeita campos extras no schema e valida origem quando o cabeçalho `Origin` está presente.
- Rotas administrativas revisadas verificam sessão, troca obrigatória de senha e papel `ADMIN`, validam o identificador da rodada e registram tentativas negadas por papel insuficiente. A apuração registra evento de auditoria após executar o serviço.
- A consulta pública por recibo exige código completo com formato `JP-`, retorna somente compras confirmadas e expõe campos limitados de resultado; não retorna nome, usuário ou dados de pagamento do jogador.
- Limite desta etapa: revisão estática não substitui testes automatizados de cada papel, tentativa de acesso cruzado entre contas, origem ausente/maliciosa, enumeração de recibos, limites de requisição e comportamento quando a escrita de auditoria falha. Não afirmar que a auditoria de segurança está concluída.
- Próxima etapa: revisar os testes de rota existentes e acrescentar casos negativos de autorização/isolamento onde estiverem ausentes; depois examinar os fluxos de login, alteração de senha, sessão e limitação de tentativas. Nenhum deploy, cobrança ou alteração de banco de produção foi realizado.


### Testes de autorização e revisão de autenticação — 2026-10-25 (complemento)

- A execução #341 está aprovada e cobre o teste de consistência financeira com várias linhas e rodadas.
- A leitura dos testes de rota existentes confirmou casos negativos para sessão ausente, papel incorreto, troca obrigatória de senha, requisições de outra origem, payloads inválidos e consulta pública sem recibo confirmado.
- O histórico do jogador verifica que a consulta usa o `playerId` da sessão autenticada; a criação da compra recebe o identificador do jogador do servidor, e não do payload do cliente.
- O login usa cookie `HttpOnly`, `SameSite=Lax`, expiração, verificação de senha e limitação de tentativas; a troca de senha exige senha atual, comprimento mínimo de 12 caracteres e revoga as sessões anteriores dentro da transação antes de emitir nova sessão.
- Ainda falta verificar os casos em que o armazenamento de auditoria falha, os limites de tentativas e isolamento de conta com integração real PostgreSQL, além da cobertura de todas as rotas. A análise não é um pentest e não certifica a aplicação como pronta para produção.
- A nota antiga sobre divergência Next/ESLint foi marcada como histórica para evitar instruções contraditórias; a branch atualmente auditada tem ambas as dependências na versão 16.4.3.

### Revisão de sessão e limite de tentativas — 2026-10-25

- As execuções #342 e #343 do workflow `Verify` foram confirmadas como concluídas com sucesso nos três jobs: verificação principal, migração e testes de concorrência PostgreSQL.
- A revisão estática de `src/lib/auth/session.ts` confirmou token de sessão aleatório de 32 bytes, persistência somente do hash SHA-256, validade de 12 horas, revogação e rejeição de sessões expiradas, revogadas ou pertencentes a contas inativas.
- O logout revoga a sessão apresentada e limpa o cookie; a rota de identidade retorna apenas campos de sessão necessários e desativa cache; a alteração de senha exige a senha atual e executa atualização da senha, revogação das sessões anteriores e criação da nova sessão numa transação.
- O limitador de login tem testes de integração PostgreSQL para contagem concorrente, janela de 15 minutos e limpeza após autenticação bem-sucedida. Esses testes só são executados quando `RUN_POSTGRES_INTEGRATION=1`.
- **Risco a tratar antes de considerar a proteção contra abuso concluída:** o limitador atual é indexado pelo nome de usuário normalizado, sem uma dimensão independente por origem/IP. Isso permite que um terceiro tente provocar bloqueio temporário de uma conta-alvo. A próxima mudança deve avaliar e testar um limite adicional por origem, sem confiar cegamente em cabeçalhos encaminhados por proxy, sem registrar IP bruto desnecessariamente e sem enfraquecer o limite por conta.
- Esta é uma revisão estática com testes existentes, não um pentest nem uma certificação de segurança. Permanecem pendentes os testes de falha na escrita de auditoria, isolamento de sessão/conta em integração e revisão sistemática das rotas restantes.
- Nenhum deploy, merge para `main`, cobrança real ou alteração em banco de produção foi realizado.

### Revisão de auditoria administrativa — 2026-10-25 (continuação)

- A inspeção das rotas administrativas confirmou que fechar e sortear registram o ator dentro dos serviços de domínio revisados, enquanto a rota de apuração grava `ROUND_PRIZES_SETTLED` depois de `settleRoundPrizes` retornar.
- **Ponto de consistência a resolver:** se a apuração financeira concluir e a gravação posterior do evento de auditoria falhar, a rota pode responder erro 500 embora a apuração já tenha sido persistida. Antes de alterar o fluxo, revisar o serviço de apuração e sua estratégia idempotente; a solução deve garantir rastreabilidade sem repetir créditos ou criar um falso estado de falha. Não basta ocultar a exceção nem declarar a operação concluída sem auditoria.
- A gravação de eventos de negação por papel insuficiente também é aguardada antes de responder 403; uma indisponibilidade do banco de auditoria pode alterar a resposta esperada. Criar testes específicos de falha de auditoria e decidir/documentar uma política uniforme para ações financeiras e tentativas negadas.
- Próxima etapa: inspecionar o serviço transacional `settleRoundPrizes`, o desenho de idempotência e seus testes antes de modificar a rota. Manter as alterações em `feature/dual-plate-draw`; sem deploy ou mudanças em produção.

### Apuração e auditoria na mesma transação — 2026-10-25

- A apuração agora recebe o identificador do administrador e grava o evento `ROUND_PRIZES_SETTLED` dentro da mesma transação PostgreSQL que persiste os prêmios e os créditos no ledger.
- A rota administrativa deixou de gravar o evento de sucesso depois que a transação financeira termina. Isso elimina o estado ambíguo em que a apuração poderia estar concluída no banco, mas a rota retornaria erro porque uma gravação de auditoria separada falhou.
- Se a gravação de auditoria falhar dentro da transação, a transação inteira deve falhar e reverter junto os créditos e atualizações da apuração. A idempotência existente por `prize-credit:<lineId>` permanece como proteção adicional, não como substituto da atomicidade.
- Os testes da rota foram ajustados para verificar que o identificador do administrador é entregue ao serviço e que a rota não tenta criar um segundo evento de sucesso fora da transação. A confirmação final depende da CI do commit atual.
- A alteração está restrita à branch `feature/dual-plate-draw`. Nenhum deploy, merge para `main`, pagamento real ou banco de produção foi tocado.

### Obrigatoriedade de auditoria na apuração — 2026-10-25

- A CI da execução #349 terminou com sucesso nos três jobs: `verify`, `migration-test` e `postgres-concurrency-test`.
- A revisão seguinte identificou que `settleRoundPrizes` aceitava o identificador do administrador como opcional. Isso permitia que uma chamada futura do serviço concluísse a apuração sem registrar o evento de auditoria, mesmo que a rota administrativa atual já passasse o ator.
- O serviço agora exige `actorId` e grava obrigatoriamente `ROUND_PRIZES_SETTLED` na mesma transação dos créditos e da apuração. O teste de integração PostgreSQL foi atualizado para fornecer um ator e verificar os eventos de auditoria das chamadas concorrentes/repetidas, além de removê-los na limpeza da fixture.
- A alteração está na branch `feature/dual-plate-draw`; aguardar CI antes de considerar validada. O teste de integração PostgreSQL depende de `RUN_POSTGRES_INTEGRATION=1` e de `DATABASE_URL`; a CI comum não substitui a execução explícita desse teste contra PostgreSQL.
- Nenhum deploy, merge para `main` ou alteração de banco de produção foi realizado.

### Correção de tipagem no teste de integração de apuração — 2026-10-25

- As execuções #350, #351 e #352 detectaram falha de TypeScript no teste de integração PostgreSQL: duas chamadas ainda usavam a assinatura antiga de `settleRoundPrizes`, sem o ator obrigatório. Os demais jobs de migração e concorrência PostgreSQL dessas execuções passaram; o job principal falhou no typecheck.
- Corrigi as chamadas restantes para fornecer o identificador do ator, mantendo a exigência de auditoria no serviço. Commit de correção: `0cc65cfc5d67bd6a9599dc75848740d96994884b`.
- A execução #353 está na fila para validar a correção. Não considerar o pipeline aprovado novamente até essa execução terminar.
- Nenhuma alteração de produção ou deploy foi feita.


### CI restabelecida e ajuste do ator de auditoria — 2026-10-25

- As execuções #353 e #354 terminaram com sucesso nos três jobs do workflow: verificação principal, teste de migração e teste de concorrência PostgreSQL. A correção das chamadas de teste para a assinatura obrigatória de `settleRoundPrizes(prisma, roundId, actorId)` está validada pela CI: https://github.com/jpveiculos/JogaPlacas/actions/runs/40233222350 e https://github.com/jpveiculos/JogaPlacas/actions/runs/40233232170.
- Na revisão posterior do teste de integração de apuração, foi identificado que o fixture usava o ID de um jogador como ator de auditoria. O teste agora cria um usuário com papel `ADMIN` e usa esse ID nas chamadas de apuração; a limpeza remove os dois usuários de teste. Essa mudança é apenas no teste e aguarda a CI do novo commit.
- A inspeção do checkout confirma que a criação de compra grava uma compra e pagamento Pix pendentes, com idempotência e validação transacional, mas não chama o Mercado Pago, não cria cobrança real e não confirma pagamento. A interface informa essa limitação ao jogador. A integração de pagamento continua explicitamente fora do estado funcional atual.
- A área do cambista continua sendo um placeholder protegido por papel, sem fluxo de venda, cliente ou comissão habilitado. Não tratar os fluxos Pix/cambista como prontos.
- A limitação de tentativas de login permanece por conta e o risco de bloqueio provocado por terceiros continua pendente. Não foi adicionada uma dimensão por IP/origem sem conhecer um sinal de cliente confiável da infraestrutura.
- Nenhum deploy, merge para `main`, cobrança real ou alteração em banco de produção foi realizado.


### Painel operacional inicial do administrador — 2026-10-25

- Implementado endpoint protegido `GET /api/admin/rounds`, com verificação de sessão, papel `ADMIN` e troca obrigatória de senha. Retorna até 100 rodadas, seus estados/resultados e contagem de participações, além de totais agregados de compras pendentes e confirmadas; respostas sem cache.
- A área administrativa deixou de ser apenas placeholder para o ciclo operacional de rodadas: lista rodadas, exibe os dois resultados como placas separadas e permite acionar fechamento, sorteio e apuração por meio das rotas existentes. A interface confirma ações antes de executá-las, mostra erros retornados pelo servidor e atualiza os dados após a operação.
- As regras críticas permanecem no servidor: cutoff, estado da rodada, horário do sorteio, existência dos dois resultados e idempotência da apuração não são confiados à interface. O painel não permite editar resultados publicados.
- Adicionado teste de rota para sessão ausente, papéis não autorizados, agregados e cabeçalho sem cache. Os commits de implementação do endpoint, componente, página, CSS e teste ainda precisam ser confirmados pela CI subsequente.
- Limites conhecidos: ainda não existe interface de criação/recorrência de rodadas, nem painéis completos de usuários, configurações, comissões, saques e relatório financeiro. Pagamento Pix real e fluxo de cambista continuam pendentes; o painel não deve ser considerado a conclusão da plataforma.
- Nenhum deploy, merge para `main`, cobrança real ou alteração de banco de produção foi executado.


### Criação administrativa de rodadas — 2026-10-25

- A execução #363 confirmou que o painel operacional anterior passou em lint, typecheck, testes, build, migração e concorrência PostgreSQL após a correção do efeito React.
- Acrescentada criação manual de rodada na API administrativa: apenas ADMIN com senha inicial já alterada pode criar; requisição de outra origem é recusada quando o cabeçalho Origin está presente; os horários são validados no servidor; o início deve ser futuro e exatamente 29 minutos antes do resultado, que precisa cair nos minutos :00 ou :30 de São Paulo; o cutoff é calculado como um minuto antes do resultado.
- O código da rodada é derivado do horário de resultado no fuso `America/Sao_Paulo`; criação e evento `ROUND_CREATED` são persistidos na mesma transação. Código duplicado retorna conflito em vez de sobrescrever a rodada.
- A interface converte horários de parede do fuso São Paulo para ISO antes de enviar, exibe a regra de cutoff e atualiza a lista após a criação. Foram acrescentados testes de rota para origem, papel, intervalo e auditoria transacional.
- As alterações de criação de rodada e seus testes ainda aguardam a CI dos commits mais recentes; não considerar aprovadas até a conclusão do workflow.
- Ainda faltam recorrência automática de rodadas, administração financeira e de contas, fluxo completo de cambista, confirmação de pagamento real e revisão final de segurança. O sistema não está pronto para produção nem foi implantado.


### Programação recorrente de rodadas — 2026-10-25

- Implementado endpoint interno protegido `POST /api/internal/round-scheduler`, destinado a ser chamado pelo agendador do ambiente de hospedagem a cada minuto com `Authorization: Bearer <ROUND_SCHEDULER_SECRET>`. A ausência de segredo ou um token inválido resulta em 401.
- O endpoint mantém uma janela móvel de 48 horas de rodadas, com horários de resultado alinhados às marcas de meia hora no fuso `America/Sao_Paulo`. Os códigos de rodada incluem data e minuto local e a restrição única no banco permite repetição segura sem duplicar rodadas.
- A sequência recorrente abre um minuto após o sorteio anterior, fecha um minuto antes do próximo sorteio e mantém resultados em :00 e :30. A rodada com resultado às 00:30 abre às 00:01 e fecha às 00:29.
- O agendador processa fechamentos vencidos antes dos sorteios vencidos e usa os serviços existentes que bloqueiam a linha e protegem contra sorteios duplicados. Cada rodada criada e sua auditoria são gravadas na mesma transação. Falhas individuais são reportadas no resultado para que o provedor possa repetir a chamada.
- A criação manual segue o mesmo ciclo de 29 minutos entre início e resultado e não substitui o agendador.
- **Não está ativado em produção:** é necessário configurar `ROUND_SCHEDULER_SECRET` no ambiente de hospedagem e criar uma tarefa externa com frequência de um minuto. O repositório não identifica ainda um provedor de hospedagem/agendador de produção confirmado, e nenhuma URL ativa, segredo ou banco produtivo foi alterado. A programação só será efetivamente automática quando essa tarefa for configurada no ambiente correto.
- Validação de CI pendente para os commits desta implementação. Não considerar sorteios automáticos ativos nem fazer cobranças reais até validar o workflow e configurar o agendador com acesso ao banco correto.


### Ajuste de ciclo: abertura efetiva e proteção de compras — 2026-10-25
- O serviço `src/modules/rounds/open-round.ts` abre uma rodada SCHEDULED quando o relógio do banco alcança `startsAt`, desde que ainda esteja antes de `cutoffAt`. Usa bloqueio da linha, transação serializável e auditoria; rodadas já abertas são tratadas como no-op idempotente.
- O endpoint interno foi alterado para POST, pois realiza mutações. A autenticação exige `ROUND_SCHEDULER_SECRET` em `Authorization: Bearer ...`, comparado em tempo constante.
- O agendador agora processa: fechamentos vencidos, aberturas cujo início chegou e sorteios vencidos. Compras também validam `startsAt`, para impedir apostas antes da abertura mesmo que a rodada já esteja criada com status SCHEDULED.
- Adicionados testes para abertura, rejeição antes do início/depois do fechamento, execução idempotente do scheduler e autorização; testes de compra cobrem o instante de abertura.
- A CI destes commits está pendente. A execução automática em produção ainda exige escolher/confirmar a hospedagem correta, configurar segredo e agendar chamada a cada minuto. Nenhum deploy ou banco de produção foi alterado.


### Correção final do alinhamento de minutos — 2026-10-25

- A regra aprovada foi aplicada literalmente: resultado em :00 ou :30; abertura em :01 ou :31; fechamento em :59 ou :29 imediatamente antes do próximo resultado. Exemplo: resultado 00:00, abertura da rodada seguinte 00:01, fechamento 00:29 e resultado 00:30.
- Para uma rodada com resultado às 00:30, o horário de início é 00:01 (29 minutos antes do resultado), o fechamento é 00:29. A rotina não usa 00:00 como início dessa rodada.
- A criação manual foi restringida à mesma regra: resultado precisa estar nos minutos :00 ou :30 do fuso de São Paulo e o início exatamente 29 minutos antes. Os testes foram ajustados para esses instantes.
- Se o scheduler iniciar no minuto anterior ao resultado e a rodada ainda não existir, ele ainda pode criar a rodada vencendo o cutoff e fechá-la imediatamente, para permitir o sorteio no horário programado. Se o instante do sorteio já passou, não cria retrospectivamente uma rodada nova.
- O serviço de compra valida `startsAt` e `cutoffAt`; portanto, mesmo uma rodada previamente criada não aceita apostas antes da abertura.
- A execução CI #405 confirmou sucesso nos três jobs (`verify`, `migration-test` e `postgres-concurrency-test`) após essas correções.


### Auditoria das transições automáticas

- Fechamentos e sorteios acionados pelo scheduler agora geram eventos de auditoria próprios (`ROUND_CLOSED_AUTOMATICALLY` e `ROUND_RESULTS_DRAWN_AUTOMATICALLY`), dentro da mesma transação que altera o estado ou persiste os resultados.
- Operações manuais de administrador preservam os eventos de auditoria existentes com o ator associado.
- CI #405 passou nos três jobs após as alterações mais recentes.


### Correção de fixtures de testes após exigir abertura — 2026-10-25

- A CI detectou que a fixture de integração PostgreSQL de compras tinha `startsAt` posterior ao horário de teste, algo que era tolerado antes da nova validação. A fixture foi corrigida para representar uma rodada já aberta no instante da compra.
- A CI também detectou uma expectativa antiga no teste de criação administrativa que ainda esperava início às 12:00; a expectativa foi alinhada para 12:01, fechamento 12:29 e resultado 12:30.
- Os jobs anteriores com falhas são anteriores a essas correções. A CI #405 do commit `c5f1119e61bb9f6f067a0b29072f5a9d35a609dd` passou em `verify`, `migration-test` e `postgres-concurrency-test`.


### Auditoria da regra de repetição sequencial — 2026-10-25

- Decisão funcional confirmada com o responsável: repetição de 1 a 10 significa rodadas consecutivas, não uma seleção de sorteios aleatórios ou espaçados. Exemplo: uma compra de 4 repetições concorre à rodada atual elegível e às três rodadas seguintes, em intervalos de 30 minutos.
- Atualizada a fonte de verdade `docs/PRODUCT_SPEC.md`: proíbe pular sorteios, escolher rodadas alternadas ou remapear a repetição silenciosamente. Cada participação mantém seu registro próprio dentro da mesma compra antecipada.
- A validação de domínio considera a primeira participação como a que precisa estar aberta no instante da compra; as participações seguintes podem estar agendadas, desde que estejam dentro do cutoff de cada rodada.
- O serviço de compra valida os horários oficiais carregados do banco: cada rodada selecionada precisa ter resultado exatamente 30 minutos depois da anterior, preservando a ordem enviada e impedindo saltos. A sequência é recusada se houver lacuna.
- Esta implementação permanece na branch `feature/dual-plate-draw`; nenhuma hospedagem, produção, cobrança real ou banco produtivo foi alterado. A conclusão depende da CI e de testes de integração adicionais.


### Ajuste de interface e correção da CI — repetição sequencial — 2026-10-25

- A primeira CI que executou a nova validação detectou uma fixture de teste financeiro antiga sem os horários `resultAt` e com a segunda rodada marcada como `OPEN`. A falha foi de fixture incompatível com o novo contrato, não do teste que rejeita sorteios pulados. A fixture foi corrigida para modelar a rodada aberta e a seguinte agendada, com resultados separados por 30 minutos.
- A interface do jogador foi ajustada para orientar a seleção sequencial: a primeira rodada só pode ser a que está aberta; só a próxima rodada consecutiva pode ser adicionada; remover uma rodada também remove as posteriores; rodadas não consecutivas ficam desabilitadas. O servidor continua sendo a autoridade final e rejeita qualquer sequência inválida.
- O teste automatizado de compra que tenta pular uma rodada passou na execução #412; porém a execução geral falhou por causa da fixture financeira, e não deve ser considerada aprovada. A nova execução após a correção precisa terminar com sucesso antes de validar a mudança.
- Sem deploy, sem merge para `main`, sem banco de produção e sem cobrança real.


### Recuperação do agendador no minuto de corte — 2026-10-25

- A auditoria encontrou uma condição de borda: se o scheduler fosse iniciado durante o minuto final antes do sorteio, a geração de slots pulava o sorteio iminente porque o cutoff já havia chegado. Isso contrariava a estratégia de recuperação documentada.
- Corrigido o cálculo para pular somente horários de resultado que já passaram. Se o scheduler iniciar às 12:29 para o resultado das 12:30, ainda cria a rodada com início às 12:01 e cutoff às 12:29; a rotina fecha a rodada e pode sortear às 12:30.
- Adicionado teste automatizado com relógio fixo para validar o caso de inicialização às 12:29 no fuso de São Paulo e conferir os horários e o evento de auditoria.
- A CI deve passar antes de considerar a correção validada. O endpoint permanece protegido por segredo e não foi configurado nem ativado em hospedagem de produção.


## Padrão visual de horário — 2026-10-25
Decisão funcional confirmada: todos os horários apresentados na interface, no recibo e em informações de rodadas devem usar o formato de 24 horas `HH:mm`, com dois pontos e sem sufixos `h` ou `hs`. Exemplos: `00:00`, `12:30`, `23:59`. Aplicar o mesmo padrão às mensagens, cartões de rodada, sequência de repetição e recibo térmico. Isso é somente formatação visual: não muda `America/Sao_Paulo`, os valores de data/hora armazenados nem a lógica do agendador. A aplicação visual em todos os componentes ainda precisa ser verificada e coberta por testes.


## Decisão e pendências do recibo para repetição — 2026-10-25
Decisão funcional: uma compra com 1 a 10 rodadas consecutivas gera um único recibo oficial e uma única sequência de impressão térmica. O recibo usa Purchase.receiptCode como código estável da compra e lista cada participação em ordem, com índice da repetição, código da rodada, placa/formato e valor; o total do recibo deve corresponder ao total confirmado da compra. Um único QR Code consulta a compra completa, não cada repetição separadamente. Reimpressão reaproveita o código e não altera estados financeiros; falha física de impressão não cancela pagamento.

Estado atual e limites: src/components/receipts/thermal-receipt.tsx é um componente de apresentação que só renderiza com status CONFIRMED e formato válido do código. Ele recebe os dados e o QR Code da camada chamadora; o QR ainda pode ser apenas um espaço reservado. Não foi concluída a integração ponta a ponta entre confirmação real de pagamento, emissão do código, carregamento das participações, resolução do QR e impressão pelo fluxo do cambista.

Testes pendentes antes de considerar o fluxo pronto:
- recibo único para compras com 1, 5 e 10 repetições;
- ordem contínua e índice correto da repetição, sem pular rodadas;
- total impresso igual à soma das participações/linhas confirmadas;
- preservação literal dos formatos de placa cinza e Mercosul;
- recibo não renderizado para pagamento pendente/cancelado/estornado;
- reimpressão com o mesmo código, sem efeitos financeiros;
- QR Code levando à consulta da compra completa e somente dados autorizados;
- integração real com a tela do cambista e com o provedor de pagamento após confirmação assinada e idempotente.


Implementação parcial do recibo — 2026-10-25: o componente térmico agora identifica visualmente cada linha pela repetição sequencial e mantém o código da rodada explícito. Foi adicionada cobertura unitária para várias linhas na mesma rodada e para dez rodadas em sequência. Isso cobre a apresentação do índice, não substitui a futura integração de pagamento, QR Code, consulta completa da compra ou impressão real no cambista.


### Correção de teste do recibo — 2026-10-25

- A CI #428/#429 encontrou que o arquivo de teste importava diretamente o componente TSX, mas a configuração Vitest não transformava JSX nessa importação. A regra de numeração foi extraída para `receipt-repetition.ts`, os tipos para `thermal-receipt-types.ts`, e o teste agora importa o módulo puro sem carregar JSX. O componente continua usando e exportando o mesmo helper. A correção aguarda CI; não considerar validada até todos os jobs terminarem.


### Revisão complementar de pagamentos e recibo — 2026-10-25

- A auditoria atual confirmou que `POST /api/player/purchases` cria somente compra/participações/pagamento pendentes e informa explicitamente que nenhuma cobrança Pix foi criada. O serviço não chama o Mercado Pago e não marca pagamento como confirmado.
- A consulta pública por código de recibo já limita o resultado a compras confirmadas e expõe apenas as linhas/resultados necessários; pode servir de destino para o QR do recibo único após validação adicional e geração do QR.
- O schema contém metadados para provedor e eventos de webhook, mas ainda não existe adaptador, criação de cobrança, verificação de autenticidade de webhook ou reconciliação ponta a ponta.
- O plano `docs/PAYMENTS_MERCADO_PAGO_IMPLEMENTATION_PLAN.md` foi atualizado com esses achados e gates de segurança. Não usar credenciais reais nem emitir recibo até que o pagamento seja confirmado por fonte confiável no servidor.
- As primeiras execuções da CI do recibo (#428 e #429) falharam porque Vitest tentou importar JSX do componente térmico sem transformação configurada. A regra de numeração e os tipos foram extraídos para módulos TypeScript sem JSX, e o teste passou a importar o módulo puro. A validação desta correção está pendente da CI mais recente.
- Sem deploy, sem merge para `main`, sem alteração de banco de produção e sem cobrança real.


### Endpoint protegido para recibo oficial — 2026-10-25

- Criado `GET /api/player/purchases/[purchaseId]/receipt` para carregar os dados do recibo a partir do banco, em vez de confiar em valores enviados pelo navegador.
- Exige sessão ativa e propriedade da compra: jogador só acessa a própria compra, cambista só acessa a compra associada a ele e administrador pode consultar para suporte/auditoria. IDs inexistentes e não autorizados retornam a mesma resposta 404 para reduzir enumeração.
- O recibo só é retornado quando compra e pagamento estão `CONFIRMED`, ambos têm timestamp de confirmação e existe `receiptCode`. Compra pendente ou inconsistente não recebe payload de recibo.
- Linhas e rodadas são lidas do banco, ordenadas por horário da rodada, e os valores por placa são reconstruídos a partir das seis alocações em centavos. O endpoint não cria cobranças nem altera estados financeiros.
- Testes cobrem sessão ausente, proprietário, acesso cruzado, pagamento pendente e ordem/total de linhas. A implementação precisa passar a CI; ainda não está ligada ao componente de impressão nem à confirmação real de pagamento.


## Recibo oficial: consulta autenticada na área do jogador (2026-10-25)

- O histórico do jogador oferece a ação de consultar/imprimir recibo somente para compras cujo estado esteja `CONFIRMED`.
- A interface consulta `GET /api/player/purchases/[purchaseId]/receipt`; o servidor repete a verificação de sessão, titularidade e confirmação de compra e pagamento. Não confiar apenas na condição visual.
- Os dados retornados pelo servidor alimentam o componente térmico de 58 mm, com linhas agrupadas por código de rodada e um único código de recibo para a compra inteira. A reimpressão não cria compra nem movimentação financeira.
- QR Code real ainda não está integrado; o componente mantém o espaço reservado. A consulta pública pelo código já existe, mas a navegação QR ponta a ponta depende de URL de destino definida e geração local confiável do QR.
- A integração de pagamento não está ativa: sem confirmação autêntica do provedor, o recibo oficial permanece indisponível. Testes da CI devem confirmar esta alteração antes de considerar a etapa validada.


## Consulta pública de recibo e resultados (2026-10-25)

- Criada a página `/consulta`, que aceita código de recibo `JP-...` e consulta `GET /api/public/ticket-check` sem exigir sessão.
- A página só exibe resultados retornados pelo endpoint, que limita a consulta a compras confirmadas e não retorna identificadores do jogador. Prêmio só é apresentado como creditado quando existe registro de crédito.
- O endpoint permanece a fonte de verdade; a página não calcula premiação nem altera registros financeiros.
- A integração com QR Code físico/digital ainda não foi ligada. O destino web pode ser `/consulta?...` numa próxima etapa, mas o fluxo precisa codificar o código do recibo com uma biblioteca local confiável e validar o link no impresso. A CI das alterações da página pública e das duas atualizações de documentação terminou com sucesso nas execuções #445, #446 e #447. Isso valida os gates automatizados desses commits, mas não substitui teste ponta a ponta nem habilita implantação.
