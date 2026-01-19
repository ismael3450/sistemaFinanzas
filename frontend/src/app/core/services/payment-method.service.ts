import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaymentMethod, CreatePaymentMethodRequest, ApiResponse } from '../models';
import { OrganizationService } from './organization.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentMethodService {
  private readonly API_URL = environment.apiUrl;

  private _paymentMethods = signal<PaymentMethod[]>([]);

  readonly paymentMethods = this._paymentMethods.asReadonly();

  readonly activePaymentMethods = computed(() => 
    this._paymentMethods().filter(pm => pm.isActive)
  );

  constructor(
    private http: HttpClient,
    private orgService: OrganizationService
  ) {}

  private getUrl(): string {
    const orgId = this.orgService.activeOrgId();
    return `${this.API_URL}/organizations/${orgId}/payment-methods`;
  }

  create(data: CreatePaymentMethodRequest): Observable<ApiResponse<PaymentMethod>> {
    return this.http.post<ApiResponse<PaymentMethod>>(this.getUrl(), data).pipe(
      tap(response => {
        this._paymentMethods.update(methods => [...methods, response.data]);
      })
    );
  }

  getAll(includeInactive = false): Observable<ApiResponse<PaymentMethod[]>> {
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }
    return this.http.get<ApiResponse<PaymentMethod[]>>(this.getUrl(), { params }).pipe(
      tap(response => this._paymentMethods.set(response.data))
    );
  }

  getById(id: string): Observable<ApiResponse<PaymentMethod>> {
    return this.http.get<ApiResponse<PaymentMethod>>(`${this.getUrl()}/${id}`);
  }

  update(id: string, data: Partial<CreatePaymentMethodRequest>): Observable<ApiResponse<PaymentMethod>> {
    return this.http.patch<ApiResponse<PaymentMethod>>(`${this.getUrl()}/${id}`, data).pipe(
      tap(response => {
        this._paymentMethods.update(methods => 
          methods.map(pm => pm.id === id ? response.data : pm)
        );
      })
    );
  }

  activate(id: string): Observable<ApiResponse<PaymentMethod>> {
    return this.http.post<ApiResponse<PaymentMethod>>(`${this.getUrl()}/${id}/activate`, {}).pipe(
      tap(response => {
        this._paymentMethods.update(methods => 
          methods.map(pm => pm.id === id ? response.data : pm)
        );
      })
    );
  }

  deactivate(id: string): Observable<ApiResponse<PaymentMethod>> {
    return this.http.post<ApiResponse<PaymentMethod>>(`${this.getUrl()}/${id}/deactivate`, {}).pipe(
      tap(response => {
        this._paymentMethods.update(methods => 
          methods.map(pm => pm.id === id ? response.data : pm)
        );
      })
    );
  }

  clearState(): void {
    this._paymentMethods.set([]);
  }
}
