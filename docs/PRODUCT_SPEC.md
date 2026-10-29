> **Índice do manual:** comece sempre pelo [MANUAL-MESTRE.md na raiz do repositório](../MANUAL-MESTRE.md), que aponta para a especificação vigente e para o manual técnico. Não use um documento isolado sem verificar a branch e a precedência definidas nesse índice.

# Joga Placas — Especificação funcional vigente

> Fonte de verdade funcional do projeto. Decisões novas devem ser registradas aqui antes de alterar comportamentos já aprovados. Quando uma melhoria aprovada substituir uma ideia inicial, atualizar a regra principal e marcar o texto anterior como histórico/superado, em vez de manter instruções contraditórias.
> Este documento também contém retratos e auditorias datados: eles descrevem o estado na data indicada e não devem ser lidos como fotografia atual se houver uma reconciliação posterior. Para estado de código, testes e pendências, consulte a seção final de reconciliação e `docs/TECHNICAL_ROADMAP.md`.
> Esta especificação não substitui revisão técnica, testes nem validação jurídica/comercial antes de operar pagamentos e jogos em produção.

## Identidade visual — logomarca oficial obrigatória (2026-10-28)

- Usar a mesma imagem oficial já existente no cabeçalho das áreas autenticadas: `/images/brand/joga-placa-logo.jpg`.
- A regra vale para todas as superfícies relevantes do produto: página inicial pública, cabeçalho e rodapé quando houver, login, cadastro, verificação pública de recibo e cabeçalhos das áreas de jogador, cambista e administrador, além de outras telas que exibam a marca.
- Não recriar a logomarca usando texto, fontes ou combinações de spans em algumas páginas enquanto outras usam a imagem. O nome textual no título, metadados e conteúdo acessível pode permanecer, mas a marca visual deve vir do mesmo arquivo.
- Reutilizar o componente compartilhado `src/components/brand-logo.tsx`; não duplicar o caminho da imagem em componentes/páginas. Se houver necessidade de variação, ajustar somente o tamanho e o espaço de apresentação, sem trocar a arte.
- O logo deve ser responsivo, manter a proporção, usar `object-fit: contain` e nunca ser cortado, esticado ou substituído por uma versão improvisada. Acessibilidade: texto alternativo “Joga Placa” e link para a página inicial quando a marca funcionar como navegação.
- Favicons, ícones de aplicativo e imagens de compartilhamento também devem apontar para a mesma arte oficial, salvo decisão documentada posterior.
- **Critério de aceite:** verificar visualmente em celular e desktop a homepage, login, cadastro, áreas autenticadas, rodapé e verificação de recibo; confirmar que todas exibem a mesma imagem, sem deformação nem corte.
- **Estado da implementação em 2026-10-28:** o componente compartilhado foi introduzido e aplicado à homepage (cabeçalho/rodapé), login, cadastro, cabeçalho das áreas autenticadas e verificação de recibo nesta branch. A compilação, o deploy e a validação visual em ambiente publicado ainda precisam ser confirmados.

## Decisão vigente — venda de cambista sem cadastro de cliente (atualizada em 2026-10-28)

- A venda presencial do cambista não deve exigir nome, telefone, WhatsApp, busca ou seleção de um cadastro de cliente. O recibo emitido após a confirmação válida da venda é a referência entregue ao jogador.
- O fluxo de venda do cambista deve ser direto: selecionar/informar o formato e digitar a placa, definir os dados necessários da aposta/rodada e valor, confirmar a venda conforme o meio de pagamento permitido, e gerar o recibo com código único e QR Code para consulta pública. O QR Code do recibo não deve ser confundido com QR Code Pix; eventual cobrança Pix é um fluxo de pagamento separado.
- A consulta de recibos antigos no painel do cambista por nome, telefone ou placa não faz parte da experiência. A decisão posterior de 2026-10-28 também proíbe qualquer recuperação, reimpressão ou segunda via: a consulta é exclusivamente pelo QR Code do recibo físico original.
- Não coletar nem persistir novos dados pessoais de clientes presenciais para concluir uma venda. Dados históricos já existentes não devem ser apagados em massa por uma mudança de interface: eventual limpeza/migração precisa de avaliação, retenção, auditoria e plano reversível próprios.
- A área do cambista deve priorizar a janela de venda rápida e as ações necessárias para concluir a venda e entregar o recibo. Não exibir pesquisa por nome/WhatsApp/telefone/placa.
- O backend deve permitir uma venda do cambista sem `customerId`, sem criar um registro artificial em `Customer`. A identidade do cambista autenticado, a integridade da compra, o pagamento, as participações, o código do recibo e os registros financeiros/auditoria continuam obrigatórios.
- **Status da decisão:** a área do cambista deve servir somente para registrar uma nova aposta. A implementação atual precisa ser validada contra este fluxo e contra a decisão posterior que removeu histórico/consulta e segunda via da interface.

## Atualização de implementação — página pública e cadastro (2026-10-26)

- Registro histórico de 2026-10-26: naquela etapa a home era descrita com consulta e resultados públicos. A decisão de 2026-10-28 substituiu esse comportamento; a home atual não deve ter painel geral de resultados nem busca por código.
- Nesta branch, estão sendo adicionados os acessos visíveis a `/cadastro` e o fluxo inicial de criação de conta de jogador, com senha armazenada por hash e sessão segura.
- **Ainda não considerar pronto para produção:** executar typecheck, lint, testes e build; testar cadastro/login no Railway; adicionar/validar limitação persistente de tentativas e controles antiabuso para cadastro público; confirmar a branch e o domínio configurados no serviço.
- Cadastro público cria exclusivamente papel `PLAYER`. Administradores e cambistas continuam fora do cadastro público.

## Decisão vigente — recibo único para compra com rodadas repetidas/agendadas (2026-10-27)

- Uma compra que inclua várias rodadas terá **um recibo principal e um QR Code de consulta principal**. O QR Code contém apenas o endereço público de verificação do recibo; ele não codifica a lista completa de placas/rodadas nem resultados.
- A página pública consultará os dados oficiais no servidor e listará todas as participações confirmadas vinculadas à compra. Cada participação permanece individualmente ligada à sua rodada, e cada placa deve ser exibida sob a rodada correta.
- O jogador poderá abrir a consulta de cada rodada a partir da página principal do recibo. Não é necessário imprimir um QR Code separado por rodada para permitir consulta individual. Códigos individuais podem ser considerados como recurso adicional, mas não substituem o recibo da compra.
- Por rodada, a consulta deve distinguir: sorteio aguardando; horário alcançado mas resultado oficial ainda não publicado; resultado publicado e participação premiada; resultado publicado e participação não premiada. Nunca declarar derrota apenas porque o horário passou, nem afirmar pagamento de prêmio sem confirmação financeira.
- A consulta pública deve usar exclusivamente os registros oficiais. Um QR copiado de um recibo antigo só revela a compra original e nunca deve validar placas/rodadas fornecidas por papel, URL manipulada ou navegador.
- A leitura pública do QR é a única entrada de resgate para prêmios de recibos físicos vendidos por cambista: se houver prêmio pendente, o cliente contata a plataforma pelo WhatsApp oficial. A leitura não autoriza pagamento por si só; a plataforma valida a participação, resultado e estado financeiro. O cambista não pode pagar, dar baixa ou marcar prêmio como pago. Prêmios de jogadores online são creditados diretamente na carteira online após apuração oficial.
- O comportamento de agendamento e repetição continua subordinado às regras existentes do manual mestre; esta decisão define apenas a forma de agrupar e consultar as participações, sem alterar preço, calendário, regras do jogo ou de premiação.

### Auditoria de compatibilidade — 2026-10-27

- **Confirmado no código:** `Purchase` possui relação com várias `PurchaseParticipation`; cada participação referencia uma `Round`; a combinação compra/rodada é única. A estrutura de dados é compatível com uma compra que reúna várias rodadas e uma página de recibo que as liste separadamente.
- **Confirmado no fluxo atual de compra do jogador:** `POST /api/player/purchases` recebe `roundIds` (1 a 10), exige rodadas distintas e replica as placas enviadas para cada rodada; o serviço valida até dez repetições e exige uma participação por rodada distinta. Isso representa seleção de rodadas existentes, não prova por si só que exista um agendador autônomo que crie reservas futuras.
- **Confirmado na consulta pública atual:** a API busca participações confirmadas e suas placas, mas retorna apenas o código da rodada e os dados das placas. Ainda não retorna horários/estados/resultados oficiais por rodada e não implementa a apuração visual definida acima.
- **Pendente de conferência:** não foi localizado na biblioteca de arquivos acessível nesta auditoria um documento separado identificado como “manual mestre”. A especificação funcional do repositório é a fonte vigente encontrada; a compatibilidade final com qualquer manual externo de agendamento ainda precisa ser confirmada quando esse documento estiver disponível.
- **Pendente de implementação/teste:** completar a API e a interface pública para estados/resultados; verificar a geração do QR no fluxo real de impressão; implementar ou confirmar atualização periódica dos estados; executar testes de integração. Não declarar o recurso pronto até essas verificações passarem.

## 1. Áreas e acesso
- A plataforma tem quatro áreas de produto: página principal pública, área do jogador, área do cambista e área do administrador.
- A página principal pública é a porta de entrada do domínio: apresentação do jogo, explicação de como jogar, regras e equivalências oficiais de prêmios e opções visíveis de Entrar/Criar conta. **Não deve exibir painel geral de resultados/ganhadores nem busca de recibo por código digitado.** A consulta pública de uma compra ocorre exclusivamente pela página específica aberta ao escanear o QR Code do recibo físico.
- Login compartilhado por usuário/senha; o servidor identifica o papel e direciona para a área autorizada. Jogador autenticado que acessar `/` é encaminhado à área do jogador; após cadastro público concluído, o novo jogador também vai para a área do jogador.
- Senhas armazenadas somente com hash forte; sessões seguras; autorização validada no servidor.
- Cadastro público é somente para jogador. Não permitir cadastro público de administradores; contas e credenciais administrativas devem ser provisionadas por configuração segura. A implementação do cadastro público ainda é pendente e precisa de validação e proteção contra abuso.
- Jogador vê apenas os próprios registros; cambista vê somente suas próprias vendas sem cadastro de comprador; ADMIN pode pesquisar contas de jogadores para manutenção e acessar os registros globais estritamente conforme permissões e auditoria.

## 2. Placas e categorias
- Formatos aceitos: padrão antigo `ABC-1234` e Mercosul `ABC1D23`, com A-Z na quinta posição Mercosul.
- Não converter letras Mercosul em dígitos durante validação, normalização ou apuração. A quinta posição Mercosul aceita A-Z, preservada literalmente.
- Cada aposta deve armazenar explicitamente seu formato (`LEGACY` ou `MERCOSUR`) e ser comparada somente com o resultado do mesmo formato. Não reutilizar equivalências entre formatos na apuração. Preservar formato e exibição para auditoria.
- Rejeitar formatos inválidos no servidor.
- Multiplicadores aprovados (regra vigente `approved-v4`, atualizada em 2026-10-28): unidade (último dígito) 6x; dezena (últimos dois) 30x; centena (últimos três) 300x; milhar (últimos quatro) 3.000x; três letras iniciais em ordem exata 3.000x; placa completa 300.000x. A versão histórica `approved-v3` mantém unidade 9x e deve ser usada somente para interpretar apostas gravadas com essa versão. Aplicam-se igualmente às apostas de placa cinza e Mercosul, cada uma apurada exclusivamente contra o resultado do próprio formato.
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
- Valor mínimo total por placa em cada rodada: R$ 1,00. Para cada placa, o sistema divide automaticamente o total em centavos inteiros entre as seis categorias: calcula `base = floor(totalCents / 6)`, atribui `base` às seis categorias e direciona todo o resíduo (`totalCents % 6`) exclusivamente à unidade. A soma das seis alocações deve ser exatamente igual ao total da placa. Exemplo: R$ 1,00 (100 centavos) resulta em unidade 20 centavos e 16 centavos para cada uma das outras cinco categorias. A unidade paga 6x sua alocação conforme a regra vigente `approved-v4`; nesse exemplo, o prêmio é R$ 1,20. A alocação de 20 centavos da unidade é multiplicada pelo multiplicador da versão gravada na aposta. O cálculo deve usar apenas inteiros, ser determinístico e ter testes.
- Rodadas devem ter data/hora e fuso explícitos (`America/Sao_Paulo`). Recorrências geram rodadas individuais. Rodadas concluídas/fechadas não podem ser editadas silenciosamente; correções e cancelamentos devem ser auditados.

## 4. Pagamentos, Pix e carteira do jogador
- Uma transação é paga integralmente pela carteira ou integralmente por Pix; não combinar saldo e Pix na mesma transação.
- Pix deve ser confirmado pelo provedor/webhook validado, nunca apenas pela interface do cliente. A confirmação precisa ocorrer até o fechamento para que a aposta participe daquela rodada.
- Fechar/ocultar a tela do QR não cancela a cobrança; o estado continua sendo acompanhado.
- Pagamentos confirmados após o cutoff ou quando a rodada já não está elegível não geram participação nem recibo retroativos; o caso permanece pendente e auditado para reconciliação manual. A política operacional final de estorno/devolução desses pagamentos tardios continua pendente de decisão e teste antes de produção.
- Prêmios elegíveis de compras online são creditados diretamente na carteira do jogador autenticado, com idempotência contra crédito duplicado. Prêmios de compras presenciais de cambista sem carteira vinculada são reivindicados pelo QR do recibo e atendimento oficial da plataforma; nunca são pagos pelo cambista.
- Livro-razão financeiro rastreável para créditos, prêmios, débitos de apostas, depósitos, estornos e saques.
- Saques somente do saldo disponível integral, com chave Pix e reserva do valor para evitar gasto duplo. Enquanto pendente, a área administrativa oferece somente duas ações: Pagar ou Rejeitar. Ao pagar, sai da lista de pendentes e aparece no histórico como pago. Ao rejeitar, o valor reservado retorna ao saldo disponível.
- Notificações para confirmação/pendência de pagamento, fechamento e resultado da rodada, crédito de prêmio e mudanças no saque.

## 5. Jogador
- **Cadastro mínimo de jogador:** somente nome de usuário e senha. Não exigir nome completo, CPF, telefone, WhatsApp, e-mail ou outros dados pessoais para criar a conta, entrar ou jogar. Guardar a senha apenas em hash forte; nome de usuário normalizado e único. Não solicitar dados pessoais dentro do fluxo da aposta.
- Dentro da área autenticada, o jogador monta o jogo informando a placa, valor, repetição/rodadas e método de pagamento permitido; não preencher cadastro de cliente nem pedir dados pessoais a cada compra. A venda só é confirmada quando o pagamento estiver validamente confirmado pelo método aplicável.
- **Gerador aleatório de placas:** oferecer, na área do jogador, uma opção para gerar uma placa válida aleatória quando a pessoa estiver indecisa. A placa gerada é apenas uma sugestão visual; não é palpite preditivo nem oferece vantagem ou garantia de prêmio.
- A pessoa pode gerar outra placa quantas vezes desejar antes de escolher. Cada nova geração substitui somente a sugestão exibida; não cria aposta, não reserva placa e não movimenta saldo.
- Exibir uma ação explícita **“Adicionar ao jogo”** para incluir a placa escolhida no modal de aposta. Até essa confirmação, a placa permanece apenas como sugestão e pode ser descartada sem efeitos.
- O gerador deve respeitar os formatos de placa aceitos pela especificação e produzir uma representação válida e normalizável pelo servidor. A geração pode ocorrer no cliente, mas toda validação necessária à aposta continua sendo feita no servidor.
- **Recibo digital:** depois da confirmação válida, exibir o recibo original com código único e QR Code que abre a consulta pública específica daquela compra. O QR Code identifica o bilhete e não deve ser confundido com o QR Code Pix usado para pagar. A consulta pública é somente de leitura e não oferece emissão, reimpressão, recuperação ou segunda via. A possibilidade de baixar/imprimir durante a emissão original não autoriza reemitir o recibo depois de encerrado o fluxo.
- Resultados recentes exibidos por até 24 horas; histórico próprio de apostas dos últimos 7 dias na interface. Registros financeiros completos permanecem disponíveis para auditoria administrativa.
- A recuperação de acesso deve funcionar sem exigir e-mail ou WhatsApp como dado cadastral obrigatório; definir e testar um fluxo seguro de recuperação antes de produção, sem revelar se um usuário existe.

## 6. Cambista
- Recursos de aposta e consulta equivalentes aos necessários para vender a clientes, sem carteira própria nem saques.
- Disponibilizar também o gerador aleatório de placas na área do cambista, para ajudar quando o cliente não tiver um palpite. O cambista pode gerar novas sugestões até o cliente escolher uma e, então, usar **“Adicionar ao jogo”** para incluí-la na venda em andamento.
- Gerar ou trocar sugestões não pode criar nem duplicar uma venda, confirmar pagamento, alterar valores ou registrar participação. A venda só segue o fluxo normal após a escolha explícita e a confirmação da operação.
- **Venda rápida anônima:** o cambista informa somente a placa (ou escolhe uma sugestão do gerador), os detalhes indispensáveis da aposta/rodada e o valor, confirma a operação conforme o meio de pagamento habilitado e entrega o recibo digital/impresso com código único e QR Code de consulta. Não pedir nem gravar nome, nome de usuário, CPF, telefone ou WhatsApp do comprador; não exigir `customerId` nem criar um registro artificial de `Customer`. A venda deve permanecer ligada ao cambista autenticado, pagamento, participações, recibo e auditoria.
- Dinheiro em espécie: cambista confirma somente o recebimento da venda e assume responsabilidade pelo registro. Pix: confirmar via provedor. Essa confirmação é da compra, não de prêmio.
- **Escopo da interface do cambista:** somente registrar uma nova aposta/venda, concluir o recebimento da própria venda e entregar o recibo original. É proibido pagar prêmio ou dar baixa em prêmio. Não exibir histórico, resumo/contadores de vendas, busca ou consulta de apostas/resultados, nem qualquer opção de segunda via ou recuperação. A decisão de limitar a interface ao registro de apostas prevalece sobre requisitos anteriores de histórico e contadores nesta área. Os registros financeiros necessários continuam existindo no backend para auditoria e administração, sem expor esses painéis ao cambista.
- Remover da área do cambista ferramentas de busca/seleção de clientes, histórico/resumo de vendas, pesquisa de vendas e consulta de resultados. **Não existe segunda via:** não recuperar, reimprimir ou reemitir recibos por código, placa, cliente, pedido ao cambista ou qualquer outro caminho. O recibo físico original e seu QR Code são a referência de consulta.

## 7. Administração
- Painel financeiro por período, distinguindo vendas diretas, vendas de cambistas, pagamentos confirmados, pendências, cancelamentos, estornos, comissões, prêmios, saques, tarifas e resultado líquido. Não confundir vendas com valores líquidos recebidos.
- **Gestão individual de cambistas:** na área administrativa, disponibilizar formulário para criar e editar cada cambista com nome completo, nome de usuário único, senha inicial (armazenada somente como hash), WhatsApp e percentual de comissão. O administrador pode definir uma taxa diferente para cada pessoa (por exemplo, cambista itinerante versus ponto fixo), editar essa taxa posteriormente, e ativar/bloquear a conta. Não usar uma taxa global como substituta da taxa individual. Validar a porcentagem no servidor dentro de uma faixa permitida explicitamente definida, rejeitar valores inválidos e auditar criação/edição/bloqueio, incluindo taxa anterior/nova sem registrar senha ou hash em metadados.
- **Histórico financeiro da comissão:** ao confirmar cada venda atribuída a cambista, calcular a comissão em centavos inteiros com a taxa individual vigente naquele momento e gravar um snapshot imutável da taxa e do valor calculado ligado à venda. Alterar a taxa do cambista afeta somente vendas futuras; não recalcular vendas históricas. Evitar duplicidade por idempotência. Definir e testar a política para estornos/cancelamentos de vendas confirmadas antes de considerar o saldo acumulado definitivo.
- **Painel do cambista:** mostrar dois contadores distintos: total bruto das vendas confirmadas e comissão acumulada em dinheiro (R$), somada dos registros de comissão, e não a porcentagem cadastrada. Exemplo: R$ 100,00 em vendas elegíveis a 20% = R$ 20,00 de comissão. Cambista não pode editar sua taxa nem solicitar saque/retirada de comissão pela interface definida.
- Configurar multiplicadores pela interface administrativa, sem deploy. Auditar alterações com valor anterior/novo, data e autor; preservar os termos históricos das operações existentes.
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
- O modal Pix é uma sobreposição na mesma área/tela atual. Não redirecionar para o checkout hospedado do provedor, não abrir nova página e não apresentar link que leve para fora da área do jogador/cambista.
- O botão **“Sair e iniciar outro jogo”** fecha apenas o modal e libera a interface para a próxima venda. A cobrança original permanece pendente no servidor, com o mesmo identificador e chave de idempotência, até confirmação, expiração, cancelamento pelo provedor ou reconciliação explícita. Fechar o modal nunca confirma nem cancela o pagamento.
- Depois de sair do modal Pix, limpar apenas o formulário local da próxima venda; não apagar nem alterar o registro financeiro da cobrança anterior. A interface deve continuar conciliando o pagamento anterior sem bloquear a próxima venda.
- Após confirmação autêntica do pagamento, exibir o recibo oficial original em um modal sobre a mesma área. O modal deve ter **Imprimir** e **Fechar**; fechar o recibo não apaga nem recria a compra. A impressão faz parte da emissão original. Depois de encerrado o fluxo, não oferecer reimpressão nem segunda via.
- Nenhuma ação de pagamento, saída do QR, recibo ou impressão deve navegar o cambista ou jogador para outra página ou área. O link de pagamento externo do Mercado Pago não faz parte do fluxo.
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


## 12. Retrato histórico de implementação — 2026-10-24 (superado)

> As afirmações desta seção sobre placeholders, inexistência de checkout/webhook e estado das branches refletem a inspeção de 2026-10-24 e foram superadas por implementações posteriores. Para estado vigente, usar a seção 22 ao final deste documento e o manual técnico consolidado. As seções 13 e 14 também são registros datados, não uma fotografia atual.


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


## 13. Registro histórico de verificação técnica — 2026-10-25

- O GitHub Actions `Verify` do commit `1d37b8fc59e0c10717272b96dec1d9bd206a6819` concluiu com sucesso. Isso não equivale a uma instalação limpa executada nesta sessão nem a uma validação de produção.
- Foi confirmado que a migração `20261024020000_dual_plate_draw` classifica dados históricos pelo valor exibido em `plateDisplay` e aborta se qualquer linha não puder ser classificada. Esse comportamento é uma proteção intencional e não deve ser removido para fazer uma migração passar.
- A CI atual testa a cadeia de migrações em um PostgreSQL vazio. Falta ensaio explícito do backfill com registros históricos válidos dos dois formatos e um caso inválido/ambíguo para provar a preservação e o bloqueio seguro.
- `package.json` e `package-lock.json` mantêm `next@16.4.3` e `eslint-config-next@16.4.2`. A diferença de patch permanece pendente de revisão; nenhuma versão foi alterada nesta etapa.
- Evidência e limites: revisão dos arquivos versionados na branch `feature/dual-plate-draw`; nenhuma instalação/teste local ou acesso a banco foi executado nesta sessão. Nenhuma alteração de código, migração, implantação ou produção foi realizada.


## 14. Registro histórico de alteração de código e teste de migração — 2026-10-25

Foi adicionado `scripts/test-dual-plate-migration.mjs`, o comando `npm run test:migration-backfill` e uma etapa correspondente no job `migration-test` de `.github/workflows/verify.yml`. O teste cria bancos descartáveis temporários, parte do SQL da migração inicial, marca essa migração como baseline e insere linhas históricas LEGACY/MERCOSUR; verifica o backfill e a preservação do resultado Mercosul. Em um segundo banco, inclui uma placa não classificável e exige que `prisma migrate deploy` falhe com o erro de segurança esperado.

Esta alteração foi commitada na branch `feature/dual-plate-draw`; o resultado do CI para o commit que inclui a nova etapa ainda precisa ser conferido. Nenhuma migração de produção ou alteração de banco real foi executada. O teste depende de uma instância PostgreSQL descartável com permissão para criar e remover bancos, como a instância do serviço PostgreSQL no GitHub Actions.


### Correção do teste histórico — 2026-10-25
A primeira execução do novo teste falhou antes de alcançar a migração dual-plate: a fixture de `Purchase` tentava inserir `updatedAt`, coluna que não existe na migração inicial. Corrigido em `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8` removendo essa coluna do INSERT de teste. A CI desse commit precisa confirmar a correção; não há aprovação ainda.


### Resultado da CI após corrigir a fixture — 2026-10-25
A execução completa do workflow no commit `576ec2afb43a5a6fcb9deeb38027a0fdf53efef8` terminou com sucesso: teste de migração histórica, validação/build/lint/typecheck/testes e concorrência PostgreSQL passaram. Execução: https://github.com/jpveiculos/JogaPlacas/actions/runs/40147585024. A diferença entre `next@16.4.3` e `eslint-config-next@16.4.2` segue em revisão; não foi alterada neste commit.


### Revisão técnica do banco — pontos a fechar antes de fluxos financeiros
A revisão de `prisma/schema.prisma` e das quatro migrações encontrou invariantes importantes que hoje dependem principalmente dos serviços TypeScript, sem `CHECK` constraints equivalentes no PostgreSQL: valores monetários e alocações não negativos, mínimo por linha/participação e consistência entre totais de compra/participação/linhas. A tabela `Round` também permite estruturalmente um estado com apenas um resultado preenchido ou status `COMPLETED` sem ambos os resultados; os serviços detectam parte desses casos, mas o banco não os impede por si só. Antes de ativar checkout ou pagamentos reais, avaliar constraints compatíveis com estados históricos, acompanhadas de migração e testes. Nenhuma regra nova foi aprovada por esta observação; regras financeiras e operacionais pendentes continuam bloqueadas.


## 15. Decisão histórica: página pública exclusiva de resultados — 2026-10-25 (superada)

> **Esta decisão foi substituída em 2026-10-26 pela seção 23.** A exigência antiga de uma página isolada, sem conteúdo promocional e exclusivamente dedicada à consulta não é mais a navegação principal. Resultados e ganhadores continuam públicos, mas agora devem ser incorporados à página principal de apresentação; `/resultados` pode ser mantida como endereço compatível. As regras de privacidade, publicação segura, horários e elegibilidade de ganhadores descritas abaixo continuam válidas quando não conflitarem com a seção 23.

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
- A área do cambista não disponibiliza componente de consulta por recibo, pesquisa, histórico ou segunda via. O cambista registra a nova aposta e entrega o recibo original; a consulta posterior é feita pelo jogador ou por terceiro que escaneie o QR impresso.


## 19. Consulta por recibo na área do cambista — 2026-10-25

- O componente público de consulta exclusivamente por código de recibo também fica disponível dentro da área autenticada do cambista para conferência presencial.
- Não adicionar pesquisa por placa nem consulta duplicada na área do jogador.
- **Busca administrativa de contas:** disponibilizar ao ADMIN uma janela de pesquisa para localizar contas de jogadores e realizar manutenção operacional. Pesquisar por nome de usuário e identificadores internos necessários; mostrar apenas os dados mínimos da conta (papel, estado, datas e registros necessários à manutenção). Não criar campos de nome completo, CPF, telefone ou WhatsApp, pois não são dados de cadastro. A busca deve exigir sessão ADMIN válida, autorização no servidor, paginação/limites e auditoria das ações de manutenção. Não confundir busca de contas administrativas com o antigo buscador de clientes do cambista.
- O histórico individual do jogador deve ser uma lista de suas próprias apostas/rodadas, com prêmios efetivamente confirmados destacados em verde; não deve ser confundido com a lista pública de resultados gerais.
- Para status individual: compra/participação ainda não concluída ou rodada não concluída deve indicar que está em andamento; prêmio positivo com crédito registrado indica premiada; valor de prêmio igual a zero em rodada concluída indica não premiada; valores ainda não apurados permanecem pendentes.


## 20. Histórico individual do jogador — implementação

- A área do jogador mantém o histórico das próprias compras e suas consultas pessoais conforme as regras de retenção vigentes. Não precisa de campo de busca pública por código: o QR do recibo original abre a consulta específica.
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
- A interface deve mostrar estados claros: pronta, enviando, impressão solicitada quando houver retorno confiável do mecanismo, ou falha. Durante o fluxo original, pode permitir nova tentativa da ação ainda aberta; não disponibilizar reimpressão/recuperação após o encerramento do fluxo.
- O fluxo de pagamento e a emissão do recibo não dependem do sucesso da impressão. Uma falha de impressora não desfaz uma compra paga nem emite um segundo recibo; permite reimprimir o mesmo recibo/código oficial.
- O sistema web sozinho não garante impressão Bluetooth direta universal, especialmente em iPhone/Safari. Para cumprir o caminho prioritário em cada plataforma, selecionar integração compatível (por exemplo, aplicativo auxiliar/ponte nativa ou aplicativo do sistema) e adaptadores de protocolo. Não prometer que qualquer Bluetooth funcione sem esse suporte.
- Não adicionar uma configuração global de protocolo. Manter as configurações por cambista/dispositivo, com perfil automático quando possível e configuração manual mínima apenas quando necessária.
- Fallbacks e mudanças de impressora durante a emissão original nunca podem gerar outro código de recibo nem alterar os dados financeiros. Após o encerramento, não disponibilizar reimpressão ou segunda via.


### Plataformas de cambista e impressão móvel — 2026-10-25

**Decisão de produto:** a área do cambista será utilizada em celulares Android e iOS, com prioridade de uso e otimização para Android. Não é requisito oferecer fluxo de cambista em computador.

**Experiência prioritária:** após a compra e a confirmação de pagamento, exibir o recibo oficial original e permitir imprimir durante o fluxo de emissão. Se a impressão direta falhar ou não estiver disponível, oferecer alternativa dentro desse mesmo fluxo (por exemplo, abrir/baixar PDF ou imprimir pelo sistema). Ao encerrar o fluxo, não oferecer reimpressão nem segunda via.

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

Quando uma compra estiver confirmada pelo sistema e o pagamento estiver confirmado, o histórico autenticado do jogador pode exibir os dados e o estado da compra conforme as permissões. O servidor valida novamente a titularidade e a confirmação. Pela decisão de 2026-10-28, o histórico do jogador não oferece reimpressão, recuperação ou segunda via do recibo: a consulta detalhada pública abre pelo QR Code do recibo físico original. Compras pendentes não geram recibo oficial.


## Consulta pública do recibo

A página pública `/consulta` permite digitar o código do recibo e consultar as placas, as rodadas, os resultados publicados e os prêmios que já foram efetivamente creditados. A consulta não exige login, mas somente retorna apostas de compras confirmadas e não expõe dados pessoais da conta. O endpoint do servidor é a fonte de verdade para estados e créditos. O QR Code do comprovante ainda não está conectado à página; essa integração permanece pendente.


## Prazo de validade de sete dias — 2026-10-25

**Registro histórico superado em 2026-10-28:** a regra anterior permitia consulta e reimpressão por sete dias. A decisão atual proíbe segunda via/reimpressão em qualquer prazo. Não inferir que essa decisão alterou prazos de resgate de prêmio, obrigações financeiras ou retenção legal; esses assuntos seguem suas regras próprias e exigem decisão explícita quando aplicável.

A página pública de termos está em `/termos-de-uso`. A validade é aplicada pelo servidor ao endpoint de recibos, à consulta pública e à pesquisa do cambista; o histórico do jogador já usa a janela móvel de sete dias. O fluxo operacional de pagamento de prêmios manuais e a eliminação física de dados ainda exigem implementação/validação separada. Revisão jurídica necessária antes de tratar o prazo como política contratual final.

### Distinção obrigatória: resgate manual versus falha técnica de crédito — 2026-10-26

- O prazo de sete dias após o resultado aplica-se exclusivamente ao prêmio manual de uma venda de cambista que esteve corretamente disponível para resgate durante todo o prazo. Se o ganhador não procurar o cambista, não conferir o cupom ou não resgatar o prêmio dentro desse prazo, o prêmio manual pode ser marcado como expirado conforme as regras finais aprovadas.
- O prazo de sete dias não se aplica a falhas técnicas da plataforma em creditar um prêmio de jogador online na carteira. Se a apuração determinou que o prêmio é devido, mas o crédito automático falhou, a obrigação permanece válida independentemente do tempo decorrido, inclusive meses ou anos.
- Falhas de crédito online devem permanecer identificáveis, auditáveis e disponíveis para reconciliação administrativa. Depois de validar a apuração, o valor devido deve ser creditado de forma idempotente, sem duplicar créditos que já tenham ocorrido. Não marcar esses prêmios como expirados apenas pela passagem de sete dias.
- Na consulta pública específica pelo QR e no histórico do jogador, não aplicar o estado PRAZO_EXPIRADO a prêmios online não creditados. Esse estado é reservado ao fluxo de resgate manual elegível. A proibição de segunda via do recibo não extingue obrigações financeiras da plataforma nem altera automaticamente prazos de resgate de prêmio.
- O fluxo real de reconciliação e crédito idempotente de falhas técnicas, bem como a aplicação operacional do prazo de resgate manual, deve ser testado antes de declarar esses fluxos concluídos. Não fazer deploy nem alterar produção sem autorização explícita.

## Saques da carteira digital — 2026-10-26

- O jogador solicita saque informando valor e chave Pix. A chave é armazenada criptografada no servidor; a chave de criptografia `WALLET_PIX_ENCRYPTION_KEY` deve ser provisionada como segredo de ambiente, mantida estável e nunca versionada. Sem a chave, o sistema deve bloquear novas solicitações e não expor dados criptografados como se fossem uma chave utilizável.
- A solicitação reserva o valor de forma transacional e idempotente no livro-razão; o valor deixa imediatamente o saldo disponível para impedir gasto duplo. A reserva e a solicitação são criadas na mesma transação serializável.
- O fluxo operacional tem somente dois estados principais: PENDING (pendente) e PAID (pago), além de REJECTED para uma solicitação recusada. O administrador confere a solicitação, o valor e a chave Pix enquanto está pendente. Há somente duas ações: “Pagar” e “Rejeitar”. Ao realizar a transferência manualmente no banco, usa “Pagar”; a solicitação sai da lista de pendentes e entra no histórico como paga, com auditoria. “Rejeitar” encerra a solicitação e libera o valor reservado de volta ao saldo disponível por lançamento compensatório idempotente. Não existe etapa separada de aprovação e o sistema não envia Pix automaticamente.
- A reserva permanece no livro-razão enquanto o saque estiver PENDING; marcar como PAID não desconta o valor duas vezes. A recusa só é permitida enquanto estiver PENDING e cria lançamento compensatório idempotente para liberar a reserva. Saques pagos ou recusados não podem ser processados novamente.
- Se a solicitação for recusada, o sistema cria lançamento compensatório idempotente para liberar a reserva, muda o estado para REJECTED e audita o responsável e o motivo. Não se pode marcar como pago ou recusar uma solicitação já encerrada; transições concorrentes são bloqueadas.
- A carteira e o histórico de saques são privados ao próprio jogador. A área administrativa é restrita a ADMIN no servidor. Chaves Pix completas só são mostradas a administradores autorizados com a chave de criptografia válida; nunca aparecem no histórico do jogador, logs ou metadados de auditoria.
- O fluxo foi integrado na branch de desenvolvimento, mas ainda requer validação de schema/Prisma, testes de concorrência, autorização, falha de criptografia, reserva/liberação, clique duplicado, trilha de auditoria e testes ponta a ponta antes de ser considerado pronto. Não fazer deploy nem aplicar alterações em produção sem autorização explícita.


### Tratamento de saques em estados legados — 2026-10-26

O fluxo atual não cria novas transições para APPROVED ou PROCESSING: novas solicitações seguem PENDING → PAID ou PENDING → REJECTED. Entretanto, os estados APPROVED/PROCESSING continuam no enum persistido para compatibilidade histórica. Registros encontrados nesses estados devem continuar visíveis para reconciliação administrativa e ser identificados como legados; não devem desaparecer das listas nem ser convertidos automaticamente, pagos ou rejeitados sem conferência do histórico financeiro. A remoção desses estados do schema só poderá ocorrer após inventário dos dados, decisão de tratamento dos registros existentes e migração segura validada. Esta compatibilidade é uma exceção de leitura para dados antigos, não uma etapa do novo fluxo operacional.


## 22. Reconciliação funcional com a implementação — 2026-10-26

Esta seção atualiza a fotografia antiga da seção 12, que foi escrita antes da implementação de várias páginas, rotas e fluxos. Ela não transforma código existente em funcionalidade aprovada para produção; separa o comportamento já refletido no código dos módulos ainda parciais.

### Comportamentos atuais refletidos no código
- Existem páginas e APIs para autenticação, jogador, cambista, administrador, compras, histórico/recibo, resultados, rodadas e saques. A autorização continua sendo validada no servidor; a existência das páginas não significa que todos os processos de negócio estejam completos.
- A compra é estruturada como `Purchase` com participações e linhas individuais; a repetição de 1 a 10 rodadas é contínua, sem pular sorteios, e o pagamento é único por compra.
- Cada rodada mantém resultados independentes para placa cinza (`resultLegacyPlate`) e Mercosul (`resultMercosurPlate`). A classificação histórica falha de modo seguro quando não consegue determinar o formato; não inventar o segundo resultado de rodadas antigas.
- O checkout Mercado Pago/Pix, adaptador Orders API, webhook assinado, consulta de status e serviço transacional de confirmação já têm implementação nesta branch. Ainda não há evidência de validação ponta a ponta com credenciais de teste no contrato/notificações reais do provedor; código presente não autoriza cobranças reais.
- A confirmação após cutoff ou para rodada indisponível não cria participação retroativa nem recibo; fica para reconciliação manual. A regra de reembolso/devolução desse caso ainda precisa ser decidida e testada.
- O recibo oficial depende de compra e pagamento confirmados no servidor. A consulta pública por recibo não deve expor dados pessoais. A integração física de impressão, a geração/validação ponta a ponta do QR e compatibilidade com impressoras reais ainda não estão comprovadas.
- A carteira deriva do livro-razão. Solicitar saque reserva o saldo em transação; a administração tem apenas **Pagar** ou **Rejeitar**. **Pagar** registra que o Pix já foi feito manualmente fora da plataforma; **Rejeitar** libera a reserva por lançamento compensatório idempotente. Não há payout Pix automático.
- `APPROVED` e `PROCESSING` são estados legados de saque: manter visíveis para reconciliação, sem conversão automática nem remoção até inventário e migração segura.
- Falha técnica de crédito de prêmio online não expira após sete dias; deve continuar auditável e ser reconciliada com crédito idempotente. O prazo de sete dias para resgate manual de prêmio de venda do cambista é uma regra separada.

### Estado incompleto / gates de validação
- Venda e recebimento em espécie pelo cambista e fluxo operacional de prêmios das vendas do cambista ainda não estão completos.
- Gestão administrativa completa de usuários, regras, comissões e relatórios financeiros ainda está parcial.
- Scheduler automático exige agendador externo, segredo e banco correto configurados; uma rota existente não comprova operação recorrente ativa.
- Permanecem pendentes a reconciliação de eventos de pagamento fora de ordem, política de pagamentos aprovados após cutoff, estornos/reembolsos, testes do webhook com credenciais de teste e observabilidade operacional.
- O estado de CI do HEAD atual não foi confirmado nesta reconciliação; o commit `84938086a2d50fd91de71b572372ab122416dcc9` não retornou checks/status na consulta ao GitHub. Não afirmar que a versão atual está aprovada só porque commits anteriores passaram.
- Antes de considerar o fluxo de saques validado, executar testes PostgreSQL de saldo derivado, reserva/liberação, concorrência, reprocessamento idempotente e falhas de transação.

### Regra de atualização
Quando o comportamento implementado e validado melhorar uma instrução antiga, atualizar a regra normativa nesta especificação e o manual técnico na mesma mudança. Se a mudança alterar regra de negócio, não inferi-la apenas a partir do código: registrar a decisão aprovada. Preservar notas antigas como histórico, mas nunca deixá-las competir com a regra vigente.


## 23. Página principal pública e entrada no produto — 2026-10-26

### Decisão de produto vigente

A decisão inicial de não criar uma página principal foi substituída. O domínio público deve abrir uma página de apresentação do Joga Placas, não a tela de login. Esta página é a primeira experiência para pessoas que clicam em links compartilhados em grupos ou em outros lugares da internet e também permite que jogadores que apostaram presencialmente com cambistas acompanhem os resultados.

### Conteúdo obrigatório da página principal

- **Apresentação clara do jogo:** o que é o Joga Placas, como funciona a participação e como conferir resultados, em linguagem direta para quem nunca usou a plataforma.
- **Banner/elemento visual explicativo:** representar os formatos de placa cinza e Mercosul, como se registra a placa e as equivalências/categorias e valores de prêmio aprovados. Os valores exibidos devem vir das regras oficiais vigentes, sem inventar multiplicadores, garantias ou prêmios não configurados.
- **Como jogar e regras essenciais:** explicar o preenchimento da placa, as categorias, as rodadas e a forma de conferir o resultado; diferenciar claramente os dois formatos de placa.
- **Acesso à conta:** botões/áreas visíveis de “Entrar” e “Criar conta”. O cadastro público cria conta de jogador, nunca de administrador. Ao concluir cadastro, o novo jogador vai para a área do jogador; login existente também direciona o jogador à sua área. Contas de cambista e administrador são encaminhadas conforme seu papel e suas permissões.
- **Registro histórico superado em 2026-10-28:** resultados públicos gerais na homepage foram removidos por decisão de produto. Resultados oficiais permanecem disponíveis na consulta específica do recibo via QR e nas áreas autenticadas conforme permissões; não recriar painel geral público.
- **Ganhadores e prêmios:** apresentar os prêmios efetivamente creditados e os ganhadores públicos elegíveis, com identificação mascarada e sem expor telefone, nome real, dados de conta ou dados financeiros pessoais. Não anunciar como prêmio pago o que ainda não foi creditado.
- **Consulta de recibo em destaque:** a home deve ter uma área de pesquisa própria, fácil de localizar e visualmente destacada — não escondida no rodapé nem misturada a links secundários — com um título direto como “Confira seu jogo” ou “Consultar recibo”, instrução curta, campo para digitar/colar o código completo `JP-...` e botão claro “Consultar”. Deve funcionar sem login e ser especialmente simples para quem recebeu o recibo impresso ao jogar com um cambista: pegar o código no recibo, digitá-lo e conferir se ganhou. No celular, o campo e o botão devem estar visíveis, legíveis e fáceis de tocar; informar como encontrar o código no recibo e apresentar um estado de carregamento, resultado encontrado ou mensagem clara de código inválido/não encontrado, sem revelar dados pessoais. Consultar somente pelo código do recibo, nunca por placa. A API pública existente continua sendo a fonte de verdade e só pode retornar os campos autorizados.
- **Experiência mobile e acessibilidade:** conteúdo objetivo, fonte legível, alvos de toque adequados, carregamento simples e navegação clara para pessoas idosas ou pouco familiarizadas com plataformas digitais.

### Regras de navegação

- Visitante sem sessão em `/`: exibir a página principal pública.
- Jogador que concluir cadastro: iniciar sessão de forma segura conforme a política de autenticação e encaminhar à área do jogador; se a política de ativação exigir etapa adicional, explicar o estado sem fingir que a conta já está ativa.
- Jogador com login bem-sucedido: encaminhar à área do jogador. Se acessar `/` já autenticado, redirecionar para a área do jogador; não mostrar um atalho promocional que o devolva à página principal.
- Cambista e administrador: encaminhar à área correspondente conforme papel, mantendo controles de autorização no servidor.
- Manter `/resultados` como endereço público compatível para links já compartilhados, podendo apontar para a seção de resultados da página principal; resultados e ganhadores devem, de qualquer modo, estar incorporados e acessíveis na home sem login.
- O campo de consulta de recibo na página principal continua público e restrito aos campos permitidos pela API. Não deve oferecer acesso à conta nem a histórico privado.

### Segurança e limites

A página principal é uma camada de apresentação/consulta pública, não prova de que o serviço está autorizado ou pronto para operar comercialmente. Não incluir credenciais, dados pessoais, informações internas, resultados não publicados nem prêmios pendentes. O cadastro público exige validação, limitação de tentativas, proteção contra abuso, tratamento de duplicidade e testes de autorização. Não liberar cobranças reais nem deploy com base apenas na criação da página.

### Estado de implementação

Registro histórico da primeira implementação (branch `feature/dual-plate-draw`, superado pela decisão de 2026-10-28): a home então integrava consulta por código e painel de resultados/ganhadores. Não usar esse comportamento como requisito atual. Esta alteração ainda precisa passar por lint, typecheck, testes e build; a página não foi validada em execução real. O cadastro público de jogador, a apresentação de valores oficiais de prêmio a partir da configuração vigente e a revisão de acessibilidade visual continuam pendentes; não apresentar esses itens como implementados.


## Decisão vigente — cadastro mínimo, recibo digital e busca administrativa (2026-10-26)

### Identidade do jogador
O único cadastro de jogador exigido pela plataforma é nome de usuário e senha. Não coletar nome completo, CPF, telefone, WhatsApp ou e-mail como campos obrigatórios. O jogador autenticado cria a aposta digitando a placa e selecionando apenas os parâmetros necessários do jogo e do pagamento; não deve ser solicitado a repetir dados pessoais.

### Recibo digital do jogador
Após confirmação válida da compra/pagamento, emitir um recibo digital com código único e QR Code para consultar aquele recibo publicamente. Disponibilizar baixar e imprimir. O recibo e o QR de consulta não substituem o QR/código de pagamento Pix. Compra pendente não deve ser apresentada como paga nem gerar recibo oficial de participação confirmada.

### Cambista
O cambista registra a venda sem cadastro do comprador: placa, parâmetros essenciais da aposta, valor e fluxo de pagamento permitido. Entrega o recibo original com QR de consulta; não coleta dados pessoais do comprador. Não há histórico/consulta na área do cambista nem segunda via por código ou qualquer outro meio.

### Administração
A área ADMIN deve ter um buscador próprio de contas de jogadores para manutenção, com pesquisa por nome de usuário e apresentação dos dados mínimos necessários. Exigir autenticação/autorização no servidor, limitar resultados, auditar ações e não introduzir dados pessoais que a plataforma decidiu não coletar.

### Estado de implementação
Estas regras substituem instruções anteriores conflitantes nesta especificação, incluindo coleta de WhatsApp no fluxo do jogador e registro de cliente/WhatsApp no fluxo do cambista. **Decisão documentada; não significa que cadastro público, recibo com QR/baixar/imprimir, venda anônima, remoção do buscador antigo ou busca administrativa já estejam implementados e validados.** As pendências técnicas estão descritas no roadmap.


## Regra de pagamento do cambista — Pix ou dinheiro em espécie (2026-10-26)

A venda do cambista tem duas formas de recebimento, selecionadas depois de informar a placa e os parâmetros essenciais da aposta:

1. **Pix:** ao avançar para pagamento, o sistema cria a cobrança Pix e mostra o QR Code Pix e o código Pix copia-e-cola na própria tela. O cliente pode escanear o QR ou copiar o código e pagar pelo aplicativo bancário. A interface acompanha o estado da cobrança. Somente a confirmação autêntica e validada do Mercado Pago (webhook/evento confiável, processado de forma idempotente) conclui a venda. Quando essa confirmação chegar, o sistema deve atualizar a tela/notificar o cambista e gerar/exibir automaticamente o recibo oficial, com código único e QR Code de consulta do recibo, pronto para imprimir/baixar. Não aceitar um clique do navegador, retorno de redirecionamento ou captura de tela como prova de pagamento.
2. **Dinheiro em espécie:** o cambista seleciona dinheiro e recebe o valor do cliente. O botão explícito “Confirmar recebimento em dinheiro” registra que o cambista declarou ter recebido, com ator autenticado e instante no servidor. A confirmação deve ser transacional, auditada e idempotente; em seguida, conclui a venda e gera/exibe automaticamente o mesmo tipo de recibo oficial com código único e QR Code de consulta, pronto para imprimir/baixar. O botão não pode confirmar uma compra diferente da que está em tela nem ser reutilizado para duplicar recibos ou participações.

**Separação obrigatória de códigos:** o QR/código Pix é usado para pagar a cobrança; o QR Code do recibo abre a consulta pública do bilhete pelo código JP-... . São códigos e finalidades diferentes. A venda só pode emitir o recibo oficial depois da confirmação correspondente ao método escolhido. Compra Pix pendente, expirada ou recusada não gera recibo oficial. Um webhook repetido ou toque repetido no botão de dinheiro não deve criar nova compra, nova participação, novo código de recibo ou novo lançamento financeiro.

**Estado técnico:** esta é a regra de produto aprovada; a sequência ponta a ponta (cobrança Pix, confirmação Mercado Pago, atualização/notificação da tela, confirmação de dinheiro e emissão automática de recibo/QR/impressão) ainda precisa ser implementada e validada por testes. Não marcar como funcional nem ativar pagamentos reais antes de comprovar a integração em ambiente de teste.


## Comportamento das telas Pix e recibo — saída e limpeza para próxima venda (2026-10-26)

Esta regra vale para a área do cambista e deve manter o mesmo padrão de usabilidade na área do jogador:

- **Tela de pagamento Pix:** deve existir um botão visível **“Sair”** / **“Fechar tela Pix”**, disponível mesmo se o QR Code não carregar, a cobrança demorar ou a tela aparentar travar. Sair fecha a tela/modal e libera a interface para continuar trabalhando; isso, por si só, **não cancela nem confirma** a cobrança pendente. O sistema deve preservar o estado da compra para reconciliação e impedir que o usuário interprete o fechamento como pagamento cancelado.
- **Tela do recibo oficial:** deve existir um botão visível **“Sair”** / **“Fechar recibo”**, além dos botões **“Imprimir”** e **“Baixar recibo”**. O botão de saída deve funcionar mesmo quando impressão ou download falharem e retornar à tela limpa de nova venda.
- **Limpeza após ação concluída:** quando o navegador/sistema aceitar a solicitação de impressão e o fluxo de impressão retornar como concluído, fechar o recibo e limpar os dados temporários da venda da tela para o próximo jogo. Quando o download do arquivo for efetivamente iniciado/aceito pelo navegador, fazer a mesma limpeza. Ao clicar em **“Sair”**, também fechar o recibo e limpar a interface. Não limpar antes de a ação de impressão/download ser aceita; se falhar ou for cancelada, manter o recibo visível e permitir tentar novamente ou sair.
- **Limite técnico da impressão:** uma aplicação web não consegue garantir que a impressora física realmente colocou papel na bandeja. O comportamento verificável é tratar o retorno/fechamento do diálogo de impressão como fim do fluxo do navegador; falha física de papel, conexão ou dispositivo pode exigir nova tentativa. Em qualquer cenário, o botão de sair continua disponível.
- **Integridade:** imprimir, baixar, fechar ou reimprimir nunca cria outra compra, participação, cobrança ou código de recibo. Uma segunda via deve reutilizar o mesmo recibo confirmado. O QR Pix continua sendo para pagamento e o QR do recibo para consulta pública.

**Conferência do código existente:** a tela Pix do jogador já tem um botão “Sair e iniciar outro jogo”; o componente de recibo do jogador já tem “Fechar recibo” e o componente térmico tem “Imprimir recibo / Salvar como PDF”. Porém, o componente térmico usa apenas `window.print()`, não tem botão de baixar arquivo dedicado nem fecha/limpa automaticamente após o fluxo; a tela do cambista e o fluxo ponta a ponta não estão concluídos. Portanto, a exigência está parcialmente coberta na interface do jogador, mas ainda não está integralmente implementada/validada para o produto.


## Reconciliação adicional do código Pix — 2026-10-27

O código de checkout Pix do jogador e o webhook Mercado Pago já existem na branch `feature/public-home-registration`; não descrevê-los como inexistentes. O endpoint de compra cria/recupera a ordem e persiste dados do QR; o webhook autentica a assinatura, consulta o estado no provedor e valida referência, moeda e valor antes de encaminhar confirmação transacional. O jogador pode consultar o estado da compra.

**Estado correto:** implementação presente; funcionamento ponta a ponta em homologação ainda não comprovado. Continuam obrigatórios testes de contrato da Orders API, eventos duplicados/fora de ordem, falhas reprocessáveis do webhook, pagamentos tardios, recusas/expiração, reembolso após confirmação, recibo e fluxo completo de interface. A venda rápida do cambista (Pix ou espécie) e o recibo com QR próprio ainda não estão completos. A configuração das variáveis de ambiente já informada pelo operador não deve ser tratada como tarefa pendente nem solicitada novamente.


## Implementação incremental — cadastro e comissão individual de cambistas (2026-10-27)

Na branch `feature/public-home-registration`, foram iniciados os seguintes componentes do requisito da seção 6/7:
- Cadastro e edição administrativa de cambistas com nome completo, usuário, senha inicial/opcional redefinição, WhatsApp, taxa individual e status ativa/bloqueada.
- Campos de perfil e taxa individual em `User`, com migração versionada; taxa representada em pontos-base (0–10000).
- Resumo da área do cambista com dois valores distintos: vendas confirmadas em reais e comissão acumulada em reais.
- Comissão Pix calculada em centavos inteiros e persistida por compra no momento da confirmação, usando a taxa vigente naquele momento; alteração posterior da taxa não reescreve o snapshot.

**Estado parcial em 2026-10-27:** foi implementado em branch um caminho de venda em espécie com endpoint separado, confirmação da compra e participações, código de recibo, comissão e auditoria na mesma transação; a tela do cambista agora permite selecionar Pix ou dinheiro. O código ainda não foi validado por typecheck, testes locais/integração e migração. Estornos de compras confirmadas e sua reconciliação financeira precisam de política e testes específicos. Não habilitar produção com base apenas na existência deste código.


## Decisão de compatibilidade — impressoras térmicas Bluetooth (2026-10-27)

### Objetivo
A impressão do recibo deve ser o mais universal e flexível possível para impressoras térmicas atuais conectadas por Bluetooth, sem assumir uma marca ou modelo específico. A interface deve oferecer um caminho padrão que funcione no maior número possível de celulares e computadores, além de uma estratégia de compatibilidade para dispositivos que exigem integração nativa.

### Limite técnico importante
Não existe um método único que funcione com literalmente toda impressora Bluetooth. Há diferenças entre Bluetooth Classic (incluindo dispositivos seriais/SPP), Bluetooth Low Energy (BLE), perfis e comandos ESC/POS proprietários, além de restrições dos navegadores e dos sistemas operacionais para descobrir, parear e enviar dados à impressora. Uma página web comum não pode prometer acesso direto a todos esses dispositivos.

### Estratégia de compatibilidade
1. **Caminho padrão universal:** manter recibo HTML responsivo e CSS de impressão para impressão pelo diálogo nativo do navegador/sistema, aproveitando as impressoras que o sistema operacional já instalou ou disponibilizou. O usuário escolhe a impressora no próprio sistema.
2. **Caminho Bluetooth direto quando suportado:** avaliar Web Bluetooth somente em navegadores/sistemas compatíveis e para dispositivos BLE compatíveis; detectar suporte e explicar claramente quando indisponível. Não apresentar Web Bluetooth como compatível com todos os modelos, especialmente impressoras Bluetooth Classic/SPP.
3. **Caminho de compatibilidade ampliada:** desenhar um adaptador opcional (aplicativo auxiliar nativo ou solução equivalente) para Android/iOS/desktop conforme a necessidade, usando descoberta/pareamento do sistema e protocolos suportados pelo dispositivo. Manter o site desacoplado desse adaptador por uma interface de impressão definida, sem dependência obrigatória de uma marca.
4. **ESC/POS:** usar comandos ESC/POS apenas para dispositivos que comprovadamente os suportem; preparar perfis/adaptadores por capacidade, não assumir que toda impressora térmica interpreta o mesmo conjunto de comandos.
5. **Recibo e QR:** gerar o QR Code real de consulta no próprio sistema e incluí-lo no recibo impresso; não usar serviços externos para gerar QR com códigos de recibo. O QR Pix de cobrança continua separado do QR de consulta do recibo.
6. **Fallback:** se impressão direta ou Bluetooth não estiver disponível, oferecer impressão pelo navegador e download de um formato imprimível, sem bloquear a venda nem impedir fechar o recibo.

### Requisitos de usabilidade e segurança
- Informar claramente os caminhos disponíveis no dispositivo e não simular conexão ou sucesso quando a impressora não foi detectada.
- Permitir tentar novamente, escolher outra impressora, baixar o recibo e fechar a tela em caso de falha.
- Durante a emissão original, imprimir somente recibos de compra confirmada. Não implementar reimpressão/segunda via após o fluxo original ser encerrado; a consulta posterior é somente pelo QR Code do recibo físico original.
- Validar em dispositivos reais representativos: Android + impressoras BLE e Classic/SPP, iPhone/iPad com modelos compatíveis com o ecossistema Apple, e desktop com impressora instalada. Registrar marca/modelo, SO, navegador, protocolo e resultado.
- Não declarar “compatível com qualquer impressora” até existir matriz de testes; a meta é máxima compatibilidade com fallback, não uma garantia tecnicamente impossível de universalidade absoluta.

### Estado
Esta é a direção aprovada para arquitetura e produto. O componente térmico atual prepara um recibo HTML de 58 mm e usa window.print(); ainda não implementa pareamento Bluetooth direto, detecção de capacidades, adaptador nativo nem QR de recibo garantidamente real. A compatibilidade Bluetooth ampla e a validação física continuam pendentes.


## Decisão vigente — consulta somente pelo QR Code e sem segunda via (2026-10-28)

Esta decisão substitui qualquer instrução anterior deste documento que permita painel geral de resultados públicos, busca pública de recibos por código digitado ou recuperação/segunda via de recibo.

- A página inicial pública não exibe resultados/ganhadores gerais nem campo para digitar código de recibo.
- A consulta pública acontece somente quando a câmera do celular lê o QR Code impresso no recibo original e abre a rota específica `/verificar-recibo/{receiptCode}`.
- A rota de verificação pode ser acessada sem login, pois precisa abrir diretamente pela câmera, mas apresenta exclusivamente a compra/recibo identificado pelo código único e seus dados oficiais vinculados. Não aceita placas, rodadas ou resultados fornecidos pelo usuário como fonte de verdade.
- A consulta é somente de leitura. Não há segunda via, recuperação, reimpressão ou reemissão por QR, código, placa, pedido ao cambista ou suporte. A geração e impressão fazem parte apenas do fluxo original da compra confirmada; depois de encerrado, o recibo físico original não pode ser substituído.
- A área do cambista contém somente o fluxo de registrar uma nova aposta/venda e entregar o recibo original. Não mostra busca, consulta, histórico, resumo/contadores de vendas ou resultados.
- A área do jogador permanece separada e mantém seu próprio histórico e suas consultas autenticadas. Esta decisão não remove nem altera o histórico do jogador.
- A API específica de verificação do recibo permanece disponível para alimentar a página QR; APIs/rotas gerais de resultados públicos e busca pública por código digitado não fazem parte do produto.
- Não apagar dados históricos nem alterar o banco de produção como parte dessa mudança. Remoção de interface/rotas e retenção de dados são assuntos distintos; qualquer migração de dados exige plano próprio e autorização.

**Precedência documental:** esta seção é a decisão funcional mais recente para consulta de recibos, página inicial e área do cambista. Se um parágrafo anterior ou documento histórico disser o contrário, aplicar esta decisão e corrigir o trecho conflitante antes de novas implementações.


## Decisão vigente — instruções para resgate de prêmio via WhatsApp (2026-10-28)

- Quando a página específica do recibo aberta pelo QR mostrar uma participação premiada cujo crédito ainda não esteja confirmado, apresentar instruções claras para guardar o recibo físico original e contatar o atendimento oficial para conferir o prêmio e receber instruções de resgate.
- Apresentar o botão **Solicitar resgate pelo WhatsApp**. O botão abre o contato oficial configurado e preenche uma mensagem com o código do recibo, código da rodada, placa e formato (cinza/Mercosul) e valor oficial indicado. Para recibos com mais de uma rodada/linha premiada pendente, incluir cada item relevante na mesma mensagem.
- O número oficial deve vir da variável de ambiente `NEXT_PUBLIC_PRIZE_SUPPORT_WHATSAPP`, somente dígitos, incluindo código do país e DDD. Não usar número fictício, pessoal ou não aprovado. O valor real deve ser definido pelo responsável da plataforma no ambiente de deploy, nunca commitado no repositório.
- Se o contato ainda não estiver configurado, exibir aviso neutro de que o atendimento não está configurado; não exibir um botão que leve a lugar nenhum.
- A mensagem de WhatsApp solicita atendimento e validação; não confirma por si só que o prêmio é devido ou pago. A equipe deve conferir o registro oficial, resultado, valor, recibo e estado financeiro antes de liberar qualquer pagamento. A página só pode afirmar crédito/pagamento confirmado se houver registro oficial de crédito.
- Não solicitar ou inserir senhas, chaves Pix, credenciais, CPF ou outros dados sensíveis na mensagem automática. Não solicitar dados pessoais desnecessários para consultar o recibo.
- Este fluxo não altera a proibição de segunda via/reimpressão e não transforma o WhatsApp em mecanismo automático de pagamento. O recibo físico original continua necessário como comprovante do jogador.
- O prazo de resgate manual de prêmios e o tratamento de falhas técnicas de crédito online seguem regras distintas já descritas nesta especificação; a inclusão do botão não altera esses prazos nem encerra obrigações financeiras.


## Decisão vigente — pagamento de prêmios exclusivamente pela plataforma (2026-10-28)

Esta regra substitui qualquer instrução anterior que permita ao cambista pagar prêmio, marcar prêmio como pago/dar baixa ou entregar dinheiro de prêmio ao comprador.

- **O cambista nunca paga prêmio.** Não deve existir na área do cambista botão, ação, endpoint ou permissão para pagar prêmio, dar baixa, marcar como pago, confirmar entrega de prêmio ou registrar liquidação manual de prêmio. A área do cambista fica restrita ao registro de novas apostas/vendas e à entrega do recibo original.
- **Compra online com jogador autenticado:** após a apuração oficial, o prêmio elegível é creditado diretamente na carteira online do próprio jogador, de forma transacional e idempotente. A consulta QR pode mostrar o estado oficial, mas não substitui o registro financeiro.
- **Compra presencial feita por cambista, sem carteira de jogador vinculada:** o cliente confere o recibo físico original pelo QR Code. Se o sistema indicar prêmio pendente, a página orienta o cliente a contatar a plataforma pelo botão oficial de WhatsApp. A equipe da plataforma valida o recibo, resultado, valor e estado financeiro e conduz o pagamento diretamente pela plataforma, nunca pelo cambista.
- **O QR Code é a porta de entrada do pedido de resgate, não um pagamento automático.** O WhatsApp inicia o atendimento com os dados mínimos do recibo/rodada/placa/valor indicado; o prêmio só pode ser declarado pago após registro financeiro oficial.
- **Proibir baixa manual de prêmio pelo cambista em todos os caminhos:** interface, API, permissões, ações administrativas delegadas ou endpoints alternativos. Se houver endpoint antigo de baixa/pagamento de prêmio acessível ao papel CASHIER, removê-lo ou negar acesso e adicionar teste de autorização. A reconciliação administrativa de falhas de crédito online permanece exclusiva a ADMIN e não deve ser usada para pagar prêmios de clientes sem carteira.
- Não confundir prêmio com comissão do cambista, confirmação de recebimento da venda, pagamento de saque do jogador ou reconciliação de crédito de carteira.
- Não apagar registros financeiros históricos nem alterar dados de produção nesta mudança. Revisar código e testes antes de afirmar que a proibição técnica está completa.


## Decisão de interface — painéis recolhíveis na área do jogador (2026-10-28)
- Manter o formulário de compra de placas e rodadas sempre visível no início da área do jogador.
- Recolher inicialmente todo o conteúdo abaixo do formulário em três menus expansíveis com seta e identificação clara: **Carteira digital / Saldo e saques**, **Suas apostas / Histórico dos últimos 7 dias** e **Resultados / Últimos resultados**.
- O cabeçalho de cada painel deve explicar brevemente o que existe dentro. Tocar nele abre ou fecha o conteúdo, sem navegar para outra página.
- A alteração organiza a interface e economiza rolagem, sem remover conteúdo ou modificar as regras funcionais dos componentes.


## Ajuste de interface — formulário do cambista (2026-10-28)
- No formulário de nova aposta/venda, o cartão **Rodadas** deve aparecer imediatamente abaixo do botão **Adicionar mais placas** e da lista de placas adicionadas, antes do valor por placa/rodada e da forma de pagamento.
- Essa é uma mudança apenas de ordem visual: manter a seleção, o limite de 10 rodadas, a validação de elegibilidade, os cálculos e o fluxo de pagamento sem alteração funcional.


## Correção de interface — espaçamento superior de Nova Aposta (2026-10-28)

- Na área do jogador, o cartão **Nova aposta** deve começar próximo ao cabeçalho e manter somente uma margem interna pequena e uniforme antes do título; não deixar uma faixa vazia excessiva acima de “NOVA APOSTA”.
- Preservar o tamanho e a posição relativa das placas, rodadas, valor e forma de pagamento; esta alteração é de espaçamento/layout, sem mudar regras da aposta.
- Causa identificada no código: `AreaShell` recebia a propriedade `compact`, mas a classe `area-page-compact` não era aplicada ao elemento `main`. Por isso, regras compactas existentes — inclusive as que reduzem o espaçamento do cartão — não eram ativadas.
- Correção: a classe do layout compacto deve ser aplicada ao contêiner principal sempre que `compact` for verdadeiro. Verificar jogador e cambista porque compartilham `AreaShell`.
- Critério de aceitação: no celular, conferir que o título “NOVA APOSTA” fica mais próximo da borda superior interna do cartão, sem a faixa vazia excessiva, e que o restante do formulário continua utilizável.
- Estado em 2026-10-28: correção de código registrada na branch de desenvolvimento; aguardando build/deploy Railway e verificação visual no ambiente publicado. Não considerar resolvido apenas pelo commit.


## Diagnóstico complementar — espaço acima de “Nova aposta” (2026-10-28)

- A primeira correção ativou a classe `area-page-compact`, mas não eliminou todo o espaço visível porque o cartão continuava herdando `padding-top: 16px` da regra compacta geral `.area-page-compact .feature-card`. Zerar `margin-top` do título não reduz o preenchimento interno superior do cartão.
- Ajuste complementar: no mobile, o cartão `.feature-card[aria-label="Nova aposta"]` recebe `padding-top: 6px`, mantendo os demais lados e os tamanhos/posições dos controles inalterados.
- Critério de aceitação: comparar a borda superior do cartão com o início do título no celular; o título deve subir visivelmente e permanecer com margem interna mínima.
- Situação: correção CSS commitada em `src/app/globals.css`; aguardando deploy bem-sucedido e verificação visual real. Não declarar concluído antes da confirmação.

## Área do cambista — menu suspenso de últimos resultados (2026-10-28)

- A área do cambista deve exibir, abaixo do formulário de nova aposta e imediatamente acima do rodapé/botão **Sair**, o mesmo menu expansível **Resultados — Últimos resultados** da área do jogador.
- O menu inicia recolhido. Ao abrir, apresenta os resultados publicados recentes com código da rodada, data/hora e as duas placas (cinza e Mercosul), reutilizando o mesmo componente visual do jogador.
- A API de resultados permite acesso autenticado aos papéis PLAYER e CASHIER; continua negando usuários não autenticados, outros papéis e contas obrigadas a trocar a senha. A resposta não deve ser armazenada em cache.
- Esta inclusão é apenas de consulta de resultados publicados: não adiciona histórico de vendas, busca de recibos, segunda via nem funções de pagamento de prêmio ao cambista.
- **Estado:** interface e autorização do endpoint atualizadas nesta branch. Build/testes, deploy e validação visual ainda precisam ser confirmados.


## Regra visual obrigatória — cabeçalho único em todo o site (2026-10-28)

- Todas as páginas e áreas devem usar o componente compartilhado `src/components/site-header.tsx`.
- O cabeçalho contém **somente a imagem oficial da logomarca, centralizada horizontalmente**. Não colocar menu, botão Entrar, Criar cadastro, Sair, ícone, título, usuário ou qualquer outro controle ao lado da marca.
- A regra vale para página inicial, login, cadastro, troca de senha, consulta pública, termos de uso, verificação de recibo e áreas de jogador, cambista e administrador.
- Links e ações necessários à navegação ficam no conteúdo da página, nunca dentro do cabeçalho. O botão Sair das áreas autenticadas permanece no rodapé, separado do cabeçalho.
- O mesmo componente define o alinhamento e as dimensões responsivas da marca; não criar cabeçalhos paralelos nem estilos inline específicos por página. A imagem deve manter proporção, usar `object-fit: contain` e não ser cortada.
- **Aceite:** conferir todas as rotas em celular e desktop e confirmar logomarca centralizada, sem controles no cabeçalho, mesma altura/alinhamento e sem regressão de conteúdo.
- **Estado em 2026-10-28:** alteração aplicada ao código e documentada; build, deploy e verificação visual real ainda precisam ser confirmados.


## Correção responsiva da página inicial e logomarca — 2026-10-28
- A página inicial deve importar explicitamente o componente compartilhado `BrandLogo` quando o utiliza no rodapé, evitando erro de compilação.
- Em celular, a seção principal deve organizar texto e ilustrações em uma coluna; as placas ilustrativas precisam respeitar a largura disponível, manter proporção e não ultrapassar/cortar o viewport.
- A logomarca no cabeçalho continua centralizada, usando o componente `SiteHeader` compartilhado e sem botões ou links no cabeçalho.
- Aceite: build sem erro; conferir no celular a página inicial, a logomarca, as duas placas ilustrativas inteiras e o início do conteúdo sem imagem gigante cortada.
- Estado: correção de código e documentação registrada; aguarda build, deploy e verificação visual no endereço publicado.


## Dimensões padronizadas da logomarca — 2026-10-28
- Todas as páginas usam o cabeçalho compartilhado e a mesma imagem oficial.
- Desktop/tablet: altura responsiva de 64–80px; celular: 60–68px (página inicial em celular: 68px); largura automática e imagem sem corte/distorção.
- O manual técnico contém os valores CSS exatos e é a referência para futuras alterações.


## Padrão obrigatório de mensagens em formulários — 2026-10-29

- Toda mensagem de validação, erro de API ou falha de operação deve ficar visível **imediatamente abaixo do botão/ação que a pessoa acabou de acionar**, dentro do mesmo formulário ou bloco de ação. Nunca deixar o único aviso no topo de um cartão/formulário longo, onde pode ficar fora da tela em celulares.
- Erros usam vermelho com contraste alto, fundo/borda de erro e semântica acessível `role="alert"` (com anúncio assertivo quando apropriado). Sucessos usam verde com contraste alto, fundo/borda de sucesso e `role="status"`/anúncio educado. Não diferenciar estado apenas pela cor: o texto precisa explicar o que ocorreu.
- Mensagens devem usar o mesmo espaço visual e alinhamento abaixo do botão, ocupar a largura disponível, quebrar linhas longas e funcionar em celular e desktop. Não usar alertas do navegador como substituto do feedback dentro da página.
- Após sucesso, atualizar a lista/estado exibido quando aplicável e mostrar confirmação explícita. Após falha, preservar os dados digitados para permitir correção; não indicar sucesso antes da confirmação do servidor.
- A regra vale para todos os formulários e ações mutáveis do site: login, cadastro, troca de senha, criação/edição de cambistas, gestão de rodadas, saques, formulários de compra/venda, Pix/carteira e qualquer formulário futuro.
- Componentes reutilizáveis devem manter as mesmas cores, espaçamento, semântica e localização. Evitar mensagens duplicadas no topo e no rodapé do formulário.
- Critério de aceite: provocar pelo menos um erro de validação local, um erro devolvido pela API e um sucesso em cada fluxo crítico; em tela pequena, a mensagem deve aparecer logo abaixo do botão acionado sem exigir rolar até o topo. Verificar leitor de tela/atributos ARIA e estado de carregamento/desabilitação do botão.
- Implementação registrada nesta alteração: CSS global padroniza mensagens `role="alert"` em vermelho e `role="status"` em verde; o cadastro de cambistas, criação manual de rodadas, login, cadastro público e troca de senha exibem feedback abaixo do botão/ação. Os formulários de compra/venda já exibiam seus avisos após o formulário e passam a receber o padrão global de cores.
- Estado: alterações de código/documentação commitadas na branch `feature/public-home-registration`. A padronização completa de todos os formulários e ações administrativas restantes, bem como lint, typecheck, testes, build, deploy e validação visual em celular/desktop, ainda precisa ser auditada antes de declarar a tarefa integralmente concluída.


## Decisão vigente — resumo financeiro do cambista em menu suspenso (2026-10-29)
- A área do cambista deve conter um menu recolhível **Resumo do cambista**, no rodapé, imediatamente acima do botão **Sair**; começa fechado para manter o formulário de venda compacto.
- Ao abrir, mostrar duas janelas: **Saldo total das apostas** e **Saldo total da comissão**, lado a lado quando houver espaço e empilhadas em telas muito estreitas.
- O saldo das apostas soma vendas confirmadas do cambista autenticado. A comissão vem dos registros oficiais associados às vendas confirmadas desse mesmo cambista. Valores em BRL; atualizar a cada 30 segundos e ao carregar. Mostrar carregamento e erro visível no próprio menu.
- Usar `GET /api/cashier/summary`, autenticado e restrito ao papel `CASHIER`; nenhum dado de outro cambista pode ser exposto.
- Esta decisão substitui a instrução anterior que removia todo resumo financeiro. Continuam proibidos histórico detalhado, consulta de apostas individuais, segunda via/reimpressão e pagamento ou baixa de prêmios pelo cambista.
- Estado: componente e integração no rodapé implementados na branch `feature/public-home-registration`; testes, build e deploy ainda precisam de confirmação.


## Painel administrativo — últimos resultados em menu suspenso (2026-10-29)
- O painel administrativo oferece um menu recolhível **Últimos resultados**, fechado por padrão, que mostra até 10 sorteios publicados mais recentes, incluindo código da rodada, data/hora e as placas cinza e Mercosul.
- Reutilizar a visualização existente de resultados e permitir somente acesso autenticado. Esta seção é adicional à gestão de rodadas e não substitui os controles operacionais do administrador.
- Estado: código registrado na branch de desenvolvimento; build, testes e implantação não confirmados.


## Ajuste vigente — logomarca proporcional no cabeçalho (2026-10-29)
- Esta regra substitui os tamanhos maiores documentados anteriormente para o cabeçalho compartilhado.
- Cabeçalho com altura mínima de 74 px em desktop/tablet e 64 px em celular (até 480 px).
- Logomarca centralizada, sem distorção: altura responsiva de 54–66 px em desktop/tablet e 54 px em celular; largura automática, limitada a 72vw/76vw e 320 px no desktop.
- Manter `object-fit: contain`, sem recorte nem esticamento. O ajuste vale globalmente para página pública, login, cadastro e áreas autenticadas por meio de `SiteHeader`/`BrandLogo` compartilhados.
- Implementado no CSS global da branch `feature/public-home-registration`. Build, deploy e inspeção visual em celular/desktop ainda precisam ser confirmados.
