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
- `next@16.4.3` e `eslint-config-next@16.4.2` seguem desalinhados por um patch. Não alterar cegamente; confirmar compatibilidade, regenerar lockfile e validar o pipeline ao resolver.
- Nenhum teste local/instalação limpa, migração produtiva ou deploy foi executado nesta etapa.


## Atualização de implementação — teste de migração histórica (2026-10-25)

Foi adicionado um teste automatizado de backfill em PostgreSQL descartável: `scripts/test-dual-plate-migration.mjs`, comando `npm run test:migration-backfill`, integrado ao job `migration-test`. Ele testa classificação de registros LEGACY/MERCOSUR, preservação do resultado Mercosul e bloqueio para placa histórica não classificável. A implementação está commitada, mas a aprovação depende do resultado do workflow do commit atual. Executar somente em PostgreSQL descartável com permissão para criar/remover bancos. Nenhum banco real foi alterado.


### Correção da primeira falha do teste de backfill — 2026-10-25
A CI identificou erro na fixture de teste (`Purchase.updatedAt` inexistente na migração inicial), antes de testar o backfill em si. O campo foi removido do INSERT no commit `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8`. O status continua pendente até a CI desse commit terminar.


### CI confirmada e dependências — 2026-10-25
O workflow completo no commit `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8` concluiu com sucesso, inclusive backfill histórico e testes PostgreSQL: https://github.com/jpveiculos/JogaPlacas/actions/runs/40147585024. O pacote `eslint-config-next@16.4.3` está publicado e sua linha 16 requer ESLint >=9, compatível com a dependência atual. A diferença de patch pode ser alinhada, mas a alteração deve ser acompanhada por lockfile regenerado com npm e nova CI completa; ainda não foi feita.


### Revisão de banco e regras de negócio — 2026-10-25
A primeira revisão das migrações/schema encontrou ausência de `CHECK` constraints para valores/alocações não negativos, mínimo por linha e consistência de totais; também não há constraint que garanta dois resultados juntos quando a rodada é `COMPLETED`. Os serviços protegem partes dessas regras, mas escritas diretas/novos caminhos poderiam contorná-las. Avaliar constraints compatíveis com reconciliação histórica e adicionar testes de migração. O serviço atual cria compra e pagamento Pix pendentes; não há integração real com provedor/webhook nem confirmação financeira. Essas pendências devem ser resolvidas antes de ativar fluxos reais.
