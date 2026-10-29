# Estratégia de migração do Joga Placas

## Estado atual

A branch planning/foundation contém um schema Prisma refatorado, mas não foi encontrada uma sequência versionada em prisma/migrations/. Não executar prisma migrate deploy, db push ou alterações manuais no banco de produção para compensar essa ausência.

## Gate 0 — identificar o banco de destino

Antes de gerar SQL, confirmar por configuração (sem imprimir segredos) qual banco corresponde a cada ambiente. Nunca usar a URL de produção em testes, reset, migrate dev ou geração de baseline. Se não for possível provar que o destino é descartável, interromper.

## Gate 1 — tornar o estado atual reproduzível

1. Confirmar a branch e o commit exatos usados pelo ambiente atual.
2. Conferir o schema, scripts, versões de Prisma e driver PostgreSQL.
3. Criar e versionar um lockfile com o gerenciador de pacotes adotado; CI deve usar instalação congelada (npm ci para npm).
4. Executar prisma validate, prisma generate, lint, typecheck, testes e build no mesmo commit.
5. Registrar resultados e versões; não considerar apenas o status do deploy como prova dos testes.

## Gate 2 — desenhar a transição de dados

1. Comparar o schema anterior e o novo e enumerar cada campo/modelo removido, renomeado ou dividido.
2. Mapear explicitamente a transformação dos modelos antigos de aposta para compra, participação e linhas.
3. Definir tratamento de pagamentos, recibos, saldos, livro-razão, saques e auditoria históricos.
4. Toda transformação deve preservar IDs/referências e totais financeiros; registros sem mapeamento bloqueiam a migração até haver decisão explícita.
5. Separar mudanças aditivas de mudanças destrutivas; nenhuma coluna/tabela antiga deve ser removida no mesmo passo em que os dados deixam de ser consultáveis.

## Gate 3 — gerar e testar em PostgreSQL descartável

1. Criar uma migração Prisma versionada a partir de uma base isolada equivalente ao schema anterior.
2. Inspecionar o SQL manualmente, especialmente DROP, ALTER TYPE, NOT NULL, índices únicos e chaves estrangeiras.
3. Restaurar uma cópia anonimizada/representativa em banco descartável e executar a migração.
4. Comparar contagens, chaves órfãs, duplicidades e totais financeiros antes/depois.
5. Executar testes de leitura e escrita e verificar rollback/recuperação por backup. O rollback operacional pode exigir restaurar backup; não presumir que toda migração de dados tenha rollback automático.

## Gate 4 — ensaio e implantação

1. Fazer ensaio cronometrado com backup verificado e plano de retorno documentado.
2. Definir janela de manutenção e impedir gravações concorrentes durante operações incompatíveis.
3. Exigir aprovação explícita antes de qualquer migração ou implantação em produção.
4. Após implantação autorizada, verificar saúde da aplicação, contagens e reconciliação financeira antes de reabrir operações.
5. Manter a versão anterior e o backup recuperável até concluir a reconciliação.

## Bloqueios atuais

- A pasta prisma/migrations/ não foi encontrada na branch revisada.
- O lockfile precisa ser confirmado/criado e o CI padronizado para instalação congelada.
- A conversão de dados históricos ainda precisa de um mapa detalhado e de ensaio em PostgreSQL descartável.
- Concorrência de criação/idempotência e fechamento de rodada ainda precisam de testes de integração com PostgreSQL; testes unitários puros não provam o comportamento de isolamento transacional.

## Regra de segurança

Mercado Pago, Pix real e webhooks permanecem fora do escopo até que os gates de schema, serviço de compra, concorrência, testes, dependências e migração tenham evidências aprovadas. Nenhum comando de migração deve apontar para produção durante esta fase.
