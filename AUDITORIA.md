# Auditoria técnica · VS Cursos

**Data:** 4 de outubro de 2026. **Versão:** 2.0.0. **Resultado:** fluxos implementados e verificados para operação local com Node.js 24.

## Achados e correções

| Área | Situação anterior | Correção entregue |
| --- | --- | --- |
| Acesso | Usuário e senha fixos no HTML; sessão simulada no navegador | Primeiro administrador configurado localmente; senhas com scrypt e sal; cookie HttpOnly; validação no servidor |
| Gravação | Dados e assinaturas desapareciam ao fechar a página | SQLite persistente; rascunho automático; histórico com recuperação de campos, imagens, tamanho e posição |
| Autenticidade | A consulta aceitava aluno, CPF e curso da URL como prova | Código aleatório gerado no servidor; consulta exclusivamente ao banco; CPF mascarado; rascunhos não confirmados |
| PDF | Sem arquivo original arquivado; exportação pesada | PDF de duas páginas guardado como BLOB; SHA-256; reimpressão idêntica; rasterização com JPEG de alta qualidade |
| Correção | Sem estados formais de emissão | Rascunho, emitido e cancelado; emissão imutável; duplicação; cancelamento com motivo, autor e data |
| Concorrência | Nenhuma proteção contra duas abas | Revisões de rascunhos e transações; segunda emissão simultânea bloqueada |
| Identidade | Dados da empresa sem controle central | Configuração administrativa; identidade congelada no registro; servidor ignora substituição arbitrária de marca pelo cliente |
| Conteúdo | Corte após 20 tópicos e truncamento das linhas | Até 40 tópicos, sem corte silencioso; tamanho ajustado; bloqueio quando o verso não comporta o texto |
| Assinaturas | Ajuste restrito à prévia sem persistência | Upload validado; posição e tamanho gravados; edição direta com cantos; centralização quando há apenas uma; remoção e assinatura padrão |
| NR 33 | Carga de 8 h indistinta | Inicial/reciclagem e função separados; pisos de 16/40/8 h validados no cliente e no servidor |
| Histórico | Inexistente | Indicadores, busca por nome/CPF/empresa/código, filtros, paginação, consulta e reimpressão |
| Turmas | Um certificado por preenchimento | Importação de até 200 alunos, conferência, emissão de até 50 rascunhos por lote, interrupção e ZIP dos PDFs |
| Relatórios | Resumo individual apenas | PDF de dados, relatório filtrado, CSV com proteção contra fórmulas e crédito do desenvolvedor |
| Recuperação | Sem backup | Snapshots SQLite; backup JSON de certificados; restauração atômica; download integral do banco |
| Equipe | Conta única com senha compartilhada | Administrador e operador; desativação; troca de senha; registro das ações; recuperação local pelo terminal |
| Segurança HTTP | Arquivos privados potencialmente servidos como estáticos | Lista explícita de arquivos públicos; banco e código do servidor não servidos; restrição de Host, Origin e métodos; CSP e anti-enquadramento externo |
| Design | Uma tela de formulário longo | Navegação, painel operacional, seções recolhíveis, estados de gravação, prévia frente/verso, zoom e layouts responsivos |

## Evidências

**15 testes automatizados de servidor passaram.** A suíte verifica CPF, datas, carga horária, bloqueio de acesso, CSRF, configuração do administrador, identidade da marca, controle de revisão, consulta por QR, preservação de PDF, emissão concorrente, cancelamento, permissões, lote atômico, backup, troca de senha e persistência após reinício.

Cobertura medida somente em `core.js` e `server.js`: **96,20% de linhas**, **70,71% de ramos** e **92% de funções**. A cobertura não representa a totalidade da interface ou uma garantia de ausência de defeitos.

O teste Playwright em Chrome percorreu o primeiro acesso, emissão, seleção da NR 33, período, upload, arraste e redimensionamento da assinatura, gravação automática, recarga, emissão, reimpressão, consulta sem login, busca, relatório, configuração, backup, importação de turma, emissão em lote e ZIP. **Nenhum erro JavaScript** ocorreu nesse percurso.

Foram verificadas larguras de **360, 390, 768 e 1440 pixels**, sem transbordamento horizontal da página. No celular, cada certificado aparece como um registro completo, com informações e ações visíveis. A tabela no tablet e o certificado ampliado usam rolagem dentro da própria área. Capturas estão em `test-results`.

O PDF foi aberto e rasterizado com PDF.js para comparação com os canvases de exportação:

| Página | Resultado | Diferença média por canal de cor, escala 0–255 |
| --- | --- | --- |
| Frente | Conteúdo presente; duas páginas no arquivo | Aproximadamente 0,35 |
| Verso | Conteúdo presente; QR e tópicos presentes | Aproximadamente 0,34 |

O certificado usado no teste ficou próximo de **0,75 MB**. A reimpressão foi comparada byte a byte e retornou o mesmo PDF. O teste de emissão em lote confirmou dois PDFs dentro do ZIP. Todos os dados e a imagem de assinatura dos testes são fictícios; o banco de teste é temporário e separado da instalação real.

## Revisão visual: azul e branco

A interface usa azul `#155eef`, branco e cinzas neutros, com navegação lateral no computador, indicadores legíveis, filtros e ações consistentes. Login, painel, editor, configurações e verificação seguem a mesma identidade. Os novos certificados e relatórios PDF também usam essa paleta; PDFs anteriormente emitidos permanecem inalterados.

Referências de organização, estados e cor: [Atlassian Design](https://atlassian.design/foundations/color) e [IBM Carbon: tabelas](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines). Não foram adicionadas dependências, fontes remotas ou rastreadores para a revisão visual.

O teste de navegador verifica também a cor da ação principal, a largura da navegação lateral, o encaixe da prévia sem zoom e a lista móvel sem rolagem horizontal.

`npm run check` passou. `npm audit --offline` retornou zero ocorrências para o pacote local, que não tem dependências npm de produção. **Esse comando não audita as bibliotecas de navegador vendorizadas**; não deve ser entendido como auditoria completa dessas bibliotecas.

## Limites da entrega

- A instalação local está preparada para primeiro acesso, sem senha de administrador escolhida pelo agente.
- A consulta do QR em outro computador/celular requer hospedagem do servidor e banco, HTTPS e URL pública configurada antes da emissão. Não houve publicação em nuvem nesta entrega.
- A versão antiga não guardava certificados. Não há histórico anterior para migrar automaticamente.
- Cópias automáticas no mesmo disco não protegem contra perda do computador. Há download de backups para cópia externa.
- A recuperação de senha pelo terminal teve verificação de sintaxe; o diálogo interativo não faz parte da automação Playwright.
- A compatibilidade visual foi testada em Chrome. Impressoras físicas, Safari e Firefox não foram verificados nesta sessão.
- Os modelos de cursos não constituem auditoria jurídica ou comprovação de treinamento. O emissor deve conferir os requisitos aplicáveis, conteúdo, local, instrutor, responsável técnico e assinaturas antes da emissão.

## Arquivos principais

`server.js` e `core.js` contêm persistência, autenticação e regras de entrada. `script.js` mantém a composição e exportação dos certificados; `editor.js` conecta rascunhos e emissão ao servidor. `dashboard.js`, `settings.js`, `login.js`, `verify.js` e `ui.js` implementam os demais fluxos. `workspace.css` organiza a interface e `styles.css` mantém a base do certificado.

As instruções de operação, backup, recuperação e hospedagem estão em `README.md`. O iniciador de Windows é `iniciar.cmd`.

Desenvolvido por Vinicius Dev.
