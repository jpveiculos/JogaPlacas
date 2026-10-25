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
- Multiplicadores aprovados: unidade (último dígito) 6x; dezena (últimos dois) 20x; centena (últimos três) 200x; milhar (últimos quatro) 2.000x; três letras iniciais em ordem exata 2.000x; placa completa 200.000x.
- Multiplicador aplica-se ao valor alocado à respectiva categoria. Para Mercosul, unidade/dezena/centena/milhar comparam literalmente os últimos 1/2/3/4 caracteres da placa; a centena pode conter uma letra e dois números, e a milhar pode conter uma letra e três caracteres numéricos no sufixo.
- Cada linha deve guardar `ruleVersion` e um `ruleSnapshot` com os multiplicadores daquela aposta. A apuração usa o snapshot histórico, nunca os multiplicadores atuais por suposição. Snapshots ausentes/inválidos bloqueiam a apuração para reconciliação.

## 3. Rodadas e apostas
- Cada rodada terá dois sorteios independentes: um resultado de placa cinza (`resultLegacyPlate`) e um resultado Mercosul (`resultMercosurPlate`). Cada resultado é sorteado, persistido e apurado separadamente; não afirmar que são conversões um do outro. A interface deve exibir duas plaquinhas identificadas.
- A aposta em placa cinza só concorre ao resultado cinza; a aposta Mercosul só concorre ao resultado Mercosul. As regras de categoria e multiplicadores precisam ser aplicadas ao formato correspondente.
- Ambos os resultados devem ser imutáveis depois de publicados, com geração e publicação idempotentes por rodada e por formato.
- Rodadas a cada 30 minutos, com resultados alinhados aos minutos :00 e :30 no fuso America/Sao_Paulo. A rodada abre em :01 ou :31, fecha em :29 ou :59 e o sorteio ocorre em :00 ou :30, sempre um minuto após o fechamento. Cada rodada abre exatamente um minuto após o sorteio anterior; por exemplo, a rodada com resultado às 00:30 abre às 00:01 e fecha às 00:29. O servidor não aceita apostas antes do início nem no instante ou após o fechamento.
- Corte validado no servidor. Não aceitar nem incluir retroativamente aposta após o fechamento.
- Repetição de 1 a 10 rodadas em sequência contínua, com pagamento antecipado e registro individual de cada participação. A primeira é a próxima rodada aberta em que a compra ainda cabe; cada repetição seguinte deve ser o sorteio imediatamente posterior, exatamente 30 minutos depois. É proibido selecionar rodadas alternadas, pular sorteios ou escolher rodadas futuras aleatórias. Se faltar uma rodada da sequência, a compra repetida deve ser recusada até que a agenda seja corrigida; nunca remapear silenciosamente para outra rodada.
- Valor mínimo total de R$ 1,00 por placa em cada rodada.
- Valor mínimo total por placa em cada rodada: R$ 1,00. Para cada placa, o sistema divide automaticamente o total em centavos inteiros entre as seis categorias: calcula `base = floor(totalCents / 6)`, atribui `base` às seis categorias e direciona todo o resíduo (`totalCents % 6`) exclusivamente à unidade. A soma das seis alocações deve ser exatamente igual ao total da placa. Exemplo: R$ 1,00 (100 centavos) resulta em unidade 20 centavos e 16 centavos para cada uma das outras cinco categorias. A unidade paga 6x sua alocação; nesse exemplo, o prêmio é R$ 1,20. O cálculo deve usar apenas inteiros, ser determinístico e ter testes.
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
- Na área do jogador, usar um único fluxo de entrada com escolha explícita entre placa cinza e Mercosul; mostrar uma plaquinha visual em branco/atualizada enquanto a pessoa digita e validar o formato selecionado. A placa cinza segue `ABC-1234`; Mercosul segue `ABC1D23`, com A–Z na quinta posição.
- Nos resultados recentes, mostrar os dois resultados independentes da rodada como plaquinhas distintas, identificadas como placa cinza e placa Mercosul; nunca converter uma na outra. Exibir resultados recentes por até 24 horas.
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


## 15. Página pública exclusiva de resultados e ganhadores — 2026-10-25

- Decisão aprovada: criar uma página pública dedicada, em /resultados, sem menu de navegação e sem conteúdo promocional ou funcionalidades de aposta. A tela deve conter somente o histórico de resultados e uma área menor de ganhadores.
- A parte principal mostra os resultados em linhas, com código da rodada, dia e horário em America/Sao_Paulo, e duas plaquinhas separadas: resultado cinza e resultado Mercosul. Nunca converter um formato no outro.
- A página carrega inicialmente até 100 rodadas concluídas e publicadas, permite carregar páginas anteriores e conserva o histórico já carregado. Atualiza automaticamente os resultados mais recentes a cada 15 segundos; não anunciar resultado antes de estar persistido/publicado como concluído.
- A faixa inferior mostra até 12 ganhadores recentes dos últimos 30 dias apenas quando o prêmio foi efetivamente creditado (prizeCreditedAt), com valor, rodada, data e formato/placa da aposta. Nome de usuário é mascarado publicamente; não expor nome real, telefone, dados da conta ou dados financeiros pessoais. Se não houver ganhadores elegíveis, mostrar uma mensagem neutra.
- A rota pública de leitura não exige login, mas retorna somente campos explicitamente selecionados e usa Cache-Control: no-store. Erros internos não devem vazar detalhes do banco.
- A tela não deve conter menu nem permitir apostas/pagamentos; é exclusivamente consulta pública. Nenhuma cobrança real, merge ou deploy está autorizado por esta decisão.


## 16. Objetivo de acessibilidade e consulta pública simples — 2026-10-25

- Motivo de negócio: a página pública não é apenas um espelho dos resultados das áreas autenticadas. Ela atende também pessoas sem conta e jogadores que fizeram a aposta presencialmente com um cambista e precisam consultar o resultado depois que o cambista foi embora.
- Público prioritário de usabilidade: pessoas idosas ou com pouca familiaridade com aplicativos e plataformas digitais. O acesso deve ser direto, sem cadastro, login, senha, menu, navegação complexa ou conteúdo não essencial.
- Hierarquia visual: a maior parte da tela fica dedicada ao histórico de resultados, em linhas grandes e fáceis de localizar; cada linha exibe data, hora, código da rodada e plaquinhas dos dois formatos. A área menor de ganhadores fica abaixo, com prêmios confirmados e informações resumidas.
- A interface deve priorizar letras legíveis, contraste, alvos de toque confortáveis, linguagem simples, layout responsivo e redução de animações quando o sistema operacional pedir movimento reduzido.
- A página é apenas informativa. Deve exibir somente resultados concluídos/publicados e ganhadores com prêmios efetivamente creditados; não pode sugerir que alguém ganhou quando o prêmio ainda não foi confirmado. Identificadores públicos permanecem mascarados.
- A página não substitui recibo nem oferece confirmação individual de uma aposta. Nesta fase, ela mostra os resultados gerais e os ganhadores publicados, não uma consulta privada que determine se uma pessoa específica ganhou.


## 17. Consulta rápida de aposta por placa ou recibo — 2026-10-25

- A consulta rápida é prioritária e disponível na página pública sem exigir conta.
- Um único campo aceita placa apostada ou código completo do recibo (prefixo JP-). A consulta por recibo retorna apenas compras e participações confirmadas; consulta por placa retorna até 20 apostas confirmadas recentes.
- A resposta mostra placa apostada, rodada, data/hora, resultados publicados dos formatos cinza e Mercosul e estado explícito: prêmio confirmado, não premiada, sorteio ainda não concluído ou apuração pendente.
- Só confirmar valor de prêmio quando prizeCreditedAt estiver preenchido e prizeCents for maior que zero; não inferir prêmio só por comparação visual.
- A rota não revela nome, telefone, conta, método de pagamento, valor total gasto nem o recibo na resposta. Erros genéricos e respostas no-store.
- O componente é reutilizável na área do cambista e do jogador; a integração nessas telas autenticadas ainda depende de localizar os pontos de entrada corretos.
- A consulta por placa pode encontrar apostas de outras pessoas com a mesma placa; não expõe dados pessoais. O recibo é preferível para localizar uma compra específica.


## 18. Escopo definitivo da consulta pública — somente recibo — 2026-10-25

- A consulta pública aceita exclusivamente o código completo do recibo com prefixo JP-. A busca por placa foi removida porque a mesma placa pode aparecer em diversas apostas e rodadas, misturando resultados e gerando confusão.
- A consulta pública retorna todas as linhas/rodadas confirmadas do recibo informado e apresenta, por rodada, prêmio confirmado, não premiada ou estado ainda pendente conforme a apuração persistida.
- O campo de consulta não será duplicado na área do jogador: essa área deve mostrar o histórico de jogos do próprio jogador em lista organizada, destacando visualmente os prêmios confirmados em verde.
- O mesmo componente de consulta por recibo deve ser disponibilizado na área do cambista, que poderá consultar o recibo do cliente e apoiar a impressão/segunda via do comprovante. Não se deve expor informações privadas além das necessárias para conferir a aposta.


## 19. Consulta por recibo na área do cambista — 2026-10-25

- O componente público de consulta exclusivamente por código de recibo também fica disponível dentro da área autenticada do cambista para conferência presencial.
- Não adicionar pesquisa por placa nem consulta duplicada na área do jogador.
- O histórico individual do jogador deve ser uma lista de suas próprias apostas/rodadas, com prêmios efetivamente confirmados destacados em verde; não deve ser confundido com a lista pública de resultados gerais.
- Para status individual: compra/participação ainda não concluída ou rodada não concluída deve indicar que está em andamento; prêmio positivo com crédito registrado indica premiada; valor de prêmio igual a zero em rodada concluída indica não premiada; valores ainda não apurados permanecem pendentes.


## 20. Histórico individual do jogador — implementação

- A área do jogador mostra o histórico das próprias compras dos últimos 7 dias; não deve conter campo de consulta por recibo, pois essa consulta é pública e também está disponível ao cambista.
- O histórico é obtido por endpoint autenticado e filtrado no servidor pelo ID do jogador da sessão. Nunca aceitar um ID de jogador fornecido pelo cliente como fonte de autorização.
- Agrupar por recibo/compra, rodada e placa, mostrando valor total, situação da compra/rodada, placa escolhida e os dois resultados independentes quando a rodada estiver concluída.
- Estados legíveis por linha: compra ainda não confirmada, aguardando resultado, apuração pendente, não premiada e prêmio confirmado.
- Somente marcar a linha em verde e exibir o valor do prêmio quando prizeCreditedAt estiver preenchido e prizeCents for positivo. A existência de resultado ou de valor isolado não comprova crédito.
- O histórico não substitui o livro-razão financeiro nem deve permitir editar apostas antigas.
- A consulta pública por recibo continua retornando apenas dados necessários para conferir as placas/resultados e nunca revela identificador de conta, telefone, nome real ou o código completo do recibo na resposta.


## 21. Regra obrigatória de emissão do recibo — 2026-10-25

O recibo oficial só pode ser emitido depois que o pagamento da compra estiver confirmado. Criar uma compra pendente, gerar QR Code, iniciar checkout ou receber um evento intermediário não autoriza emitir nem apresentar um recibo como válido. Sem confirmação, a compra não pode ser finalizada como paga e o jogador não deve receber um código de recibo emitido.

### Pagamento Pix na plataforma
- A compra permanece pendente enquanto aguarda confirmação final autenticada do provedor por webhook.
- Somente após processar de forma segura e idempotente a confirmação final do pagamento, o sistema confirma a compra/participações e emite o recibo.
- Webhooks duplicados, atrasados ou fora de ordem não podem criar recibos duplicados nem confirmar compra sem evidência de pagamento confirmado.
- O fluxo de integração Pix ainda não está implementado/ativado; esta seção define o comportamento exigido quando for implementado.

### Venda feita por cambista
- O recibo só é emitido depois de o sistema confirmar o pagamento.
- Para dinheiro em espécie, o cambista deve acionar explicitamente o botão de confirmação de recebimento. O servidor registra o ator e o instante da confirmação; só então confirma a compra e emite o recibo.
- Para Pix ou outro meio integrado, a confirmação deve vir da fonte confiável definida para esse meio, não apenas de uma ação visual do cambista.
- A confirmação por botão deve ser autorizada, transacional e idempotente, impedindo que cliques repetidos emitam recibos ou registrem a venda duas vezes.

### Identificador e estado do recibo
- O formato visível previsto permanece `JP-` seguido de caracteres alfanuméricos maiúsculos; o comprimento final e a geração precisam ser alinhados ao fluxo implementado e testados.
- O código deve ser único e associado à compra confirmada. A consulta pública por recibo e a consulta na área do cambista não devem revelar compras pendentes como recibos emitidos.
- Não basta ocultar o código na interface: a API e o modelo de persistência devem impedir a emissão prematura. Revisar o `receiptCode` atualmente obrigatório na compra pendente e a rota que hoje devolve um código antes da confirmação.
- Atualizar testes para cobrir compra pendente sem recibo, confirmação Pix final, confirmação de dinheiro pelo cambista, repetição de webhook/clique e consulta de código inexistente ou não emitido.
- Nenhuma cobrança real, ativação de webhook, migração de produção, merge ou deploy é autorizada por esta decisão.


### Estado da implementação da regra de recibo — 2026-10-25

A primeira correção foi aplicada na branch de desenvolvimento: `Purchase.receiptCode` agora é anulável, há migração para limpar o código de compras ainda pendentes, o endpoint do jogador não cria mais código antes da confirmação e a interface/histórico não apresentam compra pendente como recibo emitido.

A regra ainda não está completa ponta a ponta: falta criar a operação transacional de confirmação que atribui um código único ao confirmar compra e participações, falta o fluxo autorizado de confirmação de dinheiro pelo cambista e a integração Pix/webhook continua planejada para a última fase. Até essas etapas existirem e passarem nos testes/CI, não considerar emissão de recibo após confirmação concluída.


### QR Code no recibo — 2026-10-25

**Decisão de produto:** todo recibo oficial deve exibir um QR Code pequeno imediatamente ao lado do código textual `JP-...`. O QR Code codifica o próprio código completo do recibo, para que um leitor de câmera/QR consiga capturá-lo sem digitação manual. O código textual continua visível como alternativa acessível.

- O QR Code só pode ser apresentado quando existir um recibo oficial emitido após a confirmação do pagamento; compras pendentes não exibem código nem QR.
- O QR Code não deve conter placa, nome, telefone, dados financeiros ou outros dados pessoais: somente o código do recibo.
- A consulta continua restrita ao código do recibo; a leitura do QR não pode contornar autorização nem revelar dados privados.
- A implementação visual deve usar geração de QR confiável no próprio sistema, sem enviar códigos de recibo a serviços públicos de geração de QR de terceiros.
- Pendência técnica: integrar o QR ao componente/artefato de recibo oficial quando o fluxo transacional de confirmação e emissão estiver implementado. O código atual ainda não possui o fluxo completo de emissão após confirmação; não marcar o QR como implementado até haver interface de recibo e testes.


### Recibo térmico de 58 mm — 2026-10-25

- [x] Definido o padrão inicial de impressão para bobina nominal de 58 mm, com largura útil conservadora de 48 mm, tipografia compacta, separadores monocromáticos e layout vertical.
- [x] Estruturado componente reutilizável `ThermalReceipt` com identificação Joga Placas, data/hora de emissão, código textual do recibo e espaço de QR ao lado, identificação opcional do cliente, lista de placas/formato/rodada/valor, total pago e orientação de consulta.
- [x] O componente só renderiza com estado de pagamento `CONFIRMED` e código válido `JP-...`; compras pendentes não podem ser impressas como recibo oficial.
- [ ] Integrar o componente ao fluxo oficial de confirmação/emissão do recibo e gerar o QR localmente a partir apenas do código do recibo.
- [ ] Validar impressão real na impressora comprada: densidade/tamanho do QR, margens, corte de papel, escala “100%/tamanho real” e largura útil variam conforme modelo/driver. A marca/modelo exato ainda não está registrado, então 48 mm é o padrão inicial, não uma certificação do dispositivo.
- [ ] Adicionar testes do estado confirmado/pendente e validar a CI completa.


### Arquitetura de impressão independente de marca/protocolo — 2026-10-25

**Decisão de arquitetura:** o JogaPlacas não deve acoplar o modelo de recibo, as regras de negócio ou a interface inteira a ESC/POS, a uma marca ou a um tipo de conexão. O recibo deve ser definido como um documento canônico independente de dispositivo; adaptadores convertem esse documento para os recursos e comandos suportados por cada impressora.

- Perfil inicial prioritário: impressoras térmicas de recibo com compatibilidade ESC/POS, pois é uma linguagem amplamente adotada, mas não universal nem idêntica em todos os modelos.
- A arquitetura deve permitir adaptadores adicionais, quando necessário, para StarPRNT/StarLine, drivers/fila de impressão do sistema operacional, impressão do navegador/PDF e integrações nativas de fabricante.
- Separar o conteúdo e o layout do recibo do transporte físico: USB, Bluetooth Classic, Bluetooth LE (BLE), rede e fila do sistema são capacidades diferentes; protocolo de impressão não garante compatibilidade com todas as conexões.
- O caminho mais universal no navegador é oferecer recibo HTML/PDF para impressão pelo sistema operacional, sem exigir comandos ESC/POS. Impressão direta via browser é opcional: Web Bluetooth/WebUSB têm suporte limitado por navegador e dispositivo; não prometer impressão direta universal, especialmente no Safari/iOS.
- QR Code deve ser gerado localmente no sistema e inserido no documento canônico; para impressão ESC/POS, o adaptador pode enviar imagem rasterizada do QR como alternativa mais compatível à geração nativa de QR na impressora. O QR contém apenas o código do recibo.
- Definir perfis de capacidade por impressora (largura útil, DPI, colunas, codificação de caracteres/acentos, QR, corte e conexão), permitir seleção/configuração manual e manter um modo genérico com pré-visualização/teste.
- Não anunciar compatibilidade universal absoluta: registrar compatibilidade testada por modelo, sistema operacional, navegador/app e tipo de conexão. Nenhum modelo deve ser marcado como validado antes de teste real.
- Para novas compras, priorizar modelos de recibo com ESC/POS documentado, USB ou rede além de Bluetooth quando apropriado, driver/app compatível com os dispositivos usados e suporte explícito a QR/imagem raster. Confirmar o modelo exato antes de comprar.
- Nenhuma marca, modelo, protocolo ou conexão será requisito para as regras de compra, confirmação de pagamento, emissão do recibo ou consulta do código.

A implementação desta arquitetura ainda está pendente; o componente térmico atual é um primeiro layout de 58 mm, não uma integração universal de impressão.


### Fluxo prioritário de impressão do cambista — 2026-10-25

**Experiência desejada pelo produto:** ao concluir a compra e tocar para pagar/finalizar, o recibo oficial confirmado deve aparecer na tela do cambista. O cambista toca em **Imprimir**, e a impressão deve ser enviada diretamente à impressora já conectada/configurada, sem abrir o diálogo de impressão como caminho normal.

- A configuração da impressora, conexão e preferências pertence ao perfil/dispositivo de cada cambista e não altera configurações globais nem outros cambistas.
- A impressão direta é o caminho prioritário. O diálogo HTML/PDF/compartilhamento é fallback para falha, indisponibilidade ou impressora incompatível.
- A interface deve mostrar estados claros: pronta, enviando, impressa quando houver confirmação confiável do mecanismo, ou falha com alternativa de reimpressão/fallback. Não afirmar que imprimiu se só foi enviado o comando sem confirmação confiável.
- O fluxo de pagamento e a emissão do recibo não dependem do sucesso da impressão. Uma falha de impressora não desfaz uma compra paga nem emite um segundo recibo; permite reimprimir o mesmo recibo/código oficial.
- O sistema web sozinho não garante impressão Bluetooth direta universal, especialmente em iPhone/Safari. Para cumprir o caminho prioritário em cada plataforma, selecionar integração compatível (por exemplo, aplicativo auxiliar/ponte nativa ou aplicativo do sistema) e adaptadores de protocolo. Não prometer que qualquer Bluetooth funcione sem esse suporte.
- Não adicionar uma configuração global de protocolo. Manter as configurações por cambista/dispositivo, com perfil automático quando possível e configuração manual mínima apenas quando necessária.
- Fallbacks, reimpressão e mudanças de impressora nunca podem gerar outro código de recibo nem alterar os dados financeiros.


### Plataformas de cambista e impressão móvel — 2026-10-25

**Decisão de produto:** a área do cambista será utilizada em celulares Android e iOS, com prioridade de uso e otimização para Android. Não é requisito oferecer fluxo de cambista em computador.

**Experiência prioritária:** após a compra e a confirmação de pagamento, exibir o recibo oficial e permitir que o cambista toque em **Imprimir** para enviar o recibo diretamente à impressora conectada. Se a impressão direta falhar ou não estiver disponível, oferecer reimpressão do mesmo recibo e alternativas (abrir/compartilhar PDF ou imprimir pelo sistema).

**Arquitetura recomendada:** manter regras de negócio, dados de compra, emissão do recibo e layout canônico independentes da plataforma. Para impressão direta móvel, usar uma camada nativa/bridge compatível com Android e iOS; não depender exclusivamente das APIs do navegador. Priorizar Android e suportar Bluetooth Classic e BLE quando viável; para iOS, implementar o transporte que a impressora e as APIs permitirem, dando preferência a BLE compatível ou integração de fabricante quando necessária.

- Bluetooth não é protocolo de impressão: o transporte pode ser Classic/SPP ou BLE, e a impressora ainda precisa entender comandos compatíveis, por exemplo ESC/POS.
- O suporte a Bluetooth Classic SPP genérico no iOS é restrito; não prometer que uma impressora Classic-only funcionará em iPhone. Antes de recomendar ou certificar um modelo, validar conexão, protocolo, QR e impressão real em Android e iOS.
- Configuração de impressora e preferências ficam no escopo de cada cambista/dispositivo. Não existe configuração global de impressora que altere todos os cambistas.
- O sucesso/falha da impressão é independente do estado financeiro: reimprimir utiliza o mesmo recibo e código, sem duplicar compra ou efeitos financeiros.
- O navegador/PDF/compartilhamento é fallback, não o caminho normal desejado para o cambista.
- A base web atual não deve ser presumida capaz de imprimir diretamente por Bluetooth em todos os celulares. Avaliar e implementar uma camada móvel nativa/bridge apropriada antes de prometer impressão direta universal.


### Compatibilidade evolutiva e estratégia de atualização do JogaPlacas — 2026-10-25

**Objetivo:** manter o site utilizável em celulares Android/iOS antigos e novos, tanto quanto tecnicamente possível, e criar um caminho sustentável para corrigir incompatibilidades e atualizar dependências ao longo do tempo.

- O sistema deve usar melhoria progressiva e detecção de recursos em tempo de execução, em vez de depender apenas da versão declarada do sistema operacional. Se uma API de impressão não existir, deve oferecer uma alternativa funcional.
- Definir uma matriz de suporte com versões mínimas testadas de Android/iOS e navegadores, revisada periodicamente. Não prometer suporte infinito a todo aparelho antigo: o sistema operacional, o navegador e as políticas de segurança do fabricante impõem limites.
- Separar o núcleo web (regras de negócio, APIs, telas e recibo canônico) das integrações específicas de plataforma (Bluetooth, impressão e APIs nativas). Assim, uma mudança em iOS/Android pode exigir atualizar um adaptador, sem reescrever o sistema inteiro.
- Manter um canal formal de atualização: dependências e runtime atualizados em ciclos planejados; verificações automáticas de segurança e compatibilidade; CI para lint, tipos, testes, build e migrações de banco em ambiente de teste; ambientes de staging antes de produção; releases versionados, changelog, rollback e monitoramento pós-release.
- Usar dependências com versões controladas e atualizações de segurança prioritárias. Mudanças maiores devem ser testadas antes de atualizar frameworks, runtime, bibliotecas Bluetooth/impressão ou schema.
- Para eventual app/bridge nativa de impressão, planejar distribuição e atualizações pelas lojas/plataformas apropriadas, respeitando suporte do fabricante. Um site não consegue atualizar silenciosamente o sistema operacional nem substituir código nativo instalado quando as lojas exigirem nova versão.
- Não fazer atualizações automáticas sem teste que possam quebrar pagamentos, recibos ou dados. Atualizações do site devem ser implantadas com CI e staging, migrações compatíveis e plano de rollback; mudanças críticas exigem revisão e autorização.
- Registrar a versão da aplicação, a versão do adaptador de impressão e capacidades detectadas para ajudar suporte a diagnosticar incompatibilidades, sem coletar dados pessoais desnecessários.

**Limite técnico:** não existe implementação capaz de garantir que todos os celulares e todas as impressoras Bluetooth, atuais e futuras, funcionem sem adaptação. A arquitetura deve reduzir o custo de adaptação e oferecer fallback; compatibilidade concreta precisa ser testada.


### Atualização controlada e restauração da versão estável — 2026-10-25

**Decisão aprovada:** a área administrativa terá uma seção simples de “Atualizações e saúde do sistema”, com verificação sem alterações e uma ação explícita para atualizar o site quando houver uma versão web aprovada e publicada para atualização.

- **Verificar atualizações:** consulta disponibilidade, versão, resumo do impacto e estado dos testes; não modifica o sistema, não inicia publicação e não interrompe compras ou confirmações de pagamento em andamento.
- **Atualizar site:** só fica disponível para uma versão web aprovada, testada e pronta no processo controlado de publicação do JogaPlacas. Exige ação e confirmação administrativa; não instala código arbitrário nem baixa executáveis de origem desconhecida.
- **Restaurar versão anterior:** oferecer uma ação administrativa para retornar à última versão estável conhecida, com confirmação explícita, indicação da versão de destino, registro de auditoria e verificação posterior de saúde.
- **Proteção de operações:** atualizar ou restaurar não pode perder compras, pagamentos, recibos nem lançamentos financeiros. A publicação deve aguardar um momento seguro para novas mudanças de versão e não interromper operações em andamento.
- **Rollback real:** deve ser feito pelo mecanismo controlado de releases/implantação, mantendo artefatos da versão anterior e verificações de saúde. Não basta trocar um número ou recarregar a página.
- **Banco de dados:** uma reversão do código não reverte automaticamente migrações nem dados. Mudanças de schema precisam ser compatíveis com a versão anterior ou ter um plano de recuperação testado; migrações destrutivas não podem ser revertidas automaticamente sem estratégia validada.
- **Segurança e auditoria:** acesso exclusivo a administradores autorizados; registrar autor, versão de origem/destino, horário, resultado e motivo. Se os testes de saúde falharem após publicação, bloquear novas atualizações e recomendar restauração controlada.
- **Escopo:** este controle governa a versão web. Aplicativos auxiliares nativos, bibliotecas de impressão e firmware têm canais próprios e não são atualizados pelo botão do site.

**Estado:** requisito aprovado e documentado. A interface, detecção de versões, integração com publicação/rollback e testes operacionais ainda precisam ser implementados e validados. Não afirmar que restauração está disponível antes de existir mecanismo conectado e testado.


## 14. Auditoria de continuidade — 2026-10-25

**Escopo verificado:** branch `feature/dual-plate-draw`, arquivos versionados e estado visível do GitHub Actions; não houve execução local nesta sessão nem acesso a produção.

### Evidências atuais
- `package.json` e `package-lock.json` declaram `next@16.4.3` e `eslint-config-next@16.4.3`; a divergência de patch registrada anteriormente não aparece mais nos manifestos consultados. Ainda é necessário CI verde no HEAD atual.
- A execução `Verify` do commit `65c89d599cfdaabf880ae7ce763499798ad75bf9` falhou nos três jobs (`verify`, `migration-test`, `postgres-concurrency-test`). A tentativa de reexecução também falhou em poucos segundos; os logs/etapas não foram disponibilizados pelo conector nesta inspeção. Não presumir que seja falha de código nem declarar CI aprovada: obter detalhes no GitHub Actions e corrigir a causa antes de avançar para release.
- `src/app/admin/page.tsx` continua sendo um painel informativo/placeholder. Não há painel funcional de configuração, atualização, restauração ou saúde comprovado.
- `POST /api/player/purchases` cria compra pendente e informa explicitamente que não cria nem confirma cobrança Pix. A rota não constitui checkout Pix operacional.
- `ThermalReceipt` só renderiza com status confirmado e código válido, mas a geração do QR é fornecida externamente e, sem QR, mostra um placeholder. Não foi localizada nesta checagem uma integração ponta a ponta que confirme pagamento, emita o código, gere QR e ofereça impressão real.
- `GET /api/player/history` limita o histórico às compras do próprio jogador, usa `no-store` e mascara o código de recibo enquanto a compra não está confirmada. É uma peça parcial, não prova que o fluxo completo de compra esteja concluído.
- O pipeline configurado contém lint, typecheck, testes, build, migração em PostgreSQL descartável e testes de concorrência. As execuções recentes #445, #446 e #447 terminaram com sucesso para a página pública de consulta e suas atualizações de documentação; isso valida esses commits na CI, mas não comprova prontidão operacional nem testes ponta a ponta.

### Bloqueios para implantação
1. Não há evidência de validação ponta a ponta em ambiente de homologação.
2. Fluxo de confirmação de pagamento e emissão transacional do recibo ainda não concluído; nenhum pagamento real deve ser habilitado.
3. Áreas de jogador/cambista/administrador ainda incompletas, com telas placeholder.
4. QR Code real e integração física de impressão ainda não concluídos/testados.
5. Painel de atualização/rollback apenas documentado; não há mecanismo operacional conectado.
6. Precisam ser validados fluxos de ponta a ponta, autorização/ownership, reconciliação financeira, migrações com dados históricos e recuperação/backup antes de qualquer implantação.
7. Provedor de hospedagem/implantação e ambiente de staging não foram confirmados nesta auditoria.

**Decisão operacional:** continuar na branch de desenvolvimento, investigar e corrigir a CI antes de novos módulos de produto. Não fazer merge, deploy, migração de produção, configuração de domínio ou ativação de pagamento real sem autorização explícita.


## 15. Auditoria financeira da apuração — 2026-10-25
- A função de apuração deve validar as seis alocações em centavos de cada linha antes de calcular qualquer prêmio, inclusive categorias que não venceram. Uma alocação negativa, fracionária ou fora do intervalo seguro bloqueia a apuração; não se deve validar apenas a categoria premiada.
- Implementada validação preventiva das seis alocações em `src/modules/rounds/settle-round-prizes.ts` e teste unitário para alocação negativa em categoria perdedora. Commits: `d1c5c695751b8746942d996d4d3337920a5b2352` e `7f62eac41dcbf29f4bbe862c627ded6430b32142`.
- Estado de validação: os commits foram enviados à branch `feature/dual-plate-draw`; a aprovação da CI ainda precisa ser confirmada. Não considerar a correção validada até a execução dos testes e da pipeline completa.
- Próxima auditoria necessária: verificar que a soma das seis alocações por placa corresponde exatamente ao valor cobrado para aquela placa, e que a soma das linhas corresponde ao total da participação/compra, sem assumir isso apenas pela apuração do prêmio.


### Nota de implementação — agendamento automático
- O endpoint interno `POST /api/internal/round-scheduler` cria uma janela móvel de rodadas e processa abertura, fechamento e sorteio, com auditoria e proteção por segredo.
- O endpoint é código implementado e coberto por CI, mas só executará automaticamente quando uma tarefa externa for configurada no ambiente de hospedagem com chamada a cada minuto e a variável `ROUND_SCHEDULER_SECRET`.
- A ativação em produção permanece pendente; não há confirmação registrada de hospedagem, domínio e banco de produção corretos. Não afirmar que há rodadas automáticas ativas antes dessa configuração e validação operacional.


## Representação visual de horários
- Exibir horários no formato de 24 horas `HH:mm`, usando dois pontos entre horas e minutos.
- Exemplos: `00:00`, `12:30`, `23:59`.
- Não acrescentar `h`, `hs` nem outra abreviação após o horário. Os dois pontos são suficientes.
- Essa é uma regra de apresentação; não altera o fuso horário oficial (`America/Sao_Paulo`), os instantes armazenados nem as regras de agendamento.


## Recibo único para compras com repetição
- Uma compra gera um único recibo oficial, mesmo quando contém de 1 a 10 rodadas consecutivas. Não emitir um recibo separado para cada repetição.
- O código oficial do recibo pertence à compra (Purchase.receiptCode). Cada participação continua registrada individualmente e vinculada à sua rodada; o código da rodada (Round.code) identifica cada sorteio.
- O recibo térmico deve listar as participações em ordem sequencial, indicando o número da repetição, o código da rodada, a placa e seu formato, o valor correspondente e o total pago da compra.
- A impressão preferida é uma única impressão contínua em papel térmico de 58 mm, com todas as repetições da compra no mesmo comprovante.
- Um único QR Code deve consultar a compra inteira e apresentar todas as participações confirmadas. Não gerar um QR Code separado por repetição.
- O recibo oficial só pode ser emitido/exibido após confirmação real do pagamento. Uma compra pendente não é comprovante de pagamento. A geração e resolução do QR Code ainda dependem de integração.
- Reimprimir deve reutilizar o mesmo código de recibo e os mesmos dados da compra; não criar compra, participação, código ou movimento financeiro novo. Falha na impressora não desfaz o pagamento.
- A especificação não significa que o fluxo completo de pagamento, confirmação, emissão, consulta por QR e impressão esteja integrado ou validado; esses pontos precisam de testes ponta a ponta antes da operação.


## Recibo oficial na área do jogador

Quando uma compra estiver confirmada pelo sistema e o pagamento estiver confirmado, o histórico do jogador pode carregar os dados do recibo oficial pelo endpoint autenticado da própria compra e apresentar a versão térmica para impressão. O servidor valida novamente a titularidade e a confirmação; ocultar a ação na interface não substitui autorização. A consulta e a reimpressão reutilizam o mesmo código e não geram nova compra nem novo lançamento financeiro. O QR Code real e a integração com provedor de pagamento permanecem pendentes; compras pendentes não geram recibo oficial.


## Consulta pública do recibo

A página pública `/consulta` permite digitar o código do recibo e consultar as placas, as rodadas, os resultados publicados e os prêmios que já foram efetivamente creditados. A consulta não exige login, mas somente retorna apostas de compras confirmadas e não expõe dados pessoais da conta. O endpoint do servidor é a fonte de verdade para estados e créditos. O QR Code do comprovante ainda não está conectado à página; essa integração permanece pendente.
