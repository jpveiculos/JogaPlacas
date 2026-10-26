# Dois sorteios independentes por rodada

> **Estado reconciliado em 2026-10-26** para `feature/dual-plate-draw`. Este documento separa código implementado de validação ainda pendente. A presença de código/testes não autoriza produção.

## Regra obrigatória

Cada rodada concluída terá dois resultados independentes:
- `resultLegacyPlate`: placa no formato antigo `ABC-1234` (placa cinza).
- `resultMercosurPlate`: placa Mercosul `ABC1D23`, aceitando A-Z na quinta posição.

Os resultados não são conversões um do outro. Aposta cinza concorre somente ao resultado cinza; aposta Mercosul somente ao resultado Mercosul. A validação e a chave de comparação preservam o formato original. É proibido converter automaticamente a quinta posição Mercosul em dígito durante normalização, sorteio ou apuração.

## Implementado no código desta branch

- Validador Mercosul aceita A-Z na quinta posição; normalização mantém chaves específicas por formato.
- Gerador independente usa `node:crypto`, com fonte aleatória injetável somente em testes.
- Serviço transacional `drawRoundResults` exige rodada fechada, bloqueia a linha, grava os dois resultados e conclui a rodada em uma transação; reexecução retorna os resultados já persistidos e estado parcial é tratado como inconsistência.
- Schema e migração mantêm os resultados separados. O antigo `resultPlate` é preservado como `resultMercosurPlate`; nenhum resultado histórico é inventado para o formato cinza. A migração falha de modo seguro se uma linha histórica não puder ser classificada.
- Rotas administrativas protegidas para fechar, sortear e apurar; interface administrativa já apresenta os dois resultados.
- Serviço de apuração compara a aposta com o resultado do formato correspondente, usa snapshot histórico de regra e credita prêmios de jogador com chave idempotente dentro da transação. Existe endpoint administrativo de reconciliação de crédito de prêmio.

## Parcial ou ainda pendente

- A API de status do HEAD consultado (`ab3a24fa9ed07e02b11f8601d13b7210a13614f9`) não retornou checks/status. A CI dos commits anteriores não deve ser tomada como validação do HEAD atual.
- Executar/revisar a suíte completa e os testes PostgreSQL de migração, concorrência e apuração no HEAD exato.
- Confirmar em ambiente descartável a migração de dados representativos e a falha segura para entradas inválidas/ambíguas antes de considerar qualquer compatibilidade histórica pronta para outro banco.
- Não existe evidência aqui de operação real do scheduler hospedado; a rota interna depende de tarefa externa, segredo correto e conexão com o banco pretendido.
- O sorteio/apuração de prêmios não torna a plataforma inteira concluída: continuam pendentes fluxos completos do cambista, operações financeiras/administração e validação ponta a ponta dos pagamentos/recibos.

## Segurança e operação

Não aplicar migração em produção, habilitar cobranças/pagamentos reais nem mesclar em `main` sem CI verde no HEAD exato, revisão das migrações, validação ponta a ponta necessária e autorização explícita.
