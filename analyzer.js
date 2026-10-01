/**
 * GitDigest - Repository Change Analyzer & AI Summarizer
 * Categorizes commits, calculates impact metrics, and generates executive summaries.
 */

export class ChangeAnalyzer {
  constructor() {
    this.geminiApiKey = localStorage.getItem('gitdigest_gemini_key') || '';
  }

  setGeminiKey(key) {
    this.geminiApiKey = key.trim();
    if (this.geminiApiKey) {
      localStorage.setItem('gitdigest_gemini_key', this.geminiApiKey);
    } else {
      localStorage.removeItem('gitdigest_gemini_key');
    }
  }

  getGeminiKey() {
    return this.geminiApiKey;
  }

  /**
   * Categorizes commits into standard software development buckets
   */
  categorizeCommits(commits) {
    const categories = {
      features: {
        id: 'features',
        name: 'Novas Funcionalidades',
        icon: '🚀',
        color: '#10b981',
        commits: []
      },
      fixes: {
        id: 'fixes',
        name: 'Correções de Bugs',
        icon: '🐛',
        color: '#f43f5e',
        commits: []
      },
      refactor: {
        id: 'refactor',
        name: 'Refatoração & Qualidade de Código',
        icon: '♻️',
        color: '#8b5cf6',
        commits: []
      },
      perf: {
        id: 'perf',
        name: 'Desempenho & Otimizações',
        icon: '⚡',
        color: '#06b6d4',
        commits: []
      },
      docs_tests: {
        id: 'docs_tests',
        name: 'Documentação & Testes',
        icon: '📝',
        color: '#f59e0b',
        commits: []
      },
      maintenance: {
        id: 'maintenance',
        name: 'Manutenção, CI/CD & Dependências',
        icon: '🔧',
        color: '#64748b',
        commits: []
      }
    };

    commits.forEach(item => {
      const msg = (item.commit ? item.commit.message : item.message || '').trim();
      const firstLine = msg.split('\n')[0].toLowerCase();

      // Conventional commits patterns
      if (/^feat(\(.*\))?:|^feature(\(.*\))?:\b|adiciona|novo|implementa|create|add\b/i.test(firstLine)) {
        categories.features.commits.push(item);
      } else if (/^fix(\(.*\))?:|^bug(\(.*\))?:\b|corrige|arruma|conserta|resolve|hotfix|patch/i.test(firstLine)) {
        categories.fixes.commits.push(item);
      } else if (/^perf(\(.*\))?:|otimiza|desempenho|performance|speedup/i.test(firstLine)) {
        categories.perf.commits.push(item);
      } else if (/^refactor(\(.*\))?:|^style(\(.*\))?:|clean|refatora|reestrutura|simplifica/i.test(firstLine)) {
        categories.refactor.commits.push(item);
      } else if (/^docs?(\(.*\))?:|^test(\(.*\))?:|readme|documenta|testes?|specs?/i.test(firstLine)) {
        categories.docs_tests.commits.push(item);
      } else {
        categories.maintenance.commits.push(item);
      }
    });

    return categories;
  }

  /**
   * Computes high-level aggregated metrics from commits & files
   */
  calculateMetrics(commits, comparisonData = null) {
    const contributors = {};
    let totalAdditions = 0;
    let totalDeletions = 0;
    const fileStats = {};

    commits.forEach(c => {
      const authorName = c.commit?.author?.name || c.author?.login || 'Desconhecido';
      contributors[authorName] = (contributors[authorName] || 0) + 1;
    });

    if (comparisonData && comparisonData.files) {
      comparisonData.files.forEach(f => {
        totalAdditions += (f.additions || 0);
        totalDeletions += (f.deletions || 0);
        fileStats[f.filename] = {
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes
        };
      });
    }

    const topContributors = Object.entries(contributors)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalCommits: commits.length,
      contributorsCount: Object.keys(contributors).length,
      topContributors,
      totalAdditions,
      totalDeletions,
      filesChangedCount: comparisonData?.files?.length || 0,
      files: Object.values(fileStats)
    };
  }

  /**
   * Generates Executive AI Summary using Gemini API if key provided,
   * or a sophisticated heuristic Brazilian Portuguese synthesis as reliable fallback.
   */
  async generateExecutiveSummary(repoName, branchContext, categories, metrics, commits) {
    if (this.geminiApiKey) {
      try {
        return await this.callGemini(repoName, branchContext, categories, metrics, commits);
      } catch (err) {
        console.warn('Erro ao chamar Gemini AI, usando síntese heurística:', err);
      }
    }
    return this.generateHeuristicSummary(repoName, branchContext, categories, metrics);
  }

  /**
   * Direct integration with Google Gemini Generative AI
   */
  async callGemini(repoName, branchContext, categories, metrics, commits) {
    const commitSamples = commits.slice(0, 30).map(c => `- ${c.commit?.message?.split('\n')[0]}`).join('\n');
    
    const prompt = `
Você é um Arquiteto de Software Sênior e Tech Lead especialista em Git e Engenharia de Software.
Analise os dados deste repositório e crie um Resumo Executivo em Português do Brasil para um relatório formal em PDF.

Dados do Repositório:
- Repositório: ${repoName}
- Contexto/Branch: ${branchContext}
- Total de Commits Analisados: ${metrics.totalCommits}
- Total de Contribuidores: ${metrics.contributorsCount}
- Categorias Identificadas:
  * Novas Funcionalidades: ${categories.features.commits.length}
  * Correções de Bugs: ${categories.fixes.commits.length}
  * Refatorações: ${categories.refactor.commits.length}
  * Otimizações/Desempenho: ${categories.perf.commits.length}
  * Documentação/Testes: ${categories.docs_tests.commits.length}
  * Manutenções & Infra: ${categories.maintenance.commits.length}

Amostra de Mensagens de Commits:
${commitSamples}

Estruture sua resposta em até 3 parágrafos claros, objetivos e de alto nível:
1. Visão Geral: O foco central das modificações analisadas neste ciclo.
2. Destaques das Entregas: Principais funcionalidades e melhorias implementadas.
3. Conclusão & Estabilidade: Impacto no sistema, estabilidade e próximos passos recomendados.
Não use formato JSON, apenas o texto fluído e profissional.
`;

    // Try Gemini 1.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Falha na API Gemini: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (generatedText) {
      return generatedText.trim();
    }
    throw new Error('Resposta vazia da API Gemini');
  }

  /**
   * Deterministic, high-quality Portuguese heuristic summary
   */
  generateHeuristicSummary(repoName, branchContext, categories, metrics) {
    const featCount = categories.features.commits.length;
    const fixCount = categories.fixes.commits.length;
    const refactorCount = categories.refactor.commits.length;
    const docsCount = categories.docs_tests.commits.length;
    const total = metrics.totalCommits || 1;

    let focusTheme = 'um ciclo equilibrado de evolução e manutenção contínua';
    if (featCount / total > 0.45) {
      focusTheme = 'uma intensa fase de lançamento e expansão de novas funcionalidades';
    } else if (fixCount / total > 0.4) {
      focusTheme = 'um ciclo concentrado em estabilização, resolução de defeitos e confiabilidade';
    } else if (refactorCount / total > 0.35) {
      focusTheme = 'uma rodada relevante de refatoração, modernização e dívida técnica sanada';
    }

    const topContributorText = metrics.topContributors.length > 0
      ? ` com destaque para a liderança de desenvolvimento de ${metrics.topContributors.slice(0, 2).map(c => `${c.name} (${c.count} commits)`).join(' e ')}`
      : '';

    return `Este relatório consolida a análise de alterações no repositório **${repoName}** (${branchContext}), totalizando **${metrics.totalCommits} commits** distribuídos entre **${metrics.contributorsCount} colaboradores**${topContributorText}.

O período avaliado caracterizou-se predominantemente por **${focusTheme}**. Foram mapeadas **${featCount} novas funcionalidades**, **${fixCount} correções de erros**, **${refactorCount} refatorações arquiteturais** e **${docsCount} atualizações de documentação e testes**.

As entregas consolidam a evolução das branches selecionadas, assegurando rastreabilidade das modificações realizadas no código-fonte e fornecendo uma base sólida para controle de releases e conformidade de software.`;
  }
}

export const changeAnalyzer = new ChangeAnalyzer();
