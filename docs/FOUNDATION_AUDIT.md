# Auditoria da fundação — estado verificado

> Atualizado em 2026-10-24 após a CI verde do commit `2693c033af190a2a5a6b9b9793d81d8a225fcbe9`. Este documento registra achados observáveis na branch `planning/foundation`; não certifica prontidão para produção. Revalidar cada item após mudanças de código.

## Escopo e limites

A inspeção cobre a árvore versionada, os módulos atuais, o schema Prisma, a configuração de dependências e o workflow `.github/workflows/verify.yml`. Não houve conexão com banco de produção, leitura de segredos, execução de cobranças, implantação ou alteração de `main`.

## Estado confirmado

- A aplicação Next.js ainda contém somente a página inicial, o layout e o CSS global em `src/app`; não há rotas de API em `src/app/api` nem implementação de autenticação/sessões/controle de acesso encontrada na árvore atual.
- Há lógica isolada e testes unitários para normalização de placas, regras de compra, janela de rodada, valores e criação transacional de compra Pix pendente.
- `createPendingPixPurchase` persiste compra e pagamento pendente; não chama o provedor e não confirma pagamento.
- O schema contém modelos para usuários, rodadas, compras, pagamentos, eventos de webhook, livro-razão, comissões, saques, configurações e auditoria. A existência de modelos não comprova que os fluxos correspondentes estejam implementados.
- O workflow valida/genera Prisma, executa lint, typecheck, testes e build; um job separado aplica as migrações em PostgreSQL 16 descartável.
- A CI do commit `2693c033af190a2a5a6b9b9793d81d8a225fcbe9` terminou com sucesso nos três jobs: `verify`, `migration-test` e `postgres-concurrency-test`. Execução: https://github.com/jpveiculos/JogaPlacas/actions/runs/40104277516
- Os testes de integração PostgreSQL cobrem idempotência concorrente, conflito de conteúdo, rollback, retry simulado e limites do cutoff.
- Existe agora o serviço `src/modules/rounds/close-round.ts`, com bloqueio de linha, validação de estado/cutoff e transação Serializable. Compra e fechamento usam o mesmo protocolo de bloqueio; ambos repetem conflitos de serialização reconhecidos de forma limitada.
- O teste de corrida compra/fechamento passou na CI. Ele usa horários determinísticos injetados e valida os resultados permitidos e a ausência de registros parciais quando a compra perde a disputa.
- **Limite de cobertura temporal:** ainda falta um teste que force uma transação a aguardar um bloqueio até o relógio real do PostgreSQL ultrapassar o cutoff e comprove que a decisão usa `clock_timestamp()` depois de adquirir o bloqueio.
- **Limite de integração com a aplicação:** o serviço de fechamento ainda não está exposto por rota autenticada/autorizada. A existência do serviço não significa que um administrador já possa fechar rodadas pela aplicação.
- `package.json` fixa `next@16.4.3` e `eslint-config-next@16.4.2`. É uma divergência de patch a verificar; não foi alterada sem resolver a versão e atualizar o lockfile de forma reproduzível.
- `.env.example` usa valores ilustrativos e deixa as configurações do provedor Pix comentadas. `.gitignore` ignora arquivos `.env*` e mantém a exceção para `.env.example`.

## Pendências priorizadas

### P0 — antes de qualquer operação real

1. Implementar login, armazenamento seguro de senha, sessão segura e autorização no servidor para jogador, cambista e administrador; provisionamento administrativo exclusivamente por segredo/configuração protegida do servidor, nunca por segredo exposto ao frontend.
2. Implementar os fluxos de compra e pagamento com estados explícitos, reconciliação idempotente e tratamento de falhas. A integração Mercado Pago continua deliberadamente adiada para a fase final.
3. Implementar o livro-razão e garantir atomicidade entre operações financeiras, saldo disponível, reservas de saque e auditoria.
4. Expor o fechamento de rodada somente por uma operação autenticada e autorizada no servidor; preservar o serviço transacional e não permitir que usuários não autorizados fechem rodadas.
5. Concluir o teste temporal com bloqueio real atravessando o cutoff e repetir os cenários concorrentes para reduzir risco de flakiness.
6. Realizar revisão de segurança e de regras do produto antes de qualquer ativação em produção.

### P1 — validação técnica da fundação

1. Completar testes de integração PostgreSQL para compras concorrentes com chaves iguais e diferentes, cutoff, fechamento concorrente e rollback. A corrida de compra/fechamento determinística já está coberta; falta o teste de bloqueio atravessando o cutoff real.
2. Adicionar testes de contrato para repetição de rodadas, normalização e unicidade de placas, totais em centavos e limites do banco.
3. Resolver a divergência de versões Next.js/ESLint e confirmar `npm ci`, lint, typecheck, testes e build.
4. Definir e testar uma estratégia para tempo/fuso de rodadas usando `America/Sao_Paulo`, incluindo transições de data e limites exatos.
5. Confirmar restrições e índices do schema contra as regras funcionais e verificar que todas as migrações versionadas são reproduzíveis em banco vazio.

### P2 — manutenção e limpeza

1. Procurar referências e consumidores antes de remover arquivos, dependências ou documentação antiga.
2. Reescrever ou arquivar documentos históricos apenas após confirmar que o conteúdo útil foi preservado e que os avisos atuais não são suficientes.
3. Revisar dependências diretas e transitivas com evidência do lockfile e do uso real; não remover ferramentas de teste, migração ou segurança apenas por não serem importadas pela aplicação.
4. Atualizar esta auditoria junto com os marcos de implementação, registrando evidência de teste e os itens ainda bloqueados.

## Critério de conclusão

A fundação não deve ser considerada pronta para produção até que autenticação, autorização e fluxos de aplicação estejam implementados, os testes de integração cubram concorrência e rollback inclusive o cutoff atravessado durante bloqueio, as migrações sejam reproduzíveis e o pipeline esteja verde. Isso não substitui homologação, revisão operacional ou validação jurídica/comercial.

## Ambiente protegido

Este trabalho permanece na branch `planning/foundation`. Não modificar `main`, banco, domínio, DNS ou serviços de produção; não iniciar cobranças nem ativar webhooks. A integração Pix/Mercado Pago permanece para a fase final.
