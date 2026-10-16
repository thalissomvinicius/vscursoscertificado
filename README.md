# VS Cursos · Certificados

Sistema de emissão e gestão de certificados com banco SQLite local, contas de acesso e histórico dos PDFs originais. Requer **Node.js 24 ou superior**. Não há dependências npm de produção nem necessidade de conexão com a internet para uso local.

## Iniciar

No Windows, abra `iniciar.cmd`. Pelo terminal:

```powershell
npm start
```

Abra `http://127.0.0.1:5174`. No primeiro acesso, crie o administrador e escolha uma senha de pelo menos 12 caracteres. O acesso antigo com senha fixa foi removido. Para parar, encerre o processo com Ctrl+C.

Caso a porta esteja ocupada:

```powershell
$env:PORT = '5175'
npm start
```

## Operação

- **Painel:** indicadores, emissões por curso, atividade recente e histórico.
- **Emissão:** prévia frente/verso, datas de conclusão ou período, assinaturas com ajuste direto e zoom, conteúdo editável e rascunho automático.
- **Histórico:** busca por nome, CPF com ou sem pontuação, empresa, curso e código; filtros por situação, curso e data de criação; paginação, duplicação e exclusão de rascunhos.
- **Emissão definitiva:** o botão de PDF registra o certificado e guarda o arquivo original no banco. A reimpressão baixa exatamente o mesmo arquivo, mesmo após mudar a identidade da empresa.
- **Correção:** uma emissão não é sobrescrita. Duplique o certificado, corrija os dados e emita um novo registro. O administrador pode cancelar o registro anterior informando o motivo.
- **Turmas:** importe ou cole `Nome;CPF;Empresa`, confira os alunos e grave até 200 rascunhos. No histórico, selecione até 50 rascunhos para emissão em lote. PDFs salvos podem ser reunidos em ZIP, até 100 arquivos e 150 MB por download.
- **Relatórios:** PDF e CSV dos registros que atendem aos filtros; PDF individual dos dados coletados. Os CSVs neutralizam fórmulas de planilha.
- **Configurações:** empresa, CNPJ, contatos, logo, instrutor e assinatura padrão, endereço público para o QR, backup, usuários, senha e registro das ações.

A prévia e as imagens exportadas são instrumentos de edição. A emissão que aparece na consulta pública é a registrada pelo botão de PDF. Os PDFs anteriores a esta atualização não podem ser reconstruídos automaticamente: a versão antiga não mantinha banco ou histórico.

## Banco e backup

Os dados, PDFs, assinaturas, usuários e sessões ficam em `.data/vscursos.sqlite`. O servidor usa transações e controle de revisão dos rascunhos. Duas abas não sobrescrevem silenciosamente o mesmo registro.

Há cópias SQLite automáticas na inicialização, a cada 24 horas e antes de uma restauração. São mantidas as sete cópias mais recentes em `.data/backups`. Essas cópias estão no mesmo disco: baixe backups pelo painel e guarde uma cópia em outro local para recuperação de falha do computador.

O backup JSON da tela contém os certificados, PDFs e identidade da empresa. A restauração é atômica e não sobrescreve registros em conflito. Senhas e sessões não são incluídas nesse formato. Em uma instalação vazia, a identidade da empresa também é restaurada. O limite de importação é 120 MB; para bases maiores, use o botão **Backup completo (SQLite)**, que também inclui usuários, senhas protegidas e histórico de ações.

Para recuperar o banco inteiro: pare o servidor, preserve a pasta `.data` atual, copie um snapshot de `.data/backups` para uma **nova pasta** com o nome `vscursos.sqlite`, defina `VS_DATA_DIR` com essa pasta e reinicie. Não misture arquivos WAL antigos com um snapshot restaurado.

É possível mudar a localização do banco:

```powershell
$env:VS_DATA_DIR = 'C:\VS-Cursos-Dados'
npm start
```

Não use uma pasta compartilhada por dois servidores simultâneos. Para OneDrive ou outro sincronizador, prefira sincronizar o backup fechado, não o banco ativo.

## Contas

Administradores gerenciam a empresa, equipe, cancelamentos e backups. Operadores preenchem, emitem, consultam e baixam certificados. Usuários desativados perdem suas sessões; seus registros são preservados. A mudança de senha encerra as outras sessões da conta.

Recuperação de senha com acesso físico ao computador:

```powershell
node manage.js reset-password nome-do-usuario
```

A senha é solicitada no terminal sem exibição. A recuperação fica registrada na auditoria.

## Consulta pública e hospedagem

O QR contém somente um código aleatório. A consulta lê o banco, mascara o CPF e indica emissões canceladas. Informações fornecidas na URL não são consideradas prova de autenticidade.

Por padrão, a aplicação só atende neste computador. Um QR apontando para `127.0.0.1` não será acessível em outro aparelho. Para consulta pela internet, hospede **este servidor e seu banco**, configure HTTPS e informe a URL pública nas configurações antes de emitir. GitHub Pages não executa o servidor nem o banco desta versão.

Variáveis disponíveis:

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `PORT` | `5174` | Porta HTTP |
| `HOST` | `127.0.0.1` | Interface de escuta |
| `VS_DATA_DIR` | `.data` | Diretório persistente |
| `VS_ALLOWED_HOSTS` | somente loopback | Domínios/IPs permitidos, separados por vírgula, sem protocolo ou porta |
| `VS_SECURE_COOKIE` | `0` | Defina `1` para acesso por HTTPS atrás de proxy |
| `VS_TIMEZONE` | `America/Sao_Paulo` | Datas dos indicadores e filtros |

O proxy deve preservar o cabeçalho Host. O primeiro administrador deve ser configurado pelo acesso local antes de disponibilizar o domínio público. O servidor não confia automaticamente em cabeçalhos de proxy. O banco precisa de volume persistente e backup externo na hospedagem.

## Cursos e responsabilidade de emissão

Os conteúdos são modelos editáveis. A geração de um documento não comprova, por si só, a realização de treinamento, habilitação de instrutores ou atendimento a todas as exigências da norma. A empresa emissora deve conferir conteúdo, carga horária, função, local, documentação e assinaturas exigidos para o treinamento realizado.

A NR 33 separa trabalhador/vigia e supervisor, inicial e reciclagem. O sistema bloqueia cargas menores que 16 h para trabalhador/vigia inicial, 40 h para supervisor inicial e 8 h para reciclagem, com base no [Anexo III da NR 33 publicado pelo Ministério do Trabalho](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-33-atualizada-2022-_retificada.pdf).

## Verificação técnica

```powershell
npm run check
npm test
npm audit
```

Os testes de servidor usam banco temporário e não alteram os dados reais. Os testes visuais adicionais em `tests/browser.cjs` e `tests/pdf-visual.cjs` usam Playwright, Chrome, PDF.js, Sharp, JSZip e canvas disponíveis no ambiente de desenvolvimento. Eles não são necessários para executar o sistema. Configure `NODE_PATH` com o diretório de ferramentas quando executá-los. Evidências ficam em `test-results`, fora do versionamento.

Veja `AUDITORIA.md` para o resultado e o escopo dos testes. Bibliotecas do navegador estão incluídas localmente. Licenças de Lucide e JSZip acompanham seus arquivos; html2canvas, jsPDF e QRCode mantêm seus avisos nos arquivos distribuídos.

Desenvolvido por Vinicius Dev.
