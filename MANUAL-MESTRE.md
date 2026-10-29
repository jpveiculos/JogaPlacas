# MANUAL-MESTRE — Joga Placas

> **PONTO DE ENTRADA OBRIGATÓRIO PARA QUALQUER TRABALHO NO JOGA PLACAS.**
> Antes de documentar, alterar código, implementar uma funcionalidade ou responder sobre regras do projeto, leia este arquivo e siga os links de fonte de verdade abaixo. Não peça ao usuário para localizar o manual.

## Onde está a documentação oficial

Repositório: [jpveiculos/JogaPlacas](https://github.com/jpveiculos/JogaPlacas)

1. **Especificação funcional vigente (regras do produto e decisões aprovadas):** [docs/PRODUCT_SPEC.md — branch feature/public-home-registration](https://github.com/jpveiculos/JogaPlacas/blob/feature/public-home-registration/docs/PRODUCT_SPEC.md)
2. **Manual técnico de implementação e sequência de trabalho:** [docs/TECHNICAL_ROADMAP.md — branch feature/public-home-registration](https://github.com/jpveiculos/JogaPlacas/blob/feature/public-home-registration/docs/TECHNICAL_ROADMAP.md)
3. **Decisão detalhada de recibo, QR Code e rodadas agendadas:** [docs/decisao-recibo-qr-rodadas-agendadas.md — branch feature/public-home-registration](https://github.com/jpveiculos/JogaPlacas/blob/feature/public-home-registration/docs/decisao-recibo-qr-rodadas-agendadas.md)
4. **Estado oficial das branches e prevenção de trabalho em versões antigas:** [docs/BRANCH-STATUS.md](docs/BRANCH-STATUS.md)
5. **Configuração inicial do Railway e criação segura do primeiro administrador:** [docs/RAILWAY_SETUP.md](docs/RAILWAY_SETUP.md)

## Regra de precedência

- Para **regras do produto**, use `docs/PRODUCT_SPEC.md` na branch de trabalho ativa, atualmente `feature/public-home-registration`.
- Para **arquitetura e sequência técnica**, consulte `docs/TECHNICAL_ROADMAP.md` exclusivamente em `feature/public-home-registration` e confira o estado atual do código antes de reutilizar instruções. Não use `planning/foundation` como fonte de trabalho.
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

Criado em 2026-10-27 para evitar que o manual e as decisões fiquem difíceis de localizar. Em 2026-10-27, a conferência das refs remotas encontrou somente `main` e `feature/public-home-registration`. O manual técnico, a especificação funcional e as decisões de produto estão disponíveis na branch oficial de desenvolvimento. `main` permanece preservada e não deve ser alterada sem autorização explícita.

## Atualização automática e validade das rodadas — 2026-10-28
- Nos formulários de compra do jogador e de venda do cambista, consultar a lista de rodadas disponíveis a cada **2 segundos**, enquanto a página estiver visível. Ao voltar à página/aba, consultar imediatamente.
- Manter o temporizador já existente no cliente para atualizar a exibição no horário de encerramento (cutoffAt). Não adicionar um segundo mecanismo de remoção ou de limpeza da seleção que duplique a regra existente.
- A lista retornada pelas APIs de rodadas deve conter apenas rodadas elegíveis. A filtragem visual no cliente melhora a experiência, mas não substitui a validação autoritativa no servidor.
- **Regra obrigatória para aposta e pagamento:** antes de registrar a compra/venda e antes de iniciar ou confirmar qualquer pagamento Pix, o servidor deve revalidar, no mesmo fluxo transacional, que a primeira rodada continua aberta e que todas as rodadas selecionadas ainda aceitam apostas. Se alguma rodada tiver encerrado, recusar a operação sem registrar aposta nem gerar cobrança válida e devolver erro claro em português; o cliente deve atualizar a lista e pedir que a pessoa selecione rodadas válidas novamente. Não confiar no relógio do dispositivo nem somente no estado do carrossel.
- A consulta a cada 2 segundos foi ajustada no código dos dois formulários. A validação ponta a ponta de concorrência entre encerramento e criação de cobrança precisa ser testada e confirmada antes de considerar o fluxo homologado.


## Área do jogador — menus recolhíveis (2026-10-28)
- O formulário de jogo permanece visível. Carteira digital, histórico de apostas dos últimos 7 dias e últimos resultados ficam em painéis recolhíveis fechados inicialmente, com seta, título e descrição curta.
- Regra documentada em `docs/PRODUCT_SPEC.md` e `MANUAL_TECNICO.md`; validar em dispositivos móveis e desktop após o deploy.


## Formulário do cambista — ordem dos campos (2026-10-28)
- O cartão **Rodadas** fica imediatamente abaixo do botão **Adicionar mais placas** (e da lista de placas já adicionadas), antes do valor e da forma de pagamento. Trata-se de uma reorganização visual; as regras de jogo e pagamento permanecem iguais.


## Cabeçalho visual único — 2026-10-28
- Regra obrigatória: todas as páginas usam `src/components/site-header.tsx`; somente a logomarca oficial centralizada, sem botões, menu, ícones, usuário ou outros elementos no cabeçalho.
- Links da página pública ficam no conteúdo; botão Sair fica no rodapé das áreas autenticadas.
- Ver detalhes e critério de aceite em `docs/PRODUCT_SPEC.md` e `docs/TECHNICAL_ROADMAP.md`, na seção de padronização global do cabeçalho.


## Mapa rápido do repositório

Para identificar a pasta e o arquivo responsável por cada mudança, consulte a seção **“Árvore do repositório e mapa de arquivos”** em [`MANUAL_TECNICO.md`](https://github.com/jpveiculos/JogaPlacas/blob/feature/public-home-registration/MANUAL_TECNICO.md). Ela contém a árvore operacional e uma tabela de localização por funcionalidade.

**Multiplicadores vigentes em 28/10/2026 (`approved-v4`):** unidade 6x, dezena 30x, centena 300x, milhar 3.000x, três letras 3.000x e placa inteira 300.000x. Não usar 9x como regra vigente; o valor histórico só é preservado nos snapshots de apostas antigas.


## Consolidação de branches e administrador inicial — 2026-10-29

- Branch oficial de desenvolvimento: `feature/public-home-registration`. Para a aplicação nova da AcquaCloud Hydro, usar esta branch e deixar o campo Pasta/Root Directory vazio, porque `package.json`, `prisma/` e `src/` ficam na raiz. Não usar `main` como origem de desenvolvimento nem configurar a aplicação com uma branch de correção isolada.
- A branch `fix/hydro-admin-recovery` contém uma recuperação pontual de senha de administrador existente (`scripts/recover-admin.mjs`), não o provisionamento do primeiro administrador em banco vazio. O script exige confirmação explícita e só atualiza uma conta existente com papel ADMIN; não cria usuários. O fluxo para banco novo é `scripts/provision-admin.mjs` na branch oficial.
- O provisionamento vigente na branch oficial usa `ADMIN_USERNAME`, `ADMIN_INITIAL_PASSWORD` e `CONFIRM_ADMIN_PROVISIONING=CREATE_FIRST_ADMIN`; senha inicial mínima de 6 caracteres, hash de senha do próprio sistema e `mustChangePassword=true`. O script não altera a senha nem a conta se já houver administrador. Segredos não devem ser commitados nem enviados em mensagens.
- Comparação de refs em 2026-10-29: `fix/hydro-admin-recovery` divergiu da branch oficial por 2 commits em cada direção e acrescenta `scripts/recover-admin.mjs` e a entrada `admin:recover` em `package.json`. As branches `fix/railway-bootstrap-and-password-minimum` e `fix/railway-bootstrap-audit` estão muito defasadas/divergentes (286 e 291 commits atrás, respectivamente) e contêm documentação/alterações específicas do Railway; não as mesclar integralmente. `main` está 1067 commits atrás da branch oficial na comparação consultada; preservá-la até uma decisão explícita de publicação.
- Política de limpeza: comparar commits e arquivos antes de excluir qualquer branch; preservar as mudanças úteis na branch oficial, atualizar este manual, executar testes e só então remover branches redundantes. Não criar branches adicionais para correções pequenas; consolidar na branch oficial autorizada. Não apagar branches automaticamente antes de verificar o resultado da consolidação.
- Estado operacional: o script de recuperação da branch Hydro foi inspecionado, mas sua integração e testes devem ser confirmados no GitHub antes de declarar concluídos. Não confundir criação inicial de administrador com redefinição de senha de um administrador já existente.


## Implantação no Hydro — 2026-10-29
- O Hydro usa o `Dockerfile` do repositório. O build valida/genera o Prisma Client e compila o Next.js; na inicialização, `start` aplica migrações pendentes, executa o provisionamento idempotente do primeiro administrador e inicia o site. Ver procedimento e requisitos em `MANUAL_TECNICO.md`.
- A configuração `preDeployCommand` de `railway.json` é específica do Railway; não presumir que o Hydro a execute.
- Não resetar nem apagar o banco para corrigir tabelas ausentes. Confirmar logs de migração e login após o deploy.


## Mensagens visíveis em todos os formulários — 2026-10-29
- Regra obrigatória: mensagens de erro em vermelho e sucesso em verde, com texto claro e atributos acessíveis; sempre imediatamente abaixo do botão/ação acionado, nunca somente no topo de formulários longos.
- Aplicar a todos os formulários e ações mutáveis do site, inclusive login/cadastro, cambistas, rodadas, saques, compras/vendas e pagamentos. Preservar dados preenchidos após falha e só confirmar sucesso após resposta positiva do servidor.
- Detalhes, critério de aceite e estado de implementação: consultar a seção “Padrão obrigatório de mensagens em formulários — 2026-10-29” em `MANUAL_TECNICO.md`, `docs/PRODUCT_SPEC.md` e `docs/TECHNICAL_ROADMAP.md`.


## Área do cambista — resumo financeiro (2026-10-29)
- Acima do botão **Sair**, exibir o menu suspenso **Resumo do cambista**, inicialmente fechado.
- Ao abrir, mostrar dois cards: **Saldo total das apostas** e **Saldo total da comissão**, calculados somente com vendas/comissões confirmadas do cambista autenticado.
- A regra vigente e os critérios técnicos estão em `MANUAL_TECNICO.md` e `docs/PRODUCT_SPEC.md`. Essa decisão substitui a instrução antiga de remover todo resumo financeiro, mas não permite histórico detalhado, segunda via nem pagamento de prêmios pelo cambista.
