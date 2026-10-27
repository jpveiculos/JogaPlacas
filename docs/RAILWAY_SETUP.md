# Configuração inicial no Railway

Este guia é para um ambiente novo de desenvolvimento do Joga Placas. Não use os passos para um banco de produção que já contenha dados sem revisar o ambiente e as variáveis.

## Conectar os serviços

1. Conecte o serviço web ao repositório `jpveiculos/JogaPlacas` e selecione a branch de desenvolvimento aprovada.
2. Adicione um PostgreSQL no mesmo projeto Railway.
3. No serviço web, configure `DATABASE_URL` usando a referência privada do serviço PostgreSQL, não uma URL pública. Use a referência de variável oferecida pelo Railway para o banco correto.
4. Gere um `AUTH_SECRET` aleatório e mantenha-o secreto.
5. Configure `APP_BASE_URL` com o domínio HTTPS público do serviço web.
6. Para o primeiro deploy sem administrador, configure temporariamente:
   - `ADMIN_USERNAME`: usuário inicial (3–50 caracteres; letras minúsculas, números, ponto, sublinhado ou hífen).
   - `ADMIN_INITIAL_PASSWORD`: senha inicial com pelo menos 6 caracteres.
   - `CONFIRM_ADMIN_PROVISIONING`: exatamente `CREATE_FIRST_ADMIN`.

## O que o deploy executa

O arquivo `railway.json` configura o pré-deploy para executar:

```sh
npm run db:deploy && npm run admin:provision
```

A primeira parte aplica as migrações. A segunda cria o primeiro administrador se ainda não existir. O script usa um bloqueio transacional no PostgreSQL para evitar duas criações simultâneas. Se já existir um administrador, termina com sucesso sem alterar conta ou senha. Se não existir e faltarem as variáveis de bootstrap, o pré-deploy falha com uma mensagem explícita, em vez de publicar silenciosamente uma aplicação sem administrador.

Depois de confirmar no log `Created first administrator`, faça login usando `ADMIN_USERNAME` e `ADMIN_INITIAL_PASSWORD`. A primeira sessão exigirá a troca da senha. Após a criação, remova `ADMIN_INITIAL_PASSWORD` e `CONFIRM_ADMIN_PROVISIONING` das variáveis do serviço; mantenha somente as variáveis necessárias ao funcionamento normal. O usuário e a senha nunca devem ser incluídos no Git.

## Se o pré-deploy falhar

Abra os logs da etapa Pre-deploy e leia a mensagem completa. Verifique se o banco certo está conectado, se `DATABASE_URL` aponta para ele e se as variáveis temporárias foram preenchidas corretamente. Não habilite acesso público ao PostgreSQL para resolver problemas de conexão interna. Não apague nem recrie o banco como primeira tentativa.

## Segurança

- Não copie valores secretos para conversas, issues ou commits.
- Não use este bootstrap para redefinir uma senha existente: ele não faz isso.
- Não rode testes de integração destrutivos contra produção.
