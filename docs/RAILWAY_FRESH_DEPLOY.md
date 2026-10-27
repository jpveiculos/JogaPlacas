# Railway — instalação limpa e primeiro administrador

Este roteiro é para um **novo ambiente de desenvolvimento**, com um PostgreSQL novo e vazio. Não use para apagar ou recriar um banco que contenha dados que deseja manter.

## 1. Conecte o repositório

- Repositório: `jpveiculos/JogaPlacas`
- Branch: `fix/railway-bootstrap-audit` (após revisão e integração das correções)
- Root Directory: deixe vazio, pois `package.json`, `prisma/` e `src/` ficam na raiz.
- Build command: deixe o padrão do Railpack; o script `npm run build` valida o Prisma, gera o cliente e compila o Next.js.
- Pre-deploy command: `npm run db:deploy`
- Start command normal: deixe vazio para usar o padrão detectado, ou `npm start`.

Não configure o provisionamento do administrador como pre-deploy permanente. O bootstrap é uma operação separada e controlada.

## 2. Configure as variáveis essenciais

No serviço web, no ambiente correto:

- `DATABASE_URL`: referência/URL do PostgreSQL desse mesmo projeto e ambiente.
- `AUTH_SECRET`: segredo aleatório forte e exclusivo do ambiente; não reutilize um valor publicado.
- `APP_BASE_URL`: URL pública HTTPS final do serviço, sem barra no final.
- `NODE_ENV`: `production` (normalmente definido pelo ambiente de execução).

Não copie uma URL de banco de outro ambiente. Nunca compartilhe valores de segredo em capturas de tela.

As variáveis de Mercado Pago, criptografia Pix e scheduler só devem ser configuradas quando os respectivos recursos forem habilitados. Use `.env.example` como referência, não como arquivo de valores reais.

## 3. Faça a primeira implantação do banco

1. Confirme que `DATABASE_URL` aponta para o PostgreSQL novo.
2. Deixe o pre-deploy command como `npm run db:deploy`.
3. Faça deploy e confirme que a etapa de migrações terminou com sucesso.
4. Se o deploy falhar, pare e corrija o erro antes de continuar.

A migração cria a estrutura; **não cria o administrador**.

## 4. Crie o primeiro administrador uma única vez

O script `npm run admin:provision` cria a conta com `mustChangePassword=true`. Para executá-lo no ambiente do serviço, faça uma janela de bootstrap temporária:

1. Adicione temporariamente estas variáveis ao serviço:
   - `ADMIN_USERNAME`: nome desejado, com 3–50 caracteres: letras minúsculas, números, ponto, sublinhado ou hífen.
   - `ADMIN_INITIAL_PASSWORD`: senha inicial aleatória com pelo menos 12 caracteres.
   - `CONFIRM_ADMIN_PROVISIONING`: exatamente `CREATE_FIRST_ADMIN`.
2. Altere temporariamente o Start Command para `npm run admin:provision && npm start`.
3. Faça um deploy e abra os logs. Procure por uma destas mensagens:
   - `Created first administrator:` — a conta foi criada.
   - `Administrator already exists` — já existia um administrador; o script não alterou conta ou senha.
   - `Administrator provisioning failed:` — houve erro; não prossiga até entendê-lo.
4. Depois de confirmar a mensagem de sucesso ou a existência prévia, remova as três variáveis temporárias e restaure o Start Command padrão (ou `npm start`). Faça novo deploy para deixar o serviço sem a senha inicial no ambiente.
5. Se o log disser que o administrador já existe e você não conhece a senha, **não** espere que o bootstrap a redefina: ele deliberadamente não altera contas existentes. Para um ambiente novo, confirme que o banco conectado é realmente o banco vazio esperado antes de repetir o procedimento.

O script agora é seguro para repetição: se já houver administrador, sai com sucesso e não modifica nenhuma conta. Ele também impede que o nome de usuário de uma conta comum seja convertido em administrador.

## 5. Teste o acesso

1. Abra a URL HTTPS pública do serviço e entre com o nome e a senha inicial definidos no bootstrap.
2. A primeira autenticação deve direcionar para a troca de senha.
3. Escolha uma nova senha com pelo menos 12 caracteres e conclua a troca.
4. Confirme que a sessão permanece ativa e que a área administrativa abre.
5. Saia e entre novamente com a nova senha.

O login normaliza o nome de usuário para minúsculas, da mesma forma que o cadastro e o bootstrap. A senha diferencia maiúsculas e minúsculas.

## 6. Diagnóstico objetivo

- `Usuário ou senha inválidos.`: confira a mensagem do bootstrap, o serviço/ambiente e o banco ao qual `DATABASE_URL` aponta; não publique a senha.
- `Requisição inválida.`: confira se acessou a URL pública correta e HTTPS; não teste pela URL interna do contêiner.
- Erro de conexão/migração: confira os logs de pre-deploy e a referência de `DATABASE_URL`.
- Build verde sozinho não prova que existe uma conta administrativa; o log de bootstrap e o teste real de login são etapas separadas.

Não faça reset nem exclusão de banco como diagnóstico. Confirme o ambiente e a mensagem específica primeiro.
