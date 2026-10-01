/**
 * GitDigest - Main Application Controller
 */

import { githubApi } from './github-api.js';
import { changeAnalyzer } from './analyzer.js';
import { pdfService } from './pdf-generator.js';

class GitDigestApp {
  constructor() {
    this.currentStep = 1;
    this.repositories = [];
    this.filteredRepositories = [];
    this.selectedRepo = null;
    this.branches = [];
    this.analysisMode = 'single_branch'; // 'single_branch' | 'compare_branches' | 'all_recent'
    this.currentReportData = null;

    this.initElements();
    this.bindEvents();
    this.checkInitialAuth();
  }

  initElements() {
    // Nav & Header
    this.brandHomeBtn = document.getElementById('brand-home-btn');
    this.headerAuthPill = document.getElementById('header-auth-pill');
    this.headerStatusDot = document.getElementById('header-status-dot');
    this.headerStatusText = document.getElementById('header-status-text');
    this.headerDisconnectBtn = document.getElementById('header-disconnect-btn');

    // Steps
    this.stepNavItems = document.querySelectorAll('.step-item');
    this.views = {
      1: document.getElementById('view-step-1'),
      2: document.getElementById('view-step-2'),
      3: document.getElementById('view-step-3'),
      4: document.getElementById('view-step-4')
    };

    // Step 1 Form
    this.authForm = document.getElementById('auth-form');
    this.ghTokenInput = document.getElementById('gh-token-input');
    this.geminiKeyInput = document.getElementById('gemini-key-input');
    this.toggleTokenVisibilityBtn = document.getElementById('toggle-token-visibility');
    this.btnConnect = document.getElementById('btn-connect');
    this.btnContinueAnonymous = document.getElementById('btn-continue-anonymous');

    // Step 2 Repo Explorer
    this.userAvatarImg = document.getElementById('user-avatar-img');
    this.userNameText = document.getElementById('user-name-text');
    this.userLoginText = document.getElementById('user-login-text');
    this.rateRemaining = document.getElementById('rate-remaining');
    this.rateTotal = document.getElementById('rate-total');
    this.repoSearchInput = document.getElementById('repo-search-input');
    this.filterChips = document.querySelectorAll('.filter-chip');
    this.repoGridContainer = document.getElementById('repo-grid-container');
    this.reposLoading = document.getElementById('repos-loading');
    this.reposEmpty = document.getElementById('repos-empty');
    this.customRepoInput = document.getElementById('custom-repo-input');
    this.btnLoadCustomRepo = document.getElementById('btn-load-custom-repo');

    // Step 3 Analysis
    this.selectedRepoTitle = document.getElementById('selected-repo-title');
    this.selectedRepoDesc = document.getElementById('selected-repo-desc');
    this.btnChangeRepo = document.getElementById('btn-change-repo');
    this.modeCards = document.querySelectorAll('.mode-card');
    this.branchPrimaryGroup = document.getElementById('branch-primary-group');
    this.branchPrimaryLabel = document.getElementById('branch-primary-label');
    this.branchPrimarySelect = document.getElementById('branch-primary-select');
    this.branchCompareGroup = document.getElementById('branch-compare-group');
    this.branchCompareSelect = document.getElementById('branch-compare-select');
    this.commitsLimitSelect = document.getElementById('commits-limit-select');
    this.periodFilterSelect = document.getElementById('period-filter-select');
    this.optIncludePrs = document.getElementById('opt-include-prs');
    this.optAiSummary = document.getElementById('opt-ai-summary');
    this.btnStartAnalysis = document.getElementById('btn-start-analysis');
    this.analysisLoading = document.getElementById('analysis-loading');
    this.analysisLoadingText = document.getElementById('analysis-loading-text');

    // Step 4 Report
    this.btnBackToConfig = document.getElementById('btn-back-to-config');
    this.btnPrintReport = document.getElementById('btn-print-report');
    this.btnDownloadPdf = document.getElementById('btn-download-pdf');
    this.btnDownloadPdfText = document.getElementById('btn-download-pdf-text');
    this.pdfRenderArea = document.getElementById('pdf-render-area');

    // Toast
    this.toastContainer = document.getElementById('toast-container');
  }

  bindEvents() {
    // Brand click returns to step 1 or step 2
    this.brandHomeBtn.addEventListener('click', () => {
      this.goToStep(githubApi.currentUser ? 2 : 1);
    });

    // Stepper navigation click
    this.stepNavItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetStep = parseInt(item.getAttribute('data-step'), 10);
        if (targetStep < this.currentStep || (targetStep === 2 && githubApi.currentUser)) {
          this.goToStep(targetStep);
        }
      });
    });

    // Password visibility toggle
    this.toggleTokenVisibilityBtn.addEventListener('click', () => {
      const type = this.ghTokenInput.getAttribute('type') === 'password' ? 'text' : 'password';
      this.ghTokenInput.setAttribute('type', type);
    });

    // Disconnect
    this.headerDisconnectBtn.addEventListener('click', () => {
      githubApi.clearToken();
      changeAnalyzer.setGeminiKey('');
      this.updateAuthUi(false);
      this.goToStep(1);
      this.showToast('Desconectado com sucesso.', 'info');
    });

    // Form submit (PAT connect)
    this.authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = this.ghTokenInput.value.trim();
      const geminiKey = this.geminiKeyInput.value.trim();

      if (!token) {
        this.showToast('Por favor, insira seu GitHub Personal Access Token.', 'error');
        return;
      }

      githubApi.setToken(token);
      if (geminiKey) {
        changeAnalyzer.setGeminiKey(geminiKey);
      }

      await this.authenticateAndLoadRepos();
    });

    // Anonymous browse
    this.btnContinueAnonymous.addEventListener('click', async () => {
      githubApi.clearToken();
      await this.authenticateAndLoadRepos(true);
    });

    // Repo Search & Filtering
    this.repoSearchInput.addEventListener('input', () => this.applyRepoFilters());

    this.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.applyRepoFilters();
      });
    });

    // Custom repo input
    this.btnLoadCustomRepo.addEventListener('click', () => this.loadCustomRepo());
    this.customRepoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.loadCustomRepo();
    });

    // Step 3: Change Repo
    this.btnChangeRepo.addEventListener('click', () => {
      this.goToStep(2);
    });

    // Analysis mode switch
    this.modeCards.forEach(card => {
      card.addEventListener('click', () => {
        this.modeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.analysisMode = card.getAttribute('data-mode');
        this.updateAnalysisModeUi();
      });
    });

    // Start Analysis
    this.btnStartAnalysis.addEventListener('click', () => this.runAnalysis());

    // Step 4 Actions
    this.btnBackToConfig.addEventListener('click', () => {
      this.goToStep(3);
    });

    this.btnPrintReport.addEventListener('click', () => {
      window.print();
    });

    this.btnDownloadPdf.addEventListener('click', () => this.downloadPdf());
  }

  async checkInitialAuth() {
    // Populate saved keys
    if (githubApi.hasToken()) {
      this.ghTokenInput.value = githubApi.getToken();
    }
    if (changeAnalyzer.getGeminiKey()) {
      this.geminiKeyInput.value = changeAnalyzer.getGeminiKey();
    }

    if (githubApi.hasToken()) {
      await this.authenticateAndLoadRepos();
    }
  }

  async authenticateAndLoadRepos(isAnonymous = false) {
    this.btnConnect.disabled = true;
    this.btnConnect.querySelector('span').textContent = 'Autenticando...';

    try {
      const auth = await githubApi.validateAuth();
      this.updateAuthUi(auth.authenticated, auth.user, auth.rateLimit);

      if (auth.authenticated) {
        this.showToast(`Conectado com sucesso como @${auth.user.login}!`, 'success');
      } else {
        this.showToast('Navegando em modo público.', 'info');
      }

      this.goToStep(2);
      await this.loadUserRepositories();
    } catch (err) {
      this.showToast(err.message || 'Falha ao conectar no GitHub.', 'error');
      this.updateAuthUi(false);
    } finally {
      this.btnConnect.disabled = false;
      this.btnConnect.querySelector('span').textContent = 'Conectar e Listar Repositórios';
    }
  }

  updateAuthUi(isAuthenticated, user = null, rateLimit = null) {
    if (isAuthenticated && user) {
      this.headerStatusDot.classList.add('active');
      this.headerStatusText.textContent = `@${user.login}`;
      this.headerDisconnectBtn.style.display = 'inline-flex';

      this.userAvatarImg.src = user.avatar_url;
      this.userNameText.textContent = user.name || user.login;
      this.userLoginText.textContent = `@${user.login} • ${user.public_repos + (user.total_private_repos || 0)} repositórios`;
    } else {
      this.headerStatusDot.classList.remove('active');
      this.headerStatusText.textContent = 'Não autenticado';
      this.headerDisconnectBtn.style.display = 'none';

      this.userAvatarImg.src = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
      this.userNameText.textContent = 'Acesso Anônimo';
      this.userLoginText.textContent = 'Modo público (sem token)';
    }

    if (rateLimit) {
      this.rateRemaining.textContent = rateLimit.remaining || '0';
      this.rateTotal.textContent = rateLimit.limit || '60';
    }
  }

  goToStep(stepNumber) {
    this.currentStep = stepNumber;

    // Update Nav Stepper
    this.stepNavItems.forEach(item => {
      const step = parseInt(item.getAttribute('data-step'), 10);
      item.classList.remove('active', 'completed');
      if (step === stepNumber) {
        item.classList.add('active');
      } else if (step < stepNumber) {
        item.classList.add('completed');
      }
    });

    // Switch View
    Object.keys(this.views).forEach(key => {
      if (parseInt(key, 10) === stepNumber) {
        this.views[key].classList.add('active');
      } else {
        this.views[key].classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async loadUserRepositories() {
    this.reposLoading.style.display = 'flex';
    this.repoGridContainer.style.display = 'none';
    this.reposEmpty.style.display = 'none';

    try {
      const { repos, rateLimit } = await githubApi.getUserRepositories();
      this.repositories = repos || [];
      this.filteredRepositories = [...this.repositories];

      if (rateLimit) {
        this.rateRemaining.textContent = rateLimit.remaining;
        this.rateTotal.textContent = rateLimit.limit;
      }

      this.renderRepositories();
    } catch (err) {
      this.showToast(`Erro ao carregar repositórios: ${err.message}`, 'error');
    } finally {
      this.reposLoading.style.display = 'none';
      this.repoGridContainer.style.display = 'grid';
    }
  }

  renderRepositories() {
    this.repoGridContainer.innerHTML = '';

    if (this.filteredRepositories.length === 0) {
      this.reposEmpty.style.display = 'block';
      return;
    }

    this.reposEmpty.style.display = 'none';

    const langColors = {
      JavaScript: '#f1e05a',
      TypeScript: '#3178c6',
      Python: '#3572A5',
      HTML: '#e34c26',
      CSS: '#563d7c',
      Java: '#b07219',
      'C#': '#178600',
      PHP: '#4F5D95',
      Go: '#00ADD8',
      Rust: '#dea584'
    };

    this.filteredRepositories.forEach(repo => {
      const card = document.createElement('div');
      card.className = 'repo-card';

      const dotColor = langColors[repo.language] || '#94a3b8';
      const updatedDate = new Date(repo.updated_at || repo.pushed_at).toLocaleDateString('pt-BR');

      card.innerHTML = `
        <div>
          <div class="repo-card-header">
            <h3 class="repo-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              ${this.escape(repo.name)}
            </h3>
            <span class="badge ${repo.private ? 'badge-private' : 'badge-public'}">
              ${repo.private ? 'Privado' : 'Público'}
            </span>
          </div>

          <p class="repo-card-desc">
            ${this.escape(repo.description || 'Sem descrição informada.')}
          </p>

          <div class="repo-card-meta">
            ${repo.language ? `
              <span>
                <span class="repo-lang-dot" style="background-color: ${dotColor};"></span>
                ${this.escape(repo.language)}
              </span>
            ` : ''}
            <span>⭐ ${repo.stargazers_count || 0}</span>
            <span>🍴 ${repo.forks_count || 0}</span>
          </div>
        </div>

        <div class="repo-card-footer">
          <span class="repo-updated-time">Atualizado: ${updatedDate}</span>
          <button class="btn btn-primary btn-sm btn-select-repo">
            Analisar →
          </button>
        </div>
      `;

      card.querySelector('.btn-select-repo').addEventListener('click', () => {
        this.selectRepository(repo);
      });

      this.repoGridContainer.appendChild(card);
    });
  }

  applyRepoFilters() {
    const query = this.repoSearchInput.value.toLowerCase().trim();
    const activeChip = document.querySelector('.filter-chip.active');
    const filterType = activeChip ? activeChip.getAttribute('data-filter') : 'all';

    this.filteredRepositories = this.repositories.filter(repo => {
      // Search text match
      const nameMatch = repo.name.toLowerCase().includes(query);
      const descMatch = (repo.description || '').toLowerCase().includes(query);
      const matchesQuery = nameMatch || descMatch;

      if (!matchesQuery) return false;

      // Filter category
      if (filterType === 'public') return !repo.private;
      if (filterType === 'private') return repo.private;
      if (filterType === 'forks') return repo.fork;
      if (filterType === 'sources') return !repo.fork;

      return true;
    });

    this.renderRepositories();
  }

  async loadCustomRepo() {
    const rawInput = this.customRepoInput.value.trim();
    if (!rawInput || !rawInput.includes('/')) {
      this.showToast('Digite o repositório no formato: dono/repositorio (ex: facebook/react)', 'error');
      return;
    }

    const [owner, repoName] = rawInput.split('/');
    this.btnLoadCustomRepo.disabled = true;
    this.btnLoadCustomRepo.textContent = '...';

    try {
      const repo = await githubApi.getRepository(owner.trim(), repoName.trim());
      this.showToast(`Repositório ${repo.full_name} carregado!`, 'success');
      this.selectRepository(repo);
    } catch (err) {
      this.showToast(`Não foi possível carregar o repositório: ${err.message}`, 'error');
    } finally {
      this.btnLoadCustomRepo.disabled = false;
      this.btnLoadCustomRepo.textContent = 'Carregar';
    }
  }

  async selectRepository(repo) {
    this.selectedRepo = repo;
    this.selectedRepoTitle.textContent = repo.full_name || repo.name;
    this.selectedRepoDesc.textContent = repo.description || 'Repositório sem descrição cadastrada.';

    this.goToStep(3);
    await this.loadBranchesForSelectedRepo();
  }

  async loadBranchesForSelectedRepo() {
    this.branchPrimarySelect.innerHTML = '<option value="">Carregando branches...</option>';
    this.branchCompareSelect.innerHTML = '<option value="">Carregando branches...</option>';

    try {
      const [owner, repoName] = (this.selectedRepo.full_name || `${this.selectedRepo.owner?.login}/${this.selectedRepo.name}`).split('/');
      this.branches = await githubApi.getBranches(owner, repoName);

      const defaultBranch = this.selectedRepo.default_branch || 'main';

      let optionsHtml = '';
      this.branches.forEach(b => {
        const isSelected = b.name === defaultBranch ? 'selected' : '';
        optionsHtml += `<option value="${b.name}" ${isSelected}>${b.name}${b.name === defaultBranch ? ' (padrão)' : ''}</option>`;
      });

      this.branchPrimarySelect.innerHTML = optionsHtml;

      // Base branch for comparison (prefer default_branch)
      let compareOptionsHtml = '';
      this.branches.forEach(b => {
        const isSelected = b.name === defaultBranch ? 'selected' : '';
        compareOptionsHtml += `<option value="${b.name}" ${isSelected}>${b.name}${b.name === defaultBranch ? ' (base padrão)' : ''}</option>`;
      });
      this.branchCompareSelect.innerHTML = compareOptionsHtml;

      // If more than 1 branch, select secondary branch as head
      if (this.branches.length > 1) {
        const nonDefault = this.branches.find(b => b.name !== defaultBranch);
        if (nonDefault) {
          this.branchPrimarySelect.value = nonDefault.name;
        }
      }
    } catch (err) {
      this.showToast(`Erro ao listar branches: ${err.message}`, 'error');
      this.branchPrimarySelect.innerHTML = `<option value="${this.selectedRepo.default_branch || 'main'}">${this.selectedRepo.default_branch || 'main'}</option>`;
    }
  }

  updateAnalysisModeUi() {
    if (this.analysisMode === 'compare_branches') {
      this.branchCompareGroup.style.display = 'block';
      this.branchPrimaryLabel.textContent = 'Branch com Modificações (Head)';
    } else {
      this.branchCompareGroup.style.display = 'none';
      this.branchPrimaryLabel.textContent = 'Branch a Analisar';
    }
  }

  async runAnalysis() {
    const [owner, repoName] = (this.selectedRepo.full_name || `${this.selectedRepo.owner?.login}/${this.selectedRepo.name}`).split('/');
    const primaryBranch = this.branchPrimarySelect.value;
    const baseBranch = this.branchCompareSelect.value;
    const limit = parseInt(this.commitsLimitSelect.value, 10);
    const periodDays = this.periodFilterSelect.value;
    const includePrs = this.optIncludePrs.checked;

    this.btnStartAnalysis.disabled = true;
    this.analysisLoading.style.display = 'flex';
    this.analysisLoadingText.textContent = 'Buscando commits e branches...';

    try {
      let commits = [];
      let comparisonData = null;
      let branchContext = primaryBranch;

      // Calculate 'since' date if period selected
      let sinceDate = null;
      if (periodDays !== 'all') {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(periodDays, 10));
        sinceDate = d.toISOString();
      }

      if (this.analysisMode === 'compare_branches') {
        this.analysisLoadingText.textContent = `Comparando ${baseBranch}...${primaryBranch}...`;
        branchContext = `Comparação: ${baseBranch} ➔ ${primaryBranch}`;
        const comp = await githubApi.compareBranches(owner, repoName, baseBranch, primaryBranch);
        comparisonData = comp.comparison;
        commits = comparisonData.commits || [];
      } else {
        this.analysisLoadingText.textContent = `Coletando histórico da branch ${primaryBranch}...`;
        const res = await githubApi.getCommits(owner, repoName, {
          sha: primaryBranch,
          since: sinceDate,
          per_page: limit
        });
        commits = res.commits || [];
      }

      if (commits.length === 0) {
        throw new Error('Nenhum commit encontrado no período/branch especificado.');
      }

      // Fetch Pull Requests if selected
      let pullRequests = [];
      if (includePrs) {
        this.analysisLoadingText.textContent = 'Coletando Pull Requests recentes...';
        try {
          pullRequests = await githubApi.getPullRequests(owner, repoName);
        } catch (e) {
          console.warn('Erro ao carregar pull requests:', e);
        }
      }

      // Analysis & Metrics
      this.analysisLoadingText.textContent = 'Categorizando modificações e calculando impacto...';
      const categories = changeAnalyzer.categorizeCommits(commits);
      const metrics = changeAnalyzer.calculateMetrics(commits, comparisonData);

      // Executive Summary
      this.analysisLoadingText.textContent = 'Gerando resumo executivo inteligente...';
      let summaryText = '';
      if (this.optAiSummary.checked) {
        summaryText = await changeAnalyzer.generateExecutiveSummary(
          this.selectedRepo.full_name || this.selectedRepo.name,
          branchContext,
          categories,
          metrics,
          commits
        );
      } else {
        summaryText = changeAnalyzer.generateHeuristicSummary(
          this.selectedRepo.full_name || this.selectedRepo.name,
          branchContext,
          categories,
          metrics
        );
      }

      // Save report data
      this.currentReportData = {
        repo: this.selectedRepo,
        branchContext,
        summaryText,
        categories,
        metrics,
        commits,
        pullRequests
      };

      // Build & Render HTML
      this.pdfRenderArea.innerHTML = pdfService.buildReportHtml(this.currentReportData);

      this.showToast('Relatório gerado com sucesso!', 'success');
      this.goToStep(4);
    } catch (err) {
      this.showToast(`Erro na análise: ${err.message}`, 'error');
    } finally {
      this.btnStartAnalysis.disabled = false;
      this.analysisLoading.style.display = 'none';
    }
  }

  async downloadPdf() {
    if (!this.currentReportData) {
      this.showToast('Nenhum relatório pronto para exportação.', 'error');
      return;
    }

    const docElement = document.getElementById('pdf-document');
    if (!docElement) {
      this.showToast('Elemento do documento não encontrado.', 'error');
      return;
    }

    this.btnDownloadPdf.disabled = true;
    this.btnDownloadPdfText.textContent = 'Gerando PDF...';

    const safeRepoName = (this.selectedRepo.name || 'repositorio').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `relatorio-${safeRepoName}-${dateStr}.pdf`;

    try {
      await pdfService.exportToPdf(docElement, filename);
      this.showToast(`PDF ${filename} baixado com sucesso!`, 'success');
    } catch (err) {
      this.showToast(`Erro ao gerar PDF: ${err.message}`, 'error');
    } finally {
      this.btnDownloadPdf.disabled = false;
      this.btnDownloadPdfText.textContent = 'Baixar Relatório em PDF';
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
      <span>${icon}</span>
      <div>${this.escape(message)}</div>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new GitDigestApp();
});
