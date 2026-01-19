import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account, AccountBalance, CreateAccountRequest, ApiResponse, PaginatedResponse } from '../models';
import { OrganizationService } from './organization.service';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private readonly API_URL = environment.apiUrl;

  private _accounts = signal<Account[]>([]);
  private _balances = signal<AccountBalance[]>([]);

  readonly accounts = this._accounts.asReadonly();
  readonly balances = this._balances.asReadonly();

  readonly activeAccounts = computed(() => 
    this._accounts().filter(a => a.isActive)
  );

  readonly totalBalance = computed(() => {
    return this._balances().reduce((sum, b) => {
      return sum + parseFloat(b.currentBalance);
    }, 0);
  });

  constructor(
    private http: HttpClient,
    private orgService: OrganizationService
  ) {}

  private getUrl(): string {
    const orgId = this.orgService.activeOrgId();
    return `${this.API_URL}/organizations/${orgId}/accounts`;
  }

  create(data: CreateAccountRequest): Observable<ApiResponse<Account>> {
    return this.http.post<ApiResponse<Account>>(this.getUrl(), data).pipe(
      tap(response => {
        this._accounts.update(accounts => [...accounts, response.data]);
      })
    );
  }

  getAll(includeInactive = false): Observable<ApiResponse<PaginatedResponse<Account>>> {
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }
    return this.http.get<ApiResponse<PaginatedResponse<Account>>>(this.getUrl(), { params }).pipe(
      tap(response => this._accounts.set(response.data.data))
    );
  }

  getById(id: string): Observable<ApiResponse<Account>> {
    return this.http.get<ApiResponse<Account>>(`${this.getUrl()}/${id}`);
  }

  getBalance(id: string): Observable<ApiResponse<AccountBalance>> {
    return this.http.get<ApiResponse<AccountBalance>>(`${this.getUrl()}/${id}/balance`);
  }

  getAllBalances(): Observable<ApiResponse<AccountBalance[]>> {
    return this.http.get<ApiResponse<AccountBalance[]>>(`${this.getUrl()}/balances`).pipe(
      tap(response => this._balances.set(response.data))
    );
  }

  update(id: string, data: Partial<CreateAccountRequest>): Observable<ApiResponse<Account>> {
    return this.http.patch<ApiResponse<Account>>(`${this.getUrl()}/${id}`, data).pipe(
      tap(response => {
        this._accounts.update(accounts => 
          accounts.map(a => a.id === id ? response.data : a)
        );
      })
    );
  }

  activate(id: string): Observable<ApiResponse<Account>> {
    return this.http.post<ApiResponse<Account>>(`${this.getUrl()}/${id}/activate`, {}).pipe(
      tap(response => {
        this._accounts.update(accounts => 
          accounts.map(a => a.id === id ? response.data : a)
        );
      })
    );
  }

  deactivate(id: string): Observable<ApiResponse<Account>> {
    return this.http.post<ApiResponse<Account>>(`${this.getUrl()}/${id}/deactivate`, {}).pipe(
      tap(response => {
        this._accounts.update(accounts => 
          accounts.map(a => a.id === id ? response.data : a)
        );
      })
    );
  }

  clearState(): void {
    this._accounts.set([]);
    this._balances.set([]);
  }
}
