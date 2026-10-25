# Sequência de implementação — estado atual

Atualizado em 2026-10-24 após auditoria da branch feature/dual-plate-draw, HEAD d337082b2d0fa6b24db64a6839d20e24c894fb9e.

## Decisão permanente
A integração com Mercado Pago fica para a última fase. Até a aprovação dos gates anteriores, não criar cobranças reais, não ativar webhooks do provedor e não colocar segredos reais do provedor no ambiente. Não alterar main, banco de produção, domínio/DNS nem serviços ativos sem autorização explícita.

## Estado observado

Já existem lockfile e instalação npm ci na CI, schema Prisma e migrações versionadas, serviços de autenticação, regras de placas, compra pendente com participações, fechamento de rodada, geração dos dois resultados e apuração de prêmios. Existem rotas de autenticação e rotas administrativas para fechar, sortear e apurar rodadas.

As três páginas de perfil ainda são placeholders. Não há prova nesta auditoria de fluxos de produto ponta a ponta, de instalação limpa executada localmente nesta conversa, de banco de produção atualizado ou de integração real com pagamentos.

A branch feature/dual-plate-draw está 61 commits à frente e 1 atrás de planning/foundation, e o PR #1 está aberto em rascunho. As branches divergem; não fazer merge automaticamente.

## Ordem de trabalho revisada

1. **Reproduzir a qualidade do HEAD atual:** checkout limpo, versão de Node/npm registrada, npm ci, Prisma validate/generate, lint, typecheck, testes, build e suites PostgreSQL de integração. Guardar evidência por commit. A CI recente passou, mas repetir é parte da auditoria e ainda não foi feito nesta conversa.
2. **Resolver compatibilidade de dependências:** revisar next@16.4.3 versus eslint-config-next@16.4.2; corrigir apenas com justificativa, lockfile reproduzível e pipeline verde.
3. **Auditar schema e migrações:** revisar as quatro migrações e o SQL da migração de duas placas em PostgreSQL descartável; avaliar dados históricos e snapshots. Não executar em produção.
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
