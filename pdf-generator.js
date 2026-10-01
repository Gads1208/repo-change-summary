/**
 * GitDigest - PDF Generator Service
 * Converts repository analysis into a high-quality, formatted executive PDF report.
 */

export class PdfService {
  constructor() {
    this.isGenerating = false;
  }

  /**
   * Builds the HTML template for the PDF document
   */
  buildReportHtml(data) {
    const {
      repo,
      branchContext,
      summaryText,
      categories,
      metrics,
      commits,
      pullRequests,
      generatedAt = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } = data;

    // Build categories rows
    let categoriesHtml = '';
    Object.values(categories).forEach(cat => {
      if (cat.commits.length === 0) return;
      const pct = Math.round((cat.commits.length / (metrics.totalCommits || 1)) * 100);

      const commitItems = cat.commits.slice(0, 10).map(c => {
        const msg = (c.commit?.message || c.message || '').split('\n')[0];
        const author = c.commit?.author?.name || c.author?.login || 'Autor';
        const date = c.commit?.author?.date ? new Date(c.commit.author.date).toLocaleDateString('pt-BR') : '';
        const sha = (c.sha || '').substring(0, 7);

        return `
          <li class="pdf-category-item">
            <div>
              <span class="pdf-commit-msg">${this.escapeHtml(msg)}</span>
              <span class="pdf-commit-meta"> • ${this.escapeHtml(author)} (${date})</span>
            </div>
            <code class="pdf-commit-hash">${sha}</code>
          </li>
        `;
      }).join('');

      const moreNotice = cat.commits.length > 10 
        ? `<div style="padding: 6px 16px; font-size: 0.75rem; color: #64748b; font-style: italic;">+ mais ${cat.commits.length - 10} commits nesta categoria</div>`
        : '';

      categoriesHtml += `
        <div class="pdf-category-card" style="page-break-inside: avoid;">
          <div class="pdf-category-header">
            <span>${cat.icon} ${cat.name}</span>
            <span class="pdf-category-count">${cat.commits.length} commits (${pct}%)</span>
          </div>
          <ul class="pdf-category-list">
            ${commitItems}
          </ul>
          ${moreNotice}
        </div>
      `;
    });

    // Top contributors rows
    const contributorsHtml = metrics.topContributors.slice(0, 5).map(c => `
      <span style="display: inline-block; background: #e2e8f0; color: #1e293b; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; margin-right: 6px; margin-bottom: 6px;">
        <strong>${this.escapeHtml(c.name)}</strong> (${c.count})
      </span>
    `).join('');

    // Detailed Commits Table (First 25 commits)
    const commitRows = commits.slice(0, 25).map(c => {
      const msg = (c.commit?.message || c.message || '').split('\n')[0];
      const author = c.commit?.author?.name || c.author?.login || 'Autor';
      const date = c.commit?.author?.date ? new Date(c.commit.author.date).toLocaleDateString('pt-BR') : '';
      const sha = (c.sha || '').substring(0, 7);

      return `
        <tr>
          <td style="width: 80px;"><code class="pdf-commit-hash">${sha}</code></td>
          <td style="font-weight: 600;">${this.escapeHtml(msg)}</td>
          <td style="width: 140px;">${this.escapeHtml(author)}</td>
          <td style="width: 90px; color: #64748b;">${date}</td>
        </tr>
      `;
    }).join('');

    // Pull Requests Section (if any)
    let prsHtml = '';
    if (pullRequests && pullRequests.length > 0) {
      const prItems = pullRequests.slice(0, 5).map(pr => `
        <li class="pdf-category-item">
          <div>
            <strong>#${pr.number}</strong> ${this.escapeHtml(pr.title)}
            <span class="pdf-commit-meta"> por ${this.escapeHtml(pr.user?.login || 'autor')} • ${pr.state.toUpperCase()}</span>
          </div>
          <span style="font-size: 0.72rem; color: #64748b;">${new Date(pr.updated_at).toLocaleDateString('pt-BR')}</span>
        </li>
      `).join('');

      prsHtml = `
        <div class="pdf-category-card" style="page-break-inside: avoid; margin-top: 24px;">
          <div class="pdf-category-header">
            <span>🔀 Pull Requests Recentes</span>
            <span class="pdf-category-count">${pullRequests.length} PRs</span>
          </div>
          <ul class="pdf-category-list">
            ${prItems}
          </ul>
        </div>
      `;
    }

    return `
      <div id="pdf-document" class="pdf-paper">
        <!-- PDF Header -->
        <header class="pdf-header">
          <div class="pdf-logo-group">
            <div class="pdf-logo-badge">GD</div>
            <div>
              <h1 class="pdf-doc-title">Relatório de Modificações do Repositório</h1>
              <p class="pdf-doc-subtitle">Auditoria de Código & Resumo de Branches • GitDigest Executive</p>
            </div>
          </div>
          <div class="pdf-meta-box">
            <div>Data: <strong>${generatedAt}</strong></div>
            <div>Status: <strong style="color: #16a34a;">Consolidado</strong></div>
          </div>
        </header>

        <!-- Repo Banner -->
        <div class="pdf-repo-banner">
          <div class="pdf-repo-name">
            📁 ${this.escapeHtml(repo.full_name || repo.name)}
            <span style="font-size: 0.75rem; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">
              ${repo.private ? 'Privado' : 'Público'}
            </span>
          </div>
          <p class="pdf-repo-desc">${this.escapeHtml(repo.description || 'Repositório sem descrição cadastrada.')}</p>
          <div class="pdf-repo-details-row">
            <span>Branch/Escopo: <strong>${this.escapeHtml(branchContext)}</strong></span>
            <span>Linguagem: <strong>${repo.language || 'Não informada'}</strong></span>
            <span>Default Branch: <strong>${repo.default_branch || 'main'}</strong></span>
          </div>
        </div>

        <!-- KPIs Grid -->
        <div class="pdf-kpi-grid">
          <div class="pdf-kpi-card">
            <div class="pdf-kpi-value brand">${metrics.totalCommits}</div>
            <div class="pdf-kpi-label">Commits Analisados</div>
          </div>
          <div class="pdf-kpi-card">
            <div class="pdf-kpi-value">${metrics.contributorsCount}</div>
            <div class="pdf-kpi-label">Contribuidores</div>
          </div>
          <div class="pdf-kpi-card">
            <div class="pdf-kpi-value add">+${metrics.totalAdditions.toLocaleString('pt-BR')}</div>
            <div class="pdf-kpi-label">Linhas Inseridas</div>
          </div>
          <div class="pdf-kpi-card">
            <div class="pdf-kpi-value del">-${metrics.totalDeletions.toLocaleString('pt-BR')}</div>
            <div class="pdf-kpi-label">Linhas Removidas</div>
          </div>
        </div>

        <!-- Executive Summary -->
        <section class="pdf-summary-section" style="page-break-inside: avoid;">
          <h2 class="pdf-section-title">✨ Resumo Executivo das Modificações</h2>
          <div class="pdf-summary-text">
            ${summaryText.replace(/\n\n/g, '<br><br>')}
          </div>
        </section>

        <!-- Contributors Highlight -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">
            Principais Contribuidores:
          </div>
          <div>${contributorsHtml}</div>
        </div>

        <!-- Categorized Breakdown -->
        <section style="margin-bottom: 24px;">
          <h2 class="pdf-section-title">📊 Modificações por Categoria</h2>
          ${categoriesHtml}
        </section>

        <!-- Pull Requests (Optional) -->
        ${prsHtml}

        <!-- Commits Log Table -->
        <section style="margin-top: 28px; page-break-inside: avoid;">
          <h2 class="pdf-section-title">📜 Registro Cronológico de Commits (Últimos ${Math.min(25, commits.length)})</h2>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>SHA</th>
                <th>Mensagem</th>
                <th>Autor</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${commitRows}
            </tbody>
          </table>
          ${commits.length > 25 ? `<p style="font-size: 0.75rem; color: #64748b; margin-top: 8px; font-style: italic;">* Mostrando os primeiros 25 commits de um total de ${commits.length}.</p>` : ''}
        </section>

        <!-- PDF Footer -->
        <footer class="pdf-footer">
          <div>Gerado automaticamente pelo <strong>GitDigest</strong></div>
          <div>Relatório Técnico de Rastreabilidade • Página 1 de 1</div>
        </footer>
      </div>
    `;
  }

  /**
   * Exports the target DOM element to a downloadable PDF
   */
  async exportToPdf(element, filename = 'relatorio-modificacoes.pdf') {
    if (this.isGenerating) return;
    this.isGenerating = true;

    try {
      if (typeof window.html2pdf === 'undefined') {
        throw new Error('A biblioteca html2pdf não foi carregada.');
      }

      const opt = {
        margin: [10, 10, 10, 10], // top, left, bottom, right (mm)
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy']
        }
      };

      await window.html2pdf().set(opt).from(element).save();
      return true;
    } catch (err) {
      console.error('Falha na geração do PDF:', err);
      throw err;
    } finally {
      this.isGenerating = false;
    }
  }

  escapeHtml(string) {
    if (!string) return '';
    return String(string)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const pdfService = new PdfService();
