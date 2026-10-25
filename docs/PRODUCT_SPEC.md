# Joga Placas — Especificação funcional inicial

> Fonte de verdade funcional do projeto. Decisões novas devem ser registradas aqui antes de alterar comportamentos já aprovados.
> Esta especificação não substitui revisão técnica, testes nem validação jurídica/comercial antes de operar pagamentos e jogos em produção.

## 1. Áreas e acesso
- Três áreas: jogador, cambista e administrador.
- Login compartilhado por usuário/senha; o servidor identifica o papel e direciona para a área autorizada.
- Senhas armazenadas somente com hash forte; sessões seguras; autorização validada no servidor.
- Sem cadastro público de administradores. Contas e credenciais administrativas devem ser provisionadas por configuração segura.
- Jogador vê apenas os próprios registros; cambista vê somente suas próprias vendas/clientes; administrador tem visão global conforme permissões.

## 2. Placas e categorias
- Formatos aceitos: padrão antigo `ABC-1234` e Mercosul `ABC1D23`, com A-Z na quinta posição Mercosul.
- Não converter letras Mercosul em dígitos durante validação, normalização ou apuração. A quinta posição Mercosul aceita A-Z, preservada literalmente.
- Cada aposta deve armazenar explicitamente seu formato (`LEGACY` ou `MERCOSUR`) e ser comparada somente com o resultado do mesmo formato. Não reutilizar equivalências entre formatos na apuração. Preservar formato e exibição para auditoria.
- Rejeitar formatos inválidos no servidor.
- Multiplicadores aprovados: unidade (último dígito) 2x; dezena (últimos dois) 20x; centena (últimos três) 200x; milhar (últimos quatro) 2.000x; três letras iniciais em ordem exata 2.000x; placa completa 200.000x.
- Multiplicador aplica-se ao valor alocado à respectiva categoria. Para Mercosul, unidade/dezena/centena/milhar comparam literalmente os últimos 1/2/3/4 caracteres da placa; a centena pode conter uma letra e dois números, e a milhar pode conter uma letra e três caracteres numéricos no sufixo.
- Cada linha deve guardar `ruleVersion` e um `ruleSnapshot` com os multiplicadores daquela aposta. A apuração usa o snapshot histórico, nunca os multiplicadores atuais por suposição. Snapshots ausentes/inválidos bloqueiam a apuração para reconciliação.

## 3. Rodadas e apostas
- Cada rodada terá dois sorteios independentes: um resultado de placa cinza (`resultLegacyPlate`) e um resultado Mercosul (`resultMercosurPlate`). Cada resultado é sorteado, persistido e apurado separadamente; não afirmar que são conversões um do outro. A interface deve exibir duas plaquinhas identificadas.
- A aposta em placa cinza só concorre ao resultado cinza; a aposta Mercosul só concorre ao resultado Mercosul. As regras de categoria e multiplicadores precisam ser aplicadas ao formato correspondente.
- Ambos os resultados devem ser imutáveis depois de publicados, com geração e publicação idempotentes por rodada e por formato.
- Rodadas a cada 30 minutos; encerramento das apostas 1 minuto antes do horário do resultado.
- Corte validado no servidor. Não aceitar nem incluir retroativamente aposta após o fechamento.
- Repetição de 1 a 10 rodadas com pagamento antecipado e registro individual de cada participação.
- Valor mínimo total de R$ 1,00 por placa em cada rodada.
- O total por rodada abrange todas as placas e categorias selecionadas; a distribuição deve conservar cada centavo, com regra determinística de rateio e tratamento dos centavos residuais documentada e testada.
- Rodadas devem ter data/hora e fuso explícitos (`America/Sao_Paulo`). Recorrências geram rodadas individuais. Rodadas concluídas/fechadas não podem ser editadas silenciosamente; correções e cancelamentos devem ser auditados.

## 4. Pagamentos, Pix e carteira do jogador
- Uma transação é paga integralmente pela carteira ou integralmente por Pix; não combinar saldo e Pix na mesma transação.
- Pix deve ser confirmado pelo provedor/webhook validado, nunca apenas pela interface do cliente. A confirmação precisa ocorrer até o fechamento para que a aposta participe daquela rodada.
- Fechar/ocultar a tela do QR não cancela a cobrança; o estado continua sendo acompanhado.
- Pagamentos atrasados não geram participação retroativa. Regras de expiração, estorno ou devolução precisam ser definidas no desenho técnico antes de produção.
- Prêmios confirmados creditados automaticamente na carteira, com idempotência contra crédito duplicado.
- Livro-razão financeiro rastreável para créditos, prêmios, débitos de apostas, depósitos, estornos e saques.
- Saques somente do saldo disponível integral, com chave Pix, aprovação administrativa e reserva do valor para evitar gasto duplo. Estados: pendente, aprovado, processando, pago ou rejeitado; marcar pago somente após confirmação do pagamento.
- Notificações para confirmação/pendência de pagamento, fechamento e resultado da rodada, crédito de prêmio e mudanças no saque.

## 5. Jogador
- Cadastro/login com usuário e senha, sem exigir nome real ou documento como regra geral.
- Modal de jogo para adicionar/revisar/remover placas, valor, repetição, método de pagamento e confirmação.
- **Gerador aleatório de placas:** oferecer, na área do jogador, uma opção para gerar uma placa válida aleatória quando a pessoa estiver indecisa. A placa gerada é apenas uma sugestão visual; não é palpite preditivo nem oferece vantagem ou garantia de prêmio.
- A pessoa pode gerar outra placa quantas vezes desejar antes de escolher. Cada nova geração substitui somente a sugestão exibida; não cria aposta, não reserva placa e não movimenta saldo.
- Exibir uma ação explícita **“Adicionar ao jogo”** para incluir a placa escolhida no modal de aposta. Até essa confirmação, a placa permanece apenas como sugestão e pode ser descartada sem efeitos.
- O gerador deve respeitar os formatos de placa aceitos pela especificação e produzir uma representação válida e normalizável pelo servidor. A geração pode ocorrer no cliente, mas toda validação necessária à aposta continua sendo feita no servidor.
- WhatsApp solicitado para recibo, pré-preenchido quando disponível e editável.
- Resultados recentes exibidos por até 24 horas; histórico próprio de apostas dos últimos 7 dias na interface. Registros financeiros completos permanecem disponíveis para auditoria administrativa.
- Recuperação de acesso orientada ao contato do administrador via WhatsApp; não usar link de redefinição por e-mail como fluxo definido.

## 6. Cambista
- Recursos de aposta e consulta equivalentes aos necessários para vender a clientes, sem carteira própria nem saques.
- Disponibilizar também o gerador aleatório de placas na área do cambista, para ajudar quando o cliente não tiver um palpite. O cambista pode gerar novas sugestões até o cliente escolher uma e, então, usar **“Adicionar ao jogo”** para incluí-la na venda em andamento.
- Gerar ou trocar sugestões não pode criar nem duplicar uma venda, confirmar pagamento, alterar valores ou registrar participação. A venda só segue o fluxo normal após a escolha explícita e a confirmação da operação.
- Registrar cliente, placas, valor por rodada, repetição, forma de pagamento e WhatsApp; emitir/recuperar recibo sem duplicar venda.
- Dinheiro em espécie: cambista confirma recebimento e assume responsabilidade pelo registro. Pix: confirmar via provedor.
- Histórico limitado às próprias operações, com situação do pagamento, resultado/prêmio e dados da rodada.
- Painel informativo com total de vendas e comissão acumulada. Percentual configurado pelo administrador; não permitir ao cambista editar nem sacar a comissão pela interface definida.
- Menus secundários recolhidos para clientes recorrentes, resumo diário, busca avançada e livro de recebimentos em dinheiro.

## 7. Administração
- Painel financeiro por período, distinguindo vendas diretas, vendas de cambistas, pagamentos confirmados, pendências, cancelamentos, estornos, comissões, prêmios, saques, tarifas e resultado líquido. Não confundir vendas com valores líquidos recebidos.
- Configurar percentuais de comissão e multiplicadores pela interface administrativa, sem deploy. Auditar alterações com valor anterior/novo, data e autor; preservar os termos históricos das operações existentes.
- Criar/gerir rodadas e recorrências; impedir horários inválidos e duplicados; listar status e resultados; auditar cancelamentos/correções.
- Consultar resultados recentes (24 horas por padrão), histórico completo e vencedores com rodada/data, origem, placa, categoria, valor e estado do crédito.
- Consultar apostas de todos os jogadores/cambistas com filtros por período, rodada, origem, usuário/cliente, placa, pagamento e resultado; acessar recibos e detalhes financeiros.
- Criar, bloquear, ativar e redefinir credenciais de cambistas e jogadores. Não é possível recuperar senhas antigas em texto claro; usar redefinição segura e, quando apropriado, troca obrigatória no próximo login.
- Segredos administrativos exclusivamente em variáveis de ambiente/gerenciador de segredos; nunca no frontend, no repositório ou em logs.

## 8. Interface
- Interface limpa, responsiva e simples.
- Funções secundárias em menus recolhidos, com indicadores de expansão.
- Modal Pix com QR Code, opção copiar/colar e botão para sair da tela do QR; sair da tela não cancela a cobrança.
- No modal de jogo do jogador e no fluxo de venda do cambista, apresentar o gerador com ações simples **“Gerar placa”**, **“Gerar outra”** e **“Adicionar ao jogo”**. Mostrar claramente a placa sugerida e manter a escolha sob controle do usuário.
- Mensagens e estados de pagamento devem ser claros, sem afirmar sucesso antes da confirmação do servidor/provedor.

## 9. Critérios transversais
- Usar centavos inteiros para valores monetários; nunca depender de ponto flutuante para cálculos financeiros.
- Operações de pagamento, crédito de prêmio e criação de participação devem ser idempotentes e transacionais.
- Validar autorização no servidor, aplicar limites de tentativa, registrar ações administrativas relevantes e proteger dados pessoais.
- Criar testes automatizados para normalização de placas, rateio, fechamento de rodadas, webhooks duplicados/fora de ordem, créditos de prêmio e saques.
- Não implantar em produção sem testes, revisão de segurança, verificação de variáveis de ambiente, migrações e plano de rollback.
- Questões regulatórias, legais, de elegibilidade e operação comercial devem ser verificadas antes de disponibilizar o serviço ao público.

## 10. Decisões técnicas e pontos de negócio ainda a decidir

### Decisões técnicas já aprovadas
- Aplicação modular única com Next.js App Router, React e TypeScript estrito.
- PostgreSQL com Prisma ORM e migrações versionadas; Zod para validação de entradas.
- Vitest para testes unitários/integração; Playwright fica previsto para fluxos críticos de interface quando estes forem implementados.
- CI deve validar/gerar Prisma, executar lint, typecheck, testes, build e testar migrações em PostgreSQL descartável.
- Valores monetários em centavos inteiros; instantes em UTC e agenda apresentada no fuso America/Sao_Paulo.
- Pagamentos isolados do domínio por adaptadores. Webhooks, quando implementados, devem ser autenticados, persistidos e idempotentes.
- Não fazer deploy, migração de produção, merge para main ou cobrança real sem gates aprovados e autorização explícita.

### Decisões de negócio/técnicas ainda pendentes
- Provedor Pix e contrato exato dos webhooks, autenticação/assinatura e reconciliação; Mercado Pago permanece adiado para a fase final.
- Fonte oficial dos resultados, controles de integridade e processo auditável de correção.
- Política definitiva para pagamento confirmado depois do cutoff, expiração, devolução/estorno e rodadas canceladas.
- Detalhes de fórmula/arredondamento de prêmios, empates e limites ainda não especificados no manual.
- Política de retenção de dados e parâmetros operacionais de segurança.


## 11. Controle de decisões e manutenção desta especificação
- Esta especificação é a fonte de verdade funcional do Joga Placas. Toda decisão nova tomada durante o desenvolvimento, assim como toda alteração de uma decisão já aprovada, deve ser confrontada com este documento.
- Antes de implementar uma decisão, identificar a seção relacionada e classificar o efeito: confirma a regra existente, complementa a regra ou substitui/contradiz a regra anterior.
- Quando a decisão estiver clara e aprovada, atualizar esta especificação na mesma frente de trabalho da implementação. Não deixar uma decisão aprovada apenas na conversa, em comentários de código ou em testes.
- Se a decisão substituir uma regra anterior, editar a regra vigente para evitar contradições. Registrar o motivo e o impacto em uma nota de decisão quando o histórico for necessário para auditoria.
- Se houver ambiguidade relevante, não inventar detalhes nem alterar silenciosamente o comportamento: registrar o ponto como pendente e solicitar esclarecimento antes de implementar.
- Ao concluir cada tarefa, conferir a consistência entre esta especificação, o código e os testes pertinentes. Relatar separadamente as alterações documentais, as alterações de código e as verificações efetivamente executadas.
- Decisões e mudanças devem ser feitas na branch de desenvolvimento ativa apropriada; não alterar `main`, realizar merge, executar migrações de produção ou habilitar pagamentos reais como parte dessa rotina sem autorização explícita.
- Uma tarefa não é considerada concluída enquanto a especificação não tiver sido atualizada quando necessário e a divergência entre documento, implementação e testes não tiver sido avaliada.


## 12. Retrato de implementação verificado — 2026-10-24

Este retrato descreve a branch feature/dual-plate-draw no commit d337082b2d0fa6b24db64a6839d20e24c894fb9e. É um registro de auditoria do código versionado, não uma declaração de prontidão para produção. A auditoria detalhada e os limites de evidência estão em docs/FOUNDATION_AUDIT.md.

### Implementado no repositório
- Aplicação Next.js App Router/React/TypeScript; package.json, package-lock.json, configuração Prisma e workflow de CI versionados.
- Schema Prisma e quatro migrações versionadas: inicial, sessões, limite de tentativas de login e sorteio de duas placas. As migrações foram exercitadas pela CI em PostgreSQL descartável; não há evidência de aplicação em produção.
- Autenticação com rotas de login, logout, consulta de sessão e alteração de senha; componentes de sessão, hash/verificação de senha, proteção por papel e limite de tentativas.
- Páginas iniciais separadas para jogador, cambista e administrador, protegidas por papel no servidor. São placeholders informativos, não interfaces funcionais completas.
- Normalização/validação de placas, geração independente de placa, regras de compra, valores em centavos e snapshots de multiplicadores.
- Serviço de compra pendente com participações por rodada, idempotência e transação; serviço de fechamento de rodada.
- Rotas administrativas autenticadas para fechar rodada, gerar resultados e apurar prêmios, com testes de rota.
- Serviço de geração/persistência idempotente dos resultados LEGACY e MERCOSUR e serviço de apuração com linhas de livro-razão idempotentes; testes unitários e de integração PostgreSQL versionados.
- Workflow de CI com instalação reproduzível por npm ci, validação/geração Prisma, lint, typecheck, testes, build e teste de migrações/concorrência.

### Parcial ou ainda não implementado como fluxo de produto
- As áreas de jogador, cambista e administrador exibem placeholders; faltam os fluxos de interface e integração ponta a ponta previstos nesta especificação.
- A criação de compra pendente não integra um provedor Pix e não confirma pagamentos.
- Carteira/livro-razão, depósitos, saques, comissões, vendas em dinheiro, gestão completa de usuários/rodadas/regras e relatórios ainda não têm fluxos de produto completos comprovados nesta auditoria.
- A UI ainda não apresenta claramente os dois resultados de placa.
- Não foi confirmada nesta auditoria uma fonte oficial externa para resultados nem um processo operacional completo de publicação/correção.
- Mercado Pago, webhooks do provedor, reconciliação real e cobrança real não estão habilitados e permanecem para a fase final.

### Evidência e limites
- O workflow GitHub Actions do commit acima registra conclusão com sucesso na execução consultada em 2026-10-24. Isso prova apenas os jobs configurados naquela execução, não prontidão operacional nem produção.
- O repositório é privado; a inspeção foi feita por meio do conector GitHub e da árvore/arquivos versionados. Não foi executada instalação local nesta conversa, não houve acesso a banco de produção, segredos, DNS ou serviço hospedado.
- A branch feature/dual-plate-draw está 61 commits à frente e 1 atrás de planning/foundation, com divergência; há PR #1 aberto em rascunho para planning/foundation. Não fazer merge automaticamente.
- A divergência Next.js 16.4.3 versus eslint-config-next 16.4.2 permanece como verificação pendente; não atualizar às cegas.

### Regra de manutenção
Toda decisão aprovada, mudança de código, resultado de teste, mudança de infraestrutura ou implantação que altere este retrato deve atualizar esta seção e/ou a documentação operacional pertinente no mesmo conjunto de trabalho. Registrar claramente o que foi executado e a evidência; nunca transformar intenção em status concluído.


## 13. Verificação técnica complementar — 2026-10-25

- O GitHub Actions `Verify` do commit `1d37b8fc59e0c10717272b96dec1d9bd206a6819` concluiu com sucesso. Isso não equivale a uma instalação limpa executada nesta sessão nem a uma validação de produção.
- Foi confirmado que a migração `20261024020000_dual_plate_draw` classifica dados históricos pelo valor exibido em `plateDisplay` e aborta se qualquer linha não puder ser classificada. Esse comportamento é uma proteção intencional e não deve ser removido para fazer uma migração passar.
- A CI atual testa a cadeia de migrações em um PostgreSQL vazio. Falta ensaio explícito do backfill com registros históricos válidos dos dois formatos e um caso inválido/ambíguo para provar a preservação e o bloqueio seguro.
- `package.json` e `package-lock.json` mantêm `next@16.4.3` e `eslint-config-next@16.4.2`. A diferença de patch permanece pendente de revisão; nenhuma versão foi alterada nesta etapa.
- Evidência e limites: revisão dos arquivos versionados na branch `feature/dual-plate-draw`; nenhuma instalação/teste local ou acesso a banco foi executado nesta sessão. Nenhuma alteração de código, migração, implantação ou produção foi realizada.


## 14. Alteração de código e teste de migração histórica — 2026-10-25

Foi adicionado `scripts/test-dual-plate-migration.mjs`, o comando `npm run test:migration-backfill` e uma etapa correspondente no job `migration-test` de `.github/workflows/verify.yml`. O teste cria bancos descartáveis temporários, parte do SQL da migração inicial, marca essa migração como baseline e insere linhas históricas LEGACY/MERCOSUR; verifica o backfill e a preservação do resultado Mercosul. Em um segundo banco, inclui uma placa não classificável e exige que `prisma migrate deploy` falhe com o erro de segurança esperado.

Esta alteração foi commitada na branch `feature/dual-plate-draw`; o resultado do CI para o commit que inclui a nova etapa ainda precisa ser conferido. Nenhuma migração de produção ou alteração de banco real foi executada. O teste depende de uma instância PostgreSQL descartável com permissão para criar e remover bancos, como a instância do serviço PostgreSQL no GitHub Actions.


### Correção do teste histórico — 2026-10-25
A primeira execução do novo teste falhou antes de alcançar a migração dual-plate: a fixture de `Purchase` tentava inserir `updatedAt`, coluna que não existe na migração inicial. Corrigido em `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8` removendo essa coluna do INSERT de teste. A CI desse commit precisa confirmar a correção; não há aprovação ainda.


### Resultado da CI após corrigir a fixture — 2026-10-25
A execução completa do workflow no commit `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8` terminou com sucesso: teste de migração histórica, validação/build/lint/typecheck/testes e concorrência PostgreSQL passaram. Execução: https://github.com/jpveiculos/JogaPlacas/actions/runs/40147585024. A diferença entre `next@16.4.3` e `eslint-config-next@16.4.2` segue em revisão; não foi alterada neste commit.


### Revisão técnica do banco — pontos a fechar antes de fluxos financeiros
A revisão de `prisma/schema.prisma` e das quatro migrações encontrou invariantes importantes que hoje dependem principalmente dos serviços TypeScript, sem `CHECK` constraints equivalentes no PostgreSQL: valores monetários e alocações não negativos, mínimo por linha/participação e consistência entre totais de compra/participação/linhas. A tabela `Round` também permite estruturalmente um estado com apenas um resultado preenchido ou status `COMPLETED` sem ambos os resultados; os serviços detectam parte desses casos, mas o banco não os impede por si só. Antes de ativar checkout ou pagamentos reais, avaliar constraints compatíveis com estados históricos, acompanhadas de migração e testes. Nenhuma regra nova foi aprovada por esta observação; regras financeiras e operacionais pendentes continuam bloqueadas.
