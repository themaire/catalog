import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { Category, ModelDetail, ModelSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = '/api';

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  login(username: string, password: string): Observable<{ token: string; role: number }> {
    return this.http.post<{ token: string; role: number }>(`${this.baseUrl}/auth/login`, { username, password });
  }

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories`, { headers: this.authHeaders() });
  }

  models(category: string): Observable<ModelSummary[]> {
    return this.http.get<ModelSummary[]>(`${this.baseUrl}/models`, {
      params: { category },
      headers: this.authHeaders()
    });
  }

  model(id: number): Observable<ModelDetail> {
    return this.http.get<ModelDetail>(`${this.baseUrl}/models/${id}`, { headers: this.authHeaders() });
  }

  downloadUrl(id: number): string {
    return `${this.baseUrl}/models/${id}/download`;
  }

  adminCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/admin/categories`, { headers: this.authHeaders() });
  }

  createCategory(payload: Pick<Category, 'name' | 'rightLevel'>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.baseUrl}/admin/categories`, payload, {
      headers: this.authHeaders()
    });
  }

  updateCategory(id: number, payload: Pick<Category, 'name' | 'rightLevel'>): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/categories/${id}`, payload, {
      headers: this.authHeaders()
    });
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/admin/categories/${id}`, {
      headers: this.authHeaders()
    });
  }

  domain(): Observable<{ id: number; value: string }> {
    return this.http.get<{ id: number; value: string }>(`${this.baseUrl}/admin/domain`, {
      headers: this.authHeaders()
    });
  }

  updateDomain(value: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/admin/domain`, { value }, { headers: this.authHeaders() });
  }

  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
