# Sequência de implementação — estado atual

Atualizado em 2026-10-25 após revisão adicional da branch feature/dual-plate-draw, HEAD 1d37b8fc59e0c10717272b96dec1d9bd206a6819.

## Decisão permanente
A integração com Mercado Pago fica para a última fase. Até a aprovação dos gates anteriores, não criar cobranças reais, não ativar webhooks do provedor e não colocar segredos reais do provedor no ambiente. Não alterar main, banco de produção, domínio/DNS nem serviços ativos sem autorização explícita.

## Estado observado

Já existem lockfile e instalação npm ci na CI, schema Prisma e migrações versionadas, serviços de autenticação, regras de placas, compra pendente com participações, fechamento de rodada, geração dos dois resultados e apuração de prêmios. Existem rotas de autenticação e rotas administrativas para fechar, sortear e apurar rodadas.

As três páginas de perfil ainda são placeholders. Não há prova nesta auditoria de fluxos de produto ponta a ponta, de instalação limpa executada localmente nesta conversa, de banco de produção atualizado ou de integração real com pagamentos.

A branch feature/dual-plate-draw está 61 commits à frente e 1 atrás de planning/foundation, e o PR #1 está aberto em rascunho. As branches divergem; não fazer merge automaticamente.

## Ordem de trabalho revisada

1. **Reproduzir a qualidade do HEAD atual:** a CI Verify do commit 1d37b8fc59e0c10717272b96dec1d9bd206a6819 passou. A instalação limpa e os testes locais não foram executados nesta sessão. Manter a diferença de patch Next.js/ESLint como pendência de revisão e alinhar somente com justificativa, lockfile regenerado e pipeline verde.
2. **Resolver compatibilidade de dependências:** revisar next@16.4.3 versus eslint-config-next@16.4.2; corrigir apenas com justificativa, lockfile reproduzível e pipeline verde.
3. **Auditar schema e migrações:** revisão estática confirmou que a migração de duas placas aborta se não conseguir classificar qualquer `plateDisplay` histórico. O teste CI atual usa banco vazio; acrescentar ensaio de backfill com linhas LEGACY/MERCOSUR válidas e registro inválido/ambíguo em PostgreSQL descartável. Não executar em produção.
4. **Consolidar domínio e regras pendentes:** validar formato/resultado LEGACY e MERCOSUR, snapshots de regras, rateio em centavos, cutoff, regras de cancelamento/estorno e fonte/publicação de resultados. Não inventar decisões de negócio ausentes; atualizar docs/PRODUCT_SPEC.md quando aprovadas.
5. **Completar os serviços financeiros:** ledger append-only, saldo disponível, débitos, prêmios, saques/reservas, estornos, comissões e recebimento em espécie, com invariantes transacionais e testes concorrentes.
6. **Construir os fluxos do jogador:** compra, seleção de placa/categoria, gerador aleatório, repetição de rodadas, checkout pendente, recibos, histórico, carteira e resultados.
7. **Construir os fluxos do cambista:** cliente, venda, recebimento, recibo, histórico, comissão e consultas próprias, sem carteira nem saque do cambista.
8. **Completar a administração:** gestão de usuários, rodadas/recorrências, regras, resultados, financeiro, saques, comissões e auditoria.
9. **Executar testes de integração e ponta a ponta:** autorização, propriedade de registros, idempotência, concorrência, rollback, cutoff, publicação e apuração.
10. **Integração Mercado Pago (última fase):** adaptador, criação Pix, verificação de webhooks, confirmação idempotente, eventos fora de ordem, reconciliação e testes em homologação.
11. **Preparar implantação isolada:** revisar variáveis, segurança, monitoramento, backup/restauração e rollback no novo ambiente; não tocar no site atual sem autorização explícita.
12. **Gate final:** CI verde no commit exato, revisão de diff, testes e segurança aprovados, documentação atualizada, validação legal/comercial e autorização explícita antes de merge/produção.

## Critérios de avanço

Nenhuma fase é concluída só por código commitado ou por build isolado. Registrar comandos/testes executados, commit exato, resultado e limitações. Cada decisão, mudança de implementação, resultado de teste ou implantação que afete o comportamento deve atualizar o manual mestre e os documentos operacionais pertinentes no mesmo conjunto de trabalho. Se uma regra for ambígua, manter o fluxo afetado bloqueado e pedir decisão; não inferir comportamento financeiro.


## Atualização de evidência — 2026-10-25

O workflow Verify do commit 1d37b8fc59e0c10717272b96dec1d9bd206a6819 concluiu com sucesso. Nesta sessão, os arquivos package.json, package-lock.json, prisma/schema.prisma, workflow e SQL das quatro migrações foram inspecionados por meio do GitHub. Não houve instalação limpa ou execução local de testes.

Nova pendência identificada: o job de migrações parte de um banco PostgreSQL vazio e não prova o backfill de dados históricos da migração dual_plate_draw. O próximo gate deve testar dados antigos válidos de ambos os formatos e uma linha inválida/ambígua que provoque a interrupção intencional da migração. A diferença next@16.4.3 / eslint-config-next@16.4.2 permanece em revisão; não foi alterada.


## Atualização de implementação — 2026-10-25

Implementado: script `scripts/test-dual-plate-migration.mjs`, comando `npm run test:migration-backfill` e etapa `Test dual-plate migration against historical data` no job de migrações da CI. O cenário válido testa o backfill de placas LEGACY e MERCOSUR e a preservação de `resultMercosurPlate`; o cenário inválido exige falha da migração para placa não classificável.

**Status do teste:** pendente de confirmação no GitHub Actions para o commit que introduziu a etapa. Não afirmar que passou até o job concluir com sucesso. Não executar o script contra banco real ou compartilhado: ele cria e remove bancos PostgreSQL temporários.


### Correção de fixture — 2026-10-25
A primeira execução do teste histórico falhou antes da migração por incluir `Purchase.updatedAt` no INSERT, embora essa coluna não exista na migração inicial. O INSERT foi corrigido no commit `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8`. Aguardando nova execução da CI para validar os dois cenários de backfill.


### Confirmação da CI — 2026-10-25
O workflow completo do commit `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8` passou, incluindo o novo teste de migração histórica: https://github.com/jpveiculos/JogaPlacas/actions/runs/40147585024. Próxima pendência da sequência: continuar a auditoria de invariantes financeiros e do schema/migrações, sem introduzir regras comerciais que ainda não tenham sido aprovadas.


### Achados de banco/regras antes de implementar checkout — 2026-10-25
A revisão inicial confirma que PK/FK/uniqueness estão presentes, mas os limites de valores, soma entre compra/participações/linhas e presença conjunta dos resultados da rodada não estão protegidos por constraints do banco. Serviços validam parte desses invariantes; avaliar constraints e testes de migração antes de abrir outros caminhos de escrita. A criação de compra Pix persiste somente um pagamento pendente e não confirma cobrança com provedor. A sequência continua: alinhar e regenerar lockfile, validar CI completa, fechar as invariantes e então implementar fluxos funcionais.


### Estado após alinhamento de dependências — 2026-10-25

- [x] next e eslint-config-next alinhados em 16.4.3.
- [x] package-lock.json regenerado por npm e commitado.
- [x] CI completa verde no commit add8084f643844a1d193d2dd9e4474b49839a42b.
- [ ] Auditar e propor constraints para valores não negativos, soma das alocações, mínimo de R$ 1,00 por placa/rodada e consistência dos dois resultados. Separar o que está definido na especificação do que exige decisão de negócio.
- [ ] Continuar mantendo a interface como pendência: página inicial e áreas de jogador/cambista/administrador ainda não implementadas como fluxos de produto.


### Regra de rateio e multiplicador da unidade — 2026-10-25

Decisão aprovada e registrada em `docs/PRODUCT_SPEC.md`: cada placa deve ter no mínimo 100 centavos; o valor total em centavos é dividido por seis usando `base = floor(totalCents / 6)`; todas as categorias recebem `base`, e todo o resíduo `totalCents % 6` é adicionado somente à unidade. Para R$ 1,00, a unidade recebe R$ 0,20 e as outras cinco categorias recebem R$ 0,16 cada. O multiplicador da unidade foi atualizado para 6x no snapshot de regras; nesse exemplo, o prêmio de unidade é R$ 1,20.

Adicionado o helper puro `src/domain/allocate-plate-stake.ts` e testes `src/domain/allocate-plate-stake.test.ts`, incluindo conservação de centavos para totais de R$ 1,00 a R$ 10,00. **Limite atual:** o helper ainda precisa ser conectado ao fluxo de criação de apostas e à apuração/versão de regras; não considerar o comportamento financeiro ponta a ponta concluído até atualizar esses caminhos e executar a CI do commit resultante. Nenhuma alteração foi feita em `main`, produção ou pagamentos reais.
### Integração do rateio no serviço de compra — 2026-10-25

- [x] A entrada do serviço de compra agora recebe o valor total da placa em centavos (`stakeCents`), sem exigir que o jogador/cambista envie manualmente os seis valores por categoria.
- [x] O servidor calcula a alocação usando `allocatePlateStake` antes da validação financeira e persiste os seis valores calculados.
- [x] A comparação de idempotência compara valor total, placa e snapshot de regras, permitindo que uma repetição legítima de uma compra histórica seja reconhecida sem exigir que a alocação antiga coincida com a regra nova.
- [x] Adicionado teste do serviço para verificar a persistência do rateio de R$ 1,00: 20 centavos na unidade e 16 centavos em cada uma das outras cinco categorias.
- [ ] Confirmar a CI completa no commit mais recente antes de considerar a integração aprovada.
- [ ] Auditar a apuração para garantir que ela usa os valores alocados persistidos e o snapshot de multiplicadores da própria linha. Não migrar nem recalcular apostas históricas.
- [ ] Verificar os consumidores/API do serviço para confirmar que enviam `stakeCents`; ajustar todos os chamadores identificados pela CI/revisão antes de finalizar.

Esta alteração continua somente na branch de desenvolvimento. Nenhuma cobrança real, migração em produção, merge ou deploy foi executado.
### Fechamento da integração do rateio e proteção de regras — 2026-10-25

- [x] O teste de integração PostgreSQL foi atualizado para enviar apenas o valor total da placa em centavos; a alteração de valor no teste de idempotência também usa `stakeCents`.
- [x] O serviço bloqueia novos pedidos com multiplicadores diferentes dos valores aprovados atualmente (unidade 6x, dezena 20x, centena 200x, milhar 2.000x, letras 2.000x, placa completa 200.000x).
- [x] A verificação de idempotência acontece antes dessa restrição para que a repetição de uma compra já existente possa ser reconhecida com o snapshot original.
- [x] A apuração continua lendo os valores por categoria persistidos e o snapshot de cada linha; foi acrescentado um teste para o prêmio de unidade de R$ 1,20 quando a alocação é de R$ 0,20 a 6x.
- [ ] A CI do commit final ainda precisa ser confirmada. A consulta disponível de workflows não retornou os runs de push mais recentes, portanto não registrar a CI como aprovada sem verificação no GitHub Actions.
- [ ] A aplicação completa continua pendente: o serviço de compra e a apuração estão implementados, mas a interface/fluxo de jogador e cambista ainda precisam ser conectados e testados de ponta a ponta.

Não houve merge, deploy, migração em produção nem criação de cobrança real.
### Próxima etapa: endpoint autenticado de compra do jogador — 2026-10-25

- [x] Criado identificador versionado para as regras aprovadas (`approved-v2`) e construtor de snapshot no servidor.
- [x] Criado `POST /api/player/purchases`, exigindo sessão ativa de jogador, validando origem quando enviada, rejeitando papéis indevidos, payloads extras e rodadas repetidas.
- [x] O cliente envia placa, valor total em centavos e rodadas; os multiplicadores/snapshot são definidos pelo servidor e o serviço distribui os valores nas seis categorias.
- [x] O endpoint retorna os valores calculados e mantém a compra como `PENDING_PAYMENT`; informa explicitamente que esta etapa não cria nem confirma cobrança Pix.
- [x] Código do recibo derivado de forma estável do usuário e da chave de idempotência, para que uma repetição de requisição não produza conflito por novo recibo.
- [x] Adicionados testes de rota para origem, autenticação, autorização, payload inválido, rateio, snapshot do servidor, falha genérica e estabilidade do recibo em repetição.
- [ ] Confirmar lint, typecheck, testes e build no GitHub Actions para o commit final desta etapa.
- [ ] Próxima tarefa de produto: criar consulta segura das rodadas abertas e interface de compra do jogador que consuma este endpoint; depois integrar os recibos/histórico.

Limites mantidos: nenhuma cobrança real, webhook, migração de produção, merge ou deploy foi executado.
### Interface inicial de compra do jogador — 2026-10-25

- [x] Criado `GET /api/player/rounds`, restrito a sessão de jogador, listando somente rodadas agendadas/abertas com cutoff futuro e sem cache.
- [x] Criada a interface inicial da área do jogador: carrega rodadas, permite selecionar até 10, informar placa e valor total por rodada, e envia a compra para o endpoint autenticado.
- [x] A interface mostra o total estimado, o recibo pendente e a divisão por categoria calculada no servidor; não oferece botão de pagamento nem sugere que Pix foi cobrado.
- [x] A chave de idempotência fica preservada entre tentativas até uma resposta bem-sucedida, reduzindo duplicação em caso de falha de rede.
- [ ] A interface ainda suporta uma placa por envio; múltiplas placas, histórico/recibos persistentes e fluxo de pagamento são etapas futuras.
- [ ] Executar e confirmar CI (lint, typecheck, unit tests, build e testes PostgreSQL/migração) no HEAD final. Statuses de commit consultados até aqui não retornaram checks, então a validação não está comprovada.

Não houve merge, deploy, migração em produção nem cobrança real.


### Plaquinhas de entrada e resultados — 2026-10-25

- [x] A entrada do jogador agora exige a escolha explícita entre placa cinza (ABC-1234) e placa Mercosul (ABC1D23), com validação específica para o formato selecionado; a quinta posição Mercosul aceita A–Z e não é convertida em número.
- [x] Adicionado componente visual reutilizável de plaquinha, com estilos distintos para placa cinza e Mercosul, usado na entrada e no recibo.
- [x] Adicionada rota autenticada de resultados recentes (GET /api/player/results) e seção na área do jogador que apresenta os dois resultados independentes em plaquinhas, para rodadas concluídas nas últimas 24 horas.
- [ ] Confirmar lint, typecheck, testes e build da CI no commit final. Esta alteração não foi validada por execução local nesta sessão.
- Limites mantidos: resultados não são convertidos um no outro; nenhuma cobrança Pix real, migração de produção, merge ou deploy foi executado.


### Página pública de resultados e ganhadores — 2026-10-25

- [x] Decisão registrada no manual mestre: página limpa em /resultados, sem menu, com histórico em linhas, data/hora de São Paulo e duas plaquinhas independentes por rodada.
- [x] Implementada rota pública de leitura com paginação de resultados concluídos/publicados e seção de até 12 prêmios efetivamente creditados nos últimos 30 dias. Identificadores de usuário são mascarados; nenhum telefone ou dado financeiro pessoal é exposto.
- [x] Interface atualiza os resultados recentes automaticamente a cada 15 segundos e permite carregar resultados anteriores sem apagar o histórico já carregado.
- [x] Adicionados testes de rota para os dois resultados, ganhadores mascarados, paginação, cursor inválido e falha genérica do banco.
- [ ] Confirmar lint, TypeScript, testes, build e workflows no HEAD final. As verificações devem ser consultadas após os commits.
- Limites mantidos: sem menu nesta página, sem cobranças Pix, sem migração em produção, sem merge e sem deploy.


### Objetivo de acesso simples e inclusão digital — 2026-10-25

- [x] Registrada a razão estratégica da página: permitir consulta sem conta para quem apostou presencialmente com cambista e precisa conferir o resultado depois.
- [x] Prioridade de UX documentada para pessoas idosas e usuários com pouca familiaridade digital: acesso direto, sem menu/login, histórico grande e legível, horários claros e seção menor de ganhadores.
- [x] Reforçados tamanhos de fonte, espaçamento e alvo de toque na página pública para facilitar leitura em celular.
- [ ] Fazer revisão de acessibilidade visual em telas reais e validar a CI antes de considerar concluído.
- Limite funcional explicitado: a página informa resultados gerais e prêmios confirmados; não identifica o resultado individual de um bilhete sem uma funcionalidade própria de consulta.


### Consulta rápida — registro histórico supersedido — 2026-10-25

A decisão posterior substituiu a proposta inicial de pesquisar por placa ou recibo. A implementação vigente aceita somente o código completo do recibo iniciado por JP-. A placa não é chave de pesquisa, pois pode aparecer em várias apostas e rodadas. Ver a seção “Ajuste de escopo da consulta — somente recibo” e as seções 17–20 do manual mestre.


### Ajuste de escopo da consulta — somente recibo — 2026-10-25

- [x] Removida a pesquisa por placa da rota e da interface pública; a consulta agora aceita apenas recibos JP-.
- [x] Simplificada a orientação da tela para usar o código impresso no recibo.
- [x] Atualizado o manual para não duplicar consulta na área do jogador: o jogador terá histórico organizado com prêmios confirmados destacados em verde.
- [ ] Localizar e integrar o componente de recibo na área do cambista, sem criar pesquisa adicional na área do jogador.
- [ ] Corrigir/expandir os estados da apuração com base no modelo real de liquidação, adicionar testes e validar a CI no HEAD final.


### Integração da consulta por recibo com o cambista — 2026-10-25

- [x] Consulta pública limitada ao código do recibo, sem busca por placa.
- [x] Reutilizado o mesmo componente na área do cambista.
- [x] Diferenciado status de rodada em andamento, prêmio confirmado, não premiada e apuração pendente conforme os campos persistidos.
- [ ] Implementar histórico individual de apostas do jogador com destaques verdes para prêmios confirmados; não adicionar consulta por recibo nessa área.
- [ ] Criar testes automatizados da rota de recibo e executar/validar CI.


### Histórico do jogador e segurança da consulta por recibo — 2026-10-25

- [x] Corrigida a rota pública de recibo para remover any, normalizar o código JP- e serializar os campos necessários sem expor dados de conta.
- [x] Adicionados testes de rota da consulta por recibo: código inválido, resultado premiado somente após crédito, compra não confirmada e erro genérico do banco.
- [x] Criado GET /api/player/history, autenticado, limitado ao jogador da sessão e aos últimos 7 dias, com limite de 100 compras e cache privado desabilitado.
- [x] Criada a interface de histórico individual no jogador, agrupada por recibo/rodada/placa; prêmio confirmado recebe destaque verde somente se o crédito estiver registrado.
- [x] Adicionados testes de autorização e filtro por proprietário para o histórico do jogador.
- [x] O campo de consulta por recibo não foi adicionado à área do jogador; permanece na página pública de resultados e na área do cambista.
- [ ] Confirmar lint, TypeScript, todos os testes, build e workflow no commit resultante. Os commits feitos por esta integração via API ainda precisam de CI observada antes de serem considerados validados.
- [ ] Revisar em teste de integração o status financeiro de linhas antigas e confirmar que prizeCents = 0 representa apuração encerrada sem prêmio em todos os caminhos de liquidação.
- Limites mantidos: nenhuma cobrança real, migração em produção, merge ou deploy.


### Regra de emissão do recibo após confirmação do pagamento — 2026-10-25

**Decisão de negócio confirmada:** o recibo oficial só é gerado depois da confirmação do pagamento. Para Pix na plataforma, a confirmação final deve vir do webhook validado do provedor. Para venda em dinheiro pelo cambista, o cambista confirma o recebimento pelo botão dedicado; o servidor registra quem confirmou e quando. Em qualquer caminho, compra pendente não pode expor código como recibo emitido nem ser tratada como jogo finalizado.

**Divergência encontrada na revisão do código:** `POST /api/player/purchases` atualmente deriva e devolve `receiptCode` mesmo com status `PENDING_PAYMENT`, e `Purchase.receiptCode` é obrigatório no schema. Isso contradiz a regra aprovada e precisa ser corrigido antes de considerar recibos concluídos.

Próxima tarefa técnica:
1. Rever o schema e o fluxo de criação para permitir compra pendente sem recibo emitido; avaliar `receiptCode` anulável até confirmação, mantendo unicidade quando preenchido e migração segura.
2. Criar uma única operação de domínio/transação para confirmar pagamento, confirmar compra/participações e emitir um único código de recibo.
3. Integrar o Pix somente na fase final, por webhook autenticado, com idempotência e validação da confirmação final do provedor.
4. Implementar confirmação de dinheiro do cambista com autorização por papel, registro auditável de ator/horário e proteção contra clique repetido.
5. Atualizar a interface para mostrar “aguardando pagamento” sem código de recibo e só mostrar/imprimir/compartilhar o recibo depois da confirmação.
6. Atualizar consulta pública, consulta do cambista e histórico do jogador para não tratar compras pendentes como recibos emitidos.
7. Testar compra pendente sem recibo, confirmação Pix, confirmação em dinheiro, concorrência, eventos/cliques duplicados e falhas transacionais; então observar a CI completa.

A alteração permanece pendente de implementação e validação. Não houve merge, deploy, migração em produção nem ativação de pagamentos reais.


### Primeira correção do recibo pendente — 2026-10-25

- [x] Tornado `Purchase.receiptCode` anulável no schema e adicionada migração versionada para permitir compra pendente sem código; a migração também limpa códigos de compras ainda `PENDING_PAYMENT`.
- [x] O endpoint de compra do jogador deixou de gerar código a partir da chave de idempotência e não emite recibo ao criar compra pendente.
- [x] O serviço de criação de compra aceita `receiptCode: null` para checkout pendente.
- [x] A área do jogador passa a mostrar “Compra registrada” e “Recibo ainda não emitido” em vez de apresentar uma compra pendente como recibo.
- [x] O histórico do jogador oculta o código enquanto a compra não estiver confirmada; a consulta pública já exige compra `CONFIRMED`.
- [x] Atualizado o teste da rota para exigir ausência de recibo no estado pendente e o teste do serviço para aceitar entrada sem código.
- [ ] Executar/observar CI completa após estes commits, incluindo geração do Prisma Client e migração PostgreSQL.
- [ ] Implementar a operação transacional de confirmação que gera o código único no mesmo fluxo que confirma compra/participações; depois implementar confirmação de dinheiro pelo cambista com ator, horário, autorização e idempotência.
- [ ] Implementar integração Pix/webhook validado na fase final. Até lá, o checkout continua pendente e não emite recibo.
- [ ] Rever componentes/consumidores restantes que tipam ou assumem `receiptCode` não nulo, e adicionar testes de confirmação e concorrência antes de considerar a regra concluída.

**Limite importante:** esta etapa remove a emissão prematura; não implementa ainda o mecanismo de emissão após pagamento confirmado. Nenhum webhook real, cobrança, merge, deploy ou migração em produção foi executado.


### Requisito de QR Code no recibo — 2026-10-25

- [x] Registrada a decisão: QR Code pequeno ao lado do código textual do recibo, codificando apenas o código completo `JP-...`.
- [x] Registradas as restrições de privacidade e segurança: sem dados pessoais no QR, sem gerador público de terceiros, e sem QR para compra pendente.
- [ ] Implementar geração local/confiável do QR Code e exibi-lo junto ao código no recibo oficial.
- [ ] Garantir que leitura do QR forneça o código completo para consulta e que a consulta continue validando recibo emitido/compra confirmada.
- [ ] Testar QR/código em recibos confirmados e ausência de ambos em compras pendentes; validar acessibilidade/tamanho em impressão e celular.
- [ ] Concluir primeiro o fluxo transacional de confirmação e emissão do recibo; o QR depende desse ponto de emissão.
