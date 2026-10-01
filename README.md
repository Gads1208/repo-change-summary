# GitDigest 📊📄

> **Resumo Inteligente e Relatórios Executivos em PDF de Modificações no GitHub.**

[![Render Deployment](https://img.shields.io/badge/Render-Live%20Demo-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://repo-change-summary.onrender.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

👉 **[Acessar a Aplicação Online no Render: https://repo-change-summary.onrender.com](https://repo-change-summary.onrender.com)**

---

## 🌟 Funcionalidades

1. **Autenticação Segura via Personal Access Token (PAT)**:
   - Conexão direta com a API v3 do GitHub sem intermediários.
   - Suporte a repositórios públicos e privados.
   - Modo de navegação pública (anônimo) sem necessidade de login.

2. **Explorador Visual de Repositórios**:
   - Listagem completa com busca em tempo real por nome e descrição.
   - Filtros rápidos: *Todos*, *Públicos*, *Privados*, *Originais* e *Forks*.
   - Exibição de linguagens com cores oficiais, estrelas, forks e última data de push.
   - Carregador avulso para qualquer repositório público no formato `dono/repositorio` (ex: `facebook/react`, `torvalds/linux`).

3. **Análise Abrangente de Branches**:
   - **Branch Específica**: Analisa o histórico cronológico de commits da branch selecionada.
   - **Comparação entre Branches**: Compara o diff exato entre duas branches (ex: `feature-branch` ➔ `main`).
   - **Filtros Temporais e de Volume**: Seleção dos últimos 30, 50 ou 100 commits e períodos (7, 15, 30 ou 90 dias).
   - Inclusão opcional de Pull Requests recentes.

4. **Resumo Inteligente com IA & Heurística**:
   - **Categorização Automática**:
     - 🚀 Novas Funcionalidades (`feat`)
     - 🐛 Correções de Bugs (`fix`)
     - ⚡ Desempenho e Otimizações (`perf`)
     - ♻️ Refatorações & Arquitetura (`refactor`)
     - 📝 Documentação & Testes (`docs`, `test`)
     - 🔧 Manutenção, CI/CD e Dependências (`chore`)
   - **Síntese Executiva**:
     - Suporte nativo ao Google Gemini API (`gemini-1.5-flash`) para resumos inteligentes em linguagem natural.
     - Mecanismo analítico heurístico determinístico caso nenhuma chave de IA seja informada.

5. **Geração de PDF de Alta Resolução**:
   - Layout estilizado em formato A4, com tipografia legível, KPIs de impacto (+/- linhas, total de commits e contribuidores).
   - Exportação em um clique via `html2pdf.js` diretamente no navegador.
   - Suporte a impressão nativa do navegador (`Ctrl + P` / `Cmd + P`).

---

## 🚀 Como Executar

Como a aplicação é construída com tecnologias web nativas (HTML5, Vanilla CSS e JavaScript ES Modules), ela não requer instalação de dependências pesadas de compilação.

Para iniciar o servidor local:

```bash
cd /home/pichau/Portifolio/repo-change-summary
python3 server.py
```

Em seguida, abra seu navegador em:
👉 **[http://localhost:8080](http://localhost:8080)**

---

## 🔑 Como Gerar seu GitHub Personal Access Token (PAT)

1. Acesse suas configurações de desenvolvedor no GitHub: [GitHub Tokens](https://github.com/settings/tokens)
2. Clique em **Generate new token** -> **Generate new token (classic)**.
3. Defina um nome (ex: `GitDigest`) e marque o escopo `repo` (se quiser analisar repositórios privados) ou nenhum escopo adicional caso queira apenas repositórios públicos.
4. Clique em **Generate token** e copie o código (`ghp_...`).
5. Cole o token no campo de autenticação do GitDigest.

---

## 📁 Estrutura de Arquivos

```
repo-change-summary/
├── index.html               # Estrutura semântica e interface do assistente
├── style.css                # Sistema de design (Dark mode glassmorphism + PDF paper layout)
├── app.js                   # Controlador de fluxo e gerenciamento de estado da aplicação
├── github-api.js            # Cliente da API REST do GitHub (repos, branches, commits, compare)
├── analyzer.js              # Categorizador semântico e motor de resumo executivo com IA
├── pdf-generator.js         # Montador do template e gerador de exportação PDF
├── libs/
│   └── html2pdf.bundle.min.js # Biblioteca local para exportação de PDFs de alta fidelidade
├── server.py                # Servidor HTTP local em Python
└── README.md                # Documentação do projeto
```
