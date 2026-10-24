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
- Formatos aceitos: padrão antigo `ABC-1234` e Mercosul `ABC1D23`.
- Normalizar para uma representação canônica de sete caracteres alfanuméricos, sem hífen. Na placa Mercosul, a letra na quinta posição representa o dígito equivalente: A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9.
- Exemplo: `ABC-1323` e `ABC1D23` representam o mesmo resultado normalizado `ABC1323`. Preservar também a forma exibida/original quando necessária para apresentação e auditoria.
- Rejeitar formatos inválidos no servidor.
- Multiplicadores aprovados: unidade (último dígito) 2x; dezena (últimos dois) 20x; centena (últimos três) 200x; milhar (últimos quatro) 2.000x; três letras iniciais em ordem exata 2.000x; placa completa 200.000x.
- Multiplicador aplica-se ao valor alocado à respectiva categoria. A regra de cálculo e arredondamento dos prêmios deve ser implementada com testes e explicitada antes de produção.

## 3. Rodadas e apostas
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

## 10. Pontos técnicos ainda a decidir
- Stack, framework, banco de dados e estratégia de migrações.
- Provedor Pix e contrato exato dos webhooks, autenticação/assinatura e reconciliação.
- Fonte dos resultados das rodadas, validação e processo de correção.
- Fórmula final do prêmio, alocação por categoria, regras de empate, limites e tratamento de estornos.
- Política de retenção de dados e parâmetros de segurança operacional.
