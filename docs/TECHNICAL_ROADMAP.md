# Joga Placas — Manual técnico de implementação

Status: manual operacional vigente na branch oficial de desenvolvimento `feature/public-home-registration`, revisado em 2026-10-27. A especificação funcional em `docs/PRODUCT_SPEC.md` é a fonte de verdade para comportamento; decisões arquiteturais em `docs/ADR-001-FOUNDATION.md` e `docs/TARGET_DOMAIN_MODEL.md` complementam o manual. Este documento contém registros cronológicos de inspeções: quando um registro antigo divergir da seção “Estado consolidado da implementação”, prevalece a seção consolidada, sem apagar o histórico. Entradas datadas descrevem o estado observado na data indicada; antes de agir, conferir o código atual desta branch. Não usar branches históricas nem `main` como fonte de implementação.

## Produto e navegação obrigatórios — decisão vigente em 2026-10-26

A plataforma tem **quatro áreas de produto**, não apenas três. A decisão inicial de não criar uma página principal pública foi substituída pela nova direção de produto registrada na especificação funcional. Não reconstruir a navegação antiga como se ainda fosse válida.

1. **Página principal pública (`/`)**: página de apresentação do Joga Placas, explicação objetiva de como jogar e das regras, banner/elemento visual explicativo de placas e equivalências de prêmios, destaques de prêmios efetivamente confirmados, resultados públicos recentes, ganhadores elegíveis, consulta de recibo/código e acesso visível a **Entrar** e **Criar conta**.
2. **Área do jogador**: apostas, pagamentos, recibos, resultados pessoais, histórico e carteira conforme a especificação. Depois de entrar ou concluir o cadastro, o jogador é encaminhado diretamente para essa área.
3. **Área do cambista**: vendas para clientes, recebimentos, recibos, histórico e comissões; sem carteira própria nem saques.
4. **Área do administrador**: gestão de usuários, rodadas, regras, resultados, financeiro, comissões, saques e auditoria.

A página principal é a porta de entrada para pessoas que recebem o link em grupos ou outros locais da internet; não deve apresentar uma tela de login como primeira impressão. Os resultados e ganhadores antes descritos como página pública isolada devem ser incorporados à experiência da página principal. Pode-se preservar `/resultados` como endereço compatível/atalho para a seção pública de resultados, mas o conteúdo de resultados também deve estar acessível na página principal sem login.

**Redirecionamento e acesso:** visitante sem sessão acessando `/` vê a apresentação pública. Após login, o servidor identifica o papel e encaminha à área permitida; jogador autenticado que voltar a `/` deve ser encaminhado à área do jogador, sem fluxo de navegação que o leve de volta à página de apresentação. O cadastro público, quando implementado, deve terminar com a conta criada e encaminhar o novo jogador à área do jogador. A página principal não concede privilégios nem substitui autorização no servidor. Não criar cadastro público de administrador; contas administrativas são provisionadas de forma segura. Regras de cadastro, validação, prevenção de abuso e ativação de conta precisam ser implementadas e testadas antes de abrir o cadastro ao público.

## Nova decisão funcional — venda rápida do cambista sem dados do cliente (2026-10-26)

O modelo operacional do cambista passa a ser semelhante ao de uma venda por bilhete: não pedir nome, telefone, WhatsApp nem selecionar/cadastrar um cliente. O cambista informa a placa e os dados estritamente necessários da aposta, registra a venda e entrega um recibo identificável por código único e QR Code. O QR Code do recibo é para localizar/consultar o bilhete; não é automaticamente o QR Code de cobrança Pix.

A busca de compras por nome, telefone ou placa deve sair da interface do cambista e ser removida como fluxo de produto. A segunda via, se mantida, deve ser localizada pelo código do recibo e protegida por autorização. O backend de compras deve aceitar venda com `cashierId` e sem `customerId`; não criar clientes artificiais. A compra, o pagamento/recebimento, a rodada, as linhas, a emissão do recibo, o código único e a auditoria continuam sujeitos às validações existentes.

**Gap identificado na inspeção:** `src/app/cashier/page.tsx` atualmente mostra consulta rápida de recibo e `CashierPurchaseHistory`; este último oferece busca por código, nome, telefone e placa. `src/modules/purchases/create-purchase.ts` rejeita venda de cambista sem `customerId`. Portanto, remover apenas o componente de pesquisa deixaria o cambista sem o fluxo de venda pedido. É necessário implementar e testar o fluxo de venda rápida e seu endpoint, com geração do QR Code do recibo, antes de considerar a área concluída.

Não apagar registros históricos de `Customer` nem modificar a base de dados de produção como parte desta limpeza sem plano de migração, avaliação de retenção e autorização explícita.

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
7. Implementar as quatro áreas de produto, incluindo página principal pública com apresentação, cadastro/login, resultados/ganhadores e consulta de recibo, além das áreas autenticadas de jogador, cambista e administrador.
8. Implementar e validar a integração Pix/Mercado Pago em ambiente de desenvolvimento/homologação; **a habilitação operacional, credenciais de produção e qualquer cobrança real ficam bloqueadas até a fase final e autorização explícita**. Código de integração já existe nesta branch, mas isso não equivale a validação ponta a ponta nem autorização de produção.
9. Testar ponta a ponta, segurança, concorrência, reconciliação, backup/restauração e recuperação.
10. Revisar configuração do novo servidor e variáveis de ambiente; preparar implantação e rollback sem tocar no site atual.
11. Exigir CI verde, revisão final e autorização explícita antes de qualquer mudança de produção.

## Atualização — página pública e cadastro (2026-10-26)

- A página pública existe em `src/app/page.tsx` e apresenta consulta de recibos e resultados públicos. A rota raiz já é a porta de entrada para visitantes; usuários autenticados são encaminhados conforme seu papel.
- A branch `feature/public-home-registration` adiciona os botões de cadastro, a página `/cadastro` e a API `POST /api/auth/register`, criando somente usuários PLAYER e iniciando sessão após cadastro.
- Próximas validações obrigatórias: `npm run typecheck`, `npm run lint`, `npm test`, `npm run db:validate` e `npm run build`; revisar proteção antiabuso/limitação de cadastro; validar visualmente e funcionalmente no Railway; confirmar que o serviço e o domínio usam a branch correta. Não publicar em produção antes disso.

## Estado consolidado da implementação — 2026-10-26

Este quadro substitui as descrições de estado anteriores que diziam que a interface era apenas um placeholder ou que APIs/pagamentos ainda não existiam. Esses textos antigos são registros históricos da etapa em que foram escritos, não retrato do HEAD atual.

### Implementado no código desta branch
- Aplicação Next.js com páginas de login, troca de senha, jogador, cambista, administrador, resultados, termos e consulta pública; atualmente `/` redireciona para `/login`. A página principal pública de apresentação/cadastro/login/resultados combinados é uma nova funcionalidade aprovada e ainda precisa ser implementada. APIs de autenticação, compras, histórico/recibo, resultados, rodadas e saques já existem em diferentes graus de conclusão.
- Autenticação por sessão, verificação de papel no servidor e fluxos de troca obrigatória de senha, com testes de rotas de autenticação.
- Modelo `Purchase` → `PurchaseParticipation` → `ParticipationLine`, rateio de valores inteiros em centavos, snapshots de regra, criação transacional/idempotente de compra pendente e validações de sequência contínua de rodadas.
- Dois resultados independentes por rodada (`resultLegacyPlate` e `resultMercosurPlate`), preservação do resultado histórico como Mercosul, gerador independente, migração de classificação histórica e serviços/rotas de fechar, sortear e apurar.
- Scheduler interno protegido por segredo para abrir/fechar/sortear rodadas; sua execução automática depende de agendamento externo e configuração de ambiente, não apenas da existência da rota.
- Integração de código com Mercado Pago Orders API, criação de cobrança Pix, persistência dos dados de checkout, webhook HMAC e idempotência, serviço de confirmação transacional e consulta de status. O contrato real do provedor e o fluxo ponta a ponta ainda precisam ser testados com credenciais de teste.
- Recibo autenticado e consulta pública de recibo/resultados, crédito idempotente de prêmios de jogador e endpoint de reconciliação de crédito de prêmio.
- Carteira derivada do livro-razão, solicitação de saque com reserva transacional e chave Pix criptografada, histórico e fila administrativa com ações **Pagar**/**Rejeitar**. O Pix do saque é feito manualmente fora da plataforma; não há transferência automática.

### Parcial ou não concluído
- Fluxo completo de venda/recebimento em espécie pelo cambista e tratamento operacional de prêmios de vendas do cambista.
- Gestão administrativa completa de usuários, regras, comissões, relatórios e operações financeiras; as telas existentes não significam que todos os módulos administrativos estejam completos.
- Impressão térmica validada em dispositivo real e QR Code ligado ponta a ponta ao recibo; há componentes e endpoints parciais, mas isso não comprova compatibilidade física universal.
- Execução automática recorrente de rodadas em ambiente hospedado: exige scheduler externo, segredo e banco correto configurados e verificados.
- Reconciliação operacional de pagamento aprovado após cutoff, eventos do provedor fora de ordem, estornos/reembolsos e alertas/observabilidade.
- Estados legados de saque `APPROVED`/`PROCESSING`: preservar para histórico/reconciliação, sem conversão automática.
- Validação financeira concorrente e ponta a ponta específica dos saques e do fluxo de pagamento na versão exata do HEAD.

### Evidência de validação e limites
- A branch contém workflow CI com `verify`, `migration-test` e `postgres-concurrency-test`, além de testes unitários, de rota e integração PostgreSQL.
- No HEAD consultado nesta reconciliação (`84938086a2d50fd91de71b572372ab122416dcc9`), a API de status do commit não retornou checks/status. Portanto, **não declarar o HEAD atual aprovado por CI** só porque commits anteriores passaram.
- Código, testes existentes ou uma migração aprovada em PostgreSQL descartável não provam operação em produção. Nenhum merge para `main`, deploy, migração produtiva ou pagamento real é autorizado por este documento.

### Próximos gates
1. Obter CI verde para o HEAD exato e revisar lint, typecheck, testes, build, migrações e concorrência PostgreSQL.
2. Testar o contrato e as notificações reais do Mercado Pago em ambiente de teste, incluindo assinatura, duplicidade, ordem dos eventos, valores divergentes e falhas transacionais.
3. Testar a aritmética do livro-razão de saques, idempotência e concorrência com PostgreSQL descartável; confirmar que pagamentos/rejeições não duplicam efeitos.
4. Concluir o fluxo de cambista, a reconciliação de pagamentos tardios/estornos e os testes de impressão/QR que forem parte do escopo aprovado.
5. Só então preparar uma proposta de implantação, sem executá-la sem autorização explícita.

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

## Atualização de implementação — carteira, reconciliação de prêmios e saques (2026-10-26)

- Foi adicionada à área administrativa uma ferramenta para localizar prêmios positivos de jogadores online, recalcular o valor com o snapshot histórico e reconciliar/creditar usando a chave idempotente `prize-credit:<linha>`. Falhas técnicas de crédito não expiram em sete dias; divergências no livro-razão bloqueiam a correção. O endpoint exige ADMIN, motivo da correção e grava auditoria.
- Foi adicionada à área do jogador a seção de carteira e saques. O jogador consulta saldo derivado do livro-razão, solicita saque com valor e chave Pix, e vê o histórico de solicitações/pagamentos. O saque cria uma reserva negativa e a solicitação na mesma transação serializável; saldo reservado deixa de ficar disponível para nova utilização.
- A chave Pix é armazenada com AES-256-GCM e chave de ambiente `WALLET_PIX_ENCRYPTION_KEY`; sem a chave, novas solicitações são bloqueadas. Formatos comuns de chave são validados antes da solicitação. Não inserir o segredo real no repositório; provisionar no ambiente de desenvolvimento/homologação antes de testar chaves reais.
- Foi adicionada à área administrativa uma fila de saques pendentes, mostrando chave Pix apenas a ADMIN autenticado e autorizado. O administrador realiza o Pix fora do sistema, confere o comprovante e então registra a baixa com referência, observação, ator e auditoria. O clique não transfere dinheiro automaticamente; integração de payout Pix ainda não existe. Recusar o saque libera a reserva por lançamento compensatório idempotente.
- Testes adicionados para criptografia/mascaramento, formatos de chave Pix, reserva de saldo, saldo insuficiente, origem cruzada, autenticação administrativa, baixa de pagamento e liberação após recusa. Os fluxos permanecem apenas na branch `feature/dual-plate-draw`.
- **Validação pendente nesta atualização:** os workflows dos commits de teste de chave Pix ainda estão em execução no GitHub Actions; não declarar a pipeline mais recente verde até que os três jobs (`verify`, `migration-test`, `postgres-concurrency-test`) concluam. A CI dos commits anteriores de implementação dos painéis e dos testes iniciais de saque concluiu com sucesso.
- **Limites importantes:** não houve deploy, migração em produção, pagamento real nem configuração de segredo real. Antes de habilitar o fluxo em ambiente utilizável, executar testes ponta a ponta com banco descartável, testar concorrência e falhas de chave, e provisionar `WALLET_PIX_ENCRYPTION_KEY` de forma segura. A plataforma ainda não está finalizada: o fluxo completo de vendas do cambista em espécie, gestão administrativa completa, configuração de comissões/financeiro e testes ponta a ponta globais continuam pendentes.


## Regra de manutenção do estado documental — 2026-10-26

Ao atualizar este manual, comparar primeiro o HEAD da branch de trabalho com cada documento e código relevante. Registrar cada item como **implementado**, **parcial**, **pendente**, **bloqueado por decisão** ou **validado por evidência**, separando claramente existência de código de validação de CI e de operação real. Quando a implementação vigente representa uma melhoria aprovada em relação à ideia inicial, atualizar a regra principal e marcar a descrição antiga como histórica/superada; não manter duas instruções conflitantes como se ambas fossem atuais. Não apagar decisões históricas que expliquem migrações ou compatibilidade, mas não as apresentar como estado atual. Atualizar `docs/PRODUCT_SPEC.md` para decisões de produto e manter os documentos técnicos alinhados no mesmo conjunto de mudanças.


## Nova direção de produto: página principal pública — 2026-10-26

A decisão antiga que limitava a experiência a três áreas e rejeitava uma página principal foi substituída. A primeira implementação da home pública já está na branch `feature/dual-plate-draw`: apresenta o jogo, explica o uso do recibo, integra a consulta pública pelo código `JP-...` e incorpora o painel público de resultados/ganhadores, reaproveitando componentes e APIs existentes. A home verifica a sessão no servidor e redireciona usuários autenticados à área correspondente por papel. Os estilos responsivos foram adicionados, mas ainda exigem validação visual e de acessibilidade. Lint, typecheck, testes e build não foram confirmados para este commit; cadastro público de jogador e apresentação dinâmica dos valores oficiais de prêmio continuam pendentes. Requisitos e critérios completos estão em `docs/PRODUCT_SPEC.md`, seção “Página principal pública e entrada no produto”.


## Regra vigente — cadastro mínimo, recibo digital e pesquisa administrativa (2026-10-26)

- Cadastro de jogador: somente nome de usuário e senha. Nome completo, CPF, telefone, WhatsApp e e-mail não são requisitos e não devem ser pedidos durante a aposta. Atualizar formulários, schemas, validações e testes para refletir essa regra sem quebrar contas históricas desnecessariamente.
- Área do jogador: a aposta deve pedir placa e parâmetros essenciais (valor, rodada/repetição e meio de pagamento). Após confirmação autêntica, gerar recibo digital único com QR Code de consulta pública e ações de baixar/imprimir. QR do recibo não é QR de pagamento. Compra pendente não pode parecer confirmada.
- Área do cambista: implementar venda rápida anônima sem `customerId` e sem criação de `Customer`; placa, parâmetros essenciais, valor e fluxo de pagamento permitido. Retirar pesquisa por nome/telefone/WhatsApp/placa e seleção de clientes. Segunda via por código de recibo somente, sem duplicar venda.
- Área administrativa: adicionar busca restrita de contas de jogadores por nome de usuário e dados mínimos de manutenção, com paginação, autorização ADMIN no servidor e auditoria. Não criar dados pessoais ausentes.
- **Dependências técnicas:** inspecionar e adaptar schema Prisma, contratos de API, `create-purchase.ts`, rotas de compra, componentes do jogador/cambista, emissão/consulta de recibo e testes. O serviço de compra atual possui dependências do cliente e fluxo de pagamento PIX pendente; remover apenas a interface antiga antes de substituir o fluxo deixaria a venda incompleta. Não marcar a tarefa concluída até testes de autorização, venda anônima, pagamento, recibo, QR, download/impressão, ausência de PII e regressão dos registros históricos.
- Não apagar clientes históricos em massa nem migrar banco real como parte da limpeza de interface. Planejar eventual retenção/remoção separadamente, com revisão e plano reversível. Nenhum deploy ou ativação de pagamento real autorizado por esta decisão.


## Fluxo de recebimento do cambista — Pix e espécie (regra vigente, 2026-10-26)

### Sequência obrigatória da venda
1. Cambista informa a placa e os parâmetros indispensáveis da aposta, sem cadastro do comprador.
2. Escolhe o método de recebimento: Pix ou dinheiro em espécie.
3. **Pix:** criar cobrança e exibir na mesma tela QR Code Pix + código copia-e-cola. O cliente paga no app bancário. O backend aguarda confirmação autenticada do Mercado Pago, valida valor/referência/status, processa evento idempotentemente e notifica/atualiza a tela. Só então conclui a venda e apresenta automaticamente o recibo oficial com código JP-..., QR de consulta e ações de imprimir/baixar.
4. **Espécie:** botão explícito de confirmação de recebimento, disponível ao cambista autenticado para a venda em andamento. O servidor registra ator e timestamp e, numa operação transacional/idempotente, confirma a venda e apresenta automaticamente o recibo oficial com código e QR de consulta, pronto para imprimir/baixar.
5. O QR Pix e o QR do recibo são artefatos distintos. Não emitir recibo oficial para Pix pendente/recusado/expirado; não confiar em estado informado pelo navegador. Webhook ou clique repetido não pode duplicar compra, participações, recibo nem lançamento.

### Critérios de implementação e validação
- Criar cobrança Pix com referência interna única e validar assinatura/autenticidade do evento recebido; reconciliar status e valor com a cobrança esperada.
- Implementar webhook idempotente, estado de pagamento persistente e atualização da interface sem exigir recarregamento manual; prever consulta de estado enquanto a confirmação chega.
- Implementar confirmação de espécie com sessão/role de cambista, proteção contra CSRF, vínculo à venda em andamento, timestamp do servidor, trilha de auditoria e idempotência.
- A atribuição do código de recibo e a confirmação devem ser consistentes; QR de recibo deve resolver para consulta pública autorizada apenas após confirmação. Impressão/download reutiliza o mesmo recibo e nunca cria nova venda.
- Testar pagamento aprovado, pendente, recusado, expirado, evento duplicado, evento fora de ordem, valor divergente, webhook inválido, botão de espécie repetido, sessão sem permissão, falha de impressão e reimpressão.
- **Status:** regra definida; integração ponta a ponta não confirmada. Não habilitar cobrança real nem alegar que o recibo automático está pronto até a CI e testes de integração demonstrarem o comportamento. Nenhum deploy ou alteração de banco de produção é autorizado por esta decisão.


## Requisito de UX — sair do Pix/recibo e limpar a tela após impressão/download (2026-10-26)

**Critério obrigatório para o fluxo do cambista** (e padrão de comportamento para o jogador):

1. Tela de cobrança Pix com botão sempre acessível para sair/fechar, inclusive quando QR/copia-e-cola não carregarem ou a cobrança ficar pendente. Fechar a tela não muda o estado financeiro, não cancela automaticamente a cobrança e não emite recibo.
2. Tela do recibo com ações separadas: **Imprimir**, **Baixar recibo** e **Sair/Fechar recibo**. A ação de sair é um caminho de recuperação independente das ações de impressão e download.
3. Após a solicitação de impressão ser aceita e o diálogo de impressão retornar, fechar a tela do recibo e limpar o estado temporário da venda para que a interface esteja pronta para o próximo jogo. Após o navegador aceitar/iniciar o download, fazer a mesma limpeza. O clique isolado não basta: esperar a ação ter sido iniciada/aceita. Se imprimir/baixar falhar ou a impressão for cancelada, manter o recibo na tela com opção de tentar de novo ou sair.
4. O botão Sair fecha o recibo e limpa a tela sem alterar a compra confirmada. Limpar somente os campos/estado temporários da interface; não apagar histórico nem alterar dados persistidos.
5. Reimpressão e download usam o mesmo código de recibo e não repetem a venda nem movimentações financeiras. Não alegar que uma página web detecta a impressão física real: validar o retorno do diálogo do navegador e manter a saída manual como alternativa.

**Auditoria do estado atual:**
- Existe botão para sair da tela Pix em `src/components/player/player-purchase-form.tsx` (“Sair e iniciar outro jogo”); ele fecha a janela e limpa campos locais, mas preserva a cobrança anterior como pendente.
- Existe botão “Fechar recibo” em `src/components/receipts/player-purchase-receipt.tsx`.
- `src/components/receipts/thermal-receipt.tsx` chama `window.print()`, mas não oferece fluxo dedicado de download e não executa a limpeza automática após o diálogo de impressão.
- O fluxo completo do cambista ainda não está implementado; portanto, não considerar os requisitos atendidos ponta a ponta.

**Testes de aceitação necessários:** saída Pix sem mudança indevida do estado da cobrança; botão sair do recibo após falha de impressão/download; impressão concluída limpa a interface; download iniciado limpa a interface; cancelamento/falha mantém recibo e permite sair/tentar novamente; próxima venda inicia sem dados temporários anteriores; nenhuma ação de interface duplica compra, participação, recibo ou lançamento financeiro.


### Implementação parcial — ações de saída e download do recibo (2026-10-26)
- O componente compartilhado `ThermalReceipt` agora oferece ações separadas de **Imprimir recibo**, **Baixar recibo** e **Sair / Fechar recibo**. Sair e baixar limpam o estado/modal do recibo por meio do callback do componente; o arquivo baixado é HTML independente com estilos e conteúdo do recibo, não um PDF.
- As ações ficam fora da área impressa e não aparecem no papel. A área do jogador usa o botão do próprio recibo para fechar o modal, removendo a necessidade de depender de um botão externo abaixo do conteúdo.
- A tela Pix do jogador já tinha “Sair e iniciar outro jogo”; ela continua apenas fechando a tela e limpando os campos locais, sem afirmar que isso cancela o pagamento pendente.
- **Limite ainda aberto:** o fluxo de impressão não fecha automaticamente o recibo, porque os navegadores não distinguem de forma confiável impressão física concluída de diálogo cancelado; fechar no evento `afterprint` também fecharia quando o usuário cancela. O botão de saída manual permanece como recuperação. Validar se a experiência pode ser melhorada sem perder a opção de tentar novamente após cancelamento.
- O recibo ainda pode mostrar placeholder no lugar do QR real. O fluxo de cambista (venda anônima, cobrança Pix/confirmar dinheiro, emissão e limpeza de tela) continua não implementado ponta a ponta. CI dos commits recentes está em execução; não considerar validado até os jobs terminarem.


## Reconciliação executada — branch feature/public-home-registration — 2026-10-27

Esta seção reconcilia o código que foi inspecionado nesta branch com o manual. Ela prevalece sobre notas antigas que afirmem genericamente que a integração de Pix não existe; não transforma código implementado em prova de operação ponta a ponta.

### Confirmado no código inspecionado
- **Mercado Pago Pix do jogador:** `src/app/api/player/purchases/route.ts` cria uma compra pendente, reutiliza a chave de idempotência, cria/recupera uma ordem Pix e persiste o ID da ordem, QR/copia-e-cola, URL de pagamento e status do provedor.
- **Webhook:** `src/app/api/webhooks/mercado-pago/route.ts` exige segredo e assinatura HMAC, consulta o estado canônico no provedor, compara referência, moeda e valores, registra eventos e encaminha aprovação para confirmação transacional. Estados finais negativos cancelam registros ainda pendentes.
- **Confirmação e consulta:** `src/modules/payments/confirm-payment.ts` centraliza a confirmação; `src/app/api/player/purchases/[purchaseId]/status/route.ts` permite ao jogador consultar estado e só informa recibo pronto quando compra e pagamento estão confirmados.
- **Interface do jogador:** `src/components/player/player-purchase-form.tsx` acompanha o estado enquanto a tela Pix está aberta.
- **Saques:** o painel administrativo registra pagamento manual ou rejeição; não realiza transferência Pix automaticamente.

### Correção documental aplicada
O texto do painel administrativo que dizia que “não existe integração ativa com provedor” estava desatualizado e contradizia os módulos presentes. Foi substituído por uma descrição precisa: a implementação de checkout/webhook existe, mas a validação ponta a ponta e a autorização para operação real continuam pendentes.

### Ainda falta — prioridade de execução
1. Consultar os resultados atuais do GitHub Actions para o HEAD desta branch e corrigir qualquer falha; a existência de testes não prova que passaram neste commit.
2. Completar/validar os testes de contrato da Orders API com respostas reais de homologação, incluindo ordem sem QR, erro de rede após criação e persistência segura do ID para permitir reconciliação.
3. Testar o fluxo do jogador ponta a ponta em homologação: compra pendente → QR/copia-e-cola → notificação autenticada → confirmação única → recibo pronto; também assinatura inválida, valor/referência divergentes, evento duplicado/fora de ordem, recusa, expiração, reembolso e pagamento após cutoff. Não é necessário movimentar dinheiro real.
4. **Correção aplicada em 2026-10-27:** o webhook deixa o evento sem `processedAt` enquanto executa a reconciliação e marca como processado só após concluir o caminho de confirmação ou registrar a necessidade de reconciliação manual. Falhas permanecem reprocessáveis. Commit `27bb05b14a1a36c2c93d9534bfe15564b6f7b95d`. Ainda requer testes de concorrência, retry e duplicidade.
5. Verificar estados de reembolso/estorno após uma compra já confirmada. O código atual fecha somente pagamentos ainda PENDING no ramo de estado negativo; não presumir que uma notificação de reembolso reverte automaticamente uma compra já confirmada.
6. Implementar o fluxo prioritário ainda ausente do cambista: venda sem cadastro de cliente, escolha Pix ou espécie, confirmação de espécie auditada/idempotente, recibo com código único e QR de consulta, e recuperação sem duplicar venda.
7. Completar os módulos administrativos faltantes (gestão de contas, regras/configurações financeiras, comissões e relatórios), conforme a especificação funcional.
8. Validar QR real do recibo, download/impressão e comportamento de saída/limpeza da tela; a cobrança Pix e o QR do recibo são artefatos diferentes.
9. Confirmar o agendamento externo do scheduler no ambiente de desenvolvimento e a navegação da página pública/cadastro, sem tratar deploy bem-sucedido como prova de todos os fluxos.

### Patamar atual
**Fundação e fluxos do jogador: implementação substancial, com gates de teste/validação ainda abertos.** **Pix do jogador: código implementado, homologação ponta a ponta ainda não comprovada.** **Cambista: fluxo de venda rápida e recebimento ainda incompleto.** **Administração: operações básicas de rodadas, reconciliação de prêmios e fila de saques existem; gestão completa continua pendente.** Nenhuma alteração de produção ou cobrança real é autorizada por esta reconciliação.


### Correções incrementais — 2026-10-27
- **Webhook Pix:** o registro do evento deixou de ser marcado como processado antes da confirmação transacional. Eventos ainda não processados podem ser retomados após falha; eventos já processados são reconhecidos como duplicados. Commit: `27bb05b14a1a36c2c93d9534bfe15564b6f7b95d`.
- **Consulta de vendas do cambista:** a API e a interface agora exigem o código completo do recibo, em vez de buscar por placa ou por trecho do identificador. Isso alinha a recuperação de segunda via à regra funcional e reduz a exposição de vendas por pesquisa ampla. Commits: `303b85caa591ad47c217bf5788d36c083a42032c` e `03726a137cd89bfe43304f5e8716614efc8ce255`.
- **Validação:** o GitHub não retornou status checks nem execuções de Actions para o commit da correção do webhook consultado. Portanto, essas alterações estão registradas no repositório, mas não são declaradas testadas ou publicadas.
- **Próximo gap funcional do cambista:** a tela existente ainda prepara vendas por Pix; recebimento em dinheiro com confirmação auditada/idempotente e QR Code real do recibo continuam pendentes. Não substituir o fluxo atual sem implementar uma transição de estado atômica.


## Decisão funcional — cadastro administrativo e comissão individual de cambistas (2026-10-27)

### Regra aprovada
- A área ADMIN deve permitir criar e editar cambistas por um formulário com nome completo, nome de usuário único, senha inicial, WhatsApp e percentual individual de comissão. Senha deve ser armazenada apenas com hash; nunca registrar senha/hash em auditoria. O administrador também pode ativar ou bloquear o cambista.
- Cada cambista tem sua própria porcentagem, editável pelo administrador, para suportar pontos fixos e vendedores itinerantes com condições diferentes. A taxa é aplicada a vendas futuras; mudanças não reescrevem o histórico.
- A área do cambista deve exibir dois indicadores: total bruto das vendas confirmadas e comissão acumulada em dinheiro (R$). Exemplo: R$ 100,00 em vendas elegíveis com taxa individual de 20% representam R$ 20,00 de comissão, não “20%” como contador.
- A comissão por venda deve guardar taxa e valor calculado como snapshot ligado à compra, em centavos inteiros, de modo idempotente e auditável. Vendas pendentes/fracassadas/canceladas/estornadas não devem ser contadas indevidamente; a política de estorno de uma venda já confirmada precisa de implementação e teste explícitos.
- A alteração de taxa, criação/edição de cambista e bloqueio devem registrar ator, data e valores anterior/novo relevantes, sem expor credenciais.

### Situação técnica encontrada nesta inspeção
- A especificação já previa, de forma genérica, percentual administrado e indicadores de vendas/comissão; faltavam a exigência explícita de taxa individual por cambista, o formulário com os campos e a distinção clara entre percentual e valor monetário acumulado.
- prisma/schema.prisma contém CashierCommission com rateBasisPoints e amountCents por compra, o que oferece estrutura para preservar a taxa e o valor históricos por venda.
- O modelo User não continha os campos do perfil; isso foi corrigido na implementação incremental abaixo. A estrutura `CashierCommission` existente armazena a taxa em pontos-base e o valor em centavos por compra.
- **Implementação incremental iniciada nesta branch:** adicionados campos opcionais `fullName`/`whatsapp` e `commissionRateBasisPoints` ao modelo User, com migração versionada e limite de 0–10000 pontos-base; endpoints ADMIN para listar/criar/editar cambistas, definir comissão individual, ativar/bloquear conta e redefinir senha; formulário administrativo na área ADMIN; resumo autenticado na área do cambista com total de vendas confirmadas e comissão acumulada em reais; cálculo e persistência da comissão no mesmo fluxo transacional de confirmação Pix, usando a taxa vigente no momento da confirmação e arredondamento em centavos inteiros.
- **Ainda parcial / sem validação:** comissão só foi ligada ao caminho de confirmação Pix que foi alterado. Venda em espécie ainda não está implementada ponta a ponta e não gera comissão por esse caminho; estornos após confirmação, testes específicos do novo CRUD/cálculo e validação de migração/CI continuam pendentes. O status Railway consultado para o commit `a8cc86ae0e8a072466b26d75ffa04302a9b01220` estava `pending`; não afirmar deploy concluído nem CI verde. Não executar migração produtiva nem habilitar operação real sem os gates apropriados.


## Decisão técnica — impressão térmica Bluetooth com máxima compatibilidade (2026-10-27)

**Objetivo aprovado:** oferecer o maior alcance possível de impressoras térmicas atuais via Bluetooth, com arquitetura independente de fabricante e alternativas claras quando o acesso direto não for suportado.

### Fatos de plataforma que orientam a implementação
- Não há API única de navegador que acesse toda impressora Bluetooth. Web Bluetooth tem suporte restrito por navegador/plataforma, normalmente exige contexto seguro e não equivale a suporte geral a Bluetooth Classic/SPP.
- A impressão padrão via navegador funciona quando o sistema operacional já consegue usar a impressora; a disponibilidade do driver/serviço de impressão é responsabilidade do dispositivo/OS.
- Alguns modelos exigem protocolo ou comandos específicos (por exemplo, variantes de ESC/POS) ou SDK do fabricante. Não assumir que o mesmo pacote de bytes funciona em todo equipamento.

### Arquitetura alvo
1. **Default:** recibo HTML/CSS de 58 mm e impressão via diálogo nativo do sistema, sem acoplar a marca.
2. **Capability adapter:** definir uma interface de impressão que separe UI do transporte, por exemplo printReceipt(receipt, capabilities); selecionar caminho de impressão somente após detectar suporte real.
3. **Bluetooth Web:** avaliar como melhoria opcional para dispositivos BLE e navegadores suportados; feature-detect, tratar cancelamento/permissão/desconexão/timeouts e manter fallback.
4. **Bridge nativa opcional:** se a cobertura de campo exigir Bluetooth Classic/SPP, implementar ou integrar um aplicativo auxiliar por plataforma com permissões do sistema e perfis/protocolos adequados. Não presumir que uma PWA ou um site Next.js possa acessar livremente Bluetooth Classic.
5. **QR próprio:** gerar QR localmente/na aplicação para URL pública de consulta do recibo e embutir no recibo; não gerar QR de recibo por serviço externo nem confundir com o QR Pix. O QR principal identifica a compra inteira; a página consulta cada participação/rodada separadamente.
6. **Resiliência:** falha de pareamento/impressão nunca deve criar outra venda, apagar o recibo confirmado nem impedir a saída; oferecer retry, download e diálogo de impressão padrão.

### Critérios de aceitação
- Impressão legível em 58 mm, com margens, quebras e conteúdo conferidos em impressoras reais.
- QR do recibo escaneável após impressão e apontando para a consulta pública correta.
- Testes registrados para Android/BLE, Android/Classic-SPP, iOS com modelos explicitamente compatíveis e desktop via sistema, sem extrapolar o resultado de um modelo para todos.
- UI identifica o caminho utilizado e informa quando Bluetooth direto não é suportado.
- Nenhuma mensagem de sucesso baseada apenas em abrir o diálogo; a web não pode confirmar que o papel foi fisicamente impresso.

### Estado e próximo passo
O componente atual src/components/receipts/thermal-receipt.tsx usa window.print() e HTML baixável, sem camada Bluetooth direta e com placeholder se qrCodeDataUrl não for fornecido. Próximo passo de implementação: corrigir a geração do QR e robustecer impressão HTML/CSS como caminho base; em seguida escolher o caminho Bluetooth direto/bridge com base nos dispositivos e sistemas operacionais que se pretende suportar. Não instalar SDK específico nem prometer universalidade sem teste e sem definir a plataforma auxiliar.

## Implementação retomada — venda em dinheiro do cambista (2026-10-27)

- Foi adicionado o endpoint de desenvolvimento `POST /api/cashier/purchases/cash`, separado do endpoint Pix e protegido por sessão de cambista, validação de origem e validação estrita do payload.
- O serviço de compra passou a aceitar modo `CASH`: cria compra e participações confirmadas, gera código de recibo `JP-...`, grava a comissão com a taxa vigente e registra evento de auditoria dentro da mesma transação serializável. O fluxo de dinheiro não cria registro de pagamento Mercado Pago nem cobra Pix.
- A chave de idempotência mantém o mesmo resultado em repetição da mesma solicitação e impede reutilização para conteúdo divergente.
- **Não validado ainda:** execução local de typecheck/testes, teste integrado com PostgreSQL, revisão completa de casos de repetição e confirmação do deploy. O endpoint é código em branch, não autorização para operação em produção. A tela do cambista já oferece seleção entre Pix e dinheiro e encaminha a venda em dinheiro para o endpoint separado; após sucesso, abre o recibo pelo componente existente. Ainda precisa de typecheck, testes locais/integração e teste manual do recibo para confirmar a integração ponta a ponta. Uma revisão de integração corrigiu o endpoint de recibos oficiais para aceitar compras em dinheiro confirmadas, que não têm registro de pagamento Pix, mantendo a exigência de pagamento confirmado para compras Pix.



## Atualização de implementação — consulta pública por QR e rodadas (2026-10-27)

- A rota pública `/verificar-recibo/[receiptCode]` consulta a compra confirmada no banco oficial. A API agora inclui as rodadas vinculadas, horário programado, resultados oficiais publicados e estado de apuração de cada placa.
- A interface pública mostra separadamente: sorteio aguardando; aguardando resultado oficial; resultado publicado; rodada cancelada; placa premiada, não premiada ou ainda aguardando apuração. Só apresenta o crédito como pago quando há registro de crédito do prêmio.
- O QR continua identificando o recibo/compra; uma compra com várias rodadas mostra cada rodada separadamente, sem misturar placas nem exigir um QR impresso por rodada.
- **Ainda não validado:** executar typecheck, lint, testes e build; verificar o modelo de dados e os casos de borda de rodada concluída sem apuração; testar a consulta em celular e o QR impresso. Não declarar esta implementação pronta para produção até passar essas verificações.
