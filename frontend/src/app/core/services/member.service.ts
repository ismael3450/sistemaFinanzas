import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Member, InviteMemberRequest, Role, ApiResponse, PaginatedResponse } from '../models';
import { OrganizationService } from './organization.service';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private readonly API_URL = environment.apiUrl;

  private _members = signal<Member[]>([]);
  private _totalCount = signal<number>(0);
  private _isLoading = signal<boolean>(false);

  readonly members = this._members.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  constructor(
    private http: HttpClient,
    private orgService: OrganizationService
  ) {}

  private getUrl(): string {
    const orgId = this.orgService.activeOrgId();
    return `${this.API_URL}/organizations/${orgId}/members`;
  }

  invite(data: InviteMemberRequest): Observable<ApiResponse<Member>> {
    return this.http.post<ApiResponse<Member>>(`${this.getUrl()}/invite`, data).pipe(
      tap(response => {
        this._members.update(members => [...members, response.data]);
        this._totalCount.update(count => count + 1);
      })
    );
  }

  getAll(page = 1, limit = 10): Observable<ApiResponse<PaginatedResponse<Member>>> {
    this._isLoading.set(true);
    
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<PaginatedResponse<Member>>>(this.getUrl(), { params }).pipe(
      tap(response => {
        this._members.set(response.data.data);
        this._totalCount.set(response.data.meta.total);
        this._isLoading.set(false);
      })
    );
  }

  getById(id: string): Observable<ApiResponse<Member>> {
    return this.http.get<ApiResponse<Member>>(`${this.getUrl()}/${id}`);
  }

  updateRole(id: string, role: Role): Observable<ApiResponse<Member>> {
    return this.http.patch<ApiResponse<Member>>(`${this.getUrl()}/${id}/role`, { role }).pipe(
      tap(response => {
        this._members.update(members => 
          members.map(m => m.id === id ? response.data : m)
        );
      })
    );
  }

  revoke(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.getUrl()}/${id}`).pipe(
      tap(() => {
        this._members.update(members => members.filter(m => m.id !== id));
        this._totalCount.update(count => count - 1);
      })
    );
  }

  leave(): Observable<ApiResponse<{ message: string }>> {
    return this.http.post<ApiResponse<{ message: string }>>(`${this.getUrl()}/leave`, {});
  }

  clearState(): void {
    this._members.set([]);
    this._totalCount.set(0);
  }
}
