# Plano de construção de pagamentos e integração Pix

Documento de planejamento atualizado: 2026-10-25
Branch auditada: feature/dual-plate-draw
HEAD de código auditado anteriormente: d337082b2d0fa6b24db64a6839d20e24c894fb9e; revisão complementar de pagamentos/recibos realizada em 2026-10-25 na branch feature/dual-plate-draw
Base funcional: docs/PRODUCT_SPEC.md

## Estado atual após auditoria — 2026-10-24

O repositório agora contém autenticação inicial, serviço de criação de compra pendente com participações por rodada, schema Prisma refatorado e rotas/serviços de sorteio e apuração de prêmios. Isso não constitui integração de pagamento real. Não foi encontrada integração ativa com Mercado Pago, criação real de cobranças Pix, webhook de provedor ou reconciliação real. As páginas de jogador/cambista/admin ainda são placeholders. A implementação de pagamentos continua pendente e deve ocorrer somente na fase final, após os gates técnicos e funcionais. A CI do HEAD de código consultado passou; a CI disparada pelas atualizações documentais posteriores estava em andamento no momento desta atualização.

## Correção de escopo

A implementação de pagamentos e a integração com Mercado Pago ainda não foram construídas. Portanto, o trabalho não deve tratá-las como serviços legados a localizar ou preservar. O objetivo é projetar e implementar essa capacidade na aplicação atual, seguindo a especificação funcional. A aplicação existente e o banco de produção continuam fora do escopo de alterações nesta fase.

## Requisitos confirmados no manual

- Uma compra pode abranger de 1 a 10 rodadas, com pagamento antecipado e participações individuais.
- O pagamento é integralmente por Pix ou integralmente pela carteira; não misturar os dois métodos na mesma compra.
- Pix só é considerado pago após confirmação autêntica do provedor no servidor.
- A confirmação deve ocorrer antes do cutoff da rodada para que a participação seja elegível; pagamento tardio não cria participação retroativa.
- Fechar a tela do QR não cancela automaticamente a cobrança.
- Webhooks duplicados ou fora de ordem não podem duplicar pagamentos, participações ou lançamentos financeiros.
- Valores monetários são inteiros em centavos.
- O livro-razão deve registrar pagamentos, débitos, créditos, estornos e saques de modo auditável.
- Expiração, devolução/estorno e reconciliação precisam ser especificados antes da ativação em produção.

## Arquitetura proposta

1. **Checkout de compra:** validar jogador/cambista, placas, valor por placa, 1–10 rodadas, cutoff e total; criar compra pendente e participações candidatas em transação de banco, sem marcá-las como pagas.
2. **Abstração de provedor:** definir uma interface interna para criar e consultar cobranças, com implementação específica de Mercado Pago isolada do domínio.
3. **Criação de cobrança Pix:** criar cobrança vinculada a um identificador interno opaco e idempotente; persistir ID externo, estado, valor, moeda, expiração e dados mínimos necessários para reconciliação. Não confiar em valores ou estados enviados pelo navegador.
4. **Webhook:** validar a autenticidade conforme a documentação atual do provedor; persistir o evento de forma idempotente; consultar o estado da cobrança no provedor quando necessário; validar valor, moeda e referência da compra.
5. **Confirmação transacional:** em transação de banco, verificar estado e cutoff, mudar o pagamento uma única vez, confirmar apenas participações elegíveis e criar lançamentos financeiros com chaves únicas de idempotência.
6. **Pagamento tardio ou inconsistente:** não criar participações retroativas; registrar o evento e encaminhar para uma política explícita de reconciliação/estorno/devolução, sem marcar sucesso na interface.
7. **Consulta de status:** oferecer endpoint autenticado para a interface consultar estado persistido pelo servidor; sair do modal QR não altera a cobrança.
8. **Auditoria e segurança:** segredos somente em variáveis de ambiente/gerenciador de segredos; não registrar tokens ou payloads sensíveis; autenticação, autorização, limitação de requisições e logs sem dados desnecessários.
9. **Testes:** cobrir criação de compra, 1 e 10 rodadas, cutoff, webhook válido/inválido, repetição, eventos fora de ordem, valor divergente, moeda divergente, indisponibilidade do provedor, corrida entre webhook e cutoff, e falha transacional.
10. **Operação:** validar em ambiente isolado com credenciais de teste, reconciliar cobranças, documentar rollback e só então preparar uma proposta de implantação. Não habilitar pagamentos reais até aprovação das verificações, configuração e revisão de segurança.

## Próximas tarefas

1. Inspecionar a aplicação atual e confirmar o framework, autenticação, persistência e padrões de API já usados.
2. Validar schema Prisma e geração do cliente no commit exato da branch.
3. Implementar os serviços internos de compra/participação sem acoplamento direto ao SDK do provedor.
4. Implementar adaptador Mercado Pago conforme a documentação oficial vigente, após confirmar produto/API e credenciais disponíveis.
5. Adicionar endpoints de checkout, webhook e consulta de status com testes.
6. Criar migração revisada e testá-la em banco descartável; não aplicar em produção nesta etapa.
7. Executar testes, lint, typecheck, build e revisão de segurança; registrar resultados por commit.

## Limites

Este arquivo é plano de implementação, não uma integração já construída. Nenhum pagamento, webhook, segredo ou migração de produção foi configurado ou executado por este documento.


## Revisão complementar de checkout e recibo — 2026-10-25

Revisão de código atual confirmou os seguintes fatos:

- `POST /api/player/purchases` exige sessão de jogador, valida a origem quando o cabeçalho está presente, aceita de 1 a 10 IDs de rodada distintos e linhas com valores em centavos. Chama `createPendingPixPurchase` e retorna explicitamente que não criou nem confirmou cobrança Pix.
- `createPendingPixPurchase` persiste a compra, as participações e o pagamento pendente em transação, com idempotência. Não chama SDK ou API do Mercado Pago e não confirma compra.
- `GET /api/public/ticket-check` consulta por `Purchase.receiptCode`, só expõe dados de compra confirmada e retorna resultados de cada linha sem dados de identidade do jogador. A consulta existente é uma base para o QR do recibo único, mas o componente ainda recebe um `qrCodeDataUrl` opcional e mostra espaço reservado quando não fornecido.
- `ThermalReceipt` só renderiza para status `CONFIRMED` e código no formato esperado; o componente agora identifica repetição e código da rodada. Ainda não existe ligação ponta a ponta entre confirmação autêntica do provedor, dados de recibo carregados do banco, geração segura do QR e impressão pelo cambista.
- O modelo Prisma já inclui campos de provedor, ID externo, idempotência, eventos de webhook e status de pagamento, mas a presença desses campos não representa integração ativa nem comprova que os estados sejam reconciliados corretamente.

### Gate de segurança para a próxima implementação

Não ativar cobranças reais nem simular confirmação no servidor para liberar recibos. Antes de integrar o provedor, definir o contrato do adaptador, estados permitidos e transições, política para pagamento tardio/expirado/estornado, persistência idempotente de eventos e estratégia de reconciliação. A integração deverá usar credenciais de teste e endpoints oficiais atuais, com testes de assinatura/autenticidade, valor divergente, eventos repetidos/fora de ordem, corrida com cutoff e falha transacional.

Nenhum segredo, webhook, cobrança real, banco de produção ou deploy foi configurado ou alterado nesta revisão.


## Atualização de prioridade — 2026-10-25

O responsável pelo projeto informou que as variáveis de ambiente do Mercado Pago já estão configuradas no ambiente de hospedagem e que a ativação/deploy deve ocorrer apenas no momento apropriado. Essa informação operacional foi registrada como declaração do responsável; este repositório não lê nem valida valores secretos do provedor.

A inspeção da branch de desenvolvimento ainda encontra a rota `POST /api/player/purchases` chamando apenas `createPendingPixPurchase`, sem criação de cobrança externa, e não encontra rota de webhook Mercado Pago. Portanto, configuração de variáveis e integração no código são etapas distintas. A próxima prioridade é implementar e testar o adaptador e o webhook na branch de desenvolvimento, sem executar deploy ou pagamentos reais durante a construção.

A integração deve seguir a documentação oficial vigente: criar pagamento Pix via `POST /v1/payments` com `Authorization: Bearer` e `X-Idempotency-Key`; validar a assinatura HMAC do Webhook com `x-signature`, `x-request-id` e `data.id`; depois consultar o pagamento na API do provedor e conferir referência, valor, moeda e estado antes de qualquer confirmação local. Referências: documentação oficial de [Pix](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix) e [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/payment-notifications).

**Gate de ativação:** mesmo que as variáveis já existam, não liberar produção até que os testes provem idempotência, assinatura inválida rejeitada, pagamento duplicado sem dupla confirmação, valor divergente rejeitado, pagamento tardio tratado sem participação retroativa e recibo liberado somente após confirmação autêntica. Não registrar nem solicitar tokens reais no chat ou no repositório.

## Auditoria comparativa da integração legada — 2026-10-25

A comparação foi feita sem alterar produção nem copiar código de um sistema para o outro.

### O que pode ser reaproveitado conceitualmente

- Os nomes de credenciais já usados no sistema legado (MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_WEBHOOK_SECRET) podem ser mantidos como compatibilidade operacional, desde que sejam os segredos da mesma aplicação Mercado Pago e correspondam ao produto/API escolhidos.
- O padrão de chave de idempotência, assinatura HMAC-SHA256, consulta do pedido no servidor e conferência de referência/valor é útil como referência técnica.
- O uso de /v1/orders no legado é uma escolha de API que precisa ser validada contra o checkout Pix pretendido; não implica reutilizar o modelo de dados ou o fluxo de negócio antigo.

### O que não deve ser copiado

- O modelo de persistência e as tabelas do site antigo. O JogaPlacas tem Purchase, PurchaseParticipation, Payment, WebhookEvent e LedgerEntry, com suas próprias garantias e chaves de idempotência.
- Regras antigas de modalidades, valores, rodadas ou recibos. Elas não correspondem ao produto atual de seis categorias e placas LEGACY/MERCOSUR.
- A criação de e-mail fictício usada como fallback no site antigo. O modelo User atual não tem campo de e-mail; a implementação nova não deve inventar identidade do pagador. Antes de fechar o payload da API, confirmar se o produto escolhido exige e-mail e, se exigir, definir coleta/validação explícita ou uma alternativa suportada oficialmente.
- A confirmação de compra baseada apenas em dados recebidos do navegador ou no corpo do webhook. O webhook deve validar HMAC, buscar o pedido pela API e validar referência, total e moeda.

### Decisão de arquitetura

O adaptador do Mercado Pago será uma camada de infraestrutura isolada do domínio, com contrato próprio para criar/consultar cobrança e normalizar estados do provedor. A compra pendente será criada pelo serviço atual; a chamada externa ocorrerá com a chave idempotente já persistida. Falhas ambíguas não devem criar outra cobrança às cegas: devem entrar em reconciliação pela referência externa. A confirmação de pagamento, a elegibilidade por cutoff e os lançamentos de razão devem ser tratados no banco do JogaPlacas, em transação e com idempotência.

### Bloqueios antes da implementação de confirmação

1. Fechar o contrato de criação de cobrança e os campos persistidos para QR Pix (copia-e-cola, base64 e URL de pagamento, se fornecidos).
2. Implementar e testar uma função de confirmação transacional que atualize Payment, Purchase e participações elegíveis, gere o recibo somente após confirmação e crie lançamentos de razão exigidos pela arquitetura atual.
3. Definir tratamento auditável para pagamento confirmado após cutoff; não ativar participação retroativa nem emitir recibo de participação elegível automaticamente.
4. Implementar rota de webhook com validação da assinatura, leitura do recurso na API, deduplicação de evento e resposta HTTP adequada.
5. Cobrir assinatura inválida, evento duplicado/fora de ordem, valor ou moeda divergente, indisponibilidade do provedor, resposta perdida na criação e corrida com cutoff.
6. Testar migração e suíte de qualidade em ambiente descartável. Não realizar cobrança real nem implantar nesta fase.

Este registro é uma decisão de compatibilidade e um checklist de engenharia; não declara a integração pronta nem confirma que as variáveis do servidor foram inspecionadas.