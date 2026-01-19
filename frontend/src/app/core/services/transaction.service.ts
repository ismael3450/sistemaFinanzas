import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Transaction, 
  CreateTransactionRequest, 
  TransactionFilter,
  ApiResponse, 
  PaginatedResponse 
} from '../models';
import { OrganizationService } from './organization.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly API_URL = environment.apiUrl;

  private _transactions = signal<Transaction[]>([]);
  private _totalCount = signal<number>(0);
  private _isLoading = signal<boolean>(false);

  readonly transactions = this._transactions.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  constructor(
    private http: HttpClient,
    private orgService: OrganizationService
  ) {}

  private getUrl(): string {
    const orgId = this.orgService.activeOrgId();
    return `${this.API_URL}/organizations/${orgId}/transactions`;
  }

  create(data: CreateTransactionRequest): Observable<ApiResponse<Transaction>> {
    return this.http.post<ApiResponse<Transaction>>(this.getUrl(), data).pipe(
      tap(response => {
        this._transactions.update(txns => [response.data, ...txns]);
        this._totalCount.update(count => count + 1);
      })
    );
  }

  getAll(filter: TransactionFilter = {}): Observable<ApiResponse<PaginatedResponse<Transaction>>> {
    this._isLoading.set(true);
    
    let params = new HttpParams();
    
    if (filter.type) params = params.set('type', filter.type);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.categoryId) params = params.set('categoryId', filter.categoryId);
    if (filter.accountId) params = params.set('accountId', filter.accountId);
    if (filter.startDate) params = params.set('startDate', filter.startDate.toISOString());
    if (filter.endDate) params = params.set('endDate', filter.endDate.toISOString());
    if (filter.search) params = params.set('search', filter.search);
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());

    return this.http.get<ApiResponse<PaginatedResponse<Transaction>>>(this.getUrl(), { params }).pipe(
      tap(response => {
        this._transactions.set(response.data.data);
        this._totalCount.set(response.data.meta.total);
        this._isLoading.set(false);
      })
    );
  }

  getById(id: string): Observable<ApiResponse<Transaction>> {
    return this.http.get<ApiResponse<Transaction>>(`${this.getUrl()}/${id}`);
  }

  update(id: string, data: Partial<CreateTransactionRequest>): Observable<ApiResponse<Transaction>> {
    return this.http.patch<ApiResponse<Transaction>>(`${this.getUrl()}/${id}`, data).pipe(
      tap(response => {
        this._transactions.update(txns => 
          txns.map(t => t.id === id ? response.data : t)
        );
      })
    );
  }

  void(id: string, reason: string): Observable<ApiResponse<Transaction>> {
    return this.http.post<ApiResponse<Transaction>>(`${this.getUrl()}/${id}/void`, { reason }).pipe(
      tap(response => {
        this._transactions.update(txns => 
          txns.map(t => t.id === id ? response.data : t)
        );
      })
    );
  }

  clearState(): void {
    this._transactions.set([]);
    this._totalCount.set(0);
  }
}
