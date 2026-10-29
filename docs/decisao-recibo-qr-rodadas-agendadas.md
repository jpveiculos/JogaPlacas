# Decisão de produto — recibos, QR Code e rodadas agendadas

**Projeto:** Joga Placas  
**Status:** decisão funcional para orientar implementação; não substitui as regras oficiais do manual mestre.

## Decisão principal

Uma compra terá **um recibo principal e um QR Code principal**, mesmo quando incluir várias rodadas agendadas. O QR Code não armazena dentro da imagem todas as placas, rodadas ou resultados: ele contém apenas o endereço público de consulta do recibo. A página consulta o banco de dados oficial para apresentar os dados atuais.

A solução pode abranger várias rodadas com um único QR Code porque o identificador aponta para uma compra que possui várias participações. Cada participação continua individualmente vinculada à sua rodada.

## Exemplo: compra de dez rodadas

Quando um jogador agenda e paga dez rodadas conforme as regras de agendamento previstas no manual, o recibo principal terá um QR Code. Ao escaneá-lo, o jogador ou um terceiro poderá abrir, sem login, uma página oficial que lista as dez rodadas, as placas registradas em cada uma e o estado atualizado de cada rodada.

Cada rodada terá identificação própria, e seus dados e resultados não serão misturados. A página permitirá consultar uma rodada individual a partir da lista, sem exigir dez QR Codes impressos.

## Estados exibidos por rodada

1. **Sorteio aguardando:** a rodada ainda não atingiu o horário programado; mostrar data/hora, identificação da rodada e placas.
2. **Aguardando resultado oficial:** o horário chegou, mas o resultado oficial ainda não foi publicado. Não inferir derrota pelo horário.
3. **Resultado publicado — premiado:** quando o resultado oficial estiver registrado e a apuração confirmar que uma ou mais placas foram premiadas, mostrar a placa e o prêmio calculado conforme as regras oficiais. Não afirmar que o prêmio foi pago sem confirmação financeira.
4. **Resultado publicado — não premiado:** quando a apuração oficial concluir que nenhuma placa daquela participação foi premiada, mostrar esse estado e o resultado por placa.

A página deve consultar o servidor/banco oficial e atualizar os estados conforme a publicação dos resultados. Não será necessário trocar ou regenerar o QR Code quando uma rodada for encerrada.

## Segurança e antifraude

- O QR Code identifica o recibo/compra; os dados apresentados vêm exclusivamente do sistema oficial.
- Nunca confiar em placas, rodadas, valores ou resultados escritos no papel ou enviados pelo navegador.
- Um QR Code copiado de um recibo antigo só poderá mostrar a compra e as participações originalmente vinculadas a ele; não poderá validar dados de outra compra ou rodada.
- Exibir separadamente a confirmação de registro/pagamento e a apuração do prêmio.
- A consulta pública do QR Code não é, sozinha, autorização para pagar um prêmio.
- O fluxo de pagamento de prêmio deverá validar a participação oficial, o resultado e o estado financeiro, com proteção transacional/idempotente contra crédito ou resgate duplicado.

## Modelo funcional

- **Compra/recibo:** unidade de pagamento e documento principal; um código de recibo exclusivo.
- **Participação por rodada:** registro individual de cada rodada adquirida/agendada dentro da compra.
- **Placas:** vinculadas à participação e, portanto, à rodada correta.
- **Resultado:** associado à rodada e apurado pelas regras oficiais.
- **QR Code principal:** endereço público exclusivo da consulta da compra/recibo.
- **Consulta individual:** acessível a partir da lista de rodadas no recibo; não exige um QR Code impresso por rodada.

## Compatibilidade com o manual mestre

O agendamento e a repetição de jogadas devem obedecer às regras já definidas no manual mestre. Esta decisão define como representar e consultar a compra agrupada, sem alterar o calendário, o preço, a mecânica do jogo ou as regras de premiação. Antes de finalizar a documentação normativa e antes de ativar pagamentos reais, conferir a redação do manual mestre e a implementação do agendamento para resolver eventuais divergências.

## Critérios de aceite para implementação

- Compra de uma rodada: um recibo e um QR Code que abre a consulta oficial.
- Compra agendada de várias rodadas: um recibo e um QR Code que lista todas as rodadas confirmadas daquela compra.
- Cada rodada exibe somente suas próprias placas e seu próprio estado/resultado.
- Resultado ainda não publicado nunca é apresentado como derrota.
- Atualização do resultado no banco reflete-se na consulta sem trocar o QR Code.
- Código copiado não permite alterar a compra nem associar placas de outra participação.
- Nenhum prêmio é declarado como pago sem confirmação financeira.
- Tentativas duplicadas de crédito/resgate de prêmio são bloqueadas pelo backend.
