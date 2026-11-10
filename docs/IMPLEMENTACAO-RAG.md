# Habitat — implementação do assistente RAG

## O que foi implementado

O fluxo RAG usa LangChain.js no backend Express. A professora publica PDFs pela tela **Materiais**; o servidor extrai o texto, divide-o em trechos, cria embeddings da OpenAI e os armazena na tabela `rag_document_chunks` do PostgreSQL/Neon com pgvector. O aluno pergunta na tela **Tira-dúvidas IA**; o backend busca até quatro trechos permitidos para aquela conta e pede uma resposta fundamentada neles.

O chat não persiste histórico de perguntas e respostas. Cada resposta mostra links para os materiais usados como fontes. Materiais destinados a um aluno não entram na busca de outras contas.

## Configuração para habilitar o uso real da OpenAI

1. **Revogue a chave OpenAI compartilhada na conversa e crie uma nova.** Ela ficou exposta; não foi gravada no projeto nem usada nos testes.
2. Configure a chave nova somente no `.env` local ou no gerenciador de segredos da hospedagem:

   ```env
   OPENAI_API_KEY=chave_nova
   OPENAI_CHAT_MODEL=gpt-4o-mini
   ```

3. Configure `DATABASE_URL` para o PostgreSQL/Neon. A extensão `vector` foi habilitada no Neon e a tabela vetorial foi preparada.
4. Reinicie o app. Sem uma chave válida, a professora ainda pode publicar o material, mas a tela mostra explicitamente que a indexação falhou. Depois de configurar a nova chave, use **Tentar indexar novamente** na tela Materiais. O chat informa de forma clara se a chave estiver ausente.

Não coloque segredos no Git nem na documentação. `.env` está no `.gitignore`; `.env.example` contém somente placeholders.

## Arquivos e rotas

- `src/services/ragServices.js`: leitura de PDF, divisão em trechos, embeddings, gravação e busca vetorial filtrada por aluno, além da geração da resposta.
- `src/controllers/MaterialController.js`: inicia a indexação após o upload e disponibiliza reindexação manual.
- `src/controllers/ChatController.js`: valida o tamanho da pergunta e chama o RAG usando a identidade do aluno autenticado.
- `src/routes/appRoutes.js`:
  - `POST /admin/materials/:id/index` — reindexar um material (professora).
  - `POST /api/student/chat` — enviar pergunta (aluno).
- `src/views/student/tutor.ejs`: interface do chat e links das fontes.
- `src/database/index.js`: prepara pgvector e acrescenta os campos de estado de indexação aos materiais já existentes.

## Como funciona e limites

- Embeddings: `text-embedding-3-small`, com dimensão 1536.
- Modelo de resposta padrão: `gpt-4o-mini`, alterável por `OPENAI_CHAT_MODEL`.
- Divisão: 1200 caracteres por trecho, com sobreposição de 180.
- Busca: até quatro trechos, somente de materiais da turma ou atribuídos ao aluno atual.
- PDF: máximo de 25 MB; PDFs que gerem mais de 1000 trechos são rejeitados para indexação.
- A tabela vetorial referencia materiais e apaga seus trechos em cascata quando o material é removido.
- O chat valida perguntas de 2 a 1200 caracteres e não guarda histórico.

## Validações executadas

- O serviço RAG original tinha erro de sintaxe e imports incompatíveis; foi substituído por código executável.
- O Neon confirmou a extensão pgvector; a tabela e o índice vetorial foram criados.
- `pdf-parse` v2 extraiu texto de um PDF local (3 páginas).
- O ciclo completo — extração, 7 trechos indexados, recuperação de 4 fontes e resposta — passou usando chamadas OpenAI simuladas. Nenhum dado foi enviado à OpenAI.
- A tela do aluno respondeu `200`; as rotas rejeitam acessos sem autenticação e bloqueiam a professora no endpoint exclusivo do aluno.
- Sem `OPENAI_API_KEY`, o chat retorna erro explícito `503`, em vez de simular uma resposta bem-sucedida.
- O app reiniciou conectado ao PostgreSQL/Neon e `/health` respondeu `200`.

**Falta configurar uma chave OpenAI nova e válida** para testar uma resposta real. A chave exposta não deve ser reutilizada.
