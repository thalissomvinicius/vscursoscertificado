# Publicacao

O esquema `vscertificates` e privado e nao deve ser adicionado aos esquemas expostos pela API do Supabase. `schema.sql` e a migracao inicial; aplique apenas em um projeto dedicado vazio.

Crie uma credencial PostgreSQL exclusiva para o servidor, com LOGIN e NOINHERIT, sem SUPERUSER, CREATEDB, CREATEROLE ou BYPASSRLS. Conceda somente USAGE no esquema, SELECT/INSERT/UPDATE/DELETE nas suas tabelas e USAGE/SELECT nas suas sequencias. As politicas RLS dessas tabelas devem permitir esse papel especifico, nunca `anon`, `authenticated` ou `PUBLIC`.

A conexao usa o usuario `PAPEL.PROJECT_REF`, host e porta do Transaction pooler mostrados em Connect no Supabase. Grave a URI como variavel sensivel `VS_DATABASE_URL` na Vercel, sem parametros que desativem a validacao TLS. O certificado publico incluido foi obtido do endereco oficial usado pelo painel do Supabase:

https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Configure `VS_DATABASE_SCHEMA=vscertificates` em producao e um esquema de testes separado em preview. Nunca rode a suite de testes contra producao: ela exige explicitamente `vscert_test`. A criacao de usuarios pela internet so funciona para um administrador autenticado. Migre o primeiro administrador local de maneira privada, preservando seu hash scrypt, sem enviar senhas ou arquivos SQLite para o repositorio.

Antes da publicacao, execute `npm run check`, `npm test`, `npm audit` e os testes de navegador. Confira `/server.js`, `/storage.js`, `/package.json` e `/.data/vscursos.sqlite`: todos devem retornar 404. O acesso anonimo a `/api/certificates` deve retornar 401.

Para atualizar, publique em uma branch de preview, teste o fluxo real e depois envie para `main`. A Vercel gera uma nova versao com as variaveis de producao; nao promova diretamente um deployment que usa o banco de testes.

Baixe backups externos regularmente. Os snapshots internos compartilham o limite de armazenamento do projeto e nao substituem copias em outro local. O plano gratuito pode pausar por inatividade; acompanhe armazenamento, uso e disponibilidade no painel do Supabase.
