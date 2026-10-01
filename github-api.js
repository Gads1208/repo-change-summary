/**
 * GitDigest - GitHub API Service
 * Handles authenticated & public requests to the GitHub REST API v3
 */

export class GitHubService {
  constructor() {
    this.baseUrl = 'https://api.github.com';
    this.token = localStorage.getItem('gitdigest_gh_token') || '';
    this.currentUser = null;
  }

  setToken(token) {
    this.token = token.trim();
    if (this.token) {
      localStorage.setItem('gitdigest_gh_token', this.token);
    } else {
      localStorage.removeItem('gitdigest_gh_token');
    }
  }

  getToken() {
    return this.token;
  }

  hasToken() {
    return Boolean(this.token && this.token.length > 5);
  }

  clearToken() {
    this.token = '';
    this.currentUser = null;
    localStorage.removeItem('gitdigest_gh_token');
  }

  getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    });

    const rateLimit = {
      limit: response.headers.get('x-ratelimit-limit'),
      remaining: response.headers.get('x-ratelimit-remaining'),
      reset: response.headers.get('x-ratelimit-reset')
    };

    if (!response.ok) {
      let errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Fallback to status text
      }

      if (response.status === 401) {
        throw new Error('Token inválido ou expirado. Verifique seu Personal Access Token.');
      } else if (response.status === 403 && rateLimit.remaining === '0') {
        const resetDate = rateLimit.reset ? new Date(rateLimit.reset * 1000).toLocaleTimeString() : 'em breve';
        throw new Error(`Limite de requisições do GitHub atingido. Renova às ${resetDate}. Use um token de acesso para ter 5.000 requisições/hora.`);
      } else if (response.status === 404) {
        throw new Error('Recurso não encontrado no GitHub. Verifique o nome do repositório ou permissões.');
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    return { data, rateLimit };
  }

  async validateAuth() {
    if (!this.token) {
      // If no token, check rate limits as anonymous
      const { data } = await this.request('/rate_limit');
      return {
        authenticated: false,
        user: null,
        rateLimit: data.rate
      };
    }

    const { data: user, rateLimit } = await this.request('/user');
    this.currentUser = user;
    return {
      authenticated: true,
      user,
      rateLimit
    };
  }

  async getUserRepositories(page = 1, perPage = 100, sort = 'updated') {
    const endpoint = this.token
      ? `/user/repos?per_page=${perPage}&page=${page}&sort=${sort}&affiliation=owner,collaborator,organization_member`
      : `/repositories?since=${(page - 1) * perPage}`;

    const { data, rateLimit } = await this.request(endpoint);
    return { repos: data, rateLimit };
  }

  async getRepository(owner, repo) {
    const { data } = await this.request(`/repos/${owner}/${repo}`);
    return data;
  }

  async getBranches(owner, repo) {
    const { data } = await this.request(`/repos/${owner}/${repo}/branches?per_page=100`);
    return data;
  }

  async getCommits(owner, repo, options = {}) {
    const params = new URLSearchParams();
    if (options.sha) params.set('sha', options.sha); // branch name or SHA
    if (options.since) params.set('since', options.since);
    if (options.until) params.set('until', options.until);
    params.set('per_page', options.per_page || 50);

    const { data, rateLimit } = await this.request(`/repos/${owner}/${repo}/commits?${params.toString()}`);
    return { commits: data, rateLimit };
  }

  async compareBranches(owner, repo, base, head) {
    const { data, rateLimit } = await this.request(`/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`);
    return { comparison: data, rateLimit };
  }

  async getCommitDetails(owner, repo, sha) {
    const { data } = await this.request(`/repos/${owner}/${repo}/commits/${sha}`);
    return data;
  }

  async getPullRequests(owner, repo, state = 'all') {
    const { data } = await this.request(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=30&sort=updated&direction=desc`);
    return data;
  }
}

export const githubApi = new GitHubService();
