# Arquitetura do JogaPlacas

## Estado atual (Next.js full-stack)

O JogaPlacas usa **um único aplicativo Next.js** com App Router. Portanto, a interface e os endpoints de servidor compartilham o mesmo projeto e o mesmo pipeline de build. Criar pastas `frontend/` e `backend/` vazias ou mover `src/app` sem migrar imports, rotas, Prisma e configuração quebraria a aplicação; não é uma separação segura neste momento.

## Mapa da raiz

```text
/
├── src/
│   ├── app/                 # páginas, layouts e endpoints HTTP do Next.js
│   ├── components/          # componentes de interface reutilizáveis
│   ├── modules/             # casos de uso e regras de negócio por domínio
│   ├── lib/                 # infraestrutura compartilhada (auth, banco, utilitários)
│   └── generated/prisma/    # cliente Prisma gerado; não editar manualmente
├── prisma/
│   ├── schema.prisma        # modelo de dados
│   └── migrations/          # histórico versionado do banco
├── scripts/                 # tarefas operacionais e manutenção
├── tests/                   # testes de integração/apoio, quando aplicável
├── docs/                    # especificações, roadmap e decisões técnicas
├── public/                  # arquivos estáticos servidos diretamente
├── .github/workflows/       # CI: validação, testes e build
├── package.json             # scripts e dependências do app
├── package-lock.json        # lockfile npm; manter sincronizado com package.json
├── tsconfig.json            # configuração TypeScript
├── next.config.*            # configuração Next.js
└── eslint.config.*          # regras de lint
```

> O mapa acima descreve os papéis arquiteturais esperados. Alguns diretórios podem não existir em todos os commits; não criar pastas vazias só para preencher a árvore.

## Responsabilidade de cada camada

- **Interface:** componentes React e páginas em `src/app` e `src/components`.
- **Rotas HTTP:** handlers em `src/app/api/**/route.ts`, mantendo convenções do Next.js.
- **Regras de negócio:** `src/modules/<domínio>/`; páginas e handlers devem chamar casos de uso, não duplicar regras.
- **Infraestrutura:** `src/lib/` para autenticação, acesso ao banco e integrações compartilhadas.
- **Banco:** schema e migrations em `prisma/`; nunca alterar o banco de produção manualmente para contornar uma migration.
- **Código gerado:** `src/generated/prisma/` é saída de `prisma generate`; não editar à mão.
- **Operações:** scripts em `scripts/`, com variáveis documentadas e sem segredos versionados.
- **Qualidade:** testes, ESLint, TypeScript e build devem passar antes de promover uma alteração.

## Convenções para manter a estrutura limpa

1. Não criar uma segunda aplicação `frontend/` ou `backend/` enquanto o deployment estiver configurado para compilar o Next.js na raiz.
2. Não mover rotas, módulos ou schema sem atualizar imports, testes, scripts, workflow e configuração de deployment na mesma mudança.
3. Cada domínio de negócio deve concentrar seus casos de uso e testes; UI não deve ser a fonte das regras de negócio.
4. Alterações de schema exigem migration versionada e testes de compatibilidade.
5. Segredos ficam nas variáveis do ambiente de execução, nunca em arquivos commitados.
6. A árvore só deve ser considerada reorganizada depois de `npm ci`, validação/generation do Prisma, lint, typecheck, testes e build passarem no CI.

## Decisão de arquitetura

**Não migrar para monorepo separado agora.** Primeiro estabilizar o aplicativo atual e a validação automatizada. Uma divisão física `apps/web` + `apps/api` só deve ocorrer em uma mudança própria, com plano de deploy, roteamento, autenticação, banco e testes; não como simples movimentação de pastas.
