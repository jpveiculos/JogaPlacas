# Registro de branches — Joga Placas

> **REGRA OPERACIONAL: não iniciar trabalho novo em branches marcadas como obsoletas.** A branch de trabalho consolidada é `feature/public-home-registration`, até que uma decisão explícita a substitua. Não usar branches históricas como fonte de implementação sem comparar o conteúdo com a branch consolidada.

Auditoria inicial realizada em 2026-10-27 comparando as branches encontradas no GitHub com `feature/public-home-registration`. Os contadores são relativos a essa referência e não significam, por si só, que todos os conteúdos exclusivos tenham sido incorporados.

## Estado por branch

| Branch | Comparação inicial | Orientação |
|---|---|---|
| `feature/public-home-registration` | Branch de referência atual | **ATIVA — usar para o trabalho novo** |
| `feature/dual-plate-draw` | 0 commits exclusivos; 66 commits atrás da referência | **OBSOLETA — não usar para trabalho novo**; confirmar antes de excluir |
| `chore/organize-repository-architecture` | 1 commit exclusivo; 55 commits atrás; adiciona `ARCHITECTURE.md` | **ARQUIVAMENTO PENDENTE** — revisar/salvar o conteúdo exclusivo antes de excluir |
| `fix/admin-provision-prisma-esm` | 2 commits exclusivos; 55 commits atrás; altera `package.json` | **ARQUIVAMENTO PENDENTE** — conferir a alteração de dependência/script antes de excluir |
| `planning/foundation` | 1 commit exclusivo e grande divergência em relação à referência; contém `docs/TECHNICAL_ROADMAP.md` | **DOCUMENTAÇÃO DE REFERÊNCIA HISTÓRICA — não usar para desenvolvimento novo**; não excluir até consolidar/reconciliar o manual técnico |
| `main` | 0 commits exclusivos; 765 commits atrás da referência | **PROTEGIDA — não alterar nem excluir**; manter separada da branch de desenvolvimento e produção até autorização explícita |

## Procedimento obrigatório

1. Iniciar toda implementação nova em `feature/public-home-registration`.
2. Consultar primeiro `MANUAL-MESTRE.md` e a especificação funcional vigente.
3. Não copiar commits de branches históricas por inteiro sem comparar o diff.
4. Antes de excluir uma branch, garantir que seu conteúdo exclusivo útil esteja preservado na branch de referência ou em documentação arquivada.
5. Não excluir nem alterar `main`, nem alterar produção, sem autorização explícita.
6. Depois de concluir a reconciliação, atualizar este registro com a decisão final por branch.

## Limitação desta auditoria

A comparação de commits identificou arquivos/commits exclusivos, mas não prova que essas alterações foram incorporadas ou que não tenham valor. O conector disponível nesta sessão não expõe uma operação de excluir/desativar branches. Portanto, este registro impede operacionalmente que branches marcadas como obsoletas sejam tratadas como válidas, mas não altera o estado técnico dessas branches no GitHub. A exclusão deve ser feita pelo GitHub ou por uma integração autorizada que ofereça essa ação, depois da reconciliação do conteúdo exclusivo.
