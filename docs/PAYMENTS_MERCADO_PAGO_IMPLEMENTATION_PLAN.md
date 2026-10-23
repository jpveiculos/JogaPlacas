# Plano de construção de pagamentos e integração Pix

Data: 2026-10-23
Branch: planning/foundation
Base funcional: docs/PRODUCT_SPEC.md

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
