import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog, AuditFilter, ApiResponse, PaginatedResponse } from '../models';
import { OrganizationService } from './organization.service';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly API_URL = environment.apiUrl;

  private _logs = signal<AuditLog[]>([]);
  private _totalCount = signal<number>(0);
  private _modules = signal<string[]>([]);
  private _isLoading = signal<boolean>(false);

  readonly logs = this._logs.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly modules = this._modules.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  constructor(
    private http: HttpClient,
    private orgService: OrganizationService
  ) {}

  private getUrl(): string {
    const orgId = this.orgService.activeOrgId();
    return `${this.API_URL}/organizations/${orgId}/audit`;
  }

  getAll(filter: AuditFilter = {}): Observable<ApiResponse<PaginatedResponse<AuditLog>>> {
    this._isLoading.set(true);
    
    let params = new HttpParams();
    if (filter.startDate) params = params.set('startDate', filter.startDate.toISOString());
    if (filter.endDate) params = params.set('endDate', filter.endDate.toISOString());
    if (filter.userId) params = params.set('userId', filter.userId);
    if (filter.module) params = params.set('module', filter.module);
    if (filter.action) params = params.set('action', filter.action);
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());

    return this.http.get<ApiResponse<PaginatedResponse<AuditLog>>>(this.getUrl(), { params }).pipe(
      tap(response => {
        this._logs.set(response.data.data);
        this._totalCount.set(response.data.meta.total);
        this._isLoading.set(false);
      })
    );
  }

  getModules(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.getUrl()}/modules`).pipe(
      tap(response => this._modules.set(response.data))
    );
  }

  clearState(): void {
    this._logs.set([]);
    this._totalCount.set(0);
    this._modules.set([]);
  }
}
