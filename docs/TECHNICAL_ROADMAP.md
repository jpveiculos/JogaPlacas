# Joga Placas — Arquitetura técnica e plano de execução

Status: proposta técnica inicial para orientar a implementação. A especificação funcional em `docs/PRODUCT_SPEC.md` prevalece sobre este documento.

## Decisões técnicas iniciais
- **Aplicação:** Next.js com App Router e TypeScript, em uma única aplicação web modular para reduzir complexidade operacional inicial.
- **UI:** React com componentes acessíveis e responsivos; formulários validados tanto no cliente quanto no servidor.
- **Banco:** PostgreSQL.
- **Persistência/migrações:** Prisma ORM com migrações versionadas; restrições SQL e transações para invariantes financeiras.
- **Validação:** Zod nos limites de entrada e configuração.
- **Testes:** Vitest para unitários e integração; Playwright para fluxos críticos de interface quando a base estiver pronta.
- **Qualidade:** ESLint, TypeScript strict, formatação consistente e CI executando lint, typecheck, testes e build.
- **Dinheiro:** valores persistidos como inteiros em centavos (ou tipo SQL exato onde apropriado); nunca usar float para valores financeiros.
- **Tempo:** armazenar instantes em UTC no banco e calcular/mostrar agenda no fuso `America/Sao_Paulo`.
- **Pagamentos:** camada de integração por adaptador para não acoplar regras de negócio a um provedor específico. Webhooks autenticados, persistidos e idempotentes.
- **Segredos:** variáveis de ambiente/secret manager; apenas nomes e exemplos fictícios em `.env.example`.

## Organização modular pretendida
- `src/app`: páginas e rotas da aplicação.
- `src/modules/auth`: login, sessão, papéis e autorização.
- `src/modules/plates`: validação e normalização de placas.
- `src/modules/rounds`: calendário, fechamento e resultados de rodadas.
- `src/modules/bets`: apostas, distribuição de valores e cálculo de prêmios.
- `src/modules/payments`: pagamentos, adaptadores Pix e webhooks.
- `src/modules/wallet`: livro-razão, créditos, débitos e saques.
- `src/modules/cashiers`: vendas e comissões de cambistas.
- `src/modules/admin`: administração, configurações e auditoria.
- `src/lib`: infraestrutura compartilhada sem regras de domínio.
- `prisma`: schema e migrações.
- `tests`: testes unitários, integração e cenários críticos.

Os nomes podem ser ajustados durante a implementação se isso melhorar a separação sem contrariar a especificação.

## Ordem de execução
1. Registrar arquitetura e guardrails de segurança.
2. Criar base da aplicação, configurações de qualidade e CI.
3. Modelar banco e migrações iniciais; testar restrições e invariantes.
4. Implementar domínio puro e testes: placa, categorias, rateio e rodadas.
5. Implementar autenticação, sessões e autorização por papel.
6. Implementar fluxo de apostas e regras de fechamento.
7. Implementar pagamentos via adaptador, confirmação e webhooks idempotentes.
8. Implementar carteira, livro-razão, prêmios e saques.
9. Implementar área de cambista e comissões.
10. Implementar painel administrativo, rodadas e auditoria.
11. Integrar UI, notificações, recibos e histórico.
12. Executar testes de segurança, concorrência, reconciliação e ponta a ponta.
13. Configurar ambientes, migrações, observabilidade, backups e rollback.
14. Revisar PR e somente então planejar implantação controlada.

## Critérios para avançar
- Cada etapa deve incluir mudanças pequenas, testes e documentação do que mudou.
- Não incluir chaves ou credenciais reais em commits, mensagens, logs ou artefatos.
- Não conectar ou alterar ambiente de produção nem disparar cobrança real durante o desenvolvimento inicial.
- Provedor Pix, origem dos resultados e detalhes da fórmula de prêmio serão integrados por interfaces isoladas. Os requisitos funcionais já decididos serão respeitados; qualquer ambiguidade de regra de negócio será apresentada ao responsável antes de codificar comportamento irreversível.
- Antes de operar comercialmente, verificar requisitos legais/regulatórios aplicáveis ao modelo de jogo e pagamento.
