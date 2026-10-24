# Auditoria da fundação — estado verificado

> Atualizado em 2026-10-23. Este documento registra achados observáveis na branch `planning/foundation`; não certifica prontidão para produção. Revalidar cada item após mudanças de código.

## Escopo e limites

A inspeção cobre a árvore versionada, os módulos atuais, o schema Prisma, a configuração de dependências e o workflow `.github/workflows/verify.yml`. Não houve conexão com banco de produção, leitura de segredos, execução de cobranças, implantação ou alteração de `main`.

## Estado confirmado

- A aplicação Next.js ainda contém somente a página inicial, o layout e o CSS global em `src/app`; não há rotas de API em `src/app/api` nem implementação de autenticação/sessões/controle de acesso encontrada na árvore atual.
- Há lógica isolada e testes unitários para normalização de placas, regras de compra, janela de rodada, valores e criação transacional de compra Pix pendente.
- `createPendingPixPurchase` persiste compra e pagamento pendente; não chama o provedor e não confirma pagamento.
- O schema contém modelos para usuários, rodadas, compras, pagamentos, eventos de webhook, livro-razão, comissões, saques, configurações e auditoria. A existência de modelos não comprova que os fluxos correspondentes estejam implementados.
- O workflow valida/genera Prisma, executa lint, typecheck, testes e build; um job separado aplica as migrações em PostgreSQL 16 descartável.
- Os testes atuais de conflito na compra simulam erros Prisma. O workflow de migração não exercita concorrência real do serviço de compras.
- `package.json` fixa `next@16.4.3` e `eslint-config-next@16.4.2`. É uma divergência de patch a verificar; não foi alterada sem resolver a versão e atualizar o lockfile de forma reproduzível.
- `.env.example` usa valores ilustrativos e deixa as configurações do provedor Pix comentadas. `.gitignore` ignora arquivos `.env*` e mantém a exceção para `.env.example`.

## Pendências priorizadas

### P0 — antes de qualquer operação real

1. Implementar login, armazenamento seguro de senha, sessão segura e autorização no servidor para jogador, cambista e administrador; provisionamento administrativo exclusivamente por segredo/configuração protegida do servidor, nunca por segredo exposto ao frontend.
2. Implementar e testar os fluxos de compra e pagamento com estados explícitos, reconciliação idempotente e tratamento de falhas. A integração Mercado Pago continua deliberadamente adiada para a fase final.
3. Implementar o livro-razão e garantir atomicidade entre operações financeiras, saldo disponível, reservas de saque e auditoria.
4. Aplicar a validação de fechamento da rodada com uma decisão de tempo consistente dentro da operação transacional; o parâmetro `now` atual é capturado antes da transação e deve ser reavaliado ao desenhar o fluxo concorrente.
5. Realizar revisão de segurança e de regras do produto antes de qualquer ativação em produção.

### P1 — validação técnica da fundação

1. Adicionar testes de integração com PostgreSQL descartável para duas compras concorrentes com a mesma chave de idempotência, chaves diferentes, disputa pelo corte da rodada e rollback de criação parcial.
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

A fundação só deve ser considerada pronta para a próxima fase quando a autenticação e as três áreas estiverem implementadas, os controles de autorização forem testados no servidor, os testes de integração cobrirem concorrência e rollback, as migrações forem reproduzíveis e o pipeline estiver verde. Isso não substitui homologação, revisão operacional ou validação jurídica/comercial.

## Ambiente protegido

Este trabalho permanece na branch `planning/foundation`. Não modificar `main`, banco, domínio, DNS ou serviços de produção; não iniciar cobranças nem ativar webhooks. A integração Pix/Mercado Pago permanece para a fase final.
