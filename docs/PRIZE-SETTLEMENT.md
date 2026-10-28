# Apuração de prêmios por formato

- Só processa rodadas COMPLETED com os dois resultados presentes e válidos.
- Só considera participações e compras CONFIRMED.
- Aposta cinza compara exclusivamente com resultLegacyPlate; Mercosul exclusivamente com resultMercosurPlate.
- Não converte a quinta posição Mercosul em número. Unidade, dezena, centena e milhar comparam literalmente os últimos 1, 2, 3 e 4 caracteres da placa compactada. No formato Mercosul, o sufixo de quatro caracteres pode conter a letra da quinta posição.
- Multiplicadores vigentes (`approved-v3`): unidade 9x, dezena 30x, centena 300x, milhar 3.000x, três letras iniciais 3.000x e placa completa 300.000x. A mesma tabela vale para placa cinza e Mercosul; cada aposta concorre apenas ao resultado do seu próprio formato. O cálculo usa centavos inteiros, sem arredondamento. Compras anteriores mantêm os multiplicadores gravados em seus snapshots históricos. O cálculo usa centavos inteiros, sem arredondamento.
- `ruleSnapshot` precisa conter `{ version, multipliers }`, com `version` igual a `ruleVersion` e multiplicadores inteiros não negativos para `unit`, `tens`, `hundreds`, `thousands`, `letters` e `fullPlate`. A compra é rejeitada se o snapshot estiver ausente/inválido; a apuração também bloqueia linhas históricas inválidas, sem recorrer silenciosamente aos valores atuais.
- Crédito direto ao jogador usa a chave única prize-credit:<participationLineId> e ocorre na mesma transação da apuração. Reexecuções conferem destinatário e valor do lançamento existente.
- Venda de cambista não possui carteira do cliente no esquema atual. O prêmio é calculado e fica pendente para reconciliação/pagamento manual; nunca é creditado à carteira do cambista.

## Bloqueios antes de produção
- Revisar com o manual mestre a comparação da modalidade milhar em placas Mercosul.
- Confirmar migração/compatibilidade e revisar qualquer dado histórico criado antes do formato obrigatório de `ruleSnapshot`; dados sem multiplicadores precisam de reconciliação explícita.
- Executar testes automatizados e integração PostgreSQL.
- Não aplicar migração em produção, ativar pagamentos reais ou mesclar na main até concluir as validações.
