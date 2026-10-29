# Registro de branches — Joga Placas

> **REGRA OPERACIONAL:** a única branch autorizada para desenvolvimento novo é `feature/public-home-registration`. Antes de iniciar qualquer tarefa, consultar `MANUAL-MESTRE.md`. Branches históricas listadas como liberadas para exclusão não devem ser usadas como fonte de implementação.

Última auditoria cruzada: 2026-10-27. Foram comparados commits e arquivos exclusivos das branches antigas com a branch consolidada. Esta é uma análise de conteúdo, não uma exclusão técnica de refs no GitHub.

## Decisão após cruzamento final

| Branch | Evidência verificada | Decisão |
|---|---|---|
| `feature/public-home-registration` | Contém a especificação funcional extensa e atualizada, o manual técnico consolidado, o arquivo de arquitetura e as decisões recentes de recibo/QR/agendamento. | **OFICIAL — manter e usar para todo desenvolvimento novo.** |
| `feature/dual-plate-draw` | Comparação: zero commits exclusivos; está 68 commits atrás. O manual técnico atual da branch oficial identifica a reconciliação dessa linha de trabalho e contém a documentação atualizada. | **LIBERADA PARA EXCLUSÃO.** Não iniciar trabalho nela. |
| `chore/organize-repository-architecture` | Seu único arquivo exclusivo no histórico, `ARCHITECTURE.md`, está presente na branch oficial com o mesmo SHA de conteúdo (`388107bd94fda4f70fbee70f5534454658398ba4`). | **LIBERADA PARA EXCLUSÃO.** A informação útil já está preservada na oficial. |
| `fix/admin-provision-prisma-esm` | A diferença exclusiva indicada pela comparação era em `package.json`; o arquivo na branch antiga e na oficial tem o mesmo SHA (`34c7e1fb5ecccc8accbf52811e7d49b2b1e0a198)). O script `admin:provision` e a configuração ESM estão na oficial. | **LIBERADA PARA EXCLUSÃO.** A alteração útil já está preservada na oficial. |
| `planning/foundation` | É uma versão inicial/histórica. O manual técnico antigo descreve três áreas e trata a página pública como auxiliar; a especificação/manual atuais documentam a direção posterior, com página principal pública e manual técnico consolidado. A branch oficial já contém `docs/TECHNICAL_ROADMAP.md` atualizado (83 KB), além da especificação funcional atualizada (cerca de 99 KB). | **LIBERADA PARA EXCLUSÃO APÓS SALVAR/CONFIRMAR O MANUAL ANTIGO COMO HISTÓRICO.** A comparação não encontrou uma regra de produto vigente que justifique manter essa branch como ativa. Não desenvolver nela. |
| `main` | Branch protegida/produção, com histórico distinto e muito atrás. Não faz parte da limpeza de branches de desenvolvimento. | **NÃO EXCLUIR NEM ALTERAR.** |

## Resultado da revisão de ideias exclusivas

- **Arquitetura:** o arquivo `ARCHITECTURE.md` está na branch oficial com conteúdo idêntico; não há ideia exclusiva a migrar da branch `chore/organize-repository-architecture`.
- **Provisionamento do administrador / ESM:** `package.json` está idêntico entre a branch de correção e a oficial; o script relevante está presente na oficial.
- **Duas placas / regras de rodada:** a branch `feature/dual-plate-draw` não tem commits exclusivos em relação à oficial; o manual técnico oficial contém o registro de reconciliação dessa linha.
- **Planejamento inicial:** a branch `planning/foundation` documenta decisões anteriores que foram substituídas (em especial a orientação de não tratar a página pública como página principal). O manual técnico e a especificação funcional atuais estão na oficial. O manual antigo deve ser mantido apenas como histórico se houver necessidade de auditoria, não como fonte ativa.

## Ações para limpeza no GitHub

1. Manter `feature/public-home-registration` como única branch de desenvolvimento.
2. Excluir `feature/dual-plate-draw`, `chore/organize-repository-architecture` e `fix/admin-provision-prisma-esm`.
3. Antes de excluir `planning/foundation`, preservar uma cópia histórica de `docs/TECHNICAL_ROADMAP.md` se for desejável manter trilha de auditoria. A versão atualizada já está na branch oficial, mas o documento antigo tem decisões históricas.
4. Manter `main` intacta.
5. Após a exclusão, voltar a consultar este registro e o `MANUAL-MESTRE.md`; não recriar trabalho em branches antigas.

## Limitação operacional

A integração GitHub disponível nesta sessão permite comparar e ler arquivos, mas não oferece ação de excluir branch. Portanto, **as branches acima estão avaliadas para exclusão, mas continuam existindo no GitHub até serem apagadas pela interface do GitHub ou por uma integração com essa permissão**.
