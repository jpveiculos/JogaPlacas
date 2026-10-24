# Dois sorteios independentes por rodada

## Regra obrigatória

Cada rodada concluída terá dois resultados independentes:
- `resultLegacyPlate`: placa no formato antigo `ABC-1234`.
- `resultMercosurPlate`: placa Mercosul `ABC1D23`, aceitando A-Z na quinta posição.

Os resultados não são conversões um do outro. Aposta cinza concorre somente ao resultado cinza; aposta Mercosul concorre somente ao resultado Mercosul. A validação do formato e a chave de comparação devem preservar o formato original. É proibido converter automaticamente a quinta posição Mercosul em dígito durante normalização, sorteio ou apuração.

## Implementado nesta branch

- Validador Mercosul aceita A-Z na quinta posição.
- Normalização mantém chaves específicas por formato e não converte A-J em números.
- Testes unitários cobrem a sequência completa A-Z na quinta posição.
- Gerador independente usa `node:crypto` e permite injeção de fonte aleatória somente para testes.
- Serviço transacional `drawRoundResults` exige rodada fechada, bloqueia a linha, grava os dois resultados e conclui a rodada numa única transação. Repetição após conclusão devolve os resultados já persistidos; estado parcial é tratado como inconsistência e não é sobrescrito.
- Schema Prisma contém campos separados para os resultados.
- Migração preserva o antigo `resultPlate` como `resultMercosurPlate`, pois esse era o resultado já utilizado, e adiciona `resultLegacyPlate` sem atribuir resultados antigos ao formato cinza.

## Ainda não concluído — bloqueia produção

- Executar e validar migração em PostgreSQL descartável e confirmar compatibilidade com o banco/ambiente real.
- Auditar todos os consumidores de `normalizedPlate` e garantir filtro explícito por formato na apuração. O formato precisa estar persistido em cada linha de aposta ou ser derivado de modo inequívoco e validado.
- Serviço inicial de apuração implementado em settle-round-prizes.ts: filtra compras/participações confirmadas, compara cada aposta com o resultado do formato correspondente e registra crédito de jogador com chave única por linha. Existe endpoint administrativo protegido para execução.
- Revisar a rota administrativa, sua autorização e o fluxo de publicação.
- Exibir as duas plaquinhas na interface.
- Rodar a suíte completa e verificar CI verde. Foram adicionados testes unitários, teste de rota e teste de integração PostgreSQL para crédito idempotente; a execução ainda não foi confirmada.

## Segurança e operação

Não aplicar migração em produção, não habilitar pagamentos reais e não mesclar em `main` antes de concluir os bloqueadores acima, revisar o SQL gerado e confirmar os testes de integração.
