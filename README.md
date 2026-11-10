# Habitat — ecossistema de ensino

Plataforma de aprendizagem com áreas públicas, painel do aluno, painel da
professora, agendamento de aulas, materiais didáticos e um assistente de estudos
com IA baseado nos PDFs publicados.

## Requisitos

- Node.js 20 ou superior
- npm
- PostgreSQL (Neon recomendado para produção) ou SQLite local para desenvolvimento

## Instalação e execução

```bash
npm ci
```

Copie `.env.example` para `.env` e preencha apenas as credenciais necessárias no
arquivo local. Nunca publique `.env`.

```bash
npm start
```

O servidor inicia em `http://localhost:3000`. Sem `DATABASE_URL`, o projeto usa
SQLite em `data/saas-teacher.sqlite`. Com `DATABASE_URL`, conecta ao PostgreSQL
com TLS. O schema e a extensão `pgvector` são preparados durante a inicialização.

Para compilar o CSS:

```bash
npm run css:build
```

## Funcionalidades

- Página pública Habitat, disciplinas, metodologia e formulário de aula avaliativa.
- Cadastro e login de alunos com contato de responsável.
- Painel do aluno, agenda, materiais, envios para análise e assistente de IA.
- Painel da professora para agendamentos, bloqueios, materiais, envios e alunos.
- Ingestão de PDFs, embeddings e busca vetorial com PostgreSQL/`pgvector`.
- Notificações de novos agendamentos por e-mail quando SMTP estiver configurado.

As notificações usam SMTP opcional. Consulte
[docs/NOTIFICACOES-AGENDAMENTO.md](./docs/NOTIFICACOES-AGENDAMENTO.md) para
configuração. Uploads e banco local são dados de runtime e não fazem parte do Git.

## GitFlow

### Branches permanentes

- `main`: versão estável e pronta para publicação.
- `develop`: integração do próximo ciclo de desenvolvimento.

### Branches de trabalho

- `feature/<descricao>`: novas funcionalidades, criada a partir de `develop` e
  integrada de volta em `develop` via pull request.
- `release/<versao>`: preparação e correções de uma versão, criada de `develop`;
  ao finalizar, integrar em `main` e `develop` e marcar uma tag.
- `hotfix/<versao>`: correção urgente criada de `main`; integrar em `main` e
  `develop` e marcar uma tag.

### Exemplos

```bash
# Atualizar a linha de integração
git switch develop
git pull origin develop

# Começar uma funcionalidade
git switch -c feature/nome-da-funcionalidade
# implemente e valide a mudança
git add .
git commit -m "feat: descreve a funcionalidade"
git push -u origin feature/nome-da-funcionalidade
# abra um pull request para develop

# Preparar uma versão
git switch develop
git pull origin develop
git switch -c release/1.1.0
# valide a versão e abra PRs para main e develop

# Corrigir produção
git switch main
git pull origin main
git switch -c hotfix/1.0.1
# corrija, valide e abra PRs para main e develop
```

Após publicar uma versão, marque-a, por exemplo, com `git tag v1.1.0` e envie a
tag com `git push origin v1.1.0`. Configure proteção de `main` e `develop` no
GitHub para exigir pull request e verificações antes do merge.

## Segurança e arquivos locais

Não adicione ao Git `.env`, cookies, chaves, bancos locais, PDFs enviados ou
outros arquivos privados. Configure credenciais somente no ambiente local ou
nos secrets do ambiente de deploy.
