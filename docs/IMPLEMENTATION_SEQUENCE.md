# Sequência de implementação — estado atual

Registro de planejamento iniciado em 2026-10-25. **A fotografia de estado e o plano abaixo são históricos e foram superados pela reconciliação de 2026-10-26 em `docs/TECHNICAL_ROADMAP.md`.** Consulte o quadro consolidado antes de tomar decisões ou executar tarefas.

## Decisão permanente

A decisão anterior de manter somente três áreas e não criar uma página principal pública foi superada em 2026-10-26. A plataforma passa a ter quatro áreas de produto; a página principal pública e seu fluxo de cadastro estão aprovados, mas ainda precisam ser implementados. Consulte a seção 23 de `docs/PRODUCT_SPEC.md`.
A integração com Mercado Pago fica para a última fase. Até a aprovação dos gates anteriores, não criar cobranças reais, não ativar webhooks do provedor e não colocar segredos reais do provedor no ambiente. Não alterar main, banco de produção, domínio/DNS nem serviços ativos sem autorização explícita.

## Estado observado

Já existem lockfile e instalação npm ci na CI, schema Prisma e migrações versionadas, serviços de autenticação, regras de placas, compra pendente com participações, fechamento de rodada, geração dos dois resultados e apuração de prêmios. Existem rotas de autenticação e rotas administrativas para fechar, sortear e apurar rodadas.

As páginas de jogador, cambista e administrador e várias APIs foram implementadas depois desta fotografia inicial. Isso não prova que todos os fluxos estejam completos nem que a integração de pagamento tenha passado por teste ponta a ponta. Nenhum banco de produção atualizado ou deploy é presumido.

A contagem de commits e a referência ao PR #1 são históricas e não devem ser usadas para inferir a relação atual entre branches. O PR de trabalho conhecido nesta reconciliação é o #2, aberto em rascunho para `main`; não fazer merge automaticamente.

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
- [ ] Implementar a página principal pública (`/`) com apresentação, explicação do jogo, equivalências oficiais de prêmios, resultados/ganhadores e consulta por código de recibo; incluir Entrar/Criar conta. Atualmente `/` redireciona para `/login`.
- [ ] Implementar cadastro público seguro apenas para jogador e encaminhamento pós-cadastro para a área do jogador; login existente deve encaminhar pelo papel. Não permitir cadastro público de administrador.


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


### Estrutura inicial de impressão térmica 58 mm — 2026-10-25

- [x] Criado componente reutilizável `src/components/receipts/thermal-receipt.tsx` para o comprovante em bobina de 58 mm.
- [x] Adicionado CSS de impressão com página de 58 mm, área útil de 48 mm, monocromático, botão de imprimir oculto na impressão e QR de 20 mm ao lado do código.
- [x] Bloqueada a renderização do recibo se o pagamento não estiver confirmado ou se o código não corresponder ao padrão de recibo.
- [ ] Conectar à operação transacional que confirma pagamento e emite o código; não usar dados do cliente como prova de pagamento.
- [ ] Integrar geração local do QR Code (conteúdo somente o código completo do recibo), sem serviço público de terceiros.
- [ ] Integrar o componente ao recibo efetivo do jogador/cambista e executar testes/CI.
- [ ] Fazer teste físico na impressora específica; o modelo não foi recuperado das informações disponíveis. Confirmar escala sem ajuste, margens e leitura do QR antes de considerar o layout final.


### Arquitetura de impressão flexível e multiplataforma — 2026-10-25

**Resultado da pesquisa técnica:** ESC/POS é uma das opções mais difundidas para impressoras térmicas de recibo, mas não é um padrão universal garantido. Fabricantes podem implementar subconjuntos e variar comandos de QR, fontes e tabelas de caracteres. StarPRNT/StarLine e drivers/fila do sistema são alternativas relevantes; não existe um único protocolo de baixo nível que cubra todos os equipamentos e todos os navegadores.

**Plano de implementação:**
1. Criar um modelo canônico de recibo (dados e semântica) separado de layout/driver; a mesma fonte de dados alimenta visualização, HTML/PDF e impressão direta.
2. Preservar impressão HTML/PDF como fallback universal por meio do diálogo de impressão do sistema operacional, sem depender de ESC/POS.
3. Criar uma interface/adaptador de impressão. Primeiro adaptador direto: ESC/POS, com capacidades detectadas/configuradas e fallback para QR como imagem raster.
4. Planejar adaptadores adicionais para StarPRNT/StarLine e drivers/fila do sistema conforme demanda comprovada; não implementar todos antes de haver necessidade e ambiente de teste.
5. Tratar conexão separadamente do protocolo: USB, Bluetooth Classic, BLE, rede e fila do sistema têm requisitos distintos. No navegador, Web Bluetooth/WebUSB têm suporte limitado; não assumir que impressão Bluetooth direta funcione em todos os navegadores, principalmente Safari/iOS.
6. Criar configuração de impressora com largura útil/papel, densidade/resolução, codificação de acentos, QR, corte, conexão e perfil/modelo; incluir teste de impressão e estado de compatibilidade validada.
7. Testar recibos com acentos portugueses, corte/avanço, QR legível e larguras de 58/80 mm em modelos reais. Compatibilidade só é declarada para combinações efetivamente testadas.
8. Registrar este requisito no manual mestre e manter o layout do recibo independente de marca e protocolo.

**Compra de impressora:** priorizar ESC/POS documentado e uma conexão que funcione no equipamento que será usado (para maior flexibilidade, USB/rede ou compatibilidade com fila do sistema pode ser preferível a Bluetooth genérico isolado). Confirmar suporte de sistema operacional e testar o modelo antes de recomendar compra.

**Estado:** decisão de arquitetura documentada; adaptadores e integração física ainda não implementados. Não houve merge, deploy ou ativação de pagamento.


### Prioridade de experiência: imprimir diretamente no dispositivo do cambista — 2026-10-25

1. Após compra confirmada e recibo oficial emitido, exibir o recibo na tela do cambista com botão **Imprimir**.
2. Caminho principal: enviar à impressora já conectada usando o adaptador/mecanismo compatível com aquele dispositivo, sem diálogo do sistema como etapa normal.
3. Armazenar preferências e impressora no escopo do cambista/dispositivo; nunca alterar a configuração global ou a de outros cambistas.
4. Se a impressão direta falhar ou não estiver disponível, oferecer reimpressão do mesmo recibo e fallback HTML/PDF/diálogo de impressão ou compartilhamento.
5. Não gerar novo código, nova compra ou novo efeito financeiro em reimpressões. Falha de impressão não desfaz pagamento confirmado.
6. Implementar estados de impressão e distinguir “enviado” de “impresso” quando o dispositivo não der confirmação real.
7. Escolher a integração por plataforma depois de confirmar o ambiente-alvo. Em iPhone/Safari, não assumir Bluetooth direto pelo navegador; avaliar app auxiliar/ponte nativa ou outro mecanismo compatível.
8. Implementar testes para configurações isoladas por cambista, falha/repetição de impressão, fallback, QR legível e preservação do mesmo código de recibo.

**Estado:** requisito de experiência documentado; integração direta e fallbacks ainda não implementados nem testados fisicamente.


### Alvo móvel para impressão do cambista — 2026-10-25

1. Priorizar Android para a primeira implementação de impressão direta; manter compatibilidade planejada com iOS.
2. Não desenvolver fluxo de impressão de cambista para computador como requisito do produto.
3. Inspecionar a arquitetura atual Next.js e decidir a menor integração móvel segura: app auxiliar/nativo ou app móvel que compartilhe APIs e regras do JogaPlacas. Não assumir que PWA/navegador consegue enviar dados diretamente a qualquer Bluetooth.
4. Criar uma camada de impressão independente do recibo e da lógica financeira; transporte e linguagem de impressão são capacidades separadas.
5. Primeiro alvo de impressão direta: Android com impressoras térmicas ESC/POS, suportando Bluetooth Classic e BLE conforme biblioteca/modelo. Testar em aparelhos e impressoras reais.
6. Segundo alvo: iOS, priorizando BLE compatível e avaliando integrações de fabricante quando necessárias; impressoras Bluetooth Classic-only não devem ser consideradas compatíveis sem comprovação.
7. Manter configuração isolada por cambista/dispositivo; testar que uma alteração de perfil não afeta outros usuários.
8. Exibir o recibo confirmado, botão **Imprimir**, estados de conexão/envio/falha e fallback de PDF/compartilhamento. Reimpressão deve preservar o mesmo código de recibo e não criar efeitos financeiros.
9. Registrar matriz de compatibilidade por modelo, conexão, protocolo e versão do sistema operacional; não prometer universalidade absoluta.
10. Validar em testes físicos: acentos, tamanho do QR, alinhamento 58/80 mm quando aplicável, desconexão, repetição e recuperação após falha.

**Estado:** alvo Android-primeiro/iOS-compatível documentado; ainda é necessário inspecionar a arquitetura mobile atual e implementar a integração. Nenhuma impressão direta está certificada até testes físicos.


### Canal contínuo de atualização e compatibilidade futura — 2026-10-25

1. Inspecionar e documentar runtime, framework, dependências, navegador/PWA e possíveis integrações nativas; manter uma matriz de versões Android/iOS/navegadores e dispositivos de teste.
2. Manter o núcleo do JogaPlacas independente de APIs específicas de Bluetooth/impressora. Criar interfaces estáveis para adaptadores de impressão e detecção de capacidades.
3. Usar detecção de recursos e melhoria progressiva; oferecer recibo HTML/PDF/compartilhamento quando impressão direta não for compatível.
4. Estabelecer rotina de manutenção de dependências: verificar releases e avisos de segurança, atualizar em branch, executar lint, typecheck, testes e build, validar migrações em banco de teste e testar em staging.
5. Adotar versionamento, changelog, release notes, plano de rollback e monitoramento após deploy. Não atualizar produção sem CI verde, revisão e autorização.
6. Para componente nativo de impressão, documentar versão e processo de distribuição/atualização. Atualização web não substitui atualização de aplicativo nativo quando a mudança exigir release de loja.
7. Criar testes de regressão de compra/pagamento/recibo, impressão, QR e fallback antes de alterações de dependências.
8. Revisar periodicamente a matriz de compatibilidade e ampliar a cobertura com aparelhos Android mais antigos e recentes e iPhones suportados.
9. Não prometer compatibilidade universal irrestrita; publicar os requisitos mínimos testados e manter fallback para dispositivos sem suporte.

**Estado:** estratégia registrada; ainda não existe pipeline completo de atualizações/compatibilidade verificado nesta tarefa. Não houve deploy, alteração de produção nem ativação de pagamentos.


### Atualizações manuais com restauração segura — 2026-10-25

- [x] Decidido que a verificação de atualizações é somente leitura: não altera o sistema nem interrompe compras ou confirmações de pagamento.
- [x] Decidido que **Atualizar site** só aparece quando existe uma versão web aprovada e pronta no processo controlado de publicação.
- [x] Decidido incluir **Restaurar versão anterior**, voltado à última versão estável conhecida, com confirmação administrativa e auditoria.
- [x] Registrada a regra de preservar compras, pagamentos, recibos e livro-razão durante atualização/restauração.
- [x] Registrada a limitação: rollback de código não desfaz automaticamente migrações nem alterações de dados; compatibilidade e recuperação de banco devem ser planejadas e testadas.
- [ ] Inspecionar o provedor e o pipeline de implantação atuais e identificar como consultar versão implantada, releases aprovadas, estado de saúde e release anterior.
- [ ] Implementar painel administrativo protegido com versão atual/disponível, impacto em linguagem simples, estado dos testes e botões de verificar, atualizar e restaurar.
- [ ] Integrar os botões somente ao pipeline oficial de publicação; não permitir instalação arbitrária de código pelo site.
- [ ] Implementar trava/coordenação para adiar troca de versão durante compras ou confirmações críticas, sem bloquear a operação de verificação.
- [ ] Garantir retenção de artefatos e rollback para release anterior; validar compatibilidade de schema e plano de recuperação de dados.
- [ ] Adicionar trilha de auditoria, health checks antes/depois, teste de falha pós-publicação e teste de restauração em ambiente de staging.
- [ ] Validar a CI e ensaiar atualização e rollback em staging antes de disponibilizar o botão em produção.

**Estado real:** decisão documentada nesta branch; nenhum painel ou mecanismo de atualização/restauração foi implementado por este registro. Nenhuma publicação, reversão, merge ou alteração de produção foi executada.


### Auditoria de continuidade e bloqueios atuais — 2026-10-25

**Primeiro gate: CI do HEAD atual.** A execução `Verify` do commit `65c89d599cfdaabf880ae7ce763499798ad75bf9` falhou em `verify`, `migration-test` e `postgres-concurrency-test`. A reexecução também falhou rapidamente e o conector não disponibilizou logs/etapas. Abrir o run no GitHub Actions, obter a mensagem real de falha, corrigir a causa e reexecutar todos os jobs. Não presumir causa nem avançar para release enquanto isso estiver vermelho.

**Verificações da auditoria:**
- [x] Manifestos consultados: `next@16.4.3` e `eslint-config-next@16.4.3` estão alinhados em `package.json` e `package-lock.json`.
- [x] Confirmado que a rota de compra cria apenas compra pendente e informa que não cria/confirmar cobrança Pix.
- [x] Confirmado que a tela administrativa atual é placeholder, sem painel funcional de atualizações/rollback.
- [x] Confirmado que o recibo térmico exige status confirmado, mas o QR depende de dado externo e ainda há placeholder se não for fornecido.
- [x] Confirmado que o histórico do jogador filtra pelo proprietário e não mostra recibo para compra pendente.
- [ ] Obter logs e corrigir a CI no HEAD atual; executar novamente lint, typecheck, testes, build, migrações e concorrência.
- [ ] Concluir confirmação transacional de pagamento, emissão única de recibo e proteção de idempotência; Pix real fica bloqueado até implementação/revisão.
- [ ] Implementar fluxos completos de jogador e cambista (compra/venda, confirmação de dinheiro, consulta, recibo e impressão), preservando regras de autorização.
- [ ] Gerar QR localmente a partir apenas do código de recibo e integrar o componente ao fluxo oficial de recibo confirmado.
- [ ] Implementar painel administrativo e recursos reais de gestão/auditoria previstos no manual, com autorização e testes.
- [ ] Confirmar provedor de hospedagem e criar staging; só depois implementar publicação controlada, health checks e rollback da versão web.
- [ ] Validar ponta a ponta e preparar checklist de segurança, backup/restauração, observabilidade e requisitos legais antes de qualquer lançamento.

**Limites:** inspeção de arquivos e GitHub Actions apenas; não houve execução local, acesso a banco real, merge, deploy, alteração de produção nem ativação de pagamentos. A diferença Next/ESLint está alinhada nos manifestos, mas isso não substitui CI verde.


## Auditoria de alocações da apuração — 2026-10-25
- [x] Validar as seis alocações de cada linha antes de verificar quais categorias venceram; acrescentado teste unitário para alocação negativa em categoria não premiada.
- [ ] Confirmar CI completa após os commits `d1c5c695751b8746942d996d4d3337920a5b2352` e `7f62eac41dcbf29f4bbe862c627ded6430b32142`.
- [ ] Auditar invariantes entre alocação total por placa, total da participação e total da compra; só alterar regras após confirmar a estrutura dos dados e acrescentar testes.
- [ ] Manter deploy de desenvolvimento/produção e ativação de pagamentos fora do escopo até CI aprovada e integração financeira implementada/testada.

### Atualização de execução — 2026-10-26: carteira e saques

- [x] Ferramenta administrativa para reconciliar prêmios online não creditados, com recalculação histórica, idempotência e auditoria; sem prazo de sete dias para falhas técnicas.
- [x] Solicitação de saque pelo jogador com chave Pix criptografada, reserva de saldo no livro-razão e histórico de saques.
- [x] Fila administrativa para conferir chave Pix, registrar referência de transferência já realizada e dar baixa auditável; recusa libera a reserva com lançamento compensatório.
- [x] Testes automatizados iniciais de criptografia, reserva, saldo insuficiente, autenticação, origem cruzada, baixa e liberação.
- [ ] Aguardar CI completa dos commits mais recentes de validação de formato de chave Pix antes de confirmar os testes finais.
- [ ] Provisionar `WALLET_PIX_ENCRYPTION_KEY` somente em desenvolvimento/homologação e executar teste ponta a ponta; a chave não deve ser commitada nem compartilhada em chat.
- [ ] Implementar e testar a venda de cambista em espécie e a criação/confirmacão de compra/recibo de forma transacional, idempotente e compatível com as regras de comissão. Não usar um botão de cambista para confirmar Pix de provedor.
- [ ] Completar gestão de usuários, configurações de comissão/regras, relatórios financeiros e testes ponta a ponta das três áreas.

Sem deploy, merge para `main`, alteração de produção ou pagamentos reais nesta etapa.


### Nova direção de produto: home pública — 2026-10-26

- [ ] Substituir o redirecionamento atual de `/` para `/login` por uma página principal pública de apresentação.
- [ ] Incorporar resultados públicos, ganhadores com prêmio efetivamente creditado e consulta pública por código `JP-`, reaproveitando APIs existentes e sem expor dados pessoais.
- [ ] Implementar cadastro público seguro para jogador; após cadastro concluído, encaminhar à área do jogador. Login existente segue o redirecionamento baseado no papel.
- [ ] Manter `/resultados` compatível com links existentes, redirecionando ou apontando para a seção correspondente da home sem remover a consulta pública direta.
- [ ] Criar testes para visitantes sem sessão, jogador autenticado acessando `/`, redirecionamento por papel, cadastro duplicado/inválido, autorização e exposição mínima de dados públicos.
