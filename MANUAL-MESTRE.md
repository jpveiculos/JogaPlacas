# MANUAL-MESTRE — Joga Placas

> **PONTO DE ENTRADA OBRIGATÓRIO PARA QUALQUER TRABALHO NO JOGA PLACAS.**
> Antes de documentar, alterar código, implementar uma funcionalidade ou responder sobre regras do projeto, leia este arquivo e siga os links de fonte de verdade abaixo. Não peça ao usuário para localizar o manual.

## Onde está a documentação oficial

Repositório: [jpveiculos/JogaPlacas](https://github.com/jpveiculos/JogaPlacas)

1. **Especificação funcional vigente (regras do produto e decisões aprovadas):** [docs/PRODUCT_SPEC.md — branch feature/public-home-registration](https://github.com/jpveiculos/JogaPlacas/blob/feature/public-home-registration/docs/PRODUCT_SPEC.md)
2. **Manual técnico de implementação e sequência de trabalho:** [docs/TECHNICAL_ROADMAP.md — branch planning/foundation](https://github.com/jpveiculos/JogaPlacas/blob/planning/foundation/docs/TECHNICAL_ROADMAP.md)
3. **Decisão detalhada de recibo, QR Code e rodadas agendadas:** [docs/decisao-recibo-qr-rodadas-agendadas.md — branch feature/public-home-registration](https://github.com/jpveiculos/JogaPlacas/blob/feature/public-home-registration/docs/decisao-recibo-qr-rodadas-agendadas.md)

## Regra de precedência

- Para **regras do produto**, use `docs/PRODUCT_SPEC.md` na branch de trabalho ativa, atualmente `feature/public-home-registration`.
- Para **arquitetura e sequência técnica**, consulte o manual técnico `docs/TECHNICAL_ROADMAP.md` em `planning/foundation`, comparando com o estado atual do código antes de reutilizar instruções.
- Este arquivo é o índice permanente e ponto de entrada; não substitui as regras detalhadas dos documentos acima.
- Se encontrar divergência entre branches, não misture nem copie código automaticamente. Identifique a divergência, compare commits/arquivos e documente qual decisão prevalece antes de implementar.
- Quando uma decisão for aprovada, atualize a especificação funcional vigente na branch de trabalho e, quando necessário, o manual técnico. Atualize este índice se os caminhos mudarem.
- Nunca declarar que algo está implementado, testado, implantado ou pronto sem evidência verificável. Não alterar `main`, produção, domínio/DNS ou banco de produção sem autorização explícita.

## Rotina obrigatória ao iniciar uma tarefa

1. Abrir este `MANUAL-MESTRE.md` na raiz do repositório.
2. Ler a seção relevante de `docs/PRODUCT_SPEC.md`.
3. Ler o trecho pertinente do manual técnico e verificar a branch em que ele está.
4. Inspecionar o código e testes atuais; documentação antiga não prova estado atual.
5. Implementar na branch de trabalho autorizada, atualizar documentação junto com o código e reportar o que foi realmente verificado.

## Estado conhecido deste índice

Criado em 2026-10-27 para evitar que o manual e as decisões fiquem difíceis de localizar. O manual técnico original continua na branch `planning/foundation`; a especificação funcional e as alterações atuais continuam na branch `feature/public-home-registration`. Isso é intencional até que uma comparação explícita justifique consolidar branches.
