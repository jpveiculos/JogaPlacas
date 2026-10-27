# Manual técnico — JogaPlacas
Atualizado em 27/10/2026.

## Fuso horário oficial das rodadas
- Toda entrada e exibição de horário de rodada no painel administrativo deve usar o horário de Brasília, atualmente UTC−03:00.
- O navegador envia horários locais do campo `datetime-local` convertidos para instantes UTC; o servidor persiste os instantes como datas absolutas.
- Para código da rodada e auditoria, interpretar o instante no deslocamento fixo UTC−03:00 (`Etc/GMT+3`, nome IANA com sinal invertido por convenção). Não usar o fuso local do servidor nem o fuso do dispositivo.
- A interface deve identificar o padrão como “Horário de Brasília (UTC−03:00)”.
- A regra atual exige resultado nos minutos :00 ou :30 e início 29 minutos antes do resultado; as apostas fecham um minuto antes do resultado. O servidor valida o intervalo e calcula `cutoffAt`; nunca confiar somente na validação do navegador.
- O uso de UTC−03:00 representa o horário de Brasília vigente. Se a legislação brasileira alterar o fuso oficial, revisar explicitamente esta regra e seus testes antes de mudar o comportamento.
- O código da rodada segue `JP-AAAAMMDD-HHMM`, usando a data e hora do resultado no horário de Brasília. A criação da rodada e o evento de auditoria devem ocorrer na mesma transação serializável.

## Validação de placas nas vendas
- Placa cinza: exatamente três letras ASCII A–Z seguidas de quatro algarismos 0–9 (`ABC1234`), sem hífen na exibição canônica.
- Placa Mercosul: exatamente três letras A–Z, um algarismo, uma letra A–Z e dois algarismos (`ABC1D23`).
- A interface filtra caracteres incompatíveis com cada posição, mas a validação definitiva é feita no módulo `src/modules/plates/normalize-plate.ts` no servidor. Testar entrada digitada, colada e requisições diretas à API.

## Cadastro de cambistas
- A API `POST /api/admin/cashiers` aceita somente os campos definidos pelo esquema estrito: nome completo, usuário, senha, WhatsApp e comissão. Não enviar `status` na criação; o servidor define a nova conta como ativa e exige troca de senha no primeiro acesso.
- A edição usa `PATCH` e pode alterar o status. Senhas são armazenadas como hash; nunca registrar senha em logs nem em eventos de auditoria.
- O formulário deve mostrar erros devolvidos pela API e atualizar a lista após uma criação bem-sucedida.

## Validação e implantação
- Alterações relacionadas a rodadas devem incluir testes da conversão de horário, código de rodada, cutoff e evento de auditoria.
- Após cada commit, verificar o status de CI, o deploy correspondente no Railway, logs de build e runtime, e executar testes de fumaça nas rotas afetadas antes de declarar conclusão.
- Pagamentos reais não devem ser considerados homologados apenas por compilação: confirmar callbacks do provedor, idempotência, reconciliação e registros financeiros em ambiente de teste controlado.
