# Execução do trabalho — prioridade antes do Mercado Pago

## Decisão
A integração com o Mercado Pago fica explicitamente para a última fase. Até lá, não criar cobranças reais, não configurar webhooks do provedor e não colocar segredos do Mercado Pago no ambiente.

## Ordem de trabalho
1. **Validar o repositório e o schema Prisma**: conferir o schema no commit atual, executar `prisma validate` e `prisma generate` no ambiente de CI ou ambiente isolado, corrigir incompatibilidades encontradas.
2. **Revisar o serviço de compras**: conferir contratos reais do schema e das regras de domínio, tipos TypeScript, validação dos campos, cálculo de totais, repetição/idempotência e tratamento de erros.
3. **Testes automatizados**: acrescentar testes para compra válida, comprador inválido, rodada encerrada, valores inválidos, chave idempotente igual com payload igual/diferente e falhas transacionais.
4. **Concorrência e fechamento de rodada**: assegurar que confirmação/criação não possa ultrapassar o cutoff por corrida; definir o mecanismo transacional apropriado e testar o caso concorrente.
5. **Qualidade e segurança**: executar lint, typecheck, testes e build; revisar dependências, migrações necessárias e logs sem dados sensíveis.
6. **Revisão de migração**: gerar e revisar migração em banco descartável, verificar compatibilidade e plano de reversão. Não executar migração em produção.
7. **Integração Mercado Pago (última fase)**: somente depois dos gates acima, implementar adaptador, criação de Pix, verificação de webhook, confirmação idempotente e testes de ponta a ponta.

## Critérios para avançar
Nenhuma fase é considerada concluída apenas por ter código commitado. É necessário resultado verificável dos comandos/testes e revisão dos diffs. A branch de trabalho continua sendo `planning/foundation`; a `main` e o banco de produção permanecem intocados durante esta etapa.

## Estado
O serviço inicial de compra pendente foi commitado, mas ainda não foi comprovado por execução de testes/build. A validação do Prisma e a revisão do serviço são os próximos passos imediatos.
