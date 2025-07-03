export class AuthService {
  private token?: string;
  private user?: any;

  async init() {
    // Check for stored auth token
    this.token = localStorage.getItem('githubToken') || undefined;
    
    if (this.token) {
      // Validate token
      await this.validateToken();
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | undefined {
    return this.token;
  }

  getUser(): any {
    return this.user;
  }

  async login(token: string): Promise<boolean> {
    this.token = token;
    const isValid = await this.validateToken();
    
    if (isValid) {
      localStorage.setItem('githubToken', token);
      return true;
    } else {
      this.token = undefined;
      return false;
    }
  }

  logout() {
    this.token = undefined;
    this.user = undefined;
    localStorage.removeItem('githubToken');
  }

  private async validateToken(): Promise<boolean> {
    if (!this.token) return false;

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        this.user = await response.json();
        return true;
      } else {
        this.token = undefined;
        localStorage.removeItem('githubToken');
        return false;
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }
}