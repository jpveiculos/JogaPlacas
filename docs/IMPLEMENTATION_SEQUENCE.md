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
O workflow completo do commit `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8` passou, incluindo o novo teste de migração histórica: https://github.com/jpveiculos/JogaPlacas/actions/runs/40147585024. Próxima pendência da sequência: alinhar `next` e `eslint-config-next` em `16.4.3`, regenerar `package-lock.json` com npm e executar novamente a CI completa antes de avançar para implementação funcional.


### Achados de banco/regras antes de implementar checkout — 2026-10-25
A revisão inicial confirma que PK/FK/uniqueness estão presentes, mas os limites de valores, soma entre compra/participações/linhas e presença conjunta dos resultados da rodada não estão protegidos por constraints do banco. Serviços validam parte desses invariantes; avaliar constraints e testes de migração antes de abrir outros caminhos de escrita. A criação de compra Pix persiste somente um pagamento pendente e não confirma cobrança com provedor. A sequência continua: alinhar e regenerar lockfile, validar CI completa, fechar as invariantes e então implementar fluxos funcionais.
