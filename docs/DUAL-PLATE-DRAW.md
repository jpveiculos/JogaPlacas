# Dois sorteios independentes por rodada

## Decisão proposta

Cada rodada concluída terá dois resultados independentes:
- `resultLegacyPlate`: placa no formato antigo `ABC-1234`.
- `resultMercosurPlate`: placa no formato Mercosul `ABC1D23`, aceitando A-Z na quinta posição.

Os resultados não são conversões um do outro. Aposta cinza concorre ao resultado cinza; aposta Mercosul concorre ao resultado Mercosul. A interface deve identificá-los separadamente.

## Implementado nesta branch

- Validador Mercosul aceita A-Z na quinta posição.
- A-J continuam convertendo para os algarismos equivalentes ao comparar representações equivalentes.
- K-Z são preservadas como chaves Mercosul distintas; não se inventa uma equivalência antiga.
- Gerador independente usa `node:crypto` e permite injeção de fonte aleatória somente para testes.
- Serviço transacional `drawRoundResults` exige rodada fechada, bloqueia a linha, grava os dois resultados e conclui a rodada numa única transação. Repetição após conclusão devolve os resultados já persistidos; estado parcial é tratado como inconsistência e não é sobrescrito.
- Schema Prisma contém campos separados para os resultados.

## Ainda não concluído

- Migração versionada e validação em PostgreSQL descartável.
- Apuração das quatro modalidades e crédito de prêmios para cada resultado.
- Rota autenticada/autorizada para executar o sorteio.
- Exibição das duas plaquinhas na interface.
- Testes de integração concorrente do serviço de sorteio e verificação completa da CI.

## Segurança e operação

Não aplicar migração em produção, não habilitar pagamentos reais e não mesclar em `main` antes de concluir os itens pendentes e revisar o SQL gerado.