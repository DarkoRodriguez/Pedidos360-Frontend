import { Injectable, signal } from '@angular/core';
import {
  AccountInfo,
  Configuration,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  sub?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private msalInstance: PublicClientApplication | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private readonly demoKey = 'pedidos360-demo-session';

  readonly isAuthenticated = signal(false);
  readonly userName = signal('Equipo Pedidos360');
  readonly userRole = signal('ADMIN');
  readonly userRoles = signal<string[]>(['ADMIN']);
  readonly userEmail = signal('');

  readonly isDemoMode =
    !environment.azure.clientId ||
    environment.azure.clientId.includes('{TU_CLIENT_ID}') ||
    environment.azure.clientId.includes('REPLACE_WITH_ENTRA_CLIENT_ID');

  constructor() {
    this.initMsal();
  }

  private initMsal(): void {
    if (typeof window === 'undefined' || this.isDemoMode) {
      return;
    }

    const msalConfig: Configuration = {
      auth: {
        clientId: environment.azure.clientId,
        authority: `https://login.microsoftonline.com/${environment.azure.tenantId}`,
        redirectUri: environment.azure.redirectUri,
        postLogoutRedirectUri: environment.azure.postLogoutRedirectUri,
      },
      cache: {
        cacheLocation: 'localStorage',
      },
    };

    this.msalInstance = new PublicClientApplication(msalConfig);
    this.initPromise = this.ensureInitialized();
  }

  async ensureInitialized(): Promise<void> {
    if (!this.msalInstance) return;
    if (this.isInitialized) return;

    await this.msalInstance.initialize();
    try {
      const response = await this.msalInstance.handleRedirectPromise();
      if (response?.account) {
        this.msalInstance.setActiveAccount(response.account);
        this.processAccount(response.account);
      } else {
        const accounts = this.msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const active = this.msalInstance.getActiveAccount() || accounts[0];
          this.msalInstance.setActiveAccount(active);
          this.processAccount(active);
        }
      }
    } catch (err) {
      console.warn('Aviso procesando handleRedirectPromise:', err);
    }
    this.isInitialized = true;
  }

  async login(): Promise<void> {
    if (this.isDemoMode) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(this.demoKey, 'true');
      }
      this.setSession(['ADMIN'], 'ADMIN', 'Sesión Demo (Modo Local)', 'demo@pedidos360.local');
      return;
    }

    if (this.initPromise) await this.initPromise;
    await this.ensureInitialized();
    if (!this.msalInstance) return;

    try {
      const loginRequest = {
        // openid + profile + email para el ID Token con nombre/email
        // El scope de la API genera el Access Token que valida Spring Security
        scopes: ['openid', 'profile', 'email', environment.azure.scope],
      };
      // Flujo de redirección estándar: robusto, sin bloqueos de popups ni timeout
      await this.msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Error durante loginRedirect con Microsoft Entra ID:', error);
      throw error;
    }
  }

  async restoreSession(): Promise<boolean> {
    if (this.isDemoMode) {
      const active = typeof window !== 'undefined' && window.sessionStorage.getItem(this.demoKey) === 'true';
      if (active) {
        this.setSession(['ADMIN'], 'ADMIN', 'Sesión Demo (Modo Local)', 'demo@pedidos360.local');
      }
      return active;
    }

    if (typeof window === 'undefined') return false;

    if (this.initPromise) await this.initPromise;
    await this.ensureInitialized();
    if (!this.msalInstance) return false;

    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      this.clearSession();
      return false;
    }

    const activeAccount = this.msalInstance.getActiveAccount() || accounts[0];
    this.msalInstance.setActiveAccount(activeAccount);
    this.processAccount(activeAccount);
    return true;
  }

  async logout(): Promise<void> {
    if (this.isDemoMode) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(this.demoKey);
      }
      this.clearSession();
      return;
    }

    if (this.initPromise) await this.initPromise;
    await this.ensureInitialized();
    if (this.msalInstance) {
      const account = this.msalInstance.getActiveAccount();
      await this.msalInstance.logoutRedirect({ account: account ?? undefined });
    }
    this.clearSession();
  }

  async getAccessToken(): Promise<string | null> {
    if (this.isDemoMode) {
      return 'demo-token';
    }

    if (this.initPromise) await this.initPromise;
    await this.ensureInitialized();
    if (!this.msalInstance) return null;

    const account = this.msalInstance.getActiveAccount();
    if (!account) return null;

    try {
      // Pedimos el Access Token con el scope de la API → el backend lo valida con AudienceValidator
      const response = await this.msalInstance.acquireTokenSilent({
        account,
        scopes: [environment.azure.scope],
      });
      return response.accessToken || response.idToken;
    } catch (error) {
      // Fallback al ID Token si el Access Token falla (ej. cuenta sin scope de API asignado)
      const rawIdToken = (account.idTokenClaims as any)?.__raw || (account as any).idToken;
      if (rawIdToken) return rawIdToken;
      console.warn('Advertencia adquiriendo token silencioso:', error);
      return null;
    }
  }

  private processAccount(account: AccountInfo | null): void {
    if (!account) {
      this.clearSession();
      return;
    }

    const name = account.name ?? account.username ?? 'Usuario';
    const email = account.username ?? (account.idTokenClaims?.['preferred_username'] as string) ?? '';
    const rolesList = this.extractRoles(account);
    const mainRole = this.determinePrimaryRole(rolesList);

    this.setSession(rolesList, mainRole, name, email);
  }

  private extractRoles(account: AccountInfo): string[] {
    const rawRoles = account.idTokenClaims?.['roles'];
    if (Array.isArray(rawRoles) && rawRoles.length > 0) {
      return rawRoles.map((r) => this.normalizeRole(String(r)));
    }
    return ['CUSTOMER'];
  }

  private determinePrimaryRole(roles: string[]): string {
    const priority = ['ADMIN', 'GERENTE', 'COCINA', 'REPARTIDOR', 'CUSTOMER'];
    for (const p of priority) {
      if (roles.includes(p)) return p;
    }
    return roles[0] || 'CUSTOMER';
  }

  normalizeRole(role: string): string {
    const upper = role.toUpperCase().trim();
    if (upper.includes('ADMIN') || upper.includes('ADMINISTRADOR')) return 'ADMIN';
    if (upper.includes('GERENTE') || upper.includes('LOCAL')) return 'GERENTE';
    if (upper.includes('COCINA') || upper.includes('OPERADOR')) return 'COCINA';
    if (upper.includes('REPARTIDOR') || upper.includes('DESPACHO')) return 'REPARTIDOR';
    if (upper.includes('CUSTOMER') || upper.includes('CLIENTE') || upper.includes('USER')) return 'CUSTOMER';
    return upper.replace(/^ROLE_/, '');
  }

  private setSession(roles: string[], primaryRole: string, name: string, email: string): void {
    this.userRoles.set(roles);
    this.userRole.set(primaryRole);
    this.userName.set(name);
    this.userEmail.set(email);
    this.isAuthenticated.set(true);
  }

  private clearSession(): void {
    this.isAuthenticated.set(false);
    this.userName.set('Equipo Pedidos360');
    this.userRole.set('ADMIN');
    this.userRoles.set(['ADMIN']);
    this.userEmail.set('');
  }
}
