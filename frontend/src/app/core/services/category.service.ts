import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, CreateCategoryRequest, ApiResponse } from '../models';
import { OrganizationService } from './organization.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly API_URL = environment.apiUrl;

  private _categories = signal<Category[]>([]);

  readonly categories = this._categories.asReadonly();

  readonly activeCategories = computed(() => 
    this._categories().filter(c => c.isActive)
  );

  readonly incomeCategories = computed(() => 
    this.activeCategories().filter(c => c.type === 'INCOME' || c.type === 'BOTH')
  );

  readonly expenseCategories = computed(() => 
    this.activeCategories().filter(c => c.type === 'EXPENSE' || c.type === 'BOTH')
  );

  readonly flatCategories = computed(() => {
    const flatten = (cats: Category[], level = 0): (Category & { level: number })[] => {
      return cats.reduce((acc, cat) => {
        acc.push({ ...cat, level });
        if (cat.children?.length) {
          acc.push(...flatten(cat.children, level + 1));
        }
        return acc;
      }, [] as (Category & { level: number })[]);
    };
    return flatten(this._categories());
  });

  constructor(
    private http: HttpClient,
    private orgService: OrganizationService
  ) {}

  private getUrl(): string {
    const orgId = this.orgService.activeOrgId();
    return `${this.API_URL}/organizations/${orgId}/categories`;
  }

  create(data: CreateCategoryRequest): Observable<ApiResponse<Category>> {
    return this.http.post<ApiResponse<Category>>(this.getUrl(), data).pipe(
      tap(() => this.getAll().subscribe())
    );
  }

  getAll(includeInactive = false): Observable<ApiResponse<Category[]>> {
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }
    return this.http.get<ApiResponse<Category[]>>(this.getUrl(), { params }).pipe(
      tap(response => this._categories.set(response.data))
    );
  }

  getById(id: string): Observable<ApiResponse<Category>> {
    return this.http.get<ApiResponse<Category>>(`${this.getUrl()}/${id}`);
  }

  update(id: string, data: Partial<CreateCategoryRequest>): Observable<ApiResponse<Category>> {
    return this.http.patch<ApiResponse<Category>>(`${this.getUrl()}/${id}`, data).pipe(
      tap(() => this.getAll().subscribe())
    );
  }

  activate(id: string): Observable<ApiResponse<Category>> {
    return this.http.post<ApiResponse<Category>>(`${this.getUrl()}/${id}/activate`, {}).pipe(
      tap(() => this.getAll().subscribe())
    );
  }

  deactivate(id: string): Observable<ApiResponse<Category>> {
    return this.http.post<ApiResponse<Category>>(`${this.getUrl()}/${id}/deactivate`, {}).pipe(
      tap(() => this.getAll().subscribe())
    );
  }

  clearState(): void {
    this._categories.set([]);
  }
}
