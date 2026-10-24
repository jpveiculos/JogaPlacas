# Plano de autenticação e autorização

Status: autenticação inicial implementada na branch `planning/foundation`; ainda não aprovada para produção.
A CI do commit `c0fbd833a4fc5b05ef2fe396ac12dbf079dc0ea8` passou nos três jobs (verificação, migrações e testes PostgreSQL). Commits posteriores de preparação/deferimento de provisionamento ainda precisam de CI própria.
Este documento não habilita acesso administrativo nem substitui código/testes.

## Decisão de segurança

Já existem hash de senha, login/logout e sessões opacas persistidas. Ainda não existe fluxo completo de autorização administrativa. Não expor rotas privilegiadas até concluir as pendências abaixo.

### Identidade e credenciais
- Usar o modelo `User` existente; nunca aceitar `role`, `userId` ou `isAdmin` fornecidos pelo cliente como prova de identidade.
- Armazenar apenas hashes de senha produzidos por algoritmo de derivação apropriado para senhas (preferencialmente Argon2id, com parâmetros documentados; avaliar compatibilidade de runtime antes de fixar a dependência).
- Login deve usar respostas genéricas para usuário inexistente, senha incorreta e conta bloqueada, com limitação de tentativas e auditoria sem registrar senha, cookie ou token.
- Provisionar a primeira conta administrativa por comando operacional de servidor que lê credenciais de variáveis de ambiente/segredos; não criar administrador por cadastro público e não enviar segredos ao navegador.
- Após provisionamento, exigir troca de senha inicial se houver senha temporária; não registrar a senha temporária em logs.

### Sessão
- Preferir sessão opaca, aleatória e revogável, armazenada no servidor/banco com expiração e rotação. O navegador recebe apenas cookie `HttpOnly`, `Secure` em HTTPS, `SameSite=Lax` (ou mais restritivo quando compatível), `Path=/` e sem atributo `Domain`.
- Guardar no banco somente o hash do identificador da sessão; nunca persistir o token em texto claro.
- Validar expiração, revogação, estado atual da conta e papel atual no banco em cada requisição privilegiada.
- Invalidar a sessão no logout e ao bloquear/desativar uma conta; considerar rotação após login e mudança de privilégios.
- Operações autenticadas que alteram estado devem ter proteção contra CSRF compatível com cookies e validação de origem.

### Autorização da operação de fechamento
- O handler de fechamento deve exigir método HTTP apropriado, validar o corpo com schema estrito e rejeitar identificadores malformados.
- A autorização deve ocorrer no servidor a partir da sessão validada e do registro `User` atual; somente `ADMIN` com conta `ACTIVE` pode prosseguir.
- O papel nunca vem do corpo, query string, cabeçalho customizado ou estado do frontend.
- O handler chama `closeRound` somente depois da autenticação/autorização. Preservar a transação, o lock e a validação do cutoff do serviço.
- Registrar evento de auditoria para sucesso e tentativas privilegiadas negadas, sem dados secretos.
- Respostas esperadas: `401` sem sessão válida, `403` para conta autenticada sem permissão, `400` para entrada inválida, `404` para rodada inexistente e resposta de conflito adequada para rodada ainda não fechável/cutoff não atingido.

## Plano de implementação e critérios de aceite

1. Implementado nesta etapa: hash de senha com `scrypt` nativo do Node.js (N=16384, r=8, p=1, salt aleatório de 16 bytes e chave de 64 bytes), tabela `Session` e migração Prisma. A escolha evita dependência nativa adicional; reavaliar Argon2id antes de produção.
2. Implementação inicial: acesso Prisma server-only, validação de credenciais, sessão opaca aleatória (token de 256 bits), persistência somente de SHA-256 do token, expiração em 12 horas, revogação e cookie HttpOnly/SameSite=Lax.
3. Ainda pendente: provisionamento administrativo por comando operacional executável e testado. Não foi adicionado endpoint público de criação de administrador. Não executar provisionamento em produção nesta etapa.
4. Testes adicionados para hash/verificação, sal aleatório, senha fraca, entrada inválida, origem cruzada, credenciais genéricas, conta bloqueada e cookie de sessão/logout. Ainda faltam limitação de tentativas resistente a múltiplas instâncias, testes de integração de sessão real no PostgreSQL (incluindo expiração/revogação), auditoria e fluxo para troca de senha inicial. `mustChangePassword` existe no modelo, mas ainda não há fluxo de troca que permita considerar essa proteção concluída.
5. Implementar a rota de fechamento e testes de autorização: anônimo = 401; jogador = 403; cambista = 403; administrador ativo = pode chamar o serviço; administrador bloqueado = negado; corpo inválido = 400.
6. Executar lint, typecheck, testes, build, migração em banco descartável e os testes PostgreSQL de concorrência.
7. Só considerar a integração pronta quando todos os critérios forem comprovados pela CI. Não implantar em produção como parte desta etapa.

## Limites operacionais

- Trabalhar apenas na branch `planning/foundation`; não modificar `main`.
- Não acessar banco ou segredos de produção, não provisionar conta real, não implantar e não iniciar cobranças/webhooks.
- A rota de fechamento permanece inexistente até a autenticação e autorização acima serem implementadas e verificadas.
