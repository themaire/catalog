import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'catalog_token';
  private readonly roleKey = 'catalog_role';

  readonly role = signal<number>(this.readRole());

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get isAdmin(): boolean {
    return this.role() >= 2;
  }

  get hasModerateAccess(): boolean {
    return this.role() >= 1;
  }

  setSession(token: string, role: number): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.roleKey, String(role));
    this.role.set(role);
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);
    this.role.set(0);
  }

  private readRole(): number {
    const raw = localStorage.getItem(this.roleKey);
    const parsed = Number(raw ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
